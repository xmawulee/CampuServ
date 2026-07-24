package com.knust.campusserv.support.controller;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/location")
public class LocationController {

    private static final Logger log = LoggerFactory.getLogger(LocationController.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${google.api.key:mock-key-for-development}")
    private String googleApiKey;

    // Use a standard RestTemplate instead of the load-balanced one for external
    // calls
    private final RestTemplate restTemplate = new RestTemplate();

    // ── STOMP WebSocket Live Location Streaming ──
    @MessageMapping("/location.update")
    public void updateLocation(LocationPayload payload, Principal principal) {
        if (principal == null) {
            log.warn("WebSocket Location Update: Unauthenticated connection");
            return;
        }
        String senderId = principal.getName();

        String taskId = payload.getTaskId();
        String providerId = payload.getProviderId();

        if (taskId == null || providerId == null) {
            log.warn("WebSocket Location Update: Missing taskId or providerId in payload");
            return;
        }

        try {
            // Validate: Task status must be 'IN_PROGRESS', and provider must match
            // authenticated user
            List<Map<String, Object>> jobs = jdbcTemplate.queryForList(
                    "SELECT provider_id, status FROM jobs WHERE id = ?", taskId);

            if (jobs.isEmpty()) {
                log.warn("WebSocket Location Update: Job not found: {}", taskId);
                return;
            }

            Map<String, Object> job = jobs.get(0);
            String dbProviderId = (String) job.get("provider_id");
            String dbStatus = (String) job.get("status");

            if (!"IN_PROGRESS".equalsIgnoreCase(dbStatus) && !"ACTIVE".equalsIgnoreCase(dbStatus) && !"AWAITING_CODE".equalsIgnoreCase(dbStatus)) {
                log.warn("WebSocket Location Update: Job {} status is {}, not IN_PROGRESS/ACTIVE/AWAITING_CODE", taskId, dbStatus);
                return;
            }

            if (!dbProviderId.equals(providerId) || !dbProviderId.equals(senderId)) {
                log.warn(
                        "WebSocket Location Update: Spoofing detected for job {}. DB provider: {}, payload: {}, sender: {}",
                        taskId, dbProviderId, providerId, senderId);
                return;
            }

            // Save live location in Redis (TTL: 1 hour)
            String redisKey = "location:task:" + taskId + ":provider";
            Map<String, Object> redisVal = new LinkedHashMap<>();
            redisVal.put("lat", payload.getLatitude());
            redisVal.put("lng", payload.getLongitude());
            redisVal.put("bearing", payload.getBearing());
            redisVal.put("speed", payload.getSpeed());
            redisVal.put("timestamp", payload.getTimestamp());

            String jsonVal = objectMapper.writeValueAsString(redisVal);
            redisTemplate.opsForValue().set(redisKey, jsonVal, 1, TimeUnit.HOURS);

            // Persist to Postgres location_history table
            jdbcTemplate.update(
                    "INSERT INTO location_history (id, task_id, provider_id, latitude, longitude, accuracy, bearing, speed, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    "lh-" + UUID.randomUUID().toString(),
                    taskId,
                    providerId,
                    BigDecimal.valueOf(payload.getLatitude()),
                    BigDecimal.valueOf(payload.getLongitude()),
                    payload.getAccuracy(),
                    payload.getBearing(),
                    payload.getSpeed(),
                    LocalDateTime.now());

            // Broadcast to Requester's subscription channel
            Map<String, Object> broadcastPayload = new LinkedHashMap<>();
            broadcastPayload.put("latitude", payload.getLatitude());
            broadcastPayload.put("longitude", payload.getLongitude());
            broadcastPayload.put("bearing", payload.getBearing());
            broadcastPayload.put("speed", payload.getSpeed());
            broadcastPayload.put("timestamp", payload.getTimestamp());

            messagingTemplate.convertAndSend("/topic/task/" + taskId + "/provider-location", broadcastPayload);

            // Auto-detect Geofence Arrival (50 meters)
            try {
                List<Map<String, Object>> locations = jdbcTemplate.queryForList(
                        "SELECT pickup_latitude, pickup_longitude FROM request_locations WHERE request_id = " +
                                "(SELECT request_id FROM jobs WHERE id = ?)",
                        taskId);
                if (!locations.isEmpty()) {
                    Map<String, Object> loc = locations.get(0);
                    BigDecimal pickupLat = (BigDecimal) loc.get("pickup_latitude");
                    BigDecimal pickupLng = (BigDecimal) loc.get("pickup_longitude");
                    if (pickupLat != null && pickupLng != null) {
                        double distMeters = calculateDistance(payload.getLatitude(), payload.getLongitude(),
                                pickupLat.doubleValue(), pickupLng.doubleValue());
                        if (distMeters <= 50.0) {
                            Map<String, Object> arrivalEvent = new LinkedHashMap<>();
                            arrivalEvent.put("type", "PROVIDER_ARRIVED");
                            arrivalEvent.put("taskId", taskId);
                            arrivalEvent.put("timestamp", LocalDateTime.now().toString());
                            messagingTemplate.convertAndSend("/topic/task/" + taskId + "/provider-location",
                                    arrivalEvent);
                            log.info("Backend auto-detected provider arrival for task {}", taskId);
                        }
                    }
                }
            } catch (Exception geofenceEx) {
                log.error("Failed to execute backend geofence auto-detect check for task {}: {}", taskId,
                        geofenceEx.getMessage());
            }

        } catch (Exception e) {
            log.error("WebSocket Location Update failed for job {}: {}", taskId, e.getMessage(), e);
        }
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371e3; // Earth radius in meters
        double phi1 = Math.toRadians(lat1);
        double phi2 = Math.toRadians(lat2);
        double deltaPhi = Math.toRadians(lat2 - lat1);
        double deltaLambda = Math.toRadians(lon2 - lon1);

        double a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                Math.cos(phi1) * Math.cos(phi2) *
                        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // in meters
    }

    @PostMapping("/task/{taskId}/arrive")
    public ResponseEntity<?> providerArrived(@PathVariable("taskId") String taskId,
            @RequestHeader("X-User-Id") String callerId) {
        try {
            List<Map<String, Object>> jobs = jdbcTemplate.queryForList(
                    "SELECT provider_id, status FROM jobs WHERE id = ?", taskId);
            if (jobs.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Job not found.");
            }
            Map<String, Object> job = jobs.get(0);
            String providerId = (String) job.get("provider_id");

            if (!providerId.equals(callerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied.");
            }

            // Broadcast to the requester's channel that provider has arrived
            Map<String, Object> arrivalEvent = new LinkedHashMap<>();
            arrivalEvent.put("type", "PROVIDER_ARRIVED");
            arrivalEvent.put("taskId", taskId);
            arrivalEvent.put("timestamp", LocalDateTime.now().toString());

            messagingTemplate.convertAndSend("/topic/task/" + taskId + "/provider-location", arrivalEvent);

            log.info("Provider {} arrived for task {}", providerId, taskId);
            return ResponseEntity.ok("Arrival registered.");
        } catch (Exception e) {
            log.error("Failed to register arrival: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to register arrival.");
        }
    }

    // ── Google Maps API Proxies ──

    // 1. Reverse Geocoding: Lat/Lng -> Address
    @GetMapping("/reverse-geocode")
    public ResponseEntity<?> reverseGeocode(@RequestParam("lat") double lat,
            @RequestParam("lng") double lng) {
        if ("mock-key-for-development".equals(googleApiKey)) {
            // Mock Fallback
            Map<String, Object> mockRes = new LinkedHashMap<>();
            mockRes.put("address", "Unity Hall, KNUST, Kumasi");
            mockRes.put("placeId", "mock-place-unity-hall");
            return ResponseEntity.ok(mockRes);
        }

        try {
            String url = String.format(
                    "https://maps.googleapis.com/maps/api/geocode/json?latlng=%f,%f&result_type=premise|establishment|point_of_interest&key=%s",
                    lat, lng, googleApiKey);
            Map<?, ?> response = restTemplate.getForObject(url, Map.class);
            if (response != null && "OK".equals(response.get("status"))) {
                List<?> results = (List<?>) response.get("results");
                if (!results.isEmpty()) {
                    Map<?, ?> firstResult = (Map<?, ?>) results.get(0);
                    Map<String, Object> finalRes = new LinkedHashMap<>();
                    finalRes.put("address", firstResult.get("formatted_address"));
                    finalRes.put("placeId", firstResult.get("place_id"));
                    return ResponseEntity.ok(finalRes);
                }
            }
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("Failed to geocode with Google API");
        } catch (Exception e) {
            log.error("Reverse Geocoding failed: {}", e.getMessage(), e);
            // Fallback mock
            Map<String, Object> mockRes = new LinkedHashMap<>();
            mockRes.put("address", "Unity Hall, KNUST, Kumasi");
            mockRes.put("placeId", "mock-place-unity-hall");
            return ResponseEntity.ok(mockRes);
        }
    }

    // 2. Places Autocomplete
    @GetMapping("/places-autocomplete")
    public ResponseEntity<?> placesAutocomplete(@RequestParam("input") String input) {
        if ("mock-key-for-development".equals(googleApiKey) || input == null || input.trim().isEmpty()) {
            // Mock Autocomplete
            List<Map<String, String>> suggestions = new ArrayList<>();
            suggestions.add(Map.of("description", "KNUST SRC Building, Kumasi", "placeId", "mock-place-src"));
            suggestions.add(Map.of("description", "Unity Hall Gate, Kumasi", "placeId", "mock-place-unity"));
            suggestions.add(Map.of("description", "Ayeduase Gate, Kumasi", "placeId", "mock-place-ayeduase"));
            suggestions.add(Map.of("description", "Adum Shopping Center, Kumasi", "placeId", "mock-place-adum"));
            return ResponseEntity.ok(suggestions);
        }

        try {
            String url = String.format(
                    "https://maps.googleapis.com/maps/api/place/autocomplete/json?input=%s&location=6.6741,-1.5726&radius=10000&key=%s",
                    input, googleApiKey);
            Map<?, ?> response = restTemplate.getForObject(url, Map.class);
            if (response != null && "OK".equals(response.get("status"))) {
                List<?> predictions = (List<?>) response.get("predictions");
                List<Map<String, String>> finalRes = new ArrayList<>();
                for (Object item : predictions) {
                    Map<?, ?> pred = (Map<?, ?>) item;
                    Map<String, String> map = new LinkedHashMap<>();
                    map.put("description", (String) pred.get("description"));
                    map.put("placeId", (String) pred.get("place_id"));
                    finalRes.add(map);
                }
                return ResponseEntity.ok(finalRes);
            }
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("Google Places API error");
        } catch (Exception e) {
            log.error("Places autocomplete failed: {}", e.getMessage(), e);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    // 5. Place Details: placeId -> lat/lng DTO
    @GetMapping("/place-details")
    public ResponseEntity<?> getPlaceDetails(@RequestParam("placeId") String placeId) {
        if ("mock-key-for-development".equals(googleApiKey)) {
            Map<String, Object> mockRes = new LinkedHashMap<>();
            if ("mock-place-src".equals(placeId)) {
                mockRes.put("latitude", 6.6735);
                mockRes.put("longitude", -1.5710);
            } else if ("mock-place-unity".equals(placeId)) {
                mockRes.put("latitude", 6.6745);
                mockRes.put("longitude", -1.5728);
            } else if ("mock-place-ayeduase".equals(placeId)) {
                mockRes.put("latitude", 6.6690);
                mockRes.put("longitude", -1.5680);
            } else {
                mockRes.put("latitude", 6.6741);
                mockRes.put("longitude", -1.5726);
            }
            return ResponseEntity.ok(mockRes);
        }

        try {
            String url = String.format(
                    "https://maps.googleapis.com/maps/api/place/details/json?place_id=%s&fields=geometry&key=%s",
                    placeId, googleApiKey);
            Map<?, ?> response = restTemplate.getForObject(url, Map.class);
            if (response != null && "OK".equals(response.get("status"))) {
                Map<?, ?> result = (Map<?, ?>) response.get("result");
                Map<?, ?> geometry = (Map<?, ?>) result.get("geometry");
                Map<?, ?> location = (Map<?, ?>) geometry.get("location");

                Map<String, Object> finalRes = new LinkedHashMap<>();
                finalRes.put("latitude", ((Number) location.get("lat")).doubleValue());
                finalRes.put("longitude", ((Number) location.get("lng")).doubleValue());
                return ResponseEntity.ok(finalRes);
            }
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("Google Place Details error");
        } catch (Exception e) {
            log.error("Place Details failed: {}", e.getMessage(), e);
            Map<String, Object> mockRes = new LinkedHashMap<>();
            mockRes.put("latitude", 6.6741);
            mockRes.put("longitude", -1.5726);
            return ResponseEntity.ok(mockRes);
        }
    }

    // 3. Directions: route polyline + turn-by-turn DTO
    @GetMapping("/directions")
    public ResponseEntity<?> getDirections(@RequestParam("origin_lat") double originLat,
            @RequestParam("origin_lng") double originLng,
            @RequestParam("dest_lat") double destLat,
            @RequestParam("dest_lng") double destLng,
            @RequestParam(value = "mode", defaultValue = "walking") String mode) {
        if ("mock-key-for-development".equals(googleApiKey)) {
            // Return Mock Polyline (straight line between points) and mock ETA
            Map<String, Object> mockRes = new LinkedHashMap<>();
            mockRes.put("polyline", "a~l~Fjk~uOwpo@rqc"); // Dummy polyline
            mockRes.put("durationSeconds", 360);
            mockRes.put("distanceMeters", 600);
            mockRes.put("steps",
                    List.of(Map.of("instruction", "Head toward destination directly.", "distance", "600 m")));
            return ResponseEntity.ok(mockRes);
        }

        try {
            String url = String.format(
                    "https://maps.googleapis.com/maps/api/directions/json?origin=%f,%f&destination=%f,%f&mode=%s&key=%s",
                    originLat, originLng, destLat, destLng, mode, googleApiKey);
            Map<?, ?> response = restTemplate.getForObject(url, Map.class);
            if (response != null && "OK".equals(response.get("status"))) {
                List<?> routes = (List<?>) response.get("routes");
                if (!routes.isEmpty()) {
                    Map<?, ?> route = (Map<?, ?>) routes.get(0);
                    Map<?, ?> polylineObj = (Map<?, ?>) route.get("overview_polyline");
                    List<?> legs = (List<?>) route.get("legs");
                    Map<?, ?> leg = (Map<?, ?>) legs.get(0);

                    Map<?, ?> duration = (Map<?, ?>) leg.get("duration");
                    Map<?, ?> distance = (Map<?, ?>) leg.get("distance");

                    List<?> stepsList = (List<?>) leg.get("steps");
                    List<Map<String, Object>> steps = new ArrayList<>();
                    for (Object stepObj : stepsList) {
                        Map<?, ?> s = (Map<?, ?>) stepObj;
                        Map<String, Object> step = new LinkedHashMap<>();
                        step.put("instruction", s.get("html_instructions"));
                        Map<?, ?> stepDist = (Map<?, ?>) s.get("distance");
                        step.put("distance", stepDist != null ? stepDist.get("text") : "");
                        steps.add(step);
                    }

                    Map<String, Object> finalRes = new LinkedHashMap<>();
                    finalRes.put("polyline", polylineObj.get("points"));
                    finalRes.put("durationSeconds", ((Number) duration.get("value")).intValue());
                    finalRes.put("distanceMeters", ((Number) distance.get("value")).intValue());
                    finalRes.put("steps", steps);
                    return ResponseEntity.ok(finalRes);
                }
            }
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("Google Directions error");
        } catch (Exception e) {
            log.error("Directions failed: {}", e.getMessage(), e);
            // Fallback straight line
            Map<String, Object> mockRes = new LinkedHashMap<>();
            mockRes.put("polyline", "a~l~Fjk~uOwpo@rqc");
            mockRes.put("durationSeconds", 360);
            mockRes.put("distanceMeters", 600);
            mockRes.put("steps",
                    List.of(Map.of("instruction", "Head toward destination directly.", "distance", "600 m")));
            return ResponseEntity.ok(mockRes);
        }
    }

    // 4. Distance Matrix: pre-bid walking/driving distance estimation
    @GetMapping("/distance-matrix")
    public ResponseEntity<?> getDistanceMatrix(@RequestParam("origin_lat") double originLat,
            @RequestParam("origin_lng") double originLng,
            @RequestParam("dest_lat") double destLat,
            @RequestParam("dest_lng") double destLng,
            @RequestParam(value = "mode", defaultValue = "walking") String mode) {
        if ("mock-key-for-development".equals(googleApiKey)) {
            Map<String, Object> mockRes = new LinkedHashMap<>();
            mockRes.put("distanceText", "450 m");
            mockRes.put("durationText", "6 mins");
            mockRes.put("distanceValue", 450);
            mockRes.put("durationValue", 360);
            return ResponseEntity.ok(mockRes);
        }

        try {
            String url = String.format(
                    "https://maps.googleapis.com/maps/api/distancematrix/json?origins=%f,%f&destinations=%f,%f&mode=%s&key=%s",
                    originLat, originLng, destLat, destLng, mode, googleApiKey);
            Map<?, ?> response = restTemplate.getForObject(url, Map.class);
            if (response != null && "OK".equals(response.get("status"))) {
                List<?> rows = (List<?>) response.get("rows");
                if (!rows.isEmpty()) {
                    Map<?, ?> row = (Map<?, ?>) rows.get(0);
                    List<?> elements = (List<?>) row.get("elements");
                    if (!elements.isEmpty()) {
                        Map<?, ?> element = (Map<?, ?>) elements.get(0);
                        if ("OK".equals(element.get("status"))) {
                            Map<?, ?> distance = (Map<?, ?>) element.get("distance");
                            Map<?, ?> duration = (Map<?, ?>) element.get("duration");

                            Map<String, Object> finalRes = new LinkedHashMap<>();
                            finalRes.put("distanceText", distance.get("text"));
                            finalRes.put("durationText", duration.get("text"));
                            finalRes.put("distanceValue", ((Number) distance.get("value")).intValue());
                            finalRes.put("durationValue", ((Number) duration.get("value")).intValue());
                            return ResponseEntity.ok(finalRes);
                        }
                    }
                }
            }
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("Google Distance Matrix error");
        } catch (Exception e) {
            log.error("Distance Matrix failed: {}", e.getMessage(), e);
            Map<String, Object> mockRes = new LinkedHashMap<>();
            mockRes.put("distanceText", "450 m");
            mockRes.put("durationText", "6 mins");
            mockRes.put("distanceValue", 450);
            mockRes.put("durationValue", 360);
            return ResponseEntity.ok(mockRes);
        }
    }

    @GetMapping(value = "/static-map", produces = org.springframework.http.MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getStaticMap(
            @RequestParam("lat") double lat,
            @RequestParam("lng") double lng,
            @RequestParam(value = "zoom", defaultValue = "15") int zoom,
            @RequestParam(value = "size", defaultValue = "600x300") String size) {
        if ("mock-key-for-development".equals(googleApiKey)) {
            byte[] mockPng = Base64.getDecoder().decode(
                    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
            return ResponseEntity.ok().contentType(org.springframework.http.MediaType.IMAGE_PNG).body(mockPng);
        }

        try {
            String url = String.format(
                    "https://maps.googleapis.com/maps/api/staticmap?center=%f,%f&zoom=%d&size=%s&markers=color:red|%f,%f&key=%s",
                    lat, lng, zoom, size, lat, lng, googleApiKey);
            byte[] imageBytes = restTemplate.getForObject(url, byte[].class);
            return ResponseEntity.ok().contentType(org.springframework.http.MediaType.IMAGE_PNG).body(imageBytes);
        } catch (Exception e) {
            log.error("Static Map generation failed: {}", e.getMessage(), e);
            byte[] mockPng = Base64.getDecoder().decode(
                    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
            return ResponseEntity.ok().contentType(org.springframework.http.MediaType.IMAGE_PNG).body(mockPng);
        }
    }

    // ── LocationPayload DTO ──
    public static class LocationPayload {
        @JsonProperty("task_id")
        private String taskId;

        @JsonProperty("provider_id")
        private String providerId;

        private Double latitude;
        private Double longitude;
        private Double accuracy;
        private Double bearing;
        private Double speed;
        private String timestamp;

        // Getters and Setters
        public String getTaskId() {
            return taskId;
        }

        public void setTaskId(String taskId) {
            this.taskId = taskId;
        }

        public String getProviderId() {
            return providerId;
        }

        public void setProviderId(String providerId) {
            this.providerId = providerId;
        }

        public Double getLatitude() {
            return latitude;
        }

        public void setLatitude(Double latitude) {
            this.latitude = latitude;
        }

        public Double getLongitude() {
            return longitude;
        }

        public void setLongitude(Double longitude) {
            this.longitude = longitude;
        }

        public Double getAccuracy() {
            return accuracy;
        }

        public void setAccuracy(Double accuracy) {
            this.accuracy = accuracy;
        }

        public Double getBearing() {
            return bearing;
        }

        public void setBearing(Double bearing) {
            this.bearing = bearing;
        }

        public Double getSpeed() {
            return speed;
        }

        public void setSpeed(Double speed) {
            this.speed = speed;
        }

        public String getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(String timestamp) {
            this.timestamp = timestamp;
        }
    }
}
