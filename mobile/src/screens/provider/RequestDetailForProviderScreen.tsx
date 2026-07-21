import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { useFocusEffect } from '@react-navigation/native';
import { api, BASE_URL } from '../../services/api';
import type { OpenRequest, ProviderOffer } from '../../types/provider';
import { useToast } from '../../styles/ToastContext';
import StatusDialog from '../../components/StatusDialog';
import ImageViewerModal from '../../components/ImageViewerModal';

const ETA_OPTIONS = ['Within 30 min', '1 hour', '2 hours', 'Today', 'Tomorrow', 'This week'];

export default function RequestDetailForProviderScreen({ navigation, route }: any) {
  const { requestId } = route.params;
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [request, setRequest] = useState<OpenRequest | null>(null);
  const [myOffer, setMyOffer] = useState<ProviderOffer | null>(null);
  const [myBids, setMyBids] = useState<ProviderOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // Bid form state
  const [price, setPrice] = useState('');
  const [eta, setEta] = useState('');
  const [message, setMessage] = useState('');
  const [etaExpanded, setEtaExpanded] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Derive bid range from the request's base price (budgetMin)
  const baseBudget = Number(request?.budgetMin) || 0;
  const bidMin = baseBudget > 0 ? baseBudget * 0.5 : null;
  const bidMax = baseBudget > 0 ? baseBudget * 2.0 : null;

  const handlePriceChange = (text: string) => {
    setPrice(text);
    const num = Number(text);
    if (!text.trim() || isNaN(num) || num <= 0) {
      setPriceError(null);
      return;
    }
    if (bidMin !== null && bidMax !== null) {
      if (num < bidMin || num > bidMax) {
        setPriceError(`Must be between GHS ${bidMin.toFixed(0)} – ${bidMax.toFixed(0)}`);
      } else {
        setPriceError(null);
      }
    } else {
      setPriceError(null);
    }
  };

  const { showToast } = useToast();
  const [withdrawDialogVisible, setWithdrawDialogVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await api.get(`/requests/${requestId}`);
      const data: OpenRequest = res.data;
      setRequest(data);

      // Find all bids from this provider
      const offers: ProviderOffer[] = data.offers ?? [];
      const mine = offers.filter(o => o.providerId === user?.id).sort((a, b) => new Date((b as any).createdAt || 0).getTime() - new Date((a as any).createdAt || 0).getTime());
      
      setMyBids(mine);
      setMyOffer(mine.length > 0 && mine[0].status !== 'WITHDRAWN' && mine[0].status !== 'DECLINED' ? mine[0] : null);
    } catch {
      // Keep previous state
    } finally {
      setLoading(false);
    }
  }, [requestId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ headerShown: false });
      setLoading(true);
      fetchDetail();
    }, [fetchDetail])
  );

  const handleSubmitBid = async () => {
    const numPrice = Number(price);
    if (!price.trim() || isNaN(numPrice) || numPrice <= 0) {
      showToast({ status: 'error', title: 'Error', subtitle: 'Please enter a valid bid price.' });
      return;
    }

    const basePrice = Number(request?.budgetMin) || 0;
    if (basePrice > 0) {
      const minBid = basePrice * 0.5;
      const maxBid = basePrice * 2.0;
      if (numPrice < minBid || numPrice > maxBid) {
        showToast({ status: 'error', title: 'Invalid Bid', subtitle: `Bid must be between ${minBid} and ${maxBid} GHS.` });
        return;
      }
    }
    const identicalCount = myBids.filter(b => Number(b.price) === numPrice).length;
    if (identicalCount >= 4) {
      showToast({ status: 'error', title: 'Error', subtitle: 'You have already offered this exact amount 4 times.' });
      return;
    }

    if (!eta) {
      showToast({ status: 'error', title: 'Error', subtitle: 'Please select an ETA.' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/requests/${requestId}/offers`, null, {
        params: {
          price: Number(price).toString(),
          eta,
          ...(message.trim() ? { message: message.trim() } : {})
        }
      });

      showToast({ status: 'success', title: 'Success', subtitle: 'Bid submitted successfully!' });
      // Refresh to show the submitted offer
      setTimeout(() => fetchDetail(), 800);
    } catch (e: any) {
      const errMsg = e.response?.data || 'Failed to submit bid.';
      showToast({ status: 'error', title: 'Error', subtitle: typeof errMsg === 'string' ? errMsg : 'Failed to submit bid.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawBid = () => {
    setWithdrawDialogVisible(true);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 12 }]}>Request Not Found</Text>
      </View>
    );
  }

  const budgetText =
    request.budgetMin && request.budgetMax
      ? request.budgetMin === request.budgetMax
        ? `${Number(request.budgetMin).toFixed(0)} GHS`
        : `${Number(request.budgetMin).toFixed(0)} – ${Number(request.budgetMax).toFixed(0)} GHS`
      : 'No budget specified';

  const bidWindowClose = request.bidWindowCloses ? new Date(request.bidWindowCloses) : null;
  const isBidOpen = !bidWindowClose || bidWindowClose > new Date();
  const requestIsOpen = request.status === 'OPEN';
  const canBid = isBidOpen && requestIsOpen;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Request Detail</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={[styles.content, { paddingBottom: 60 + insets.bottom }]} 
          showsVerticalScrollIndicator={false}
        >

          {/* ── Category & Status ── */}
          <View style={styles.topRow}>
            <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                {request.category?.name || 'Service'}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: requestIsOpen ? colors.successLight : colors.inputBackground }]}>
              <Text style={[styles.badgeText, { color: requestIsOpen ? colors.success : colors.textMuted }]}>
                {request.status}
              </Text>
            </View>
          </View>

          {/* ── Title & Description ── */}
          {request.title && (
            <Text style={[styles.title, { color: colors.text }]}>{request.title}</Text>
          )}
          <Text style={[styles.description, { color: colors.text }]}>{request.description}</Text>

          {/* ── Meta Cards ── */}
          <View style={styles.metaRow}>
            <View style={[styles.metaCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="cash-outline" size={18} color={colors.primary} />
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Client's Budget</Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>{budgetText}</Text>
            </View>
            <View style={[styles.metaCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Location</Text>
              <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={2}>
                {request.location || request.locationType || 'Campus'}
              </Text>
            </View>
          </View>

          {/* ── Bid window ── */}
          {bidWindowClose && (
            <View style={[styles.infoRow, { backgroundColor: isBidOpen ? colors.successLight : colors.inputBackground, borderColor: isBidOpen ? colors.success : colors.border }]}>
              <Ionicons name="time-outline" size={16} color={isBidOpen ? colors.success : colors.textMuted} />
              <Text style={[styles.infoText, { color: isBidOpen ? colors.success : colors.textMuted }]}>
                {isBidOpen
                  ? `Bid window closes: ${bidWindowClose.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Bid window has closed'}
              </Text>
            </View>
          )}

          {/* ── Attachments ── */}
          {(request.attachments ?? []).length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Attached Photos ({request.attachments!.length})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                {request.attachments!.map((att) => {
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

          {/* ── Existing bids summary ── */}
          {(request.offers ?? []).filter(o => ['PENDING', 'ACCEPTED'].includes(o.status)).length > 0 && (
            <View style={[styles.bidsInfo, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Ionicons name="people-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.bidsInfoText, { color: colors.textMuted }]}>
                {request.offers!.filter(o => o.status === 'PENDING').length} bid(s) placed so far
              </Text>
            </View>
          )}

          {/* ── My Active Bid ── */}
          {myOffer && (
            <View style={[styles.myBidCard, { backgroundColor: colors.successLight, borderColor: colors.success }]}>
              <View style={styles.myBidTop}>
                <View style={styles.myBidLeft}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={[styles.myBidTitle, { color: colors.success }]}>Your Active Bid</Text>
                </View>
                <Text style={[styles.myBidStatus, { color: colors.success }]}>{myOffer.status}</Text>
              </View>
              <Text style={[styles.myBidPrice, { color: colors.text }]}>
                {Number(myOffer.price).toFixed(2)} GHS
              </Text>
              {myOffer.eta && (
                <Text style={[styles.myBidEta, { color: colors.textMuted }]}>ETA: {myOffer.eta}</Text>
              )}
              {myOffer.message && (
                <Text style={[styles.myBidMsg, { color: colors.textMuted }]}>{myOffer.message}</Text>
              )}
              {myOffer.status === 'PENDING' && (
                <TouchableOpacity
                  style={[styles.withdrawBtn, { borderColor: colors.error }]}
                  onPress={handleWithdrawBid}
                  disabled={withdrawing}
                  activeOpacity={0.8}
                >
                  {withdrawing
                    ? <ActivityIndicator size="small" color={colors.error} />
                    : <Text style={[styles.withdrawBtnText, { color: colors.error }]}>Withdraw Active Bid</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Bid History ── */}
          {myBids.length > 1 && (
            <View style={{ marginTop: 24 }}>
              <Text style={[styles.historyTitle, { color: colors.text }]}>Your Bid History</Text>
              {myBids.slice(1).map((bid) => (
                <View key={bid.id} style={[styles.historyCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <View style={styles.historyTop}>
                    <Text style={[styles.historyPrice, { color: colors.text }]}>{Number(bid.price).toFixed(2)} GHS</Text>
                    <Text style={[styles.historyStatus, { color: colors.textMuted }]}>{bid.status}</Text>
                  </View>
                  <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                    {new Date((bid as any).createdAt || '').toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Bid Form ── */}
          {canBid && (
            <View style={[styles.bidForm, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Text style={[styles.bidFormTitle, { color: colors.text }]}>Place Your Bid</Text>

              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Your Price (GHS)</Text>
              {request.budgetMin && !isNaN(Number(request.budgetMin)) && (
                <Text style={{ fontSize: 12, color: colors.primary, marginBottom: 8 }}>
                  Valid range: {(Number(request.budgetMin) * 0.5).toFixed(0)} - {(Number(request.budgetMin) * 2).toFixed(0)} GHS
                </Text>
              )}
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.inputBackground, color: colors.text, borderColor: priceError ? colors.error : colors.border },
                ]}
                placeholder={`Budget: ${budgetText}`}
                placeholderTextColor={colors.placeholderText}
                keyboardType="numeric"
                value={price}
                onChangeText={handlePriceChange}
              />
              {/* Inline bid range guidance */}
              {bidMin !== null && bidMax !== null && !priceError && (
                <Text style={{ fontSize: 12, color: colors.primary, marginTop: 4, marginBottom: 4 }}>
                  Valid range: GHS {bidMin.toFixed(0)} – {bidMax.toFixed(0)}
                </Text>
              )}
              {priceError && (
                <Text style={{ fontSize: 12, color: colors.error, marginTop: 4, marginBottom: 4 }}>
                  ⚠ {priceError}
                </Text>
              )}

              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Estimated Time of Arrival</Text>
              <TouchableOpacity
                style={[styles.etaSelector, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={() => setEtaExpanded(!etaExpanded)}
                activeOpacity={0.8}
              >
                <Text style={[styles.etaSelectorText, { color: eta ? colors.text : colors.placeholderText }]}>
                  {eta || 'Select ETA'}
                </Text>
                <Ionicons name={etaExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
              </TouchableOpacity>
              {etaExpanded && (
                <View style={[styles.etaOptions, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  {ETA_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.etaOption, eta === opt && { backgroundColor: colors.primaryLight }]}
                      onPress={() => { setEta(opt); setEtaExpanded(false); }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.etaOptionText, { color: eta === opt ? colors.primary : colors.text }]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Note to Client (optional)</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                placeholder="Why should they pick you? Describe your experience..."
                placeholderTextColor={colors.placeholderText}
                multiline
                numberOfLines={3}
                value={message}
                onChangeText={setMessage}
                textAlignVertical="top"
              />



              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: (submitting || !!priceError) ? colors.border : colors.primary },
                  (submitting || !!priceError) && { opacity: 0.7 },
                ]}
                onPress={handleSubmitBid}
                disabled={submitting || !!priceError}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator color="#FFF" />
                  : <>
                    <Ionicons name="send" size={16} color="#FFF" />
                    <Text style={styles.submitBtnText}>Submit Bid</Text>
                  </>
                }
              </TouchableOpacity>
            </View>
          )}

          {!requestIsOpen && !myOffer && (
            <View style={[styles.closedBanner, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.closedText, { color: colors.textMuted }]}>
                This request is no longer accepting bids.
              </Text>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      <StatusDialog
        visible={withdrawDialogVisible}
        status="warning"
        title="Withdraw Bid"
        description="Are you sure you want to withdraw your bid for this request?"
        confirmLabel="Withdraw"
        cancelLabel="Cancel"
        destructive={true}
        onConfirm={async () => {
          setWithdrawDialogVisible(false);
          if (!myOffer) return;
          setWithdrawing(true);
          try {
            await api.put(`/requests/${requestId}/offers/${myOffer.id}/withdraw`);
            showToast({ status: 'success', title: 'Success', subtitle: 'Bid withdrawn.' });
            setMyOffer(null);
            setTimeout(() => fetchDetail(), 500);
          } catch (e: any) {
            const errMsg = e.response?.data || 'Failed to withdraw bid.';
            showToast({ status: 'error', title: 'Error', subtitle: typeof errMsg === 'string' ? errMsg : 'Failed to withdraw bid.' });
          } finally {
            setWithdrawing(false);
          }
        }}
        onCancel={() => setWithdrawDialogVisible(false)}
        onClose={() => setWithdrawDialogVisible(false)}
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: { padding: 24, paddingBottom: 60 },

  topRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },

  title: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  description: { fontSize: 15, lineHeight: 22, marginBottom: 20 },

  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  metaCard: {
    flex: 1, borderRadius: 20, padding: 18, borderWidth: 0,
    alignItems: 'center', gap: 6,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  metaLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 4, letterSpacing: 0.5 },
  metaValue: { fontSize: 15, fontWeight: '800', textAlign: 'center' },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16,
  },
  infoText: { fontSize: 13, fontWeight: '600', flex: 1 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  attachmentImg: { width: 100, height: 100, borderRadius: 12, marginRight: 10, borderWidth: 1 },

  bidsInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16,
  },
  bidsInfoText: { fontSize: 13 },

  myBidCard: { borderRadius: 18, borderWidth: 1.5, padding: 16, marginBottom: 24 },
  myBidTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  myBidLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  myBidTitle: { fontSize: 14, fontWeight: '700' },
  myBidStatus: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  myBidPrice: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  myBidEta: { fontSize: 13, marginBottom: 2 },
  myBidMsg: { fontSize: 13, marginBottom: 12 },
  withdrawBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawBtnText: { fontSize: 14, fontWeight: '600' },
  historyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, paddingHorizontal: 4 },
  historyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyPrice: { fontSize: 16, fontWeight: '700' },
  historyStatus: { fontSize: 12, fontWeight: '600' },
  historyDate: { fontSize: 12 },

  bidForm: { 
    borderRadius: 28, borderWidth: 0, padding: 24, marginBottom: 24,
    shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 12,
  },
  bidFormTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20, letterSpacing: -0.3 },
  fieldLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  input: { height: 56, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 16, marginBottom: 20 },
  etaSelector: {
    height: 56, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
  },
  etaSelectorText: { fontSize: 16 },
  etaOptions: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  etaOption: { paddingHorizontal: 16, paddingVertical: 14 },
  etaOptionText: { fontSize: 15, fontWeight: '500' },
  textArea: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingTop: 16, fontSize: 16, minHeight: 100, marginBottom: 24 },
  submitBtn: {
    height: 56, borderRadius: 100, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  closedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16, borderRadius: 14, borderWidth: 1,
  },
  closedText: { fontSize: 14, flex: 1 },

  emptyTitle: { fontSize: 18, fontWeight: '700' },
});
