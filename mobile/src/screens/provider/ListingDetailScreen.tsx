import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Image, Dimensions, Modal, TextInput,
  Alert, Linking, FlatList, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { 
  getProviderProfile, toggleSaveListing, reportListing, 
  getProviderListings, ProviderResponse 
} from '../../services/userService';
import RatingBadge from '../../components/RatingBadge';
import { api, BASE_URL } from '../../services/api';
import { stompClient } from '../../services/socket';
import { useAuthStore } from '../../store/authStore';
import { startChat } from '../../services/chatService';
import { useToast } from '../../styles/ToastContext';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen({ route, navigation }: any) {
  const { providerId } = route.params;
  const { colors } = useTheme();
  const { accessToken, user } = useAuthStore();
  const { showToast } = useToast();
  const [chatLoading, setChatLoading] = useState(false);
  
  const [profile, setProfile] = useState<ProviderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'about' | 'services' | 'reviews'>('about');

  // Hero image carousel state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Optimistic Save State
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Seller Ads state
  const [sellerListings, setSellerListings] = useState<any[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);

  // Modals state

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const socketSubRef = useRef<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await getProviderProfile(providerId);
      setProfile(res);
      setIsSaved(!!res.isSaved);
    } catch (e: any) {
      console.error('Failed to load listing details:', e);
    }
  }, [providerId]);

  const loadReviews = useCallback(async () => {
    try {
      setLoadingReviews(true);
      const res = await api.get(`/reviews/provider/${providerId}`);
      setReviews(Array.isArray(res.data) ? res.data : (res.data?.content || []));
    } catch (e) {
      console.warn('Could not load reviews:', e);
    } finally {
      setLoadingReviews(false);
    }
  }, [providerId]);

  const loadSellerListings = useCallback(async () => {
    try {
      setLoadingListings(true);
      const res = await getProviderListings(providerId);
      setSellerListings(res.services || []);
    } catch (e) {
      console.warn('Could not load seller listings:', e);
    } finally {
      setLoadingListings(false);
    }
  }, [providerId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([loadProfile(), loadReviews(), loadSellerListings()]).finally(() => {
        setLoading(false);
      });
    }, [loadProfile, loadReviews, loadSellerListings])
  );

  // STOMP live update listener
  useEffect(() => {
    if (!providerId) return;
    if (accessToken) {
      stompClient.connect(accessToken, () => {});
    }
    const topic = `/topic/provider.${providerId}`;
    const subId = stompClient.subscribe(topic, (msg: any) => {
      if (msg) {
        loadProfile();
      }
    });
    socketSubRef.current = subId;

    return () => {
      if (socketSubRef.current) {
        stompClient.unsubscribe(socketSubRef.current);
        socketSubRef.current = null;
      }
    };
  }, [providerId, accessToken, loadProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), loadReviews(), loadSellerListings()]);
    setRefreshing(false);
  }, [loadProfile, loadReviews, loadSellerListings]);

  const handleToggleSave = async () => {
    if (saving || !profile) return;
    const prev = isSaved;
    setIsSaved(!prev);
    setSaving(true);
    try {
      await toggleSaveListing(profile.id || profile.providerId || providerId);
    } catch (err: any) {
      setIsSaved(prev);
      Alert.alert('Error', err.message || 'Could not save listing.');
    } finally {
      setSaving(false);
    }
  };

  const handleCallNow = () => {
    const phone = profile?.whatsappNumber || '0240000000';
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Notice', `Contact number: ${phone}`);
    });
  };

  const handleChat = async () => {
    if (!profile?.id) return;
    setChatLoading(true);
    try {
      const thread = await startChat(profile.id);
      navigation.navigate('ChatThread', {
        threadId: thread.id,
        otherUserName: thread.otherUserName,
        otherUserAvatar: thread.otherUserAvatar,
      });
    } catch (e: any) {
      showToast({ status: 'error', title: 'Chat Error', subtitle: e?.response?.data?.message || 'Could not open chat.' });
    } finally {
      setChatLoading(false);
    }
  };


  const handleReportSubmit = async () => {
    if (submittingReport) return;
    setSubmittingReport(true);
    try {
      const res = await reportListing(providerId, reportReason, reportDetails);
      setReportModalVisible(false);
      setReportDetails('');
      Alert.alert('Report Submitted', res.message || 'Thank you for keeping CampusServ safe.');
    } catch (err: any) {
      Alert.alert('Report Notice', err.message || 'Could not submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0056D2" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={{ color: colors.text, fontSize: 16 }}>Listing not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getFullImageUrl = (url?: string | null) => {
    if (!url) return undefined;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://') || url.startsWith('data:')) return url;
    return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Compile carousel images
  const images: string[] = [];
  const addImage = (u?: string | null) => {
    const full = getFullImageUrl(u);
    if (full && !images.includes(full)) images.push(full);
  };
  addImage(profile.heroImageUrl);
  if (profile.portfolio && Array.isArray(profile.portfolio)) {
    profile.portfolio.forEach(url => addImage(url));
  }
  const currentImage = images[selectedImageIndex] || null;

  const memberSince = profile.createdAt ? new Date(profile.createdAt).getFullYear() : '2026';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8FAFC' }]} edges={['top']}>
      {/* Top Header / Breadcrumb */}
      <View style={[styles.topHeader, { backgroundColor: '#FFFFFF' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.breadcrumbWrap}>
          <Text style={styles.breadcrumbText} numberOfLines={1}>
            {profile.serviceCategory || 'Service Listing'} • {profile.fullName}
          </Text>
        </View>
        <TouchableOpacity onPress={handleToggleSave} style={styles.iconBtn}>
          <Ionicons 
            name={isSaved ? "bookmark" : "bookmark-outline"} 
            size={24} 
            color={isSaved ? "#0056D2" : "#64748B"} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0056D2" />}
      >
        {/* Hero Image / Carousel */}
        <View style={styles.heroSection}>
          {images.length > 0 ? (
            <FlatList
              ref={flatListRef}
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => index.toString()}
              getItemLayout={(data, index) => (
                { length: width, offset: width * index, index }
              )}
              onMomentumScrollEnd={(e) => {
                const contentOffset = e.nativeEvent.contentOffset.x;
                const viewSize = e.nativeEvent.layoutMeasurement.width;
                const index = Math.round(contentOffset / viewSize);
                setSelectedImageIndex(index);
              }}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.heroImage} resizeMode="cover" />
              )}
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="storefront-outline" size={64} color="#94A3B8" />
              <Text style={styles.heroPlaceholderText}>No photo preview available</Text>
            </View>
          )}

          {/* Carousel Thumbnails */}
          {images.length > 1 && (
            <View style={styles.thumbnailsContainer}>
              {images.map((imgUrl, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.thumbWrap,
                    selectedImageIndex === idx && styles.thumbWrapActive
                  ]}
                  onPress={() => {
                    setSelectedImageIndex(idx);
                    flatListRef.current?.scrollToIndex({ index: idx, animated: true });
                  }}
                >
                  <Image source={{ uri: imgUrl }} style={styles.thumbImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Listing Title & Price Treatment Card */}
        <View style={styles.mainInfoCard}>
          <View style={styles.verifiedRow}>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.verifiedText}>Verified Pro</Text>
            </View>
            {!!profile.serviceCategory && (
              <View style={[styles.verifiedBadge, { backgroundColor: '#EEF2FF', borderColor: '#DBEAFE', borderWidth: 1, marginLeft: 8 }]}>
                <Ionicons name="pricetag-outline" size={12} color="#0056D2" style={{ marginRight: 4 }} />
                <Text style={[styles.verifiedText, { color: '#0056D2' }]}>Category: {profile.serviceCategory}</Text>
              </View>
            )}
            <View style={styles.priceTagWrap}>
              <Text style={styles.priceTagText}>Contact for quote</Text>
            </View>
          </View>

          <Text style={styles.listingTitle}>{profile.fullName}</Text>

          <View style={styles.metaRow}>
            <RatingBadge rating={profile.rating || 0} reviewCount={profile.completedJobsCount} size="medium" />
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{profile.location || 'Campus Area'}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{profile.viewCount || 0} views</Text>
          </View>

          {/* 3 Contact CTAs */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity style={[styles.ctaBtn, styles.ctaBtnSecondary]} onPress={handleChat}>
              <Ionicons name="chatbubbles-outline" size={18} color="#0056D2" />
              <Text style={[styles.ctaBtnText, { color: '#0056D2' }]}>Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.ctaBtn, styles.ctaBtnSecondary]} onPress={handleCallNow}>
              <Ionicons name="call-outline" size={18} color="#0F172A" />
              <Text style={[styles.ctaBtnText, { color: '#0F172A' }]}>Call Now</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.ctaBtn, styles.ctaBtnPrimary]} 
              onPress={() => {
                if (profile) {
                  navigation.navigate('PostRequest', {
                    targetProviderId: profile.id || profile.providerId || providerId,
                    targetProviderName: profile.fullName,
                    targetProviderAvatarUrl: profile.profilePictureUrl,
                    targetProviderRating: profile.rating,
                    categoryId: profile.serviceCategory || (profile.services && profile.services.length > 0 ? (profile.services[0].category?.id || profile.services[0].category?.name) : undefined),
                  });
                }
              }}
            >
              <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
              <Text style={[styles.ctaBtnText, { color: '#FFFFFF' }]}>Request Quote</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs Bar */}
        <View style={styles.tabsBar}>
          <TouchableOpacity 
            style={[styles.tabItem, activeTab === 'about' && styles.tabItemActive]}
            onPress={() => setActiveTab('about')}
          >
            <Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>Description</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabItem, activeTab === 'services' && styles.tabItemActive]}
            onPress={() => setActiveTab('services')}
          >
            <Text style={[styles.tabText, activeTab === 'services' && styles.tabTextActive]}>Key Services</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabItem, activeTab === 'reviews' && styles.tabItemActive]}
            onPress={() => setActiveTab('reviews')}
          >
            <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
              Reviews ({reviews.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: About / Description */}
        {activeTab === 'about' && (
          <View style={styles.tabContentCard}>
            <Text style={styles.sectionHeading}>About this Service</Text>
            <Text style={styles.bioText}>
              {profile.bio || 'This seller has not provided a detailed biography yet. Contact them directly to inquire about their services, turnaround times, and rates.'}
            </Text>

            {profile.keyServices && profile.keyServices.length > 0 && (
              <>
                <Text style={[styles.sectionHeading, { marginTop: 20 }]}>Service Highlights</Text>
                <View style={styles.tagsContainer}>
                  {profile.keyServices.map((tag, idx) => (
                    <View key={idx} style={styles.tagPill}>
                      <Ionicons name="pricetag-outline" size={12} color="#0056D2" style={{ marginRight: 4 }} />
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <View style={styles.sellerInfoBox}>
              <Text style={styles.sellerInfoTitle}>Seller Verification & Tenure</Text>
              <View style={styles.sellerInfoRow}>
                <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                <Text style={styles.sellerInfoText}>Identity & Role Verified by CampusServ</Text>
              </View>
              <View style={styles.sellerInfoRow}>
                <Ionicons name="time-outline" size={18} color="#64748B" />
                <Text style={styles.sellerInfoText}>Member since {memberSince}</Text>
              </View>
              <View style={styles.sellerInfoRow}>
                <Ionicons name="briefcase-outline" size={18} color="#64748B" />
                <Text style={styles.sellerInfoText}>{profile.completedJobsCount || 0} completed campus orders</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tab 2: Key Services & Pricing */}
        {activeTab === 'services' && (
          <View style={styles.tabContentCard}>
            <Text style={styles.sectionHeading}>Service Offerings & Base Prices</Text>
            {profile.services && profile.services.length > 0 ? (
              profile.services.map((svc: any, idx: number) => (
                <View key={idx} style={styles.serviceItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceTitle}>{svc.title || 'Standard Service'}</Text>
                    {!!svc.category?.name && (
                      <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700', marginBottom: 2 }}>
                        Category: {svc.category.name}
                      </Text>
                    )}
                    {!!svc.description && <Text style={styles.serviceDesc}>{svc.description}</Text>}
                  </View>
                  <View style={styles.servicePriceTag}>
                    <Text style={styles.servicePriceText}>Contact for quote</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Standard service rates apply. Request a quote for details.</Text>
            )}

            {/* Seller's other listings */}
            <View style={{ marginTop: 24 }}>
              <Text style={styles.sectionHeading}>More Listings by this Seller</Text>
              {loadingListings ? (
                <ActivityIndicator size="small" color="#0056D2" />
              ) : sellerListings && sellerListings.length > 0 ? (
                sellerListings.map((ad: any, idx: number) => (
                  <View key={idx} style={styles.sellerAdCard}>
                    <Ionicons name="megaphone-outline" size={20} color="#0056D2" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.sellerAdTitle}>{ad.title || ad.category?.name || 'Campus Listing'}</Text>
                      <Text style={styles.sellerAdPrice}>{ad.basePrice ? `From GHS ${ad.basePrice}` : 'Negotiable'}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No additional active listings.</Text>
              )}
            </View>
          </View>
        )}

        {/* Tab 3: Reviews */}
        {activeTab === 'reviews' && (
          <View style={styles.tabContentCard}>
            <Text style={styles.sectionHeading}>Student Reviews ({reviews.length})</Text>
            {loadingReviews ? (
              <ActivityIndicator size="small" color="#0056D2" style={{ marginVertical: 20 }} />
            ) : reviews && reviews.length > 0 ? (
              reviews.map((rev: any, idx: number) => (
                <View key={idx} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerAvatar}>
                      <Text style={styles.reviewerAvatarText}>
                        {(rev.reviewerName || 'Student').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.reviewerName}>{rev.reviewerName || 'Verified Student'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        {[...Array(5)].map((_, i) => (
                          <Ionicons 
                            key={i} 
                            name={i < (rev.rating || 5) ? "star" : "star-outline"} 
                            size={12} 
                            color="#FFB800" 
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{rev.comment || 'Great service and timely delivery!'}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyReviews}>
                <Ionicons name="chatbox-ellipses-outline" size={40} color="#94A3B8" />
                <Text style={styles.emptyText}>No reviews yet. Book this service to be the first!</Text>
              </View>
            )}
          </View>
        )}

        {/* Report Listing Footer */}
        <View style={styles.reportSection}>
          <TouchableOpacity onPress={() => setReportModalVisible(true)} style={styles.reportBtn}>
            <Ionicons name="flag-outline" size={16} color="#EF4444" />
            <Text style={styles.reportBtnText}>Report this Listing</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>


      {/* Report Listing Modal */}
      <Modal visible={reportModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Listing</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Why are you reporting this listing? False or spam reports may affect your account.
            </Text>

            <View style={styles.reasonsContainer}>
              {['Spam', 'Inaccurate info', 'Inappropriate', 'Other'].map(reason => (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonChip, reportReason === reason && styles.reasonChipActive]}
                  onPress={() => setReportReason(reason)}
                >
                  <Text style={[styles.reasonChipText, reportReason === reason && styles.reasonChipTextActive]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Additional Details (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Provide context for moderation review..."
              multiline
              numberOfLines={3}
              value={reportDetails}
              onChangeText={setReportDetails}
            />

            <TouchableOpacity 
              style={[styles.modalSubmitBtn, { backgroundColor: '#EF4444' }]} 
              onPress={handleReportSubmit}
              disabled={submittingReport}
            >
              {submittingReport ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breadcrumbWrap: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  breadcrumbText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  heroImage: {
    width: width,
    height: 240,
  },
  heroPlaceholder: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  heroPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  thumbnailsContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  thumbWrap: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbWrapActive: {
    borderColor: '#0056D2',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  mainInfoCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  verifiedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },
  priceTagWrap: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceTagText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#0056D2',
  },
  listingTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  metaDot: {
    marginHorizontal: 8,
    color: '#94A3B8',
    fontSize: 12,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  ctaContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
  },
  ctaBtnSecondary: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  ctaBtnPrimary: {
    flex: 1.5,
    backgroundColor: '#0056D2',
  },
  ctaBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  tabsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#0056D2',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  tabTextActive: {
    fontFamily: 'Inter-Bold',
    color: '#0056D2',
  },
  tabContentCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    minHeight: 250,
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#334155',
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#1E3A8A',
  },
  sellerInfoBox: {
    marginTop: 24,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sellerInfoTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 12,
  },
  sellerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sellerInfoText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#334155',
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  serviceTitle: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  serviceDesc: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 2,
  },
  servicePriceTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  servicePriceText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  sellerAdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sellerAdTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  sellerAdPrice: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#0056D2',
    marginTop: 2,
  },
  reviewItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerAvatarText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#334155',
  },
  reviewerName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  reviewComment: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    lineHeight: 20,
  },
  emptyReviews: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
  },
  reportSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
  },
  reportBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#334155',
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#0F172A',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  modalSubmitBtn: {
    backgroundColor: '#0056D2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  modalSubmitBtnText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reasonChipActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  reasonChipText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#475569',
  },
  reasonChipTextActive: {
    color: '#EF4444',
    fontFamily: 'Inter-Bold',
  },
});
