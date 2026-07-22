import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  Dimensions,
  FlatList,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { getDirections, getRequestLocation, notifyProviderArrived } from '../../services/locationService';
import { stompClient } from '../../services/socket';
import { api } from '../../services/api';
import { useToast } from '../../styles/ToastContext';
import StatusDialog from '../../components/StatusDialog';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LOCATION_TASK_NAME = 'campusserv-provider-location-updates';
const GEOFENCE_TASK_NAME = 'campusserv-provider-geofence-arrival';

// TaskManager Background Tasks
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      // Get stored active task info from state if needed, but since it runs in background context,
      // we get task details or token or just rely on StompClient if it is alive.
      // Alternatively, we stream coordinates via background.
      try {
        const activeTaskId = await Location.hasServicesEnabledAsync() ? 'active' : ''; // placeholder
        // STOMP is used. If stompClient is connected, publish coordinate updates.
        // If not connected, stompClient automatically reconnects.
        const token = useAuthStore.getState().accessToken;
        const user = useAuthStore.getState().user;
        // Check if there is an active navigation taskId stored in a persistent store or memory
        const activeNavJobId = activeJobIdInMemory; 
        
        if (activeNavJobId && token && user) {
          stompClient.sendMessage('/app/location.update', {
            task_id: activeNavJobId,
            provider_id: user.id,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 1.0,
            bearing: location.coords.heading || 0.0,
            speed: location.coords.speed || 0.0,
            timestamp: new Date(location.timestamp).toISOString(),
          });
        }
      } catch (err) {
        console.warn('Background STOMP stream failed:', err);
      }
    }
  }
});

TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('Background geofence error:', error);
    return;
  }
  if (data) {
    const { eventType } = data;
    if (eventType === Location.GeofencingEventType.Enter) {
      console.log('Provider entered the geofence!');
      const activeNavJobId = activeJobIdInMemory;
      if (activeNavJobId) {
        await notifyProviderArrived(activeNavJobId);
      }
    }
  }
});

// Memory cache to pass active Job ID to background tasks
let activeJobIdInMemory: string | null = null;

export default function ActiveNavigationScreen({ route, navigation }: any) {
  const { taskId, requestId } = route.params;
  const { colors, isDark } = useTheme();
  const { user, accessToken } = useAuthStore();

  const [requestLocation, setRequestLocation] = useState<any>(null);
  const [providerCoords, setProviderCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [providerBearing, setProviderBearing] = useState(0);
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);
  const [routePoints, setRoutePoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [etaText, setEtaText] = useState('...');
  const [distanceText, setDistanceText] = useState('...');
  const [steps, setSteps] = useState<any[]>([]);
  const [requesterName, setRequesterName] = useState('Requester');
  const [requesterPhone, setRequesterPhone] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [arrived, setArrived] = useState(false);
  const [batterySaverWarning, setBatterySaverWarning] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  
  const { showToast } = useToast();
  const [arrivedDialogVisible, setArrivedDialogVisible] = useState(false);

  const mapRef = useRef<MapView>(null);
  const stepsListRef = useRef<FlatList>(null);
  const locationSubscriptionRef = useRef<any>(null);

  // Store active navigation job ID in memory for background Tasks access
  useEffect(() => {
    activeJobIdInMemory = taskId;
    return () => {
      activeJobIdInMemory = null;
    };
  }, [taskId]);

  useEffect(() => {
    initNavigation();

    // Re-calculate route every 30 seconds
    const routeTimer = setInterval(() => {
      recalculateRoute();
    }, 30000);

    return () => {
      clearInterval(routeTimer);
      stopLocationTracking();
    };
  }, []);

  const initNavigation = async () => {
    setLoading(true);
    setNetworkError(false);
    try {
      // 1. Fetch exact request location details
      const loc = await getRequestLocation(requestId);
      setRequestLocation(loc);

      // 2. Fetch Requester details (specifically name and phone for call/chat)
      try {
        const jobDetails = await api.get(`/jobs/${taskId}`);
        const requesterId = jobDetails.data.requesterId;
        const requesterRes = await api.get(`/users/${requesterId}`);
        setRequesterName(requesterRes.data.fullName || 'Requester');
        setRequesterPhone(requesterRes.data.phoneNumber || '');
      } catch (err) {
        console.warn('Failed to fetch requester details:', err);
      }

      // 3. Request background and foreground location permissions
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Foreground GPS permission is required to navigate.');
        setLoading(false);
        return;
      }

      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        console.log('Background location updates denied. Using foreground updates only.');
      }

      // 4. Connect STOMP socket if not already connected
      if (accessToken) {
        stompClient.connect(accessToken);
      }

      // 5. Start GPS tracking
      if (loc && loc.pickupLatitude && loc.pickupLongitude) {
        await startLocationTracking(loc);
      } else {
        Alert.alert('No GPS Data', 'This request does not have precise GPS coordinates. Please navigate manually using the description.');
        setLoading(false);
      }

    } catch (e) {
      console.error('initNavigation error', e);
      setNetworkError(true);
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = async (destLoc: any) => {
    try {
      // Get initial position
      const initialPos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const startCoords = {
        latitude: initialPos.coords.latitude,
        longitude: initialPos.coords.longitude,
      };

      setProviderCoords(startCoords);
      setProviderBearing(initialPos.coords.heading || 0);

      // Compute initial route
      await fetchRoute(startCoords, {
        latitude: destLoc.pickupLatitude,
        longitude: destLoc.pickupLongitude,
      });

      // Start background tracking if permitted
      const bgPerm = await Location.getBackgroundPermissionsAsync();
      if (bgPerm.granted) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000, // Update every 3 seconds
          distanceInterval: 5, // Or every 5 meters
          foregroundService: {
            notificationTitle: 'CampusServ Navigation',
            notificationBody: 'Tracking your location for active task.',
            notificationColor: colors.primary,
          },
        });
      }

      // Start foreground tracking listener
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (location) => {
          handleProviderLocationUpdate(location, destLoc);
        }
      );

      // Setup geofencing
      if (bgPerm.granted) {
        await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [
          {
            identifier: `task-${taskId}-destination`,
            latitude: destLoc.pickupLatitude,
            longitude: destLoc.pickupLongitude,
            radius: 50, // 50 meters geofence radius
            notifyOnEnter: true,
            notifyOnExit: false,
          },
        ]);
      }

    } catch (e) {
      console.warn('startLocationTracking error:', e);
    }
  };

  const stopLocationTracking = async () => {
    try {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
      const isLocTracking = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (isLocTracking) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
      const isGeofencing = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
      if (isGeofencing) {
        await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      }
    } catch (e) {
      console.warn('stopLocationTracking error:', e);
    }
  };

  const handleProviderLocationUpdate = async (location: Location.LocationObject, destLoc: any) => {
    const coords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    setProviderCoords(coords);
    setProviderBearing(location.coords.heading || 0);

    // Stream over WebSocket
    if (user) {
      stompClient.sendMessage('/app/location.update', {
        task_id: taskId,
        provider_id: user.id,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: location.coords.accuracy || 1.0,
        bearing: location.coords.heading || 0.0,
        speed: location.coords.speed || 0.0,
        timestamp: new Date(location.timestamp).toISOString(),
      });
    }

    // Auto-detect Geofence locally as double insurance
    const distToDest = getHaversineDistance(
      coords.latitude,
      coords.longitude,
      destLoc.pickupLatitude,
      destLoc.pickupLongitude
    );

    if (distToDest <= 50 && !arrived) {
      handleArrival();
    }
  };

  const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLam = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) * Math.sin(dLam / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // returns distance in meters
  };

  const recalculateRoute = async () => {
    if (!providerCoords || !requestLocation) return;
    await fetchRoute(providerCoords, {
      latitude: requestLocation.pickupLatitude,
      longitude: requestLocation.pickupLongitude,
    });
  };

  const fetchRoute = async (start: any, dest: any) => {
    try {
      // Choose driving/walking mode based on distance
      const distKm = getHaversineDistance(start.latitude, start.longitude, dest.latitude, dest.longitude) / 1000;
      const mode = distKm > 2.0 ? 'driving' : 'walking';

      const directions = await getDirections(
        start.latitude,
        start.longitude,
        dest.latitude,
        dest.longitude,
        mode
      );

      setRoutePolyline(directions.polyline);
      setEtaText(`${Math.round(directions.durationSeconds / 60)} min`);
      
      const distM = directions.distanceMeters;
      setDistanceText(distM >= 1000 ? `${(distM / 1000).toFixed(1)} km` : `${distM} m`);
      setSteps(directions.steps);

      // Decode polyline points
      const points = decodePolyline(directions.polyline);
      setRoutePoints(points);

      // Fit map camera to route
      setTimeout(() => {
        mapRef.current?.fitToCoordinates([start, dest], {
          edgePadding: { top: 80, right: 50, bottom: 250, left: 50 },
          animated: true,
        });
      }, 500);

    } catch (e) {
      console.warn('Failed to fetch navigation directions:', e);
    }
  };

  // Decode Google Overview Polyline
  const decodePolyline = (t: string) => {
    let points = [];
    let index = 0,
      len = t.length;
    let lat = 0,
      lng = 0;
    while (index < len) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = t.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;
      shift = 0;
      result = 0;
      do {
        b = t.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;
      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  };

  const handleArrival = async () => {
    if (arrived) return;
    setArrived(true);
    await stopLocationTracking();
    
    // Notify server of arrival
    await notifyProviderArrived(taskId);

    setArrivedDialogVisible(true);
  };

  const handleCall = () => {
    if (!requesterPhone) {
      showToast({ status: 'error', title: 'Phone Unavailable', subtitle: 'Requester phone number is not available.' });
      return;
    }
    Linking.openURL(`tel:${requesterPhone}`);
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Setting up navigation route...</Text>
      </View>
    );
  }

  if (networkError || !requestLocation) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="location-outline" size={48} color={colors.textMuted} style={{ marginBottom: 16 }} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          {networkError ? 'Connection Error' : 'No GPS Data'}
        </Text>
        <Text style={[styles.errorDesc, { color: colors.textMuted }]}>
          {networkError ? 'Failed to load navigation data.' : 'No precise GPS location provided for this request.'}
        </Text>
        {networkError ? (
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={initNavigation}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.goBack()}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* ── Top Directions Indicator ── */}
      <View style={[styles.topBanner, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <View style={styles.etaBox}>
          <Text style={[styles.etaText, { color: colors.primary }]}>{etaText}</Text>
          <Text style={[styles.distanceText, { color: colors.text }]}>{distanceText}</Text>
        </View>
        <View style={styles.addressBox}>
          <Ionicons name="basket-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.addressText, { color: colors.textMuted }]} numberOfLines={1}>
            Deliver to: {requestLocation.pickupAddress}
          </Text>
        </View>
      </View>

      {/* ── Google Map View ── */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          showsUserLocation={false} // Custom marker is utilized to indicate bearing
          initialRegion={{
            latitude: providerCoords?.latitude || requestLocation.pickupLatitude,
            longitude: providerCoords?.longitude || requestLocation.pickupLongitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        >
          {/* Destination Marker */}
          <Marker
            coordinate={{
              latitude: requestLocation.pickupLatitude,
              longitude: requestLocation.pickupLongitude,
            }}
            title="Destination"
            description={requestLocation.pickupAddress}
          >
            <View style={styles.destMarkerWrap}>
              <Ionicons name="home" size={20} color="#FFF" />
            </View>
          </Marker>

          {/* Live Provider Marker (bearing arrow style) */}
          {providerCoords && (
            <Marker
              coordinate={providerCoords}
              flat
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.providerMarkerWrap, { transform: [{ rotate: `${providerBearing}deg` }] }]}>
                <Ionicons name="navigate" size={26} color={colors.primary} />
              </View>
            </Marker>
          )}

          {/* Navigation route line */}
          {routePoints.length > 0 && (
            <Polyline
              coordinates={routePoints}
              strokeColor={colors.primary}
              strokeWidth={5}
            />
          )}
        </MapView>
      </View>

      {/* ── Turn-by-Turn Instruction Slider ── */}
      {steps.length > 0 && !arrived && (
        <View style={styles.stepsCarouselContainer}>
          <FlatList
            ref={stepsListRef}
            data={steps}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item, index }) => (
              <View style={[styles.stepCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <View style={styles.stepHeader}>
                  <Ionicons name="arrow-redo-circle" size={22} color={colors.primary} />
                  <Text style={[styles.stepIndex, { color: colors.textMuted }]}>
                    Step {index + 1} of {steps.length}
                  </Text>
                </View>
                {/* instructions can contain HTML tags, strip them for clean TSX render */}
                <Text style={[styles.stepInstruction, { color: colors.text }]} numberOfLines={2}>
                  {item.instruction.replace(/<[^>]*>/g, '')}
                </Text>
                <Text style={[styles.stepDistance, { color: colors.textMuted }]}>
                  ({item.distance})
                </Text>
              </View>
            )}
          />
        </View>
      )}

      {/* ── Bottom Sheet Controls ── */}
      <View style={[styles.bottomSheet, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={styles.riderProfileRow}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="person" size={22} color={colors.primary} />
          </View>
          <View style={styles.riderInfo}>
            <Text style={[styles.riderName, { color: colors.text }]}>{requesterName}</Text>
            {requestLocation.pickupLandmark ? (
              <Text style={[styles.landmarkHint, { color: colors.textMuted }]} numberOfLines={2}>
                📝 {requestLocation.pickupLandmark}
              </Text>
            ) : (
              <Text style={[styles.landmarkHint, { color: colors.textMuted }]}>No landmark hints</Text>
            )}
          </View>
        </View>

        <View style={styles.controlRow}>
          <TouchableOpacity style={[styles.callBtn, { backgroundColor: colors.inputBackground }]} onPress={handleCall}>
            <Ionicons name="call" size={20} color={colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.chatBtn, { backgroundColor: colors.inputBackground }]}
            onPress={() => navigation.navigate('Chat', { requestId })}
          >
            <Ionicons name="chatbubbles" size={20} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.arriveBtn, { backgroundColor: arrived ? colors.success : colors.primary }]}
            onPress={handleArrival}
            disabled={arrived}
          >
            <Text style={styles.arriveBtnText}>{arrived ? 'Arrived!' : "I've Arrived"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <StatusDialog
        visible={arrivedDialogVisible}
        status="success"
        title="You've Arrived!"
        description="You have entered the 50-meter pickup zone. Let the Requester know you're here."
        confirmLabel="Send Message Suggestion"
        cancelLabel="OK"
        onConfirm={() => {
          setArrivedDialogVisible(false);
          navigation.replace('Chat', {
            requestId: requestId,
            prefilledMessage: 'Hi! I\'m here. 🙂',
          });
        }}
        onCancel={() => setArrivedDialogVisible(false)}
        onClose={() => setArrivedDialogVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '600' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorTitle: { fontSize: 18, fontWeight: '800' },
  errorDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  retryBtn: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8, marginTop: 10 },
  retryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  topBanner: {
    padding: 16,
    borderBottomWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    zIndex: 10,
  },
  etaBox: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 },
  etaText: { fontSize: 24, fontWeight: '900' },
  distanceText: { fontSize: 16, fontWeight: '700' },
  addressBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressText: { fontSize: 12, fontWeight: '600', flex: 1 },

  mapContainer: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  
  destMarkerWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#FFF',
    borderWidth: 2,
    elevation: 4,
  },
  providerMarkerWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepsCarouselContainer: {
    position: 'absolute',
    bottom: 170,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 10,
  },
  stepCard: {
    width: SCREEN_WIDTH - 40,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    height: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  stepIndex: { fontSize: 11, fontWeight: '600' },
  stepInstruction: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  stepDistance: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  bottomSheet: {
    padding: 20,
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  riderProfileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  riderInfo: { flex: 1 },
  riderName: { fontSize: 15, fontWeight: '800' },
  landmarkHint: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  controlRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  callBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chatBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  arriveBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  arriveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
