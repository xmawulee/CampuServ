import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, Image, Linking, RefreshControl
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { getDirections } from '../../services/locationService';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import ImageViewerModal from '../../components/ImageViewerModal';
import { api, BASE_URL } from '../../services/api';
import type { ProviderJob } from '../../types/provider';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../styles/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../styles/ToastContext';
import ChatScreen from '../chat/ChatScreen';
import { stompClient } from '../../services/socket';
import CompletionCodeClientModal from '../../components/CompletionCodeClientModal';
import CompletionCodeEntryModal from '../../components/CompletionCodeEntryModal';

// Status steps for on-site jobs (code-exchange based)
const STATUS_STEPS_ONSITE = ['ACCEPTED', 'IN_PROGRESS', 'AWAITING_CODE', 'COMPLETED'];
// Status steps for remote jobs (proof-review based)
const STATUS_STEPS_REMOTE = ['ACCEPTED', 'IN_PROGRESS', 'PROOF_SUBMITTED', 'COMPLETED'];

export default function ActiveJobScreen({ navigation, route }: any) {
  const { jobId } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, accessToken } = useAuthStore();
  const { showToast } = useToast();

  const [job, setJob] = useState<ProviderJob | null>(null);
  const [loading, setLoading] = useState(true);

  const [startingJob, setStartingJob] = useState(false);
  const [markingFinished, setMarkingFinished] = useState(false);
  const [confirmingJob, setConfirmingJob] = useState(false);

  const [showClientModal, setShowClientModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [completionCode, setCompletionCode] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [checkingReview, setCheckingReview] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providerLocation, setProviderLocation] = useState<Location.LocationObject | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number, longitude: number }[]>([]);

  const fetchJob = useCallback(async () => {
    setCheckingReview(true);
    try {
      const res = await api.get(`/jobs/${jobId}`);
      setJob(res.data);
      if (res.data && res.data.completionCode) {
        setCompletionCode(res.data.completionCode);
      }
      if (res.data && res.data.status === 'COMPLETED' && user?.id === res.data.requesterId) {
        try {
          const revs = await api.get(`/reviews/job/${jobId}`);
          const reviewed = (revs.data || []).some((r: any) => r.direction === 'REQUESTER_TO_PROVIDER');
          setHasReviewed(reviewed);
        } catch (err) {
          console.warn("Failed to check if job is reviewed:", err);
        }
      }
    } catch {
    } finally {
      setCheckingReview(false);
      setLoading(false);
    }
  }, [jobId, user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJob();
    setRefreshing(false);
  }, [fetchJob]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchJob();
    }, [fetchJob])
  );

  useEffect(() => {
    (async () => {
      if (job?.serviceMode !== 'REMOTE' && job?.locationLat && job?.locationLng) {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        let location = await Location.getCurrentPositionAsync({});
        setProviderLocation(location);

        try {
          const decodePolyline = (t: string) => {
            let points = [];
            let index = 0, len = t.length;
            let lat = 0, lng = 0;
            while (index < len) {
              let b, shift = 0, result = 0;
              do {
                b = t.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
              } while (b >= 0x20);
              let dlat = result & 1 ? ~(result >> 1) : result >> 1;
              lat += dlat;
              shift = 0; result = 0;
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

          const directions = await getDirections(
            location.coords.latitude, location.coords.longitude,
            job.locationLat, job.locationLng
          );
          setRouteCoordinates(decodePolyline(directions.polyline));
        } catch (e) {
          console.error("Failed to get directions", e);
        }
      }
    })();
  }, [job?.locationLat, job?.locationLng, job?.serviceMode]);

  useEffect(() => {
    let subStatusId: string | null = null;
    let subCodeId: string | null = null;

    if (job?.id && accessToken) {
      stompClient.connect(accessToken);
      
      subStatusId = stompClient.subscribe(`/topic/job.${job.id}.status`, () => {
        fetchJob();
      });

      if (user?.id === job.requesterId) {
        subCodeId = stompClient.subscribe(`/topic/user/${user.id}/completion-code`, (payload: any) => {
          if (payload && payload.jobId === job.id) {
            setCompletionCode(payload.code);
            setShowClientModal(true);
          }
        });
      }
    }

    return () => {
      if (subStatusId) stompClient.unsubscribe(subStatusId);
      if (subCodeId) stompClient.unsubscribe(subCodeId);
    };
  }, [job?.id, accessToken, user?.id, fetchJob]);

  const handleStartJob = async () => {
    setStartingJob(true);
    try {
      await api.put(`/jobs/${jobId}/start`);
      showToast({ status: 'success', title: 'Job started!', subtitle: "Client notified you're on your way." });
      fetchJob();
    } catch (e: any) {
      showToast({ status: 'error', title: e.response?.data || 'Failed to start job.' });
    } finally {
      setStartingJob(false);
    }
  };

  const handleMarkFinished = async () => {
    setMarkingFinished(true);
    try {
      await api.post(`/jobs/${jobId}/mark-complete`);
      if (job?.serviceMode === 'REMOTE') {
        showToast({ status: 'success', title: 'Proof Submitted!', subtitle: 'Waiting for the client to review and release payment.' });
        fetchJob();
      } else {
        showToast({ status: 'success', title: 'Awaiting Code!', subtitle: 'Ask the client for their 6-digit code.' });
        fetchJob();
        setShowProviderModal(true);
      }
    } catch (e: any) {
      showToast({ status: 'error', title: e.response?.data || 'Failed to mark complete.' });
    } finally {
      setMarkingFinished(false);
    }
  };

  /** Client releases payment for a remote job after reviewing proof. */
  const handleReleasePayment = async () => {
    setConfirmingJob(true);
    try {
      // For remote jobs, client directly confirms completion (no code needed)
      await api.put(`/jobs/${jobId}/complete`);
      showToast({ status: 'success', title: 'Payment Released!', subtitle: 'The provider has been paid. Thank you!' });
      fetchJob();
    } catch (e: any) {
      showToast({ status: 'error', title: e.response?.data || 'Failed to release payment.' });
    } finally {
      setConfirmingJob(false);
    }
  };

  const handleConfirmCompletion = async (code: string) => {
    setConfirmingJob(true);
    setCodeError(null);
    try {
      await api.post(`/jobs/${jobId}/confirm-completion`, { code });
      showToast({ status: 'success', title: 'Completed!', subtitle: 'Funds have been released to your wallet.' });
      setIsSuccess(true);
      setTimeout(() => {
        setShowProviderModal(false);
        setIsSuccess(false);
        fetchJob();
      }, 2500);
    } catch (e: any) {
      setCodeError(e.response?.data || 'Failed to confirm completion.');
    } finally {
      setConfirmingJob(false);
    }
  };

  const handleRegenerateCode = async () => {
    setRegenerating(true);
    try {
      await api.post(`/jobs/${jobId}/regenerate-code`);
      // Fetch the job again so the new plaintext code is loaded into state
      await fetchJob();
      showToast({ status: 'success', title: 'Code Regenerated', subtitle: 'Your new code is ready.' });
    } catch (e: any) {
      showToast({ status: 'error', title: e.response?.data || 'Failed to regenerate code.' });
    } finally {
      setRegenerating(false);
    }
  };

  const handleDispute = async () => {
    try {
      await api.put(`/jobs/${jobId}/dispute`, { description: 'Dispute during completion' });
      showToast({ status: 'success', title: 'Disputed', subtitle: 'Support team will review.' });
      setShowClientModal(false);
      fetchJob();
    } catch (e: any) {
      showToast({ status: 'error', title: e.response?.data || 'Failed to dispute.' });
    }
  };

  const handleOpenGoogleMaps = () => {
    if (!job?.locationLat || !job?.locationLng) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${job.locationLat},${job.locationLng}&travelmode=walking`;
    Linking.openURL(url).catch(() => {
      showToast({ status: 'error', title: 'Error', subtitle: "Couldn't open Maps — check your device's default apps" });
    });
  };

  // Auto-open the completion code modal for the student when the code is available
  useEffect(() => {
    // Only auto-open for the student (requester), not the provider
    if (job?.status === 'AWAITING_CODE' && user?.id === job?.requesterId && completionCode && !showClientModal) {
      setShowClientModal(true);
    }

    if (job?.status === 'COMPLETED' && user?.id === job?.requesterId && !checkingReview && !hasReviewed) {
      // Trigger navigation to RateProviderScreen if client
      setShowClientModal(false); // Close the modal if open
      navigation.replace('RateProvider', {
        jobId: job.id,
        providerName: job.providerName || 'Provider',
        providerId: job.providerId,
        categoryName: 'Service',
      });
    }
  }, [job?.status, user?.id, job?.providerId, job?.requesterId, completionCode, hasReviewed, checkingReview]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Job Not Found</Text>
      </View>
    );
  }

  const isProvider = user?.id === job.providerId;
  const isRemote = job.serviceMode === 'REMOTE';
  const canStart = isProvider && job.status === 'ACTIVE';
  const canMarkFinished = isProvider && ['ACTIVE', 'IN_PROGRESS'].includes(job.status);
  const isAwaitingCode = job.status === 'AWAITING_CODE' && !isRemote;
  const isProofSubmitted = job.status === 'PROOF_SUBMITTED' && isRemote;

  // Use the appropriate status steps based on service mode
  const STATUS_STEPS = isRemote ? STATUS_STEPS_REMOTE : STATUS_STEPS_ONSITE;

  // Normalize status for strip
  let currentStepIndex = 0;
  if (job.status === 'ACTIVE') currentStepIndex = 0;
  else if (job.status === 'IN_PROGRESS') currentStepIndex = 1;
  else if (job.status === 'AWAITING_CODE' || job.status === 'PROOF_SUBMITTED') currentStepIndex = 2;
  else if (job.status === 'COMPLETED') currentStepIndex = 3;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Active Job</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={styles.topSection} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Linear Status Strip */}
        <View style={styles.statusStrip}>
          {STATUS_STEPS.map((step, idx) => {
            const isActive = currentStepIndex >= idx;
            const isCurrent = currentStepIndex === idx;
            return (
              <View key={step} style={styles.stepContainer}>
                <View style={[
                  styles.stepNode,
                  { backgroundColor: isActive ? colors.primary : colors.inputBackground, borderColor: isActive ? colors.primary : colors.border }
                ]}>
                  {isActive && <Ionicons name="checkmark" size={12} color="#FFF" />}
                </View>
                {idx < STATUS_STEPS.length - 1 && (
                  <View style={[styles.stepLine, { backgroundColor: currentStepIndex > idx ? colors.primary : colors.border }]} />
                )}
                <Text style={[styles.stepText, { color: isCurrent ? colors.primary : colors.textMuted, fontWeight: isCurrent ? '800' : '500' }]} numberOfLines={1}>
                  {step.replace('_', ' ')}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {canStart && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleStartJob} disabled={startingJob}>
              {startingJob ? <ActivityIndicator color="#FFF" /> : <Text style={styles.actionBtnText}>{job.serviceMode === 'REMOTE' ? 'Start Working (Remote)' : 'Start Job (En Route)'}</Text>}
            </TouchableOpacity>
          )}
          {canMarkFinished && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success }]} onPress={handleMarkFinished} disabled={markingFinished}>
              {markingFinished ? <ActivityIndicator color="#FFF" /> : (
                <Text style={styles.actionBtnText}>
                  {isRemote ? 'Submit Proof of Completion' : 'Mark as Complete'}
                </Text>
              )}
            </TouchableOpacity>
          )}
          {/* ON-SITE: client shows their code; provider enters it */}
          {isAwaitingCode && !isProvider && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => setShowClientModal(true)}>
              <Text style={styles.actionBtnText}>Show Completion Code</Text>
            </TouchableOpacity>
          )}
          {isAwaitingCode && isProvider && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => setShowProviderModal(true)}>
              <Text style={styles.actionBtnText}>Enter Completion Code</Text>
            </TouchableOpacity>
          )}
          {/* REMOTE: client reviews proof and releases payment */}
          {isProofSubmitted && !isProvider && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10B981' }]} onPress={handleReleasePayment} disabled={confirmingJob}>
              {confirmingJob ? <ActivityIndicator color="#FFF" /> : <Text style={styles.actionBtnText}>✓ Review & Release Payment</Text>}
            </TouchableOpacity>
          )}
          {isProofSubmitted && !isProvider && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444', marginTop: 6 }]} onPress={() => navigation.navigate('RaiseDispute', { jobId: job.id })}>
              <Text style={styles.actionBtnText}>Raise Dispute</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Job Details Section */}
        {isProvider && (
          <View style={[styles.jobDetailsCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>Job Details</Text>

            {job.requestTitle && (
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
                {job.requestTitle}
              </Text>
            )}

            {job.requestDescription && (
              <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 12, lineHeight: 20 }}>
                {job.requestDescription}
              </Text>
            )}

            {job.requesterName && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="person-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>
                  Client: {job.requesterName}
                </Text>
              </View>
            )}

            {job.categoryName && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="grid-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>
                  Category: {job.categoryName}
                </Text>
              </View>
            )}

            {job.agreedPrice !== undefined && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="pricetag-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
                  {Number(job.agreedPrice).toFixed(2)} GHS
                </Text>
              </View>
            )}
            
            {job.attachmentUrls && job.attachmentUrls.length > 0 && (
              <ScrollView horizontal style={styles.photosContainer} showsHorizontalScrollIndicator={false}>
                {job.attachmentUrls.map((url: string, idx: number) => {
                  const fullUrl = url.startsWith('/') ? `${BASE_URL}${url}` : url;
                  return (
                    <TouchableOpacity key={idx} onPress={() => setSelectedImage(fullUrl)} activeOpacity={0.8}>
                      <Image source={{ uri: fullUrl }} style={styles.thumbnail} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {job.serviceMode === 'REMOTE' ? (
              <View style={[styles.remoteNoteCard, { backgroundColor: colors.inputBackground }]}>
                <Text style={[styles.remoteNoteTitle, { color: colors.text }]}>Client's Instructions:</Text>
                <Text style={[styles.remoteNoteText, { color: colors.text }]}>{job.remoteInfo || 'No additional instructions provided.'}</Text>
              </View>
            ) : (
              <View>
                {job.locationHint && (
                  <TouchableOpacity 
                    style={[styles.hintCard, { backgroundColor: colors.inputBackground }]}
                    onPress={isProvider ? handleOpenGoogleMaps : undefined}
                    activeOpacity={isProvider ? 0.8 : 1}
                  >
                    <Text style={[styles.hintText, { color: colors.text }]}>📍 {job.locationHint}</Text>
                  </TouchableOpacity>
                )}

                {isProvider && job.locationLat && job.locationLng && (
                  <TouchableOpacity 
                    style={[styles.mapsBtn, { borderColor: colors.border }]} 
                    onPress={handleOpenGoogleMaps}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="map-outline" size={18} color={colors.primary} />
                    <Text style={[styles.mapsBtnText, { color: colors.primary }]}>Get Directions (Google Maps)</Text>
                  </TouchableOpacity>
                )}

                {job.locationLat && job.locationLng && (
                  <View style={styles.mapContainer}>
                    <MapView
                      style={styles.map}
                      initialRegion={{
                        latitude: providerLocation ? (providerLocation.coords.latitude + job.locationLat) / 2 : job.locationLat,
                        longitude: providerLocation ? (providerLocation.coords.longitude + job.locationLng) / 2 : job.locationLng,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                      }}
                    >
                      <Marker coordinate={{ latitude: job.locationLat, longitude: job.locationLng }} title="Client Location" pinColor="red" />
                      {providerLocation && (
                        <Marker coordinate={{ latitude: providerLocation.coords.latitude, longitude: providerLocation.coords.longitude }} title="Your Location" pinColor="blue" />
                      )}
                      {routeCoordinates.length > 0 && (
                        <Polyline coordinates={routeCoordinates} strokeWidth={4} strokeColor={colors.primary} />
                      )}
                    </MapView>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.chatContainer, { borderTopColor: colors.border }]}>
        {/* Pinned Chat Thread */}
        <ChatScreen route={{ params: { requestId: job.requestId } }} navigation={navigation} />
      </View>
      {/* Modals */}
      <CompletionCodeClientModal
        visible={showClientModal}
        code={completionCode}
        providerName={job.providerName}
        onClose={() => setShowClientModal(false)}
        onRegenerate={handleRegenerateCode}
        onDispute={handleDispute}
        loadingRegenerate={regenerating}
        serviceMode={job.serviceMode}
      />

      <CompletionCodeEntryModal
        visible={showProviderModal}
        agreedPrice={job.agreedPrice}
        isSuccess={isSuccess}
        onClose={() => {
          setShowProviderModal(false);
          setIsSuccess(false);
        }}
        onSubmit={handleConfirmCompletion}
        submitting={confirmingJob}
        error={codeError}
        serviceMode={job.serviceMode}
      />

      <ImageViewerModal
        visible={!!selectedImage}
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  
  topSection: { padding: 16, paddingBottom: 8 },
  statusStrip: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  stepContainer: { flex: 1, alignItems: 'center' },
  stepNode: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  stepLine: { position: 'absolute', top: 11, left: '50%', right: '-50%', height: 2, zIndex: 1 },
  stepText: { fontSize: 10, marginTop: 6, textAlign: 'center', textTransform: 'uppercase' },

  actionsContainer: { marginBottom: 8 },
  actionBtn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  jobDetailsCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  photosContainer: { flexDirection: 'row', marginBottom: 12 },
  thumbnail: { width: 80, height: 80, borderRadius: 8, marginRight: 8, backgroundColor: '#EEE' },
  remoteNoteCard: { padding: 12, borderRadius: 8 },
  remoteNoteTitle: { fontWeight: '700', fontSize: 14, marginBottom: 4 },
  remoteNoteText: { fontSize: 14, lineHeight: 20 },
  hintCard: { padding: 12, borderRadius: 8, marginBottom: 12 },
  hintText: { fontSize: 14, fontWeight: '600' },
  mapsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 12 },
  mapsBtnText: { fontSize: 15, fontWeight: '700', marginLeft: 8 },
  mapContainer: { height: 180, borderRadius: 12, overflow: 'hidden' },
  map: { width: '100%', height: '100%' },

  chatContainer: { flex: 1, borderTopWidth: 1 },
});
