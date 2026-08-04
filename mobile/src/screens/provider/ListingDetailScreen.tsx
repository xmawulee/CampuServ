import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Image, Dimensions, Modal, TextInput,
  Alert, Linking, FlatList, RefreshControl
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import AnimatedBackground from '../../components/AnimatedBackground';


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
  const insets = useSafeAreaInsets();

  // Active selected listing state
  const [currentListing, setCurrentListing] = useState<any>(route.params?.selectedListing || null);

  useEffect(() => {
    if (route.params?.selectedListing) {
      setCurrentListing(route.params.selectedListing);
    }
  }, [route.params?.selectedListing]);

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
      // Automatically default to the first listing/service if no listing was explicitly selected
      if (!currentListing && res.services && res.services.length > 0) {
        setCurrentListing(res.services[0]);
      }
    } catch (e: any) {
      console.error('Failed to load listing details:', e);
    }
  }, [providerId, currentListing]);

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

  const handleRequestQuote = () => {
    if (!profile) return;
    const pId = profile.id || profile.providerId || providerId;
    const catId = currentListing?.category?.id || currentListing?.categoryId || profile.serviceCategory;

    navigation.navigate('PostRequest', {
      selectedTargetProvider: {
        id: pId,
        fullName: profile.fullName,
        profilePictureUrl: profile.profilePictureUrl || null,
        rating: profile.rating || 5.0,
        services: profile.services || [],
      },
      targetProviderId: pId,
      targetProviderName: profile.fullName,
      targetProviderAvatarUrl: profile.profilePictureUrl || null,
      targetProviderRating: profile.rating || 5.0,
      categoryId: catId,
    });
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
          <ActivityIndicator size="large" color={colors.primary} />
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

  // Compile carousel images — prefer per-listing photos if a specific listing was selected
  const images: string[] = [];
  const addImage = (u?: string | null) => {
    const full = getFullImageUrl(u);
    if (full && !images.includes(full)) images.push(full);
  };
  if (currentListing?.portfolioList && Array.isArray(currentListing.portfolioList) && currentListing.portfolioList.length > 0) {
    // Per-listing photos from the selected listing
    currentListing.portfolioList.forEach((url: string) => addImage(url));
  } else if (currentListing?.listingPortfolio) {
    // Fallback: comma-separated string from the entity
    String(currentListing.listingPortfolio).split(',').forEach((url: string) => addImage(url.trim()));
  } else {
    // No listing selected — use provider's shared heroImage and portfolio
    addImage(profile.heroImageUrl);
    if (profile.portfolio && Array.isArray(profile.portfolio)) {
      profile.portfolio.forEach(url => addImage(url));
    }
  }
  const currentImage = images[selectedImageIndex] || null;

  const memberSince = profile.createdAt ? new Date(profile.createdAt).getFullYear() : '2026';

  return (
    <AnimatedBackground style={{ flex: 1 }}>
      <View style={styles.container}>
      {/* Top Header / Breadcrumb */}
      <View style={[styles.topHeader, { backgroundColor: colors.cardBackground, paddingTop: insets.top, height: 56 + insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, { backgroundColor: colors.background }]}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.breadcrumbWrap}>
          <Text style={[styles.breadcrumbText, { color: colors.text }]} numberOfLines={1}>
            {(currentListing?.category?.name) || profile.serviceCategory || 'Service Listing'} • {profile.fullName}
          </Text>
        </View>
        <TouchableOpacity onPress={handleToggleSave} style={[styles.iconBtn, { backgroundColor: colors.background }]}>
          <Ionicons 
            name={isSaved ? "bookmark" : "bookmark-outline"} 
            size={24} 
            color={isSaved ? colors.primary : colors.textMuted} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Hero Image / Carousel */}
        <View style={[styles.heroSection, { backgroundColor: colors.background }]}>
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
            <View style={[styles.heroPlaceholder, { backgroundColor: colors.background }]}>
              <Ionicons name="storefront-outline" size={64} color={colors.textMuted} />
              <Text style={styles.heroPlaceholderText}>No photo preview available</Text>
            </View>
          )}

          {/* Carousel Thumbnails */}
          {images.length > 1 && (
            <View style={[styles.thumbnailsContainer, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
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
        <View style={[styles.mainInfoCard, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <View style={styles.verifiedRow}>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.verifiedText, { color: colors.success }]}>Verified Pro</Text>
            </View>
            {!!profile.serviceCategory && (
              <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(255, 120, 70, 0.08)', borderColor: 'rgba(255, 120, 70, 0.25)', borderWidth: 1.5, marginLeft: 8 }]}>
                <Ionicons name="pricetag-outline" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.verifiedText, { color: colors.primary }]}>Category: {profile.serviceCategory}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.listingTitle, { color: colors.text }]}>{profile.fullName}</Text>

          <View style={styles.metaRow}>
            <RatingBadge rating={profile.rating || 0} reviewCount={profile.completedJobsCount} size="medium" />
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{profile.location || 'Campus Area'}</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>{profile.viewCount || 0} views</Text>
          </View>

          {/* Contact & Request CTAs */}
          <View style={[styles.ctaContainer, { backgroundColor: colors.primaryLight }]}>
            <TouchableOpacity 
              style={[styles.ctaBtn, styles.ctaBtnPrimary, { backgroundColor: colors.primary }]} 
              onPress={handleRequestQuote}
              activeOpacity={0.85}
            >
              <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
              <Text style={[styles.ctaBtnText, { color: '#FFFFFF' }]}>Request Quote</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.ctaBtn} onPress={handleChat} activeOpacity={0.8}>
              <Ionicons name="chatbubbles-outline" size={16} color={colors.primaryDark} />
              <Text style={[styles.ctaBtnText, { color: colors.primaryDark }]}>Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.ctaBtn} onPress={handleCallNow} activeOpacity={0.8}>
              <Ionicons name="call-outline" size={16} color={colors.primaryDark} />
              <Text style={[styles.ctaBtnText, { color: colors.primaryDark }]}>Call</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs Bar */}
        <View style={[styles.tabsBarWrapper, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
          <View style={[styles.tabsBar, { backgroundColor: colors.primaryLight }]}>
            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'about' && [styles.tabItemActive, { backgroundColor: colors.primary }]]}
              onPress={() => setActiveTab('about')}
            >
              <Text style={[styles.tabText, activeTab === 'about' ? styles.tabTextActive : { color: colors.textMuted }]}>Description</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'services' && [styles.tabItemActive, { backgroundColor: colors.primary }]]}
              onPress={() => setActiveTab('services')}
            >
              <Text style={[styles.tabText, activeTab === 'services' ? styles.tabTextActive : { color: colors.textMuted }]}>Key Services</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'reviews' && [styles.tabItemActive, { backgroundColor: colors.primary }]]}
              onPress={() => setActiveTab('reviews')}
            >
              <Text style={[styles.tabText, activeTab === 'reviews' ? styles.tabTextActive : { color: colors.textMuted }]}>
                Reviews ({reviews.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab 1: About / Description */}
        {activeTab === 'about' && (
          <View style={[styles.tabContentCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>About this Service</Text>
            <Text style={[styles.bioText, { color: colors.text }]}>
              {(currentListing?.description) ||
               (currentListing?.listingDescription) ||
               profile.bio ||
               'This seller has not provided a detailed biography yet. Contact them directly to inquire about their services, turnaround times, and rates.'}
            </Text>

            {((): string[] => {
              const tags: string[] = currentListing?.keyServicesList ||
                (currentListing?.listingKeyServices ? String(currentListing.listingKeyServices).split(',').map((s: string) => s.trim()).filter(Boolean) : null) ||
                profile.keyServices || [];
              return tags;
            })().length > 0 && (
              <>
                <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 20 }]}>Service Highlights</Text>
                <View style={styles.tagsContainer}>
                  {(currentListing?.keyServicesList ||
                    (currentListing?.listingKeyServices ? String(currentListing.listingKeyServices).split(',').map((s: string) => s.trim()).filter(Boolean) : null) ||
                    profile.keyServices || []).map((tag: string, idx: number) => (
                    <View key={idx} style={styles.tagPill}>
                      <Ionicons name="pricetag-outline" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <View style={[styles.sellerInfoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.sellerInfoTitle, { color: colors.text }]}>Seller Verification & Tenure</Text>
              <View style={styles.sellerInfoRow}>
                <Ionicons name="shield-checkmark" size={18} color={colors.success} />
                <Text style={[styles.sellerInfoText, { color: colors.textMuted }]}>Identity & Role Verified by CampusServ</Text>
              </View>
              <View style={styles.sellerInfoRow}>
                <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.sellerInfoText, { color: colors.textMuted }]}>Member since {memberSince}</Text>
              </View>
              <View style={styles.sellerInfoRow}>
                <Ionicons name="briefcase-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.sellerInfoText, { color: colors.textMuted }]}>{profile.completedJobsCount || 0} completed campus orders</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tab 2: Key Services & Pricing */}
        {activeTab === 'services' && (
          <View style={[styles.tabContentCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Service Offerings & Base Prices</Text>
            {profile.services && profile.services.length > 0 ? (
              profile.services.map((svc: any, idx: number) => (
                <View key={idx} style={[styles.serviceItem, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.serviceTitle, { color: colors.text }]}>{svc.title || 'Standard Service'}</Text>
                    {!!svc.category?.name && (
                      <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700', marginBottom: 2 }}>
                        Category: {svc.category.name}
                      </Text>
                    )}
                    {!!svc.description && <Text style={[styles.serviceDesc, { color: colors.textMuted }]}>{svc.description}</Text>}
                  </View>
                  <View style={[styles.servicePriceTag, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.servicePriceText, { color: colors.text }]}>Contact for quote</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Standard service rates apply. Request a quote for details.</Text>
            )}

            {/* Seller's other listings */}
            <View style={{ marginTop: 24 }}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>More Listings by this Seller</Text>
              {loadingListings ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : sellerListings && sellerListings.length > 0 ? (
                sellerListings.map((ad: any, idx: number) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.sellerAdCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => navigation.push('ListingDetail', { providerId, selectedListing: ad })}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="megaphone-outline" size={20} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.sellerAdTitle, { color: colors.text }]}>{ad.title || ad.category?.name || 'Campus Listing'}</Text>
                      <Text style={styles.sellerAdPrice}>{ad.basePrice ? `From GHS ${ad.basePrice}` : 'Negotiable'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No additional active listings.</Text>
              )}
            </View>
          </View>
        )}

        {/* Tab 3: Reviews */}
        {activeTab === 'reviews' && (
          <View style={[styles.tabContentCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Student Reviews ({reviews.length})</Text>
            {loadingReviews ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : reviews && reviews.length > 0 ? (
              reviews.map((rev: any, idx: number) => (
                <View key={idx} style={[styles.reviewItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.reviewHeader}>
                    <View style={[styles.reviewerAvatar, { backgroundColor: colors.background }]}>
                      <Text style={[styles.reviewerAvatarText, { color: colors.text }]}>
                        {(rev.reviewerName || 'Student').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.reviewerName, { color: colors.text }]}>{rev.reviewerName || 'Verified Student'}</Text>
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
                  <Text style={[styles.reviewComment, { color: colors.text }]}>{rev.comment || 'Great service and timely delivery!'}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyReviews}>
                <Ionicons name="chatbox-ellipses-outline" size={40} color="#94A3B8" />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No reviews yet. Book this service to be the first!</Text>
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
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Report Listing</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
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

            <Text style={[styles.inputLabel, { color: colors.text }]}>Additional Details (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
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
    </View>
    </AnimatedBackground>
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
    borderBottomColor: '#F1F5F9',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  breadcrumbWrap: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  breadcrumbText: {
    fontSize: 14,
    fontFamily: 'System',
    fontWeight: '700',
    color: '#0F172A',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  heroImage: {
    width: width,
    height: 240,
  },
  heroPlaceholder: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 120, 70, 0.05)',
  },
  heroPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'System',
    fontWeight: '600',
    color: '#FF7846',
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
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbWrapActive: {
    borderColor: '#FF7846',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  mainInfoCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  verifiedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EAF6F0',
  },
  verifiedText: {
    fontSize: 12,
    fontFamily: 'System',
    fontWeight: '700',
    color: '#1B8A55',
  },
  priceTagWrap: {
    backgroundColor: 'rgba(255, 120, 70, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceTagText: {
    fontSize: 14,
    fontFamily: 'System',
    fontWeight: '800',
    color: '#FF7846',
  },
  listingTitle: {
    fontSize: 22,
    fontFamily: 'System',
    fontWeight: '800',
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
    fontFamily: 'System',
    fontWeight: '500',
    color: '#64748B',
  },
  ctaContainer: {
    flexDirection: 'row',
    borderRadius: 30,
    padding: 4,
  },
  ctaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 26,
    gap: 6,
  },
  ctaBtnPrimary: {
    flex: 1.5,
    backgroundColor: '#FF7846',
    shadowColor: '#FF7846',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnText: {
    fontSize: 14,
    fontFamily: 'System',
    fontWeight: '700',
  },
  tabsBarWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabsBar: {
    flexDirection: 'row',
    borderRadius: 30,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 26,
  },
  tabItemActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'System',
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabContentCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    minHeight: 250,
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: 'System',
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  bioText: {
    fontSize: 14,
    fontFamily: 'System',
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
    backgroundColor: 'rgba(255, 120, 70, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 120, 70, 0.15)',
  },
  tagText: {
    fontSize: 13,
    fontFamily: 'System',
    fontWeight: '600',
    color: '#FF7846',
  },
  sellerInfoBox: {
    marginTop: 24,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  sellerInfoTitle: {
    fontSize: 14,
    fontFamily: 'System',
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  sellerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sellerInfoText: {
    fontSize: 13,
    fontFamily: 'System',
    fontWeight: '500',
    color: '#475569',
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
    fontFamily: 'System',
    fontWeight: '700',
    color: '#0F172A',
  },
  serviceDesc: {
    fontSize: 13,
    fontFamily: 'System',
    color: '#64748B',
    marginTop: 2,
  },
  servicePriceTag: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  servicePriceText: {
    fontSize: 13,
    fontFamily: 'System',
    fontWeight: '700',
    color: '#334155',
  },
  sellerAdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  sellerAdTitle: {
    fontSize: 14,
    fontFamily: 'System',
    fontWeight: '700',
    color: '#0F172A',
  },
  sellerAdPrice: {
    fontSize: 13,
    fontFamily: 'System',
    fontWeight: '600',
    color: '#FF7846',
    marginTop: 2,
  },
  reviewItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerAvatarText: {
    fontSize: 16,
    fontFamily: 'System',
    fontWeight: '700',
    color: '#475569',
  },
  reviewerName: {
    fontSize: 14,
    fontFamily: 'System',
    fontWeight: '700',
    color: '#0F172A',
  },
  reviewComment: {
    fontSize: 13,
    fontFamily: 'System',
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
    fontFamily: 'System',
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
    fontFamily: 'System',
    fontWeight: '600',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
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
    fontFamily: 'System',
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: 'System',
    color: '#64748B',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'System',
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'System',
    color: '#0F172A',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  modalSubmitBtn: {
    backgroundColor: '#FF7846',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  modalSubmitBtnText: {
    fontSize: 15,
    fontFamily: 'System',
    fontWeight: '700',
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
    fontFamily: 'System',
    fontWeight: '600',
    color: '#475569',
  },
  reasonChipTextActive: {
    color: '#EF4444',
    fontWeight: '800',
  },
});
