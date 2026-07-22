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

  useEffect(() => { fetchRequestDetails(); }, [fetchRequestDetails]);

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
    <>
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]} 
        contentContainerStyle={styles.content}
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
            <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.75)" />
            <Text style={styles.heroStatText}>{request.location || 'Campus'}</Text>
          </View>
          <View style={styles.heroStat}>
            <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.75)" />
            <Text style={styles.heroStatText}>{new Date(request.deadline).toLocaleDateString()}</Text>
          </View>
          <View style={styles.heroStat}>
            <Ionicons name="cash-outline" size={14} color="rgba(255,255,255,0.75)" />
            <Text style={styles.heroStatText}>{request.budget ? `${request.budget} GHS` : 'Open'}</Text>
          </View>
        </View>
      </View>

      {/* ── Status pill ── */}
      <View style={styles.statusRow}>
        <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Status</Text>
        <View style={[
          styles.statusPill,
          {
            backgroundColor: request.status === 'OPEN' ? colors.successLight : colors.warningLight,
          }
        ]}>
          <View style={[
            styles.statusDot,
            { backgroundColor: request.status === 'OPEN' ? colors.success : colors.warning }
          ]} />
          <Text style={[
            styles.statusPillText,
            { color: request.status === 'OPEN' ? colors.success : colors.warning }
          ]}>
            {request.status}
          </Text>
        </View>
      </View>

      {/* ── Attachments ── */}
      {(request.attachments ?? []).length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Attached Photos ({request.attachments.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {request.attachments.map((att: any) => {
              const url = att.fileUrl.startsWith('/') ? `${BASE_URL}${att.fileUrl}` : att.fileUrl;
              return (
                <TouchableOpacity key={att.id} onPress={() => setSelectedImage(url)} activeOpacity={0.8}>
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
          <Text style={[styles.locationDetailsTitle, { color: colors.text }]}>Service Location</Text>
          
          <View style={styles.locationDetailsRow}>
            <Ionicons name="location" size={20} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.locationDetailsAddress, { color: colors.text }]} numberOfLines={2}>
              {requestLocation.pickupAddress}
            </Text>
          </View>

          {/* If there's an active provider landmark (released only after start task / IN_PROGRESS) */}
          {requestLocation.pickupLandmark ? (
            <View style={[styles.landmarkDetailsBox, { backgroundColor: colors.inputBackground }]}>
              <Ionicons name="information-circle" size={16} color={colors.primary} style={{ marginRight: 6 }} />
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
                style={{ marginRight: 6 }} 
              />
              <Text style={[styles.distanceEstimateText, { color: colors.text }]}>
                {distanceEstimate.mode === 'driving' ? '🚗' : '📍'} ~{distanceEstimate.distanceText} away · ~{distanceEstimate.durationText} {distanceEstimate.mode === 'driving' ? 'drive' : 'walk'}
              </Text>
            </View>
          )}

          {/* Static Map Thumbnail: if coordinates are available (Requester, or Confirmed Provider) */}
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
                style={[styles.navigationBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  navigation.navigate("ActiveJob", {
                    jobId: job.id,
                  });
                }}
              >
                <Ionicons name="briefcase-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.navigationBtnText}>Go to Active Job Dashboard</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── Offers Section (for requester) ── */}
      {isMyRequest && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Provider Bids
            <Text style={[styles.sectionCount, { color: colors.primary }]}> ({request.offers?.length || 0})</Text>
          </Text>

          {request.targetProviderId && (request.offers || []).length === 0 ? (
            <View style={[styles.emptyOffers, { backgroundColor: colors.inputBackground, borderColor: colors.accent, borderWidth: 1, borderStyle: 'dashed', padding: 20 }]}>
              <Ionicons name="person-circle-outline" size={32} color={colors.accent} />
              <Text style={[styles.emptyOffersText, { color: colors.text, fontWeight: '700', marginTop: 8 }]}>
                Awaiting response from {request.targetProviderName || 'selected provider'}...
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                We have notified them of your request.
              </Text>
            </View>
          ) : (request.offers || []).length === 0 ? (
            <View style={[styles.emptyOffers, { backgroundColor: colors.inputBackground }]}>
              <Ionicons name="hourglass-outline" size={28} color={colors.textMuted} />
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
                        <Image source={{ uri: offer.providerAvatar }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                      ) : (
                        <Ionicons name="person" size={16} color={colors.primary} />
                      )}
                    </View>
                    <View>
                      <Text style={[styles.offerProviderName, { color: colors.text }]}>
                        {offer.providerName ? offer.providerName : `Provider ···${offer.providerId.substring(0, 6)}`}
                        {offer.providerIsVerified && <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={{ marginLeft: 4 }} />}
                      </Text>
                      {(offer.providerCompletedJobs > 0 || offer.providerTotalReviews > 0) ? (
                         <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>⭐ {Number(offer.providerRating).toFixed(1)} per {offer.providerCompletedJobs || offer.providerTotalReviews} jobs done</Text>
                      ) : (
                         <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>✨ New provider</Text>
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
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, marginBottom: 12 }}>
                    {offer.attachmentUrls.map((url: string, idx: number) => {
                      const fullUrl = url.startsWith('/') ? `${BASE_URL}${url}` : url;
                      return (
                        <TouchableOpacity key={idx} onPress={() => setSelectedImage(fullUrl)} activeOpacity={0.8}>
                          <Image source={{ uri: fullUrl }} style={{ width: 80, height: 80, borderRadius: 12, marginRight: 8 }} />
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
                      style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleAcceptOffer(offer.id)}
                    >
                      <Text style={styles.acceptBtnText}>Accept Bid</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {offer.status === 'ACCEPTED' && (
                  <View style={[styles.acceptedBadge, { backgroundColor: colors.successLight }]}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={[styles.acceptedBadgeText, { color: colors.success }]}>ACCEPTED & HIRED</Text>
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
          <View style={[styles.emptyOffers, { backgroundColor: colors.inputBackground, borderColor: colors.border, borderWidth: 1, padding: 18 }]}>
            <Ionicons name="lock-closed-outline" size={26} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: 8, textAlign: 'center' }}>
              Direct Hire Request
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
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

            <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>Message (Optional)</Text>
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
              style={[styles.submitBidBtn, { backgroundColor: colors.primary }, bidding && { opacity: 0.6 }]}
              onPress={handleBidSubmit}
              disabled={bidding}
            >
              {bidding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={16} color="#FFF" style={{ marginRight: 8 }} />
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
            userOffer.status === 'ACCEPTED' ? { color: colors.success } :
              userOffer.status === 'DECLINED' ? { color: colors.error } : { color: colors.warning }
          ]}>
            {userOffer.status}
          </Text>
          <Text style={[styles.bidStatusMeta, { color: colors.textMuted }]}>
            {userOffer.price} GHS · ETA: {userOffer.eta}
          </Text>
          {userOffer.status === 'ACCEPTED' && (
            <TouchableOpacity
              style={[styles.chatBtn, { backgroundColor: colors.primary }]}
              onPress={() => thread && navigation.navigate('Chat', { requestId: request.id, threadId: thread.id })}
            >
              <Ionicons name="chatbubble-outline" size={16} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.chatBtnText}>Open Chat Channel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Chat / Call Action Bar ── */}
      {thread && (
        <View style={[styles.actionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          {request.status === 'ASSIGNED' ? (
            <TouchableOpacity
              style={[styles.messageBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Chat', { requestId: request.id, threadId: thread.id })}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.actionBtnText}>Message {thread.otherParticipant?.fullName?.split(' ')[0] || 'User'}</Text>
            </TouchableOpacity>
          ) : (
            // COMPLETED or CANCELLED status
            thread.hasHistory && (
              <TouchableOpacity
                style={[styles.viewConvBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Chat', { requestId: request.id, threadId: thread.id })}
              >
                <Ionicons name="eye-outline" size={18} color={colors.text} style={{ marginRight: 8 }} />
                <Text style={[styles.viewConvBtnText, { color: colors.text }]}>View Conversation</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      )}

      {/* ── Student Cancel / Dispute Actions (state-gated) ── */}
      {isMyRequest && request.status === 'OPEN' && (
        <View style={[styles.cancelSection, { borderTopColor: colors.border }]}>
          {cancellingRequest ? (
            <ActivityIndicator size="small" color="#D32F2F" />
          ) : (
            <TouchableOpacity
              style={styles.cancelRequestBtn}
              onPress={() => setCancelDialog(true)}
              disabled={cancellingRequest}
            >
              <Ionicons name="close-circle-outline" size={18} color="#D32F2F" style={{ marginRight: 6 }} />
              <Text style={styles.cancelRequestText}>Cancel Request</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.cancelHintText, { color: colors.textMuted }]}>
            No provider has been accepted yet. Your request will be removed from the feed.
          </Text>
        </View>
      )}
      {isMyRequest && request.status === 'ASSIGNED' && (
        <View style={[styles.cancelSection, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.reportIssueBtn}
            onPress={() => navigation.navigate('RaiseDispute', { jobId: job?.id })}
          >
            <Ionicons name="alert-circle-outline" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
            <Text style={styles.reportIssueText}>Report an Issue</Text>
          </TouchableOpacity>
          <Text style={[styles.cancelHintText, { color: colors.textMuted }]}>
            A provider has been accepted. Please use the dispute flow to resolve any issues.
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
      </ScrollView>

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

            <View style={[styles.escrowInfo, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="lock-closed" size={20} color={colors.primary} />
              <Text style={[styles.escrowInfoText, { color: colors.primary }]}>
                Funds will be securely locked in escrow. They are only released to the provider once you confirm the job is complete.
              </Text>
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity style={[styles.sheetBtn, styles.sheetBtnCancel, { borderColor: colors.border }]} onPress={() => setAcceptDialogVisible(false)}>
                <Text style={[styles.sheetBtnCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetBtn, styles.sheetBtnConfirm, { backgroundColor: colors.primary }]} onPress={confirmAcceptOffer}>
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
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Cancel / dispute actions
  cancelSection: { paddingVertical: 20, paddingHorizontal: 24, borderTopWidth: 1, alignItems: 'center' },
  cancelRequestBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1.5, borderColor: '#D32F2F', marginBottom: 8 },
  cancelRequestText: { color: '#D32F2F', fontSize: 14, fontWeight: '700' },
  reportIssueBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1.5, borderColor: '#F59E0B', marginBottom: 8 },
  reportIssueText: { color: '#F59E0B', fontSize: 14, fontWeight: '700' },
  cancelHintText: { fontSize: 12, textAlign: 'center', lineHeight: 16, maxWidth: 280 },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  sheetSummaryCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  sheetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetRowLabel: { fontSize: 15, fontWeight: '500' },
  sheetRowValue: { fontSize: 15, fontWeight: '700' },
  sheetDivider: { height: 1, marginVertical: 8 },
  sheetTotalLabel: { fontSize: 16, fontWeight: '700' },
  sheetTotalValue: { fontSize: 20, fontWeight: '800' },
  escrowInfo: { flexDirection: 'row', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 24, gap: 12 },
  escrowInfoText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  sheetActions: { flexDirection: 'row', gap: 12 },
  sheetBtn: { flex: 1, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetBtnCancel: { borderWidth: 1 },
  sheetBtnCancelText: { fontSize: 15, fontWeight: '700' },
  sheetBtnConfirm: { },
  sheetBtnConfirmText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  heroCard: {
    borderRadius: 24, padding: 24, marginBottom: 16,
    shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 6,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, marginBottom: 12,
  },
  heroBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  heroDesc: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', lineHeight: 26, marginBottom: 16 },
  heroStats: { flexDirection: 'row', gap: 16 },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroStatText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },

  statusRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24,
  },
  statusLabel: { fontSize: 14, fontWeight: '600' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 12, fontWeight: '700' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  sectionCount: { fontWeight: '600' },

  emptyOffers: {
    borderRadius: 16, padding: 28, alignItems: 'center', gap: 10,
  },
  emptyOffersText: { fontSize: 13 },

  offerCard: {
    borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  offerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  offerProviderInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  offerAvatar: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  offerProviderName: { fontSize: 14, fontWeight: '700' },
  offerEta: { fontSize: 12, marginTop: 2 },
  offerPrice: { fontSize: 18, fontWeight: '800' },
  offerMsg: { fontSize: 13, fontStyle: 'italic', marginBottom: 12, lineHeight: 18 },
  offerActions: { flexDirection: 'row', gap: 10 },
  declineBtn: {
    flex: 1, height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  declineBtnText: { fontWeight: '600', fontSize: 13 },
  acceptBtn: {
    flex: 1.5, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  acceptBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  acceptedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, alignSelf: 'flex-start',
  },
  acceptedBadgeText: { fontSize: 12, fontWeight: '700' },
  declinedText: { fontSize: 13, fontStyle: 'italic' },

  bidCard: {
    borderRadius: 20, padding: 20, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06, shadowRadius: 14, elevation: 3,
  },
  bidInputRow: { flexDirection: 'row' },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { borderRadius: 12, height: 46, paddingHorizontal: 14, borderWidth: 1, fontSize: 14 },
  textArea: { borderRadius: 12, padding: 14, minHeight: 80, borderWidth: 1, fontSize: 14 },
  submitBidBtn: {
    flexDirection: 'row', height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginTop: 16,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  submitBidBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  bidStatusCard: {
    borderRadius: 20, padding: 24, borderWidth: 1, alignItems: 'center', gap: 6,
    marginBottom: 24,
  },
  bidStatusLabel: { fontSize: 13 },
  bidStatusValue: { fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },
  bidStatusMeta: { fontSize: 12 },
  chatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, marginTop: 8,
  },
  chatBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  
  actionCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  viewConvBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewConvBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  locationDetailsCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  locationDetailsTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  attachmentImg: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 10,
  },
  locationDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationDetailsAddress: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  landmarkDetailsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  landmarkDetailsText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  distanceEstimateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  distanceEstimateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  staticMapContainer: {
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 8,
  },
  staticMapImage: {
    width: '100%',
    height: '100%',
  },
  navigationActions: {
    marginTop: 10,
  },
  navigationBtn: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
