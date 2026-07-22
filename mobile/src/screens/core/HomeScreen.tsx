import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Categories will be loaded dynamically from API
// const CATEGORIES = [
//   { id: 'cat-1', name: 'Laundry',   icon: 'shirt-outline',          bg: '#FFF0E6', iconColor: '#FF6B35' },
// ...
// ];

export default function HomeScreen({ route, navigation }: any) {
  const { user, accessToken } = useAuthStore();
  const { colors } = useTheme();
  const { showToast } = useToast();

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


  // UI States
  const [isSearchBarSticky, setIsSearchBarSticky] = useState(false);

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
    if (!isProvider) {
      navigation.navigate('CategoryProviders', { categoryId: catId, categoryName: catName });
      return;
    }
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
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



  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    // Toggle sticky search bar when scrolled down past category shortcuts
    if (offsetY > 110) {
      setIsSearchBarSticky(true);
    } else {
      setIsSearchBarSticky(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return colors.success;
      case 'IN_PROGRESS': return colors.primary;
      case 'COMPLETED': return colors.success;
      case 'CANCELLED': return colors.error;
      default: return colors.warning;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'OPEN': return colors.successLight;
      case 'IN_PROGRESS': return colors.warningLight;
      case 'COMPLETED': return colors.successLight;
      case 'CANCELLED': return colors.errorLight;
      default: return colors.warningLight;
    }
  };

  const renderRequestCard = ({ item }: any) => {
    const stripColor = getStatusColor(item.status);
    return (
      <TouchableOpacity
        style={[styles.requestCard, { backgroundColor: colors.cardBackground }]}
        onPress={() => navigation.navigate('RequestDetails', { requestId: item.id })}
        activeOpacity={0.88}
      >
        <View style={[styles.cardStrip, { backgroundColor: stripColor }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={[styles.cardCategory, { color: colors.textMuted }]}>
              {item.category?.name || 'Service'}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: getStatusBg(item.status) }]}>
              <Text style={[styles.statusPillText, { color: getStatusColor(item.status) }]}>
                {item.status?.replace('_', ' ')}
              </Text>
            </View>
          </View>
          <Text style={[styles.cardDesc, { color: colors.text }]} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.cardFooter}>
            <View style={styles.cardMeta}>
              <CustomIonicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.cardMetaText, { color: colors.textMuted }]}>
                {item.location || 'Campus'}
              </Text>
            </View>
            <Text style={[styles.cardPrice, { color: colors.primary }]}>
              {item.budget ? `GHS ${item.budget}` : 'Open bid'}
            </Text>
          </View>
        </View>
        <View style={[styles.cardChevron, { backgroundColor: colors.inputBackground }]}>
          <CustomIonicons name="arrow-forward" size={14} color={colors.text} />
        </View>
      </TouchableOpacity>
    );
  };

  const SearchBar = ({ isSticky }: { isSticky?: boolean }) => {
    return (
      <View style={[styles.searchRow, isSticky ? styles.searchRowSticky : null]}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBackground }]}>
          <CustomIonicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            ref={isSticky ? undefined : searchInputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search services, categories..."
            placeholderTextColor={colors.placeholderText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            accessibilityLabel="Search for services"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}>
              <CustomIonicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

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

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const browseRequests = isProvider ? availableRequests : myRequests;
  const listData = isSearchMode ? filteredRequests : browseRequests.slice(0, 5);

  // Quick action tiles for the home screen
  const quickTiles = [
    { label: 'New Request', icon: 'add-circle-outline', bg: colors.primary, nav: 'PostRequest' },
    { label: 'Browse Services', icon: 'grid-outline', bg: '#8DC63F', nav: null },
    { label: 'My Requests', icon: 'document-text-outline', bg: colors.text, nav: 'MyRequests' },
    { label: 'My Wallet', icon: 'wallet-outline', bg: '#6B7280', nav: 'Wallet' },
  ] as const;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>

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
      <View style={[styles.headerBar, { paddingTop: 8 }]}>
        {/* Avatar + Greeting */}
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.8}
        >
          {user?.profilePictureUrl ? (
            <Image
              source={{ uri: getFullImageUrl(user.profilePictureUrl) || undefined }}
              style={styles.headerAvatar}
            />
          ) : (
            <View style={[styles.headerAvatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.headerAvatarText}>{getInitials(user?.fullName || '')}</Text>
            </View>
          )}
          <View>
            <Text style={[styles.greetSub, { color: colors.textMuted }]}>Hello, 👋</Text>
            <Text style={[styles.greetName, { color: colors.text }]}>{user?.fullName?.split(' ')[0] || 'Student'}</Text>
          </View>
        </TouchableOpacity>

        {/* Right actions */}
        <View style={[styles.headerRight, { gap: 8 }]}>
          <RoleSwitcher />
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

      {/* ── Sticky Search Bar overlay ── */}
      {isSearchBarSticky && (
        <View style={[styles.stickySearchContainer, { top: 70 + insets.top, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <SearchBar isSticky />
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={renderRequestCard}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <>
            {/* Search Bar */}
            <SearchBar />

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

            {/* Quick Action Tiles 2x2 */}
            {!isSearchMode && (
              <View style={styles.tilesGrid}>
                {quickTiles.map((tile) => (
                  <TouchableOpacity
                    key={tile.label}
                    style={[styles.tile, { backgroundColor: tile.bg }]}
                    onPress={() => tile.nav && navigation.navigate(tile.nav as any)}
                    activeOpacity={0.88}
                  >
                    <CustomIonicons name={tile.icon as any} size={28} color="#FFF" />
                    <Text style={styles.tileLabel}>{tile.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Category filter row */}
            <View style={{ marginBottom: 16 }}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Category</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScrollList}>
                {categories.map((item) => {
                  const isActive = activeCategory === item.name;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.catCard, { backgroundColor: isActive ? colors.text : colors.cardBackground }]}
                      onPress={() => handleCategoryToggle(item.id, item.name)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.catIconWrap, { backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : colors.inputBackground }]}>
                        <CategoryIcon
                          name={item.name}
                          size={22}
                          color={isActive ? '#FFFFFF' : colors.primary}
                        />
                      </View>
                      <Text style={[styles.catLabel, { color: isActive ? '#FFFFFF' : colors.textMuted }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {categories.length === 0 && (
                  <Text style={{ color: colors.textMuted, marginLeft: 4 }}>Loading...</Text>
                )}
              </ScrollView>
            </View>

            {/* Active Filter Chips */}
            {renderActiveFilterChips()}

            {/* Wallet Banner */}
            {!isSearchMode && (
              <TouchableOpacity
                style={[styles.walletBanner, { backgroundColor: colors.text }]}
                onPress={() => navigation.navigate('Wallet')}
                activeOpacity={0.9}
              >
                <View>
                  <Text style={styles.walletLabel}>Escrow Wallet</Text>
                  <Text style={styles.walletBalance}>GHS {balance}</Text>
                  <Text style={styles.walletSub}>Tap to manage funds</Text>
                </View>
                <View style={styles.walletRight}>
                  <View style={[styles.walletIconWrap, { backgroundColor: colors.primary }]}>
                    <CustomIonicons name="wallet-outline" size={26} color="#FFF" />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Section Header */}
            {!isSearchMode && (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {isProvider ? 'Available Bids' : 'Recent Activity'}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('MyRequests')}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>View all</Text>
                </TouchableOpacity>
              </View>
            )}

            {isSearchMode && (
              <View style={[styles.sectionHeader, { paddingHorizontal: 0, marginTop: 8 }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Search Results</Text>
                <Text style={[styles.resultsCount, { color: colors.textMuted }]}>{filteredRequests.length} results</Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          isSearchMode ? (
            <View style={[styles.emptyBox, { backgroundColor: colors.inputBackground }]}>
              <CustomIonicons name="search-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.text }]}>No services found</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>Try adjusting your search or filters.</Text>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={handleClearAll}>
                <Text style={styles.emptyBtnText}>Clear filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.emptyBox, { backgroundColor: colors.inputBackground }]}>
              <CustomIonicons name="cube-outline" size={40} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.text }]}>
                {isProvider ? 'No open bids yet.' : 'No active requests.'}
              </Text>
              {!isProvider && (
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: colors.accent }]}
                  onPress={() => navigation.navigate('PostRequest')}
                >
                  <Text style={styles.emptyBtnText}>Post a Request</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />

      {/* ── FAB ── */}
      {!isProvider && !isSearchMode && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent }]}
          onPress={() => navigation.navigate('PostRequest')}
          activeOpacity={0.9}
        >
          <CustomIonicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      )}

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
  listContent: { paddingHorizontal: 20, paddingTop: 8 },
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
  headerAvatar: { width: 44, height: 44, borderRadius: 22 },
  headerAvatarPlaceholder: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { fontSize: 16, fontWeight: '800', color: '#FFF' },

  // Search
  searchRow: { flexDirection: 'row', paddingVertical: 14, gap: 10, alignItems: 'center' },
  searchRowSticky: { paddingHorizontal: 20, paddingVertical: 10 },
  stickySearchContainer: {
    position: 'absolute', left: 0, right: 0, zIndex: 100, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 4, borderBottomWidth: 1,
  },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 50, paddingHorizontal: 16, height: 50 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },
  filterBtn: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },

  // 2x2 Quick tiles
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  tile: {
    width: (SCREEN_WIDTH - 40 - 12) / 2,
    aspectRatio: 1.3,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  tileLabel: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  // Category
  categoryScrollList: { paddingVertical: 4, gap: 10 },
  catCard: {
    width: 88, borderRadius: 20, padding: 12,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  catIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  // Filter chips
  filterChipsContainer: { marginBottom: 16, height: 36 },
  filterChipsScroll: { alignItems: 'center', gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 4 },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  clearAllBtn: { paddingHorizontal: 8, justifyContent: 'center' },
  clearAllText: { fontSize: 13, fontWeight: '700' },

  // Wallet banner
  walletBanner: {
    borderRadius: 24, padding: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 6,
  },
  walletLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  walletBalance: { color: '#FFF', fontSize: 28, fontWeight: '900', marginBottom: 4, letterSpacing: -0.5 },
  walletSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  walletRight: { alignItems: 'center' },
  walletIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  // Section headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
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

  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#E8A838', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
});
