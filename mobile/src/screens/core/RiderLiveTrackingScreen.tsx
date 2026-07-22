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
  Image,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { getDirections, getRequestLocation } from '../../services/locationService';
import { stompClient } from '../../services/socket';
import { api } from '../../services/api';
import { useToast } from '../../styles/ToastContext';
import StatusDialog from '../../components/StatusDialog';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RiderLiveTrackingScreen({ route, navigation }: any) {
  const { taskId, requestId } = route.params;
  const { colors, isDark } = useTheme();
  const { accessToken } = useAuthStore();

  const [requestLocation, setRequestLocation] = useState<any>(null);
  const [providerCoords, setProviderCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [providerBearing, setProviderBearing] = useState(0);
  const [routePoints, setRoutePoints] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [etaText, setEtaText] = useState('...');
  const [distanceText, setDistanceText] = useState('...');
  
  const [providerName, setProviderName] = useState('Provider');
  const [providerPhone, setProviderPhone] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [arrived, setArrived] = useState(false);
  const [almostThere, setAlmostThere] = useState(false);
  const [signalLostText, setSignalLostText] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  
  const { showToast } = useToast();
  const [completeDialogVisible, setCompleteDialogVisible] = useState(false);

  const mapRef = useRef<MapView>(null);
  const providerMarkerRef = useRef<any>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const socketSubscriptionRef = useRef<string | null>(null);
  const timeoutCheckerRef = useRef<any>(null);

  useEffect(() => {
    initTracking();

    // Start checking for provider offline timeouts every 10 seconds
    timeoutCheckerRef.current = setInterval(() => {
      checkProviderTimeout();
    }, 10000);

    return () => {
      if (socketSubscriptionRef.current) {
        stompClient.unsubscribe(socketSubscriptionRef.current);
      }
      if (timeoutCheckerRef.current) {
        clearInterval(timeoutCheckerRef.current);
      }
    };
  }, []);

  const initTracking = async () => {
    setLoading(true);
    setSignalLostText(null);
    try {
      // 1. Fetch exact request location details
      const loc = await getRequestLocation(requestId);
      setRequestLocation(loc);

      // 2. Fetch Provider details (name, phone)
      try {
        const jobDetails = await api.get(`/jobs/${taskId}`);
        const providerId = jobDetails.data.providerId;
        const providerRes = await api.get(`/users/${providerId}`);
        setProviderName(providerRes.data.fullName || 'Provider');
        setProviderPhone(providerRes.data.phoneNumber || '');
      } catch (err) {
        console.warn('Failed to fetch provider details:', err);
      }

      // 3. Connect and subscribe to WebSocket topic
      if (accessToken) {
        stompClient.connect(accessToken, () => {
          subscribeToLiveLocation();
        });
      }

    } catch (e) {
      console.error('initTracking error', e);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToLiveLocation = () => {
    const topic = `/topic/task/${taskId}/provider-location`;
    console.log(`Subscribing to live tracking topic: ${topic}`);
    
    socketSubscriptionRef.current = stompClient.subscribe(topic, (msg) => {
      // Handle coordinate updates or arrival alerts
      if (msg.type === 'PROVIDER_ARRIVED') {
        setArrived(true);
        setAlmostThere(false);
        setEtaText('Arrived');
        setDistanceText('0 m');
        return;
      }

      const { latitude, longitude, bearing } = msg;
      
      // Update marker coordinates and rotation
      const coords = { latitude, longitude };
      setProviderCoords(coords);
      setProviderBearing(bearing || 0);
      lastUpdateRef.current = Date.now();
      setSignalLostText(null);

      // Recalculate route polyline & ETA from provider to destination
      if (requestLocation) {
        updateRouteAndETA(coords, {
          latitude: requestLocation.pickupLatitude,
          longitude: requestLocation.longitude || requestLocation.pickupLongitude,
        });
      }
    });
  };

  const updateRouteAndETA = async (start: any, dest: any) => {
    try {
      const distM = getHaversineDistance(start.latitude, start.longitude, dest.latitude, dest.longitude);
      const mode = distM > 2000 ? 'driving' : 'walking';

      const directions = await getDirections(start.latitude, start.longitude, dest.latitude, dest.longitude, mode);
      setEtaText(`${Math.round(directions.durationSeconds / 60)} min`);
      setDistanceText(distM >= 1000 ? `${(distM / 1000).toFixed(1)} km` : `${Math.round(distM)} m`);
      
      // Update polyline points
      const points = decodePolyline(directions.polyline);
      setRoutePoints(points);

      // Trigger "almost there" when within 100 meters
      if (distM <= 100) {
        setAlmostThere(true);
      } else {
        setAlmostThere(false);
      }

      // Smoothly animate the map camera to fit both points
      mapRef.current?.fitToCoordinates([start, dest], {
        edgePadding: { top: 80, right: 50, bottom: 200, left: 50 },
        animated: true,
      });

    } catch (e) {
      console.warn('Failed to update live directions:', e);
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

    return R * c;
  };

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

  const checkProviderTimeout = () => {
    if (arrived) return;
    const timeSinceLastUpdate = Date.now() - lastUpdateRef.current;
    
    if (timeSinceLastUpdate >= 300000) { // 5 minutes
      setSignalLostText("Contact lost. Location stream paused.");
      // Flag task internally or hide countdown
      setEtaText('--');
    } else if (timeSinceLastUpdate >= 120000) { // 2 minutes
      setSignalLostText("We've lost contact with your provider. They may be in a low-signal area. Try calling them.");
    } else if (timeSinceLastUpdate >= 30000) { // 30 seconds
      const minutesAgo = Math.round(timeSinceLastUpdate / 60000);
      setSignalLostText(`Provider signal lost. Last seen ${minutesAgo === 0 ? 'recently' : `${minutesAgo}m ago`}.`);
    } else {
      setSignalLostText(null);
    }
  };

  const handleConfirmCompletion = async () => {
    setCompleteDialogVisible(true);
  };

  const handleCall = () => {
    if (!providerPhone) {
      showToast({ status: 'error', title: 'Phone Unavailable', subtitle: 'Provider phone number is not available.' });
      return;
    }
    Linking.openURL(`tel:${providerPhone}`);
  };

  if (loading || !requestLocation) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Initializing live tracker...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* ── Top Status Bar ── */}
      <View style={[styles.topBanner, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <View style={styles.etaBox}>
          {arrived ? (
            <Text style={[styles.etaText, { color: colors.success }]}>Provider Has Arrived!</Text>
          ) : (
            <>
              <Text style={[styles.etaText, { color: colors.primary }]}>{etaText}</Text>
              <Text style={[styles.distanceText, { color: colors.text }]}>({distanceText})</Text>
            </>
          )}
        </View>
        <Text style={[styles.bannerSubtext, { color: colors.textMuted }]}>
          {arrived ? 'Handoff your items and click complete.' : 'Your provider is on the way.'}
        </Text>
      </View>

      {/* ── Active Warning Alerts ── */}
      {signalLostText && (
        <View style={[styles.alertBanner, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
          <Ionicons name="wifi-outline" size={16} color={colors.error} style={{ marginRight: 8 }} />
          <Text style={[styles.alertText, { color: colors.error }]}>{signalLostText}</Text>
        </View>
      )}

      {almostThere && !arrived && (
        <View style={[styles.alertBanner, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <Ionicons name="flash" size={16} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.alertText, { color: colors.primary }]}>⚡ Your provider is almost there!</Text>
        </View>
      )}

      {arrived && (
        <View style={[styles.alertBanner, { backgroundColor: colors.successLight, borderColor: colors.success }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} style={{ marginRight: 8 }} />
          <Text style={[styles.alertText, { color: colors.success }]}>📍 Your provider is at the pickup location!</Text>
        </View>
      )}

      {/* ── Interactive Google Map ── */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          showsUserLocation={true} // pulses blue dot for requester location
          initialRegion={{
            latitude: requestLocation.pickupLatitude,
            longitude: requestLocation.pickupLongitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        >
          {/* Static Destination Pin */}
          <Marker
            coordinate={{
              latitude: requestLocation.pickupLatitude,
              longitude: requestLocation.pickupLongitude,
            }}
            title="Pickup Location"
            description={requestLocation.pickupAddress}
          >
            <View style={styles.destMarkerWrap}>
              <Ionicons name="flag" size={18} color="#FFF" />
            </View>
          </Marker>

          {/* Live Animating Provider Marker */}
          {providerCoords && (
            <Marker
              ref={providerMarkerRef}
              coordinate={providerCoords}
              flat
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.scooterMarkerWrap, { transform: [{ rotate: `${providerBearing}deg` }] }]}>
                {/* Custom provider vehicle icon */}
                <Ionicons name="bicycle" size={24} color="#FFF" />
              </View>
            </Marker>
          )}

          {/* Route polyline */}
          {routePoints.length > 0 && (
            <Polyline
              coordinates={routePoints}
              strokeColor={colors.primary}
              strokeWidth={5}
            />
          )}
        </MapView>
      </View>

      {/* ── Bottom Sheet Profile card ── */}
      <View style={[styles.bottomSheet, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={styles.providerProfileRow}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="bicycle" size={22} color={colors.primary} />
          </View>
          <View style={styles.providerInfo}>
            <Text style={[styles.providerName, { color: colors.text }]}>{providerName}</Text>
            <Text style={[styles.providerSub, { color: colors.textMuted }]}>Fulfilling your CampusServ request</Text>
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

          {arrived ? (
            <TouchableOpacity
              style={[styles.completeBtn, { backgroundColor: colors.success }]}
              onPress={handleConfirmCompletion}
              disabled={completing}
            >
              {completing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.completeBtnText}>Confirm & Complete</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={[styles.statusIndicator, { backgroundColor: colors.inputBackground }]}>
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.statusIndicatorText, { color: colors.text }]}>Provider Driving</Text>
            </View>
          )}
        </View>
      </View>

      <StatusDialog
        visible={completeDialogVisible}
        status="warning"
        title="Confirm Completion"
        description="Are you sure the provider has completed this service? This will release funds from escrow to the provider."
        confirmLabel="Confirm & Complete"
        cancelLabel="Cancel"
        onConfirm={async () => {
          setCompleteDialogVisible(false);
          setCompleting(true);
          try {
            await api.put(`/jobs/${taskId}/complete`, null, {
              headers: { 'X-User-Id': useAuthStore.getState().user?.id }
            });
            showToast({ status: 'success', title: 'Job Completed!', subtitle: 'Thank you for using CampusServ.' });
            setTimeout(() => navigation.popToTop(), 1500);
          } catch (err: any) {
            showToast({ status: 'error', title: 'Error', subtitle: err.response?.data || 'Failed to complete job.' });
          } finally {
            setCompleting(false);
          }
        }}
        onCancel={() => setCompleteDialogVisible(false)}
        onClose={() => setCompleteDialogVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '600' },

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
  etaBox: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 2 },
  etaText: { fontSize: 24, fontWeight: '900' },
  distanceText: { fontSize: 15, fontWeight: '600' },
  bannerSubtext: { fontSize: 13, fontWeight: '600' },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  alertText: { fontSize: 12, fontWeight: '700', flex: 1 },

  mapContainer: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },

  destMarkerWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00C853',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#FFF',
    borderWidth: 2,
    elevation: 4,
  },
  scooterMarkerWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2979FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#FFF',
    borderWidth: 2,
    elevation: 6,
  },

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
  providerProfileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 15, fontWeight: '800' },
  providerSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },

  controlRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  callBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chatBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  completeBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  completeBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  
  statusIndicator: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIndicatorText: { fontSize: 14, fontWeight: '700' },
});
