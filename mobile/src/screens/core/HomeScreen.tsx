import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Dimensions,
  Image,
  ImageBackground,
  Alert,
  ScrollView,
  Modal,
  Animated,
  Easing,
  Switch,
  Platform,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabSpacing } from '../../hooks/useBottomTabSpacing';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { api, BASE_URL } from '../../services/api';
import { stompClient } from '../../services/socket';
import { CustomIonicons } from '../../components/CustomIcons';
import { CategoryIcon } from '../../utils/categoryIcons';
import { useTheme } from '../../styles/ThemeContext';
import RatingModal from '../../components/RatingModal';
import { useToast } from '../../styles/ToastContext';
import { RoleSwitcher } from '../../components/RoleSwitcher';
import { SecondaryRoleStatusBanner } from '../../components/SecondaryRoleStatusBanner';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getChats } from '../../services/chatService';
import { getProviders } from '../../services/userService';
import ProviderFeedCard from '../../components/ProviderFeedCard';
import { getGreeting, formatGreeting } from '../../utils/greeting';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getStatusColor = (status: string, colors: any) => {
  switch (status) {
    case 'OPEN': return colors.success;
    case 'IN_PROGRESS': return colors.primary;
    case 'COMPLETED': return colors.success;
    case 'CANCELLED': return colors.error;
    default: return colors.warning;
  }
};

const getStatusBg = (status: string, colors: any) => {
  switch (status) {
    case 'OPEN': return colors.successLight;
    case 'IN_PROGRESS': return colors.warningLight;
    case 'COMPLETED': return colors.successLight;
    case 'CANCELLED': return colors.errorLight;
    default: return colors.warningLight;
  }
};

const HomeScreenRequestCard = React.memo(({ item, colors, onPress }: { item: any; colors: any; onPress: () => void }) => {
  const stripColor = getStatusColor(item.status, colors);
  return (
    <TouchableOpacity
      style={[styles.requestCard, { backgroundColor: colors.cardBackground }]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`View request details for ${item.category?.name || 'Service'}`}
    >
      <View style={[styles.cardStrip, { backgroundColor: stripColor }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={[styles.cardCategory, { color: colors.textMuted, flex: 1, marginRight: 8 }]} numberOfLines={1}>
            Category: {item.category?.name || 'Service'}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: getStatusBg(item.status, colors) }]}>
            <Text style={[styles.statusPillText, { color: stripColor }]}>
              {item.status?.replace('_', ' ')}
            </Text>
          </View>
        </View>
        <Text style={[styles.cardDesc, { color: colors.text }]} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.cardFooter}>
          <View style={[styles.cardMeta, { flex: 1, marginRight: 8 }]}>
            <CustomIonicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.cardMetaText, { color: colors.textMuted, flex: 1 }]} numberOfLines={1} ellipsizeMode="tail">
              {item.location || 'Campus'}
            </Text>
          </View>
          {(() => {
            const rawPrice = item.agreedPrice ?? item.acceptedOffer?.price ?? item.finalBudget ?? item.price ?? item.counterOffer?.price ?? item.budgetMin ?? item.budgetMax;
            const priceText = rawPrice != null && !isNaN(Number(rawPrice)) && Number(rawPrice) > 0
              ? `GHS ${Number(rawPrice).toFixed(2)}`
              : 'Contact for quote';
            return (
              <Text style={[styles.cardPrice, { color: colors.primary, flexShrink: 0 }]} numberOfLines={1}>
                {priceText}
              </Text>
            );
          })()}
        </View>

      </View>
      <View style={[styles.cardChevron, { backgroundColor: colors.inputBackground }]}>
        <CustomIonicons name="arrow-forward" size={14} color={colors.text} />
      </View>
    </TouchableOpacity>
  );
});

// SearchBar component removed. Search is handled inline.

const LOCAL_IMAGES = {
  food: require('../../../assets/images/home/food.jpg'),
  fashion: require('../../../assets/images/home/fashion.jpg'),
  electronic: require('../../../assets/images/home/electronic2.jpg'),
  beauty: require('../../../assets/images/home/beauty.jpg'),
  repair: require('../../../assets/images/home/repair2.jpg'),
  errand: require('../../../assets/images/home/errand.jpg'),
  tutor: require('../../../assets/images/home/tutor.jpg'),
  laundry: require('../../../assets/images/home/laundry.jpg'),
  cleaning: require('../../../assets/images/home/cleaning.png'),
  design_print: require('../../../assets/images/home/design_print.png'),
  fallback: require('../../../assets/images/home/browse_services.jpg'),
  new_request: require('../../../assets/images/home/new_request.jpg'),
  browse_services: require('../../../assets/images/home/browse_services.jpg'),
  my_requests: require('../../../assets/images/home/my_requests.jpg'),
  my_wallet: require('../../../assets/images/home/my_wallet.jpg'),
  photo_video: require('../../../assets/images/home/photo_video2.jpg'),
  catering: require('../../../assets/images/home/catering.jpg'),
};

const getCategoryImageUrl = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('food')) return LOCAL_IMAGES.food;
  if (n.includes('fashion') || n.includes('cloth')) return LOCAL_IMAGES.fashion;
  if (n.includes('electronic') || n.includes('gadget')) return LOCAL_IMAGES.electronic;
  if (n.includes('styl') || n.includes('groom') || n.includes('beauty') || n.includes('hair')) return LOCAL_IMAGES.beauty;
  if (n.includes('repair') || n.includes('tech') || n.includes('mechanic')) return LOCAL_IMAGES.repair;
  if (n.includes('errand') || n.includes('deliver') || n.includes('shop')) return LOCAL_IMAGES.errand;
  if (n.includes('tutor') || n.includes('academic')) return LOCAL_IMAGES.tutor;
  if (n.includes('clean')) return LOCAL_IMAGES.cleaning;
  if (n.includes('laundry')) return LOCAL_IMAGES.laundry;
  if (n.includes('photo') || n.includes('video') || n.includes('camera')) return LOCAL_IMAGES.photo_video;
  if (n.includes('design') || n.includes('print')) return LOCAL_IMAGES.design_print;
  if (n.includes('cater') || n.includes('event')) return LOCAL_IMAGES.catering;
  
  // Generic fallback
  return LOCAL_IMAGES.fallback;
};

export default function HomeScreen({ route, navigation }: any) {
  const { user, accessToken } = useAuthStore();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const bottomTabSpacing = useBottomTabSpacing();

  // Time-of-day greeting logic
  const [greetingText, setGreetingText] = useState('');

  const updateGreeting = useCallback(() => {
    const greetingPrefix = getGreeting(new Date());
    const formatted = formatGreeting(greetingPrefix, user?.fullName);
    setGreetingText(formatted);
  }, [user?.fullName]);

  useEffect(() => {
    updateGreeting();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        updateGreeting();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [updateGreeting]);

  const { data: chatThreads } = useQuery<any[]>({
    queryKey: ['chat-list'],
    queryFn: getChats,
    staleTime: 30000,
  });

  const unreadChatCount = chatThreads?.reduce((acc, t) => acc + (t.unreadCount || 0), 0) || 0;

  // Data State
  const [balance, setBalance] = useState('0.00');
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [availableRequests, setAvailableRequests] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [pendingReview, setPendingReview] = useState<any>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Filter Modal & Temp States
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [minRating, setMinRating] = useState<number>(0.0);
  const [sortOrder, setSortOrder] = useState<string>('discover');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  const [tempMinRating, setTempMinRating] = useState<number>(0.0);
  const [tempSortOrder, setTempSortOrder] = useState<string>('discover');
  const [tempVerifiedOnly, setTempVerifiedOnly] = useState<boolean>(false);
  const [tempMinPrice, setTempMinPrice] = useState<string>('');
  const [tempMaxPrice, setTempMaxPrice] = useState<string>('');

  // Load and query providers feed for student
  const {
    data: providerPages,
    isLoading: loadingProviders,
    isRefetching: refetchingProviders,
    fetchNextPage: fetchNextProvidersPage,
    hasNextPage: hasNextProvidersPage,
    isFetchingNextPage: fetchingNextProvidersPage,
    refetch: refetchProvidersFeed
  } = useInfiniteQuery({
    queryKey: [
      'providers-feed',
      debouncedQuery,
      activeCategory,
      minRating,
      sortOrder,
      verifiedOnly,
      minPrice,
      maxPrice
    ],
    queryFn: async ({ pageParam = 0 }) => {
      return getProviders(
        activeCategory || undefined, // categoryName
        minRating, // minRating
        pageParam as number, // page
        10, // size
        sortOrder, // sort
        debouncedQuery.trim() || undefined, // name query
        verifiedOnly || undefined, // verifiedOnly
        minPrice ? Number(minPrice) : undefined, // minPrice
        maxPrice ? Number(maxPrice) : undefined // maxPrice
      );
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: any) => {
      return lastPage.currentPage < lastPage.totalPages - 1 ? lastPage.currentPage + 1 : undefined;
    },
    enabled: user?.role === 'STUDENT' || user?.role === 'ADMIN', // Only run for student
  });

  const providers = React.useMemo(() => {
    return providerPages?.pages.flatMap(page => page.content) || [];
  }, [providerPages]);

  const isAnyFilterActive = useMemo(() => {
    return (
      activeCategory !== null ||
      minRating > 0.0 ||
      verifiedOnly ||
      !!minPrice ||
      !!maxPrice ||
      sortOrder !== 'discover'
    );
  }, [activeCategory, minRating, verifiedOnly, minPrice, maxPrice, sortOrder]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activeCategory) count += 1;
    if (minRating > 0.0) count += 1;
    if (verifiedOnly) count += 1;
    if (minPrice || maxPrice) count += 1;
    if (sortOrder !== 'discover') count += 1;
    return count;
  }, [activeCategory, minRating, verifiedOnly, minPrice, maxPrice, sortOrder]);

  const clearAllFilters = () => {
    setActiveCategory(null);
    setMinRating(0.0);
    setSortOrder('discover');
    setVerifiedOnly(false);
    setMinPrice('');
    setMaxPrice('');
    
    // Clear temp states too
    setTempMinRating(0.0);
    setTempSortOrder('discover');
    setTempVerifiedOnly(false);
    setTempMinPrice('');
    setTempMaxPrice('');
  };

  const handleOpenFilterModal = () => {
    setTempMinRating(minRating);
    setTempSortOrder(sortOrder);
    setTempVerifiedOnly(verifiedOnly);
    setTempMinPrice(minPrice);
    setTempMaxPrice(maxPrice);
    setIsFilterModalVisible(true);
  };

  const handleApplyFilters = () => {
    setMinRating(tempMinRating);
    setSortOrder(tempSortOrder);
    setVerifiedOnly(tempVerifiedOnly);
    setMinPrice(tempMinPrice);
    setMaxPrice(tempMaxPrice);
    setIsFilterModalVisible(false);
  };


  // UI States

  const isProvider = user?.role === 'PROVIDER';
  const insets = useSafeAreaInsets();
  const searchInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  // Derived Search Mode Check
  const isSearchMode = searchQuery.trim().length > 0 || activeCategory !== null;

  // Debouncing Search Input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handle Route params (focusSearch and categoryId)
  useFocusEffect(
    useCallback(() => {
      if (route.params?.focusSearch) {
        flatListRef.current?.scrollToOffset({ offset: 70, animated: true });
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 200);
        navigation.setParams({ focusSearch: undefined });
      } else if (route.params?.categoryId) {
        setActiveCategory(route.params.categoryId);
        flatListRef.current?.scrollToOffset({ offset: 70, animated: true });
        navigation.setParams({ categoryId: undefined });
      }
    }, [route.params])
  );

  const fetchData = async () => {
    try {
      // Load active announcement
      api.get('/announcements/active').then(res => {
        if (res.data && res.data.length > 0) {
          setAnnouncement(res.data[0]);
          setShowAnnouncement(true);
        }
      }).catch(err => console.log('Announcements fetch error:', err));

      if (!isProvider) {
        // TODO: Backend does not have a GET /reviews/pending endpoint implemented yet.
        // Uncomment this once the backend implements it to avoid 500 errors.
        /*
        api.get('/reviews/pending').then(res => {
          if (res.data && res.data.length > 0) {
            setPendingReview(res.data[0]);
            setShowRatingModal(true);
          } else {
            setPendingReview(null);
            setShowRatingModal(false);
          }
        }).catch(err => console.log('Pending reviews fetch error:', err));
        */
      }

      const [walletRes, requestsRes, catRes] = await Promise.all([
        api.get('/payments/student/wallet').catch(() => ({ data: { balance: 0.00 } })),
        api.get('/requests').catch(() => ({ data: { content: [] } })),
        api.get('/categories').catch(() => ({ data: [] }))
      ]);
      setBalance(Number(walletRes.data.balance || 0).toFixed(2));
      const allReqs = requestsRes.data.content || [];
      setAllRequests(allReqs);
      setCategories(catRes.data || []);

      if (isProvider) {
        setAvailableRequests(allReqs);
      } else {
        setMyRequests(allReqs.filter((r: any) => r.requesterId === user?.id));
        refetchProvidersFeed();
      }
    } catch (err) {
      // Silent catch
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // STOMP subscription for live announcements + bid events
  useEffect(() => {
    if (!accessToken) return;
    let subAnnouncementId = '';
    let subBidId = '';
    stompClient.connect(
      accessToken,
      () => {
        // Announcements
        subAnnouncementId = stompClient.subscribe('/topic/announcements', (msg: any) => {
          if (msg.isActive !== false) {
            setAnnouncement(msg);
            setShowAnnouncement(true);
          }
        });

        // New bid received (client side)
        if (!isProvider && user?.id) {
          subBidId = stompClient.subscribe(`/topic/client/${user.id}/bids`, (msg: any) => {
            showToast({
              status: 'cta',
              title: 'New Bid Received!',
              subtitle: msg.providerName ? `${msg.providerName} placed a bid on your request.` : 'A provider placed a bid on your request.',
              duration: 6000,
            });
            // Refresh requests to show updated bid count
            fetchData();
          });
        }
      },
      () => {
        // WS disconnected
        showToast({ status: 'warning', title: 'Connection Lost', subtitle: 'Reconnecting to live updates…', duration: 3000 });
      }
    );
    return () => {
      if (subAnnouncementId) stompClient.unsubscribe(subAnnouncementId);
      if (subBidId) stompClient.unsubscribe(subBidId);
    };
  }, [accessToken, user?.id, isProvider]);

  // Filter requests based on search and category
  useEffect(() => {
    let list = [...allRequests];
    if (activeCategory) {
      list = list.filter((r: any) => r.category?.name === activeCategory);
    }
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      list = list.filter((r: any) =>
        r.description?.toLowerCase().includes(q) || r.category?.name?.toLowerCase().includes(q)
      );
    }
    setFilteredRequests(list);
  }, [allRequests, activeCategory, debouncedQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCategoryToggle = (catId: string, catName: string) => {
    if (activeCategory === catName) {
      setActiveCategory(null);
    } else {
      setActiveCategory(catName);
    }
  };

  const handleClearAll = () => {
    setSearchQuery('');
    setActiveCategory(null);
  };


  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getFullImageUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) return url;
    return `${BASE_URL}${url}`;
  };

  // scroll listener removed

  const renderItem = useCallback(({ item }: any) => {
    if (isProvider) {
      return (
        <HomeScreenRequestCard
          item={item}
          colors={colors}
          onPress={() => navigation.navigate('RequestDetails', { requestId: item.id })}
        />
      );
    } else {
      return (
        <ProviderFeedCard
          provider={item}
          onPress={() => navigation.navigate('ListingDetail', { 
            providerId: (item as any).id || item.providerId,
            selectedListing: item.services?.[0]
          })}
        />
      );
    }
  }, [isProvider, colors, navigation]);

  const renderActiveFilterChips = () => {
    const chips = [];
    if (activeCategory) {
      chips.push({
        id: 'category',
        label: activeCategory,
        onRemove: () => setActiveCategory(null),
      });
    }

    if (searchQuery.trim().length > 0) {
      chips.push({
        id: 'query',
        label: `"${searchQuery}"`,
        onRemove: () => setSearchQuery(''),
      });
    }

    if (chips.length === 0) return null;

    return (
      <View style={styles.filterChipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsScroll}>
          {chips.map((chip) => (
            <TouchableOpacity
              key={chip.id}
              style={[styles.filterChip, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              onPress={chip.onRemove}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${chip.label} filter`}
            >
              <Text style={[styles.filterChipText, { color: colors.text }]}>{chip.label} ✕</Text>
            </TouchableOpacity>
          ))}
          {chips.length >= 2 && (
            <TouchableOpacity
              style={styles.clearAllBtn}
              onPress={handleClearAll}
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
            >
              <Text style={[styles.clearAllText, { color: colors.primary }]}>Clear all</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderActiveRequestsSection = () => {
    if (isProvider) return null;
    
    // Filter active requests
    const activeReqs = myRequests.filter(r => r.status !== 'COMPLETED' && r.status !== 'CANCELLED');

    return (
      <View style={{ marginBottom: 24 }}>
        <View style={[styles.sectionHeader, { justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Requests</Text>
          {activeReqs.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('MyRequests')}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>See All</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {activeReqs.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.inputBackground, marginHorizontal: 16 }]}>
            <CustomIonicons name="cube-outline" size={40} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No active requests</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Post a request to get offers from campus providers.
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.accent }]}
              onPress={() => navigation.navigate('PostRequest')}
            >
              <Text style={styles.emptyBtnText}>Post a Request</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }}
          >
            {activeReqs.map((item) => {
              const stripColor = getStatusColor(item.status, colors);
              const getStatusBg = (status: string, colors: any) => {
                switch (status) {
                  case 'OPEN': return colors.successLight;
                  case 'IN_PROGRESS': return colors.warningLight;
                  case 'COMPLETED': return colors.successLight;
                  case 'CANCELLED': return colors.errorLight;
                  default: return colors.warningLight;
                }
              };
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.horizontalRequestCard,
                    { backgroundColor: colors.cardBackground, borderColor: colors.border }
                  ]}
                  onPress={() => navigation.navigate('RequestDetails', { requestId: item.id })}
                  activeOpacity={0.88}
                >
                  <View style={[styles.cardStrip, { backgroundColor: stripColor }]} />
                  <View style={{ flex: 1, padding: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', flex: 1, marginRight: 6 }} numberOfLines={1}>
                        {item.category?.name || 'Service'}
                      </Text>
                      <View style={[styles.statusPill, { backgroundColor: getStatusBg(item.status, colors), paddingHorizontal: 6, paddingVertical: 2 }]}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: stripColor, textTransform: 'uppercase' }}>
                          {item.status?.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 }} numberOfLines={2}>
                      {item.description}
                    </Text>
                    {(() => {
                      const rawPrice = item.agreedPrice ?? item.acceptedOffer?.price ?? item.finalBudget ?? item.price;
                      return (
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary }}>
                          {rawPrice != null && !isNaN(Number(rawPrice)) && Number(rawPrice) > 0 ? `GHS ${Number(rawPrice).toFixed(2)}` : 'Quote pending'}
                        </Text>
                      );
                    })()}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  };

  if (loading || (loadingProviders && !isProvider)) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const browseRequests = isProvider ? availableRequests : myRequests;
  const listData = isProvider 
    ? (isSearchMode ? filteredRequests : browseRequests.slice(0, 5))
    : providers;

  return (
    <View style={[styles.root, { backgroundColor: 'transparent', paddingTop: insets.top, overflow: 'hidden' }]}>

      {/* Slide-up Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isFilterModalVisible}
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={() => setIsFilterModalVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
              <TouchableOpacity onPress={clearAllFilters}>
                <Text style={[styles.resetFiltersLink, { color: colors.primary }]}>Reset All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Sort Order Selector */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.text }]}>Sort By</Text>
                <View style={styles.sortPillsRow}>
                  {[
                    { id: 'discover', label: 'Discover' },
                    { id: 'rating', label: 'Highest Rated' },
                    { id: 'jobs', label: 'Most Reviewed' },
                    { id: 'newest', label: 'Newest' },
                    { id: 'price-low', label: 'Price: Low to High' },
                    { id: 'price-high', label: 'Price: High to Low' },
                  ].map(option => {
                    const isSelected = tempSortOrder === option.id;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.sortPill,
                          { borderColor: colors.border, backgroundColor: colors.inputBackground },
                          isSelected ? { backgroundColor: colors.primary, borderColor: colors.primary } : null,
                        ]}
                        onPress={() => setTempSortOrder(option.id)}
                      >
                        <Text style={[styles.sortPillText, { color: colors.text }, isSelected ? { color: '#FFF' } : null]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Minimum Rating Selector */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.text }]}>Minimum Rating</Text>
                <View style={styles.ratingRowSelect}>
                  {[0.0, 3.0, 4.0, 4.5].map(ratingValue => {
                    const isSelected = tempMinRating === ratingValue;
                    return (
                      <TouchableOpacity
                        key={ratingValue}
                        style={[
                          styles.ratingPill,
                          { borderColor: colors.border, backgroundColor: colors.inputBackground },
                          isSelected ? { backgroundColor: colors.primary, borderColor: colors.primary } : null,
                        ]}
                        onPress={() => setTempMinRating(ratingValue)}
                      >
                        <Text style={[styles.ratingPillText, { color: colors.text }, isSelected ? { color: '#FFF' } : null]}>
                          {ratingValue === 0.0 ? 'Any' : `${ratingValue} ★ & up`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Verified Badge Switch */}
              <View style={[styles.filterSection, styles.toggleRow]}>
                <View>
                  <Text style={[styles.filterLabel, { color: colors.text, marginBottom: 2 }]}>Verified Pro Status</Text>
                  <Text style={{ fontSize: 13, color: colors.textMuted }}>Show verified experts only</Text>
                </View>
                <Switch
                  value={tempVerifiedOnly}
                  onValueChange={setTempVerifiedOnly}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={Platform.OS === 'android' ? '#FFF' : undefined}
                />
              </View>

              {/* Price Range */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.text }]}>Price Range (GHS)</Text>
                <View style={styles.priceInputRow}>
                  <TextInput
                    style={[styles.priceInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                    placeholder="Min Price"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    value={tempMinPrice}
                    onChangeText={setTempMinPrice}
                  />
                  <Text style={{ color: colors.textMuted, marginHorizontal: 8 }}>to</Text>
                  <TextInput
                    style={[styles.priceInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                    placeholder="Max Price"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    value={tempMaxPrice}
                    onChangeText={setTempMaxPrice}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={handleApplyFilters}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Announcement Modal */}
      <Modal visible={showAnnouncement} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={[styles.announcementModal, { backgroundColor: colors.cardBackground }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <CustomIonicons
                name={announcement?.severity === 'CRITICAL' ? 'warning' : 'information-circle'}
                size={24}
                color={announcement?.severity === 'CRITICAL' ? colors.error : colors.primary}
              />
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginLeft: 10, flex: 1 }}>
                {announcement?.title}
              </Text>
            </View>
            <Text style={{ fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: 24 }}>
              {announcement?.message}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.text, paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
              onPress={() => setShowAnnouncement(false)}
            >
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Fixed Header Bar ── */}
      <View style={[styles.headerBar, { paddingTop: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'space-between' }]}>
        {/* Left: Spacer for center alignment balance */}
        <View style={{ width: 40 }} />

        {/* Center: App Logo */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: -0.5 }}>
            Campu<Text style={{ color: colors.primary }}>Serv</Text>
          </Text>
        </View>

        {/* Right actions */}
        <View style={[styles.headerRight, { gap: 12 }]}>
          <RoleSwitcher />
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.cardBackground, position: 'relative' }]}
            onPress={() => navigation.navigate('ChatList')}
            accessibilityLabel="Open Messages"
          >
            <CustomIonicons name="chatbubbles-outline" size={18} color={colors.text} />
            {unreadChatCount > 0 && (
              <View style={[styles.badgeContainer, { borderColor: colors.cardBackground }]}>
                <Text style={styles.badgeText}>
                  {unreadChatCount > 99 ? '99+' : unreadChatCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.cardBackground }]}
            onPress={() => navigation.navigate('NotificationCenter')}
            accessibilityLabel="Open Notifications"
          >
            <CustomIonicons name="notifications-outline" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Status Banner for Pending/Rejected Secondary Role Applications */}
      <SecondaryRoleStatusBanner navigation={navigation} />

      <FlatList
        ref={flatListRef}
        key={isProvider ? 'provider-list' : 'student-list'}
        numColumns={1}
        data={listData}
        keyExtractor={(item) => item.id || item.providerId}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomTabSpacing }]}
        ItemSeparatorComponent={isProvider ? () => <View style={{ height: 12 }} /> : null}
        onEndReached={() => {
          if (!isProvider && hasNextProvidersPage && !fetchingNextProvidersPage) {
            fetchNextProvidersPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <>
            {/* Pending Review CTA */}
            {pendingReview && (
              <TouchableOpacity
                style={{ backgroundColor: colors.warning, padding: 16, borderRadius: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}
                onPress={() => setShowRatingModal(true)}
              >
                <CustomIonicons name="star" size={24} color="#FFF" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>Pending Rating</Text>
                  <Text style={{ color: '#FFF', fontSize: 13, marginTop: 2 }}>Please rate your recent completed job.</Text>
                </View>
                <CustomIonicons name="arrow-forward" size={20} color="#FFF" />
              </TouchableOpacity>
            )}
            {/* Active Filter Chips */}
            {renderActiveFilterChips()}


            {/* Service Feed Search & Filters */}
            {!isProvider && (
              <View style={{ paddingHorizontal: 16, marginBottom: 16, marginTop: 8 }}>
                {greetingText ? (
                  <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 6 }}>
                    {greetingText}
                  </Text>
                ) : null}
                <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.8 }}>
                  Explore Campus Services
                </Text>
                
                {/* Feed Search Input and Filter Button */}
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <View style={[styles.feedSearchInputWrap, { backgroundColor: colors.inputBackground, borderColor: colors.border, flex: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1 }]}>
                    <CustomIonicons name="search-outline" size={20} color={colors.textMuted} style={{ opacity: 0.7, marginRight: 8 }} />
                    <TextInput
                      ref={searchInputRef}
                      style={[styles.feedSearchInput, { color: colors.text, flex: 1, paddingVertical: 8 }]}
                      placeholder="Search services..."
                      placeholderTextColor={colors.placeholderText}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      accessibilityLabel="Search services"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                        <CustomIonicons name="close-circle" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Dedicated Filter Button */}
                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      {
                        backgroundColor: isAnyFilterActive ? colors.primary : colors.inputBackground,
                        borderColor: isAnyFilterActive ? colors.primary : colors.border
                      }
                    ]}
                    onPress={handleOpenFilterModal}
                    activeOpacity={0.8}
                  >
                    <CustomIonicons name="options-outline" size={20} color={isAnyFilterActive ? '#FFF' : colors.text} />
                    {activeFiltersCount > 0 && (
                      <View style={[styles.filterBadge, { backgroundColor: isAnyFilterActive ? '#FFF' : colors.primary }]}>
                        <Text style={[styles.filterBadgeText, { color: isAnyFilterActive ? colors.primary : '#FFF' }]}>
                          {activeFiltersCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Category Filter Pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                  style={{ marginTop: 10 }}
                >
                  <TouchableOpacity
                    style={[
                      styles.categoryFilterPill,
                      activeCategory === null
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.inputBackground, borderColor: colors.border }
                    ]}
                    onPress={() => setActiveCategory(null)}
                  >
                    <Text
                      style={[
                        styles.categoryFilterPillText,
                        activeCategory === null
                          ? { color: '#FFF', fontWeight: '800' }
                          : { color: colors.text, fontWeight: '600' }
                      ]}
                    >
                      All Services
                    </Text>
                  </TouchableOpacity>

                  {categories.map((cat) => {
                    const isActive = activeCategory === cat.name;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryFilterPill,
                          isActive
                            ? { backgroundColor: colors.primary, borderColor: colors.primary }
                            : { backgroundColor: colors.inputBackground, borderColor: colors.border }
                        ]}
                        onPress={() => handleCategoryToggle(cat.id, cat.name)}
                      >
                        <Text
                          style={[
                            styles.categoryFilterPillText,
                            isActive
                              ? { color: '#FFF', fontWeight: '800' }
                              : { color: colors.text, fontWeight: '600' }
                          ]}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Section Header */}
            {!isSearchMode && (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {isProvider ? 'Available Bids' : 'Service Feed'}
                </Text>
              </View>
            )}

            {isSearchMode && (
              <View style={[styles.sectionHeader, { paddingHorizontal: 0, marginTop: 8 }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Search Results</Text>
                <Text style={[styles.resultsCount, { color: colors.textMuted }]}>
                  {isProvider ? filteredRequests.length : providers.length} results
                </Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          isSearchMode ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.inputBackground, marginHorizontal: 16 }]}>
              <CustomIonicons name="search-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.text }]}>No services found</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>Try adjusting your search or filters.</Text>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={handleClearAll}>
                <Text style={styles.emptyBtnText}>Clear filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.emptyBox, { backgroundColor: colors.inputBackground, marginHorizontal: 16 }]}>
              <CustomIonicons name="cube-outline" size={40} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.text }]}>
                {isProvider ? 'No open bids yet.' : 'No providers available.'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isProvider ? (
            <View style={{ height: 40 }} />
          ) : (
            fetchingNextProvidersPage ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <View style={{ height: 40 }} />
            )
          )
        }
      />

      {/* ── FAB ── */}

      {/* Rating Modal */}
      {pendingReview && (
        <RatingModal
          visible={showRatingModal}
          jobId={pendingReview.jobId}
          providerName={"the Provider"}
          onSuccess={() => {
            setShowRatingModal(false);
            fetchData();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 100 },
  announcementModal: { borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 },

  // Header
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 68,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greetSub: { fontSize: 13, fontWeight: '500' },
  greetName: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  headerIconBtn: { padding: 4 },
  headerAvatar: { width: 44, height: 44, borderRadius: 22 },
  headerAvatarPlaceholder: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { fontSize: 16, fontWeight: '800', color: '#FFF' },

  // --- Hero Banner ---
  heroBanner: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  heroText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 24,
    lineHeight: 36,
  },
  heroSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  heroSearchInput: {
    flex: 1,
    fontSize: 16,
  },
  heroSearchBtn: {
    backgroundColor: '#05230E',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search styles cleaned up

  // New Grid System (Replaces 2x2 and Category scroll)
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 32, marginBottom: 24, rowGap: 24 },
  gridItem: {
    width: '45%', // slightly smaller to create more center gap
    alignItems: 'center',
  },
  gridIconBox: {
    width: '100%',
    aspectRatio: 1, // perfect square
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 12,
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Category
  categoryScrollList: { paddingVertical: 8, paddingHorizontal: 16, gap: 14 },
  catCard: { width: 148, height: 148, borderRadius: 22 },
  catImageBg: { flex: 1, justifyContent: 'flex-end', padding: 14 },
  catOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 22 },
  catActiveOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', borderWidth: 3, borderRadius: 22 },
  catLabel: { color: '#FFF', fontSize: 16, fontWeight: '800', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },

  // Filter chips
  filterChipsContainer: { marginBottom: 16, height: 36 },
  filterChipsScroll: { alignItems: 'center', gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 4 },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  clearAllBtn: { paddingHorizontal: 8, justifyContent: 'center' },
  clearAllText: { fontSize: 13, fontWeight: '700' },

  // Wallet banner
  walletBanner: {
    borderRadius: 24, paddingHorizontal: 24, paddingVertical: 24,
    marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 6,
  },
  walletTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  walletLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  walletBalance: { color: '#FFF', fontSize: 44, fontWeight: '900', letterSpacing: -1, lineHeight: 48, marginBottom: 8 },
  walletSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '500', marginBottom: 24 },
  walletButtonsRow: { flexDirection: 'row', gap: 12 },
  walletBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 100, gap: 6 },
  walletBtnText: { fontSize: 15, fontWeight: '700' },

  // Section headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2, textAlign: 'center' },
  seeAll: { fontSize: 13, fontWeight: '700' },
  resultsCount: { fontSize: 12, fontWeight: '600' },

  // Request cards — logistics row style
  requestCard: {
    flexDirection: 'row',
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardStrip: { width: 5, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardCategory: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  cardDesc: { fontSize: 15, fontWeight: '700', lineHeight: 20, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardMetaText: { fontSize: 11, fontWeight: '500' },
  cardPrice: { fontSize: 14, fontWeight: '800' },
  cardChevron: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0,
  },

  // Empty state
  emptyBox: { borderRadius: 20, padding: 36, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  badgeContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    zIndex: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  horizontalRequestCard: {
    width: 280,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: 'row',
  },
  feedSearchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  feedSearchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryFilterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryFilterPillText: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCloseArea: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  resetFiltersLink: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalScroll: {
    padding: 24,
  },
  filterSection: {
    marginBottom: 28,
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  sortPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
  },
  sortPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ratingRowSelect: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
  },
  ratingPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  modalFooter: {
    padding: 24,
    borderTopWidth: 1,
  },
  applyBtn: {
    height: 52,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
});
