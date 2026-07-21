import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
} from 'react-native';
import { api, BASE_URL } from '../../services/api';
import { getThreadForRequest } from '../../services/chatService';
import { cancelRequest } from '../../services/requestService';
import { stompClient } from '../../services/socket';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../styles/ThemeContext';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useToast } from '../../styles/ToastContext';
import StatusDialog from '../../components/StatusDialog';
import ImageViewerModal from '../../components/ImageViewerModal';
import * as Location from 'expo-location';
import { getRequestLocation, getDistanceEstimate, getStaticMapUrl } from '../../services/locationService';

export default function RequestDetailsScreen({ route, navigation }: any) {
  const { requestId } = route.params;
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  const [price, setPrice] = useState('');
  const [eta, setEta] = useState('');
  const [message, setMessage] = useState('');
  const [bidding, setBidding] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const isProvider = user?.role === 'PROVIDER';

  const [requestLocation, setRequestLocation] = useState<any>(null);
  const [distanceEstimate, setDistanceEstimate] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [startingTask, setStartingTask] = useState(false);
  const [acceptDialogVisible, setAcceptDialogVisible] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [cancellingRequest, setCancellingRequest] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const fetchRequestDetails = useCallback(async () => {
    try {
      const response = await api.get(`/requests/${requestId}`);
      setRequest(response.data);
    } catch (e) {
      showToast({ status: 'error', title: 'Load Failed', subtitle: 'Failed to load request details.' });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [requestId, navigation]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    fetchRequestDetails();
  }, [fetchRequestDetails, navigation]);

  const fetchLocationAndJob = useCallback(async () => {
    if (!requestId) return;
    setLocationLoading(true);
    try {
      if (request?.locationType !== 'REMOTE' && request?.location_type !== 'REMOTE') {
        const loc = await getRequestLocation(requestId);
        setRequestLocation(loc);
      } else {
        setRequestLocation({ pickupAddress: 'Remote / Online' } as any);
      }

      try {
        const jobRes = await api.get(`/jobs/request/${requestId}`);
        setJob(jobRes.data);
      } catch (jobErr: any) {
        if (jobErr.response?.status !== 404) {
          console.warn('Failed to fetch job details:', jobErr);
        } else {
          setJob(null);
        }
      }

      if (isProvider) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const currentPos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            const dist = await getDistanceEstimate(
              requestId,
              currentPos.coords.latitude,
              currentPos.coords.longitude
            );
            setDistanceEstimate(dist);
          }
        } catch (locErr) {
          console.warn('Failed to resolve provider distance estimate:', locErr);
        }
      }
    } catch (err) {
      console.warn('Failed to load location details:', err);
    } finally {
      setLocationLoading(false);
    }
  }, [requestId, isProvider]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRequestDetails();
    await fetchLocationAndJob();
    setRefreshing(false);
  }, [fetchRequestDetails, fetchLocationAndJob]);

  useEffect(() => {
    fetchLocationAndJob();
  }, [fetchLocationAndJob, request]);

  const handleStartTask = async () => {
    if (!job) return;
    setStartingTask(true);
    try {
      const response = await api.put(`/jobs/${job.id}/start`, null, {
        headers: { 'X-User-Id': user?.id }
      });
      setJob(response.data);
      showToast({ status: 'success', title: 'Task Started!', subtitle: 'Navigation route calculated. Please head to destination.', duration: 3000 });
      navigation.navigate("ActiveNavigation", {
        taskId: response.data.id,
        requestId: request.id,
      });
      fetchRequestDetails();
    } catch (err: any) {
      showToast({ status: 'error', title: 'Error', subtitle: err.response?.data || "Failed to start task." });
    } finally {
      setStartingTask(false);
    }
  };

  const [thread, setThread] = useState<any>(null);

  useEffect(() => {
    if (request && (request.status === 'ASSIGNED' || request.status === 'COMPLETED' || request.status === 'CANCELLED')) {
      const fetchThread = async () => {
        try {
          const threadData = await getThreadForRequest(request.id);
          setThread(threadData);
        } catch (e) {
          console.warn('Failed to fetch chat thread:', e);
        }
      };
      fetchThread();
    } else {
      setThread(null);
    }
  }, [request]);
  useEffect(() => {
    let subId = '';
    const token = useAuthStore.getState().accessToken;
    if (token) {
      try {
        stompClient.connect(token);
        const topic = `/topic/request.${requestId}.bids`;
        subId = stompClient.subscribe(topic, (msg: any) => {
          console.log('STOMP WS: New bid update for request:', msg);
          fetchRequestDetails();
        });
      } catch (e) {
        console.warn('Failed to subscribe to bids topic:', e);
      }
    }
    return () => {
      if (subId) stompClient.unsubscribe(subId);
    };
  }, [requestId, fetchRequestDetails]);

  useEffect(() => {
    if (route.params?.showToastOnMount) {
      showToast({ status: 'success', title: route.params.showToastOnMount });
      navigation.setParams({ showToastOnMount: undefined });
    }
  }, [route.params?.showToastOnMount]);

  const handleBidSubmit = async () => {
    if (!price.trim() || isNaN(Number(price))) { showToast({ status: 'error', title: 'Error', subtitle: 'Please enter a valid price.' }); return; }
    if (!eta.trim()) { showToast({ status: 'error', title: 'Error', subtitle: 'Please enter estimated time to complete (ETA).' }); return; }
    setBidding(true);
    try {
      await api.post(`/requests/${requestId}/offers`, {
        price: Number(price), eta: eta.trim(), message: message.trim(),
      });
      showToast({ status: 'success', title: 'Success', subtitle: 'Your bid has been submitted!' });
      setPrice(''); setEta(''); setMessage(''); fetchRequestDetails();
    } catch (err: any) {
      showToast({ status: 'error', title: 'Error', subtitle: err.response?.data || 'Failed to submit bid.' });
    } finally { setBidding(false); }
  };

  const handleAcceptOffer = (offerId: string) => {
    setSelectedOfferId(offerId);
    setAcceptDialogVisible(true);
  };

  const confirmAcceptOffer = async () => {
    if (!selectedOfferId) return;
    setAcceptDialogVisible(false);
    setLoading(true);
    try {
      await api.put(`/requests/${requestId}/offers/${selectedOfferId}/accept`);
      showToast({ status: 'success', title: 'Accepted!', subtitle: 'Job created. Chat with the provider.' });
      fetchRequestDetails();
    } catch (err: any) {
      showToast({ status: 'error', title: 'Error', subtitle: err.response?.data || 'Failed to accept offer.' });
      setLoading(false);
    }
  };

  const handleDeclineOffer = async (offerId: string) => {
    try {
      await api.put(`/requests/${requestId}/offers/${offerId}/decline`);
      showToast({ status: 'info', title: 'Declined', subtitle: 'The offer was declined.' });
      fetchRequestDetails();
    } catch (err: any) {
      showToast({ status: 'error', title: 'Error', subtitle: err.response?.data || 'Failed to decline offer.' });
    }
  };

  // Cancel request — only available when status is OPEN (no provider accepted yet)
  const handleCancelRequest = async () => {
    if (!request) return;
    setCancellingRequest(true);
    setCancelDialog(false);
    try {
      const token = useAuthStore.getState().accessToken || '';
      await cancelRequest(requestId, token);
      showToast({ status: 'info', title: 'Request Cancelled', subtitle: 'Your request has been cancelled and any held funds refunded.' });
      fetchRequestDetails();
    } catch (err: any) {
      showToast({ status: 'error', title: "Couldn't Cancel", subtitle: err.message || 'Something went wrong.' });
    } finally {
      setCancellingRequest(false);
    }
  };

  if (loading || !request) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isMyRequest = request.requesterId === user?.id;
  const userOffer = isProvider ? (request.offers || []).find((o: any) => o.providerId === user?.id) : null;
  const selectedOffer = request.offers?.find((o: any) => o.id === selectedOfferId);
  const offerPrice = selectedOffer ? Number(selectedOffer.price) : 0;
  const commission = offerPrice * 0.05;
  const totalCharge = offerPrice + commission;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Fixed Header ── */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Request Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
      
      {/* ── Hero Card ── */}
      <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>{request.category?.name || 'Service'}</Text>
        </View>
        <Text style={styles.heroDesc} numberOfLines={4}>{request.description}</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <View style={styles.heroStatIconWrap}>
              <Ionicons name="location" size={12} color={colors.primary} />
            </View>
            <Text style={styles.heroStatText} numberOfLines={1}>{request.location || 'Campus'}</Text>
          </View>
          <View style={styles.heroStat}>
            <View style={styles.heroStatIconWrap}>
              <Ionicons name="calendar" size={12} color={colors.primary} />
            </View>
            <Text style={styles.heroStatText}>{new Date(request.deadline).toLocaleDateString()}</Text>
          </View>
          <View style={styles.heroStat}>
            <View style={styles.heroStatIconWrap}>
              <Ionicons name="wallet" size={12} color={colors.primary} />
            </View>
            <Text style={styles.heroStatText}>{request.budget ? `${request.budget} GHS` : 'Open'}</Text>
          </View>
        </View>
      </View>

      {/* ── Status pill ── */}
      <View style={styles.statusRow}>
        <Text style={[styles.statusLabel, { color: colors.text }]}>Status</Text>
        <View style={[
          styles.statusPill,
          {
            backgroundColor: request.status === 'OPEN' ? 'rgba(16, 185, 129, 0.12)' : (request.status === 'COMPLETED' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(245, 158, 11, 0.12)'),
          }
        ]}>
          <View style={[
            styles.statusDot,
            { backgroundColor: request.status === 'OPEN' ? '#10B981' : (request.status === 'COMPLETED' ? '#3B82F6' : '#F59E0B') }
          ]} />
          <Text style={[
            styles.statusPillText,
            { color: request.status === 'OPEN' ? '#10B981' : (request.status === 'COMPLETED' ? '#3B82F6' : '#F59E0B') }
          ]}>
            {request.status}
          </Text>
        </View>
      </View>

      {/* ── Attachments ── */}
      {(request.attachments ?? []).length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Attached Photos <Text style={{ color: colors.textMuted }}>({request.attachments.length})</Text>
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {request.attachments.map((att: any) => {
              const url = att.fileUrl.startsWith('/') ? `${BASE_URL}${att.fileUrl}` : att.fileUrl;
              return (
                <TouchableOpacity key={att.id} onPress={() => setSelectedImage(url)} activeOpacity={0.85}>
                  <Image source={{ uri: url }} style={[styles.attachmentImg, { borderColor: colors.border }]} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Location & Navigation Section ── */}
      {requestLocation && (
        <View style={[styles.locationDetailsCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Service Location</Text>
          
          <View style={styles.locationDetailsRow}>
            <View style={[styles.locIconContainer, { backgroundColor: 'rgba(21, 101, 192, 0.1)' }]}>
              <Ionicons name="location" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.locationDetailsAddress, { color: colors.text }]} numberOfLines={2}>
              {requestLocation.pickupAddress}
            </Text>
          </View>

          {/* If there's an active provider landmark (released only after start task / IN_PROGRESS) */}
          {requestLocation.pickupLandmark ? (
            <View style={[styles.landmarkDetailsBox, { backgroundColor: colors.inputBackground }]}>
              <Ionicons name="information-circle" size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.landmarkDetailsText, { color: colors.text }]}>
                Landmark: "{requestLocation.pickupLandmark}"
              </Text>
            </View>
          ) : null}

          {/* Pre-bid distance and walking ETA for Provider */}
          {isProvider && distanceEstimate && (
            <View style={styles.distanceEstimateRow}>
              <Ionicons 
                name={distanceEstimate.mode === 'driving' ? 'car-outline' : 'footsteps-outline'} 
                size={16} 
                color={colors.primary} 
                style={{ marginRight: 8 }} 
              />
              <Text style={[styles.distanceEstimateText, { color: colors.text }]}>
                {distanceEstimate.mode === 'driving' ? '🚗' : '📍'} ~{distanceEstimate.distanceText} away · ~{distanceEstimate.durationText} {distanceEstimate.mode === 'driving' ? 'drive' : 'walk'}
              </Text>
            </View>
          )}

          {/* Static Map Thumbnail */}
          {requestLocation.pickupLatitude && requestLocation.pickupLongitude ? (
            <View style={styles.staticMapContainer}>
              <Image
                source={{
                  uri: getStaticMapUrl(
                    requestLocation.pickupLatitude,
                    requestLocation.pickupLongitude
                  )
                }}
                style={styles.staticMapImage}
                resizeMode="cover"
              />
            </View>
          ) : null}

          {/* Navigation Action Buttons */}
          {job && (
            <View style={styles.navigationActions}>
              <TouchableOpacity
                style={[styles.navigationBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                onPress={() => {
                  navigation.navigate("ActiveJob", {
                    jobId: job.id,
                  });
                }}
              >
                <Ionicons name="briefcase" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.navigationBtnText}>Go to Active Job Dashboard</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── Offers Section (for requester) ── */}
      {isMyRequest && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>
            Provider Bids
            <Text style={[styles.sectionCount, { color: colors.primary }]}> ({request.offers?.length || 0})</Text>
          </Text>

          {request.targetProviderId && (request.offers || []).length === 0 ? (
            <View style={[styles.emptyOffers, { backgroundColor: colors.inputBackground, borderColor: colors.accent, borderWidth: 2, borderStyle: 'dashed' }]}>
              <View style={[styles.emptyOffersIconWrap, { backgroundColor: 'rgba(255, 107, 53, 0.1)' }]}>
                <Ionicons name="person-circle-outline" size={32} color={colors.accent} />
              </View>
              <Text style={[styles.emptyOffersText, { color: colors.text }]}>
                Awaiting response from {request.targetProviderName || 'selected provider'}...
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                We have notified them of your request.
              </Text>
            </View>
          ) : (request.offers || []).length === 0 ? (
            <View style={[styles.emptyOffers, { backgroundColor: colors.inputBackground }]}>
              <View style={[styles.emptyOffersIconWrap, { backgroundColor: 'rgba(100, 116, 139, 0.1)' }]}>
                <Ionicons name="hourglass" size={28} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyOffersText, { color: colors.textMuted }]}>
                Waiting for providers to bid...
              </Text>
            </View>
          ) : (
            request.offers.map((offer: any) => (
              <View key={offer.id} style={[styles.offerCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                <View style={styles.offerTop}>
                  <View style={styles.offerProviderInfo}>
                    <View style={[styles.offerAvatar, { backgroundColor: colors.primaryLight }]}>
                      {offer.providerAvatar ? (
                        <Image source={{ uri: offer.providerAvatar }} style={{ width: '100%', height: '100%', borderRadius: 16 }} />
                      ) : (
                        <Ionicons name="person" size={20} color={colors.primary} />
                      )}
                    </View>
                    <View>
                      <Text style={[styles.offerProviderName, { color: colors.text }]}>
                        {offer.providerName ? offer.providerName : `Provider ···${offer.providerId.substring(0, 6)}`}
                        {offer.providerIsVerified && <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={{ marginLeft: 4 }} />}
                      </Text>
                      {(offer.providerCompletedJobs > 0 || offer.providerTotalReviews > 0) ? (
                         <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '500' }}>⭐ {Number(offer.providerRating).toFixed(1)} per {offer.providerCompletedJobs || offer.providerTotalReviews} jobs done</Text>
                      ) : (
                         <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '500' }}>✨ New provider</Text>
                      )}
                      <Text style={[styles.offerEta, { color: colors.textMuted }]}>ETA: {offer.eta}</Text>
                    </View>
                  </View>
                  <Text style={[styles.offerPrice, { color: colors.primary }]}>{offer.price} GHS</Text>
                </View>

                {offer.message ? (
                  <Text style={[styles.offerMsg, { color: colors.textMuted }]}>"{offer.message}"</Text>
                ) : null}

                {offer.attachmentUrls && offer.attachmentUrls.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginBottom: 12 }}>
                    {offer.attachmentUrls.map((url: string, idx: number) => {
                      const fullUrl = url.startsWith('/') ? `${BASE_URL}${url}` : url;
                      return (
                        <TouchableOpacity key={idx} onPress={() => setSelectedImage(fullUrl)} activeOpacity={0.85}>
                          <Image source={{ uri: fullUrl }} style={{ width: 80, height: 80, borderRadius: 16, marginRight: 10 }} />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {offer.status === 'PENDING' && request.status === 'OPEN' && (
                  <View style={styles.offerActions}>
                    <TouchableOpacity
                      style={[styles.declineBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                      onPress={() => handleDeclineOffer(offer.id)}
                    >
                      <Text style={[styles.declineBtnText, { color: colors.text }]}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.acceptBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                      onPress={() => handleAcceptOffer(offer.id)}
                    >
                      <Text style={styles.acceptBtnText}>Accept Bid</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {offer.status === 'ACCEPTED' && (
                  <View style={[styles.acceptedBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={[styles.acceptedBadgeText, { color: '#10B981' }]}>ACCEPTED & HIRED</Text>
                  </View>
                )}
                {offer.status === 'DECLINED' && (
                  <Text style={[styles.declinedText, { color: colors.error }]}>✕ Declined</Text>
                )}
              </View>
            ))
          )}
        </View>
      )}

      {/* ── Bid Form (for providers) ── */}
      {isProvider && request.targetProviderId && request.targetProviderId !== user?.id && request.status === 'OPEN' && (
        <View style={styles.section}>
          <View style={[styles.emptyOffers, { backgroundColor: colors.inputBackground, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={[styles.emptyOffersIconWrap, { backgroundColor: 'rgba(100, 116, 139, 0.1)' }]}>
              <Ionicons name="lock-closed" size={26} color={colors.textMuted} />
            </View>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 12, textAlign: 'center' }}>
              Direct Hire Request
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 22 }}>
              This request is private and targeted to a specific provider.
            </Text>
          </View>
        </View>
      )}

      {isProvider && request.status === 'OPEN' && !userOffer && (!request.targetProviderId || request.targetProviderId === user?.id) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Place a Bid</Text>
          <View style={[styles.bidCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.bidInputRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Bid Amount (GHS)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g. 40"
                  placeholderTextColor={colors.placeholderText}
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>ETA</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g. 2 Hours"
                  placeholderTextColor={colors.placeholderText}
                  value={eta}
                  onChangeText={setEta}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 16 }]}>Message (Optional)</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              placeholder="Tell them why you're the best fit..."
              placeholderTextColor={colors.placeholderText}
              multiline
              numberOfLines={3}
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitBidBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }, bidding && { opacity: 0.6 }]}
              onPress={handleBidSubmit}
              disabled={bidding}
            >
              {bidding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBidBtnText}>Submit Bid Offer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Provider bid status ── */}
      {isProvider && userOffer && (
        <View style={[styles.bidStatusCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.bidStatusLabel, { color: colors.textMuted }]}>Your Bid Status</Text>
          <Text style={[
            styles.bidStatusValue,
            userOffer.status === 'ACCEPTED' ? { color: '#10B981' } :
              userOffer.status === 'DECLINED' ? { color: colors.error } : { color: '#F59E0B' }
          ]}>
            {userOffer.status}
          </Text>
          <Text style={[styles.bidStatusMeta, { color: colors.textMuted }]}>
            {userOffer.price} GHS · ETA: {userOffer.eta}
          </Text>
          {userOffer.status === 'ACCEPTED' && (
            <TouchableOpacity
              style={[styles.chatBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
              onPress={() => thread && navigation.navigate('Chat', { requestId: request.id, threadId: thread.id })}
            >
              <Ionicons name="chatbubbles" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.chatBtnText}>Open Chat Channel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Student Cancel / Dispute Actions (state-gated) ── */}
      {isMyRequest && request.status === 'OPEN' && (
        <View style={styles.cancelSection}>
          {cancellingRequest ? (
            <ActivityIndicator size="small" color="#D32F2F" />
          ) : (
            <TouchableOpacity
              style={styles.cancelRequestBtn}
              onPress={() => setCancelDialog(true)}
              disabled={cancellingRequest}
            >
              <Ionicons name="close-circle" size={18} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.cancelRequestText}>Cancel Request</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.cancelHintText, { color: colors.textMuted }]}>
            No provider has been accepted yet. Your request will be removed from the feed.
          </Text>
        </View>
      )}
      {isMyRequest && request.status === 'ASSIGNED' && (
        <View style={styles.cancelSection}>
          <TouchableOpacity
            style={styles.reportIssueBtn}
            onPress={() => navigation.navigate('RaiseDispute', { jobId: job?.id })}
          >
            <Ionicons name="warning" size={18} color="#F59E0B" style={{ marginRight: 8 }} />
            <Text style={styles.reportIssueText}>Report an Issue</Text>
          </TouchableOpacity>
          <Text style={[styles.cancelHintText, { color: colors.textMuted }]}>
            A provider has been accepted. Please use the dispute flow to resolve any issues.
          </Text>
        </View>
      )}

      <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Chat Action Footer ── */}
      {thread && (
        <View style={[styles.footerAction, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
          {request.status === 'ASSIGNED' ? (
            <TouchableOpacity
              style={[styles.messageBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
              onPress={() => navigation.navigate('Chat', { requestId: request.id, threadId: thread.id })}
            >
              <Ionicons name="chatbubbles" size={20} color="#FFF" style={{ marginRight: 10 }} />
              <Text style={styles.actionBtnText}>Message {thread.otherParticipant?.fullName?.split(' ')[0] || 'User'}</Text>
            </TouchableOpacity>
          ) : (
            thread.hasHistory && (
              <TouchableOpacity
                style={[styles.viewConvBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Chat', { requestId: request.id, threadId: thread.id })}
              >
                <Ionicons name="eye" size={20} color={colors.text} style={{ marginRight: 10 }} />
                <Text style={[styles.viewConvBtnText, { color: colors.text }]}>View Conversation</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      )}

      {/* Acceptance Confirmation Sheet */}
      <Modal visible={acceptDialogVisible} transparent animationType="slide" onRequestClose={() => setAcceptDialogVisible(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheetContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Confirm Acceptance</Text>
            
            <View style={[styles.sheetSummaryCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <View style={styles.sheetRow}>
                <Text style={[styles.sheetRowLabel, { color: colors.textMuted }]}>Bid Price</Text>
                <Text style={[styles.sheetRowValue, { color: colors.text }]}>{offerPrice.toFixed(2)} GHS</Text>
              </View>
              <View style={styles.sheetRow}>
                <Text style={[styles.sheetRowLabel, { color: colors.textMuted }]}>Platform Fee (5%)</Text>
                <Text style={[styles.sheetRowValue, { color: colors.text }]}>{commission.toFixed(2)} GHS</Text>
              </View>
              <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />
              <View style={styles.sheetRow}>
                <Text style={[styles.sheetTotalLabel, { color: colors.text }]}>Total Charge</Text>
                <Text style={[styles.sheetTotalValue, { color: colors.primary }]}>{totalCharge.toFixed(2)} GHS</Text>
              </View>
            </View>

            <View style={[styles.escrowInfo, { backgroundColor: 'rgba(21, 101, 192, 0.1)' }]}>
              <Ionicons name="lock-closed" size={24} color={colors.primary} />
              <Text style={[styles.escrowInfoText, { color: colors.primary }]}>
                Funds will be securely locked in escrow. They are only released to the provider once you confirm the job is complete.
              </Text>
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity style={[styles.sheetBtn, styles.sheetBtnCancel, { borderColor: colors.border }]} onPress={() => setAcceptDialogVisible(false)}>
                <Text style={[styles.sheetBtnCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetBtn, styles.sheetBtnConfirm, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={confirmAcceptOffer}>
                <Text style={styles.sheetBtnConfirmText}>Accept & Lock Funds</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ImageViewerModal
        visible={!!selectedImage}
        imageUrl={selectedImage}
        onClose={() => setSelectedImage(null)}
      />

      {/* Cancel Request Confirmation Dialog */}
      <StatusDialog
        visible={cancelDialog}
        status="warning"
        headerLabel="Cancel Request"
        title="Cancel this request?"
        description="This request hasn't been accepted by a provider yet. It will be removed from the feed immediately. Any wallet funds are refunded in full."
        confirmLabel="Yes, Cancel"
        cancelLabel="Keep Request"
        destructive
        onConfirm={handleCancelRequest}
        onCancel={() => setCancelDialog(false)}
        onClose={() => setCancelDialog(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  
  content: { padding: 24 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  heroCard: {
    borderRadius: 24, padding: 24, marginBottom: 24,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 8,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 100, marginBottom: 16,
  },
  heroBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroDesc: { color: '#FFFFFF', fontSize: 19, fontWeight: '800', lineHeight: 28, marginBottom: 24, letterSpacing: -0.4 },
  heroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: '45%' },
  heroStatIconWrap: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  heroStatText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  statusRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 28,
  },
  statusLabel: { fontSize: 16, fontWeight: '800' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, letterSpacing: -0.3 },
  sectionCount: { fontWeight: '800' },

  emptyOffers: {
    borderRadius: 20, padding: 32, alignItems: 'center', gap: 12,
  },
  emptyOffersIconWrap: {
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyOffersText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },

  offerCard: {
    borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04, shadowRadius: 16, elevation: 2,
  },
  offerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  offerProviderInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  offerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  offerProviderName: { fontSize: 16, fontWeight: '800' },
  offerEta: { fontSize: 13, marginTop: 4, fontWeight: '600' },
  offerPrice: { fontSize: 20, fontWeight: '800' },
  offerMsg: { fontSize: 14, fontStyle: 'italic', marginBottom: 16, lineHeight: 22 },
  offerActions: { flexDirection: 'row', gap: 12 },
  declineBtn: {
    flex: 1, height: 48, borderRadius: 100, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  declineBtnText: { fontWeight: '700', fontSize: 14 },
  acceptBtn: {
    flex: 1.5, height: 48, borderRadius: 100,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  acceptBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  acceptedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, alignSelf: 'flex-start',
  },
  acceptedBadgeText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  declinedText: { fontSize: 14, fontStyle: 'italic', fontWeight: '600' },

  bidCard: {
    borderRadius: 24, padding: 24, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05, shadowRadius: 20, elevation: 4,
  },
  bidInputRow: { flexDirection: 'row' },
  inputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: { borderRadius: 14, height: 52, paddingHorizontal: 16, borderWidth: 1, fontSize: 15 },
  textArea: { borderRadius: 14, padding: 16, minHeight: 90, borderWidth: 1, fontSize: 15 },
  submitBidBtn: {
    flexDirection: 'row', height: 56, borderRadius: 100,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  submitBidBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  bidStatusCard: {
    borderRadius: 24, padding: 28, borderWidth: 1, alignItems: 'center', gap: 8,
    marginBottom: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 20, elevation: 3,
  },
  bidStatusLabel: { fontSize: 14, fontWeight: '600' },
  bidStatusValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  bidStatusMeta: { fontSize: 14, fontWeight: '500' },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 48, paddingHorizontal: 32, borderRadius: 100, marginTop: 12,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  chatBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  
  footerAction: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
  },
  messageBtn: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  viewConvBtn: {
    height: 56,
    borderRadius: 100,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewConvBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },

  locationDetailsCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  attachmentImg: {
    width: 100,
    height: 100,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 12,
  },
  locationDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationDetailsAddress: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    lineHeight: 22,
  },
  landmarkDetailsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  landmarkDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  distanceEstimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  distanceEstimateText: {
    fontSize: 14,
    fontWeight: '700',
  },
  staticMapContainer: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
  },
  staticMapImage: {
    width: '100%',
    height: '100%',
  },
  navigationActions: {
    marginTop: 8,
  },
  navigationBtn: {
    height: 52,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  navigationBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },

  cancelSection: { paddingVertical: 16, alignItems: 'center' },
  cancelRequestBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 100, borderWidth: 1.5, borderColor: '#EF4444', marginBottom: 12 },
  cancelRequestText: { color: '#EF4444', fontSize: 14, fontWeight: '800' },
  reportIssueBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 100, borderWidth: 1.5, borderColor: '#F59E0B', marginBottom: 12 },
  reportIssueText: { color: '#F59E0B', fontSize: 14, fontWeight: '800' },
  cancelHintText: { fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 300, fontWeight: '500' },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheetContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, paddingBottom: 48 },
  sheetTitle: { fontSize: 22, fontWeight: '800', marginBottom: 24, letterSpacing: -0.5 },
  sheetSummaryCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 24 },
  sheetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sheetRowLabel: { fontSize: 15, fontWeight: '600' },
  sheetRowValue: { fontSize: 16, fontWeight: '800' },
  sheetDivider: { height: 1, marginVertical: 12 },
  sheetTotalLabel: { fontSize: 18, fontWeight: '800' },
  sheetTotalValue: { fontSize: 24, fontWeight: '900' },
  escrowInfo: { flexDirection: 'row', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 32, gap: 16 },
  escrowInfoText: { flex: 1, fontSize: 14, lineHeight: 22, fontWeight: '700' },
  sheetActions: { flexDirection: 'row', gap: 16 },
  sheetBtn: { flex: 1, height: 56, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  sheetBtnCancel: { borderWidth: 1.5 },
  sheetBtnCancelText: { fontSize: 16, fontWeight: '800' },
  sheetBtnConfirm: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  sheetBtnConfirmText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
