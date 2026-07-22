import { api, BASE_URL } from './api';
import ENV from '../config/env';

const GOOGLE_MAPS_API_KEY = ENV.googleMapsApiKey || 'mock-key-for-development';

export interface ReverseGeocodeResponse {
  address: string;
  placeId: string;
}

export interface PlaceSuggestion {
  description: string;
  placeId: string;
}

export interface DirectionsResponse {
  polyline: string;
  durationSeconds: number;
  distanceMeters: number;
  steps: Array<{
    instruction: string;
    distance: string;
  }>;
}

export interface DistanceMatrixResponse {
  distanceText: string;
  durationText: string;
  distanceValue: number;
  durationValue: number;
}

export interface RequestLocation {
  id?: string;
  requestId?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  pickupAddress: string;
  pickupPlaceId?: string;
  pickupLandmark?: string;
  locationMethod?: 'auto_gps' | 'manual_pin' | 'search';
  pickupConfirmedAt?: string;
  isLocked?: boolean;
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResponse | null> {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
    console.warn('[locationService] reverseGeocode: invalid coordinates', { lat, lng });
    return null;
  }

  if (GOOGLE_MAPS_API_KEY === 'mock-key-for-development') {
    return {
      address: 'Unity Hall, KNUST, Kumasi',
      placeId: 'mock-place-unity-hall'
    };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=premise|establishment|point_of_interest&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'OK' && data.results.length > 0) {
      return {
        address: data.results[0].formatted_address,
        placeId: data.results[0].place_id
      };
    }
    return null;
  } catch (error: any) {
    console.error('[locationService] reverseGeocode failed', error);
    return null;
  }
}

export async function placesAutocomplete(input: string): Promise<PlaceSuggestion[]> {
  if (!input || !input.trim()) return [];

  if (GOOGLE_MAPS_API_KEY === 'mock-key-for-development') {
    return [
      { description: 'KNUST SRC Building, Kumasi', placeId: 'mock-place-src' },
      { description: 'Unity Hall Gate, Kumasi', placeId: 'mock-place-unity' },
      { description: 'Ayeduase Gate, Kumasi', placeId: 'mock-place-ayeduase' },
      { description: 'Adum Shopping Center, Kumasi', placeId: 'mock-place-adum' }
    ];
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&location=6.6741,-1.5726&radius=10000&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'OK' && data.predictions) {
      return data.predictions.map((p: any) => ({
        description: p.description,
        placeId: p.place_id
      }));
    }
    return [];
  } catch (error: any) {
    console.error('locationService: placesAutocomplete failed', error);
    return [];
  }
}

export async function getPlaceDetails(placeId: string): Promise<{ latitude: number; longitude: number }> {
  if (GOOGLE_MAPS_API_KEY === 'mock-key-for-development') {
    if (placeId === 'mock-place-src') return { latitude: 6.6735, longitude: -1.5710 };
    if (placeId === 'mock-place-unity') return { latitude: 6.6745, longitude: -1.5728 };
    if (placeId === 'mock-place-ayeduase') return { latitude: 6.6690, longitude: -1.5680 };
    return { latitude: 6.6741, longitude: -1.5726 };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'OK' && data.result?.geometry?.location) {
      return {
        latitude: data.result.geometry.location.lat,
        longitude: data.result.geometry.location.lng
      };
    }
    return { latitude: 6.6741, longitude: -1.5726 };
  } catch (error: any) {
    console.error('locationService: getPlaceDetails failed', error);
    return { latitude: 6.6741, longitude: -1.5726 };
  }
}

export async function getDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  mode: 'walking' | 'driving' = 'walking'
): Promise<DirectionsResponse> {
  const fallback = {
    polyline: 'a~l~Fjk~uOwpo@rqc',
    durationSeconds: 360,
    distanceMeters: 600,
    steps: [{ instruction: 'Head toward destination directly.', distance: '600 m' }]
  };

  if (GOOGLE_MAPS_API_KEY === 'mock-key-for-development') {
    return fallback;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'OK' && data.routes?.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];
      return {
        polyline: route.overview_polyline.points,
        durationSeconds: leg.duration.value,
        distanceMeters: leg.distance.value,
        steps: leg.steps.map((s: any) => ({
          instruction: s.html_instructions,
          distance: s.distance?.text || ''
        }))
      };
    }
    return fallback;
  } catch (error: any) {
    console.error('locationService: getDirections failed', error);
    return fallback;
  }
}

export async function getDistanceMatrix(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  mode: 'walking' | 'driving' = 'walking'
): Promise<DistanceMatrixResponse> {
  const fallback = {
    distanceText: '450 m',
    durationText: '6 mins',
    distanceValue: 450,
    durationValue: 360
  };

  if (GOOGLE_MAPS_API_KEY === 'mock-key-for-development') {
    return fallback;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=${mode}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'OK' && data.rows?.length > 0 && data.rows[0].elements?.length > 0) {
      const el = data.rows[0].elements[0];
      if (el.status === 'OK') {
        return {
          distanceText: el.distance.text,
          durationText: el.duration.text,
          distanceValue: el.distance.value,
          durationValue: el.duration.value
        };
      }
    }
    return fallback;
  } catch (error: any) {
    console.error('locationService: getDistanceMatrix failed', error);
    return fallback;
  }
}

export async function getRequestLocation(requestId: string): Promise<RequestLocation | null> {
  if (!requestId) return null;
  try {
    const response = await api.get(`/requests/${requestId}/location`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    console.warn('[locationService] getRequestLocation unavailable for request:', requestId, error?.message || error);
    return null;
  }
}

export async function updateRequestLocation(requestId: string, data: RequestLocation): Promise<RequestLocation> {
  try {
    const response = await api.put(`/requests/${requestId}/location`, data);
    return response.data;
  } catch (error: any) {
    console.error('locationService: updateRequestLocation failed', error);
    throw error;
  }
}

export function getStaticMapUrl(lat: number, lng: number, zoom = 15, size = '600x300'): string {
  if (GOOGLE_MAPS_API_KEY === 'mock-key-for-development') {
    return 'https://via.placeholder.com/600x300.png?text=Mock+Map';
  }
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&markers=color:red|${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
}

export async function getDistanceEstimate(requestId: string, lat: number, lng: number): Promise<{
  distanceText: string;
  durationText: string;
  distanceValue: number;
  durationValue: number;
  mode: 'walking' | 'driving';
}> {
  const fallback = {
    distanceText: '400 m',
    durationText: '5 mins',
    distanceValue: 400,
    durationValue: 300,
    mode: 'walking' as const,
  };

  try {
    const response = await api.get(`/requests/${requestId}/distance-estimate`, {
      params: { lat, lng }
    });
    // Ensure mode is present (server adds it, but guard for older responses)
    return { ...fallback, ...response.data };
  } catch (error: any) {
    const status = error.response?.status;
    if (status === 404 || status === 422) {
      // 404 = request not found, 422 = no pickup coordinates yet — both expected, silent
    } else {
      console.error(
        `locationService: getDistanceEstimate failed [${status ?? 'network'}] for request ${requestId}:`,
        error.response?.data ?? error.message
      );
    }
    return fallback;
  }
}

export async function notifyProviderArrived(taskId: string): Promise<void> {
  try {
    await api.post(`/location/task/${taskId}/arrive`);
  } catch (error: any) {
    console.error('locationService: notifyProviderArrived failed', error);
  }
}
