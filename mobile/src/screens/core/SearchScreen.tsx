import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../styles/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getProviders, ProviderResponse } from '../../services/userService';
import ProviderFeedCard from '../../components/ProviderFeedCard';
import { Ionicons } from '@expo/vector-icons';

const POPULAR_SEARCHES = ['Laundry', 'Cleaning', 'Tutoring', 'Errands', 'Tech Repair'];
const RECENT_SEARCHES_KEY = 'recent_searches';

// Skeleton Loader Card for premium loading states
const SkeletonCard = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.skeletonCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={[styles.skeletonBanner, { backgroundColor: colors.inputBackground }]} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonTitle, { backgroundColor: colors.inputBackground }]} />
        <View style={[styles.skeletonText, { backgroundColor: colors.inputBackground }]} />
        <View style={[styles.skeletonTextShort, { backgroundColor: colors.inputBackground }]} />
      </View>
    </View>
  );
};

export default function SearchScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuthStore();

  // Search Input State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  // Filter States
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0.0);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('discover');

  // Temporary States for Filter Modal (applied only when pressing "Apply")
  const [tempCategories, setTempCategories] = useState<string[]>([]);
  const [tempMinRating, setTempMinRating] = useState<number>(0.0);
  const [tempVerifiedOnly, setTempVerifiedOnly] = useState<boolean>(false);
  const [tempMinPrice, setTempMinPrice] = useState<string>('');
  const [tempMaxPrice, setTempMaxPrice] = useState<string>('');
  const [tempSortOrder, setTempSortOrder] = useState<string>('discover');

  const searchInputRef = useRef<TextInput>(null);

  // Load categories from API
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data || [];
    }
  });

  // Load and manage recent searches
  useEffect(() => {
    loadRecentSearches();
  }, []);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadRecentSearches = async () => {
    try {
      const saved = await SecureStore.getItemAsync(RECENT_SEARCHES_KEY);
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch (e) {
      console.warn('Failed to load recent searches', e);
    }
  };

  const saveSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    try {
      const searches = [trimmed, ...recentSearches.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
      setRecentSearches(searches);
      await SecureStore.setItemAsync(RECENT_SEARCHES_KEY, JSON.stringify(searches));
    } catch (e) {
      console.warn('Failed to save recent search', e);
    }
  };

  const removeRecentSearch = async (query: string) => {
    try {
      const searches = recentSearches.filter(s => s !== query);
      setRecentSearches(searches);
      await SecureStore.setItemAsync(RECENT_SEARCHES_KEY, JSON.stringify(searches));
    } catch (e) {
      console.warn('Failed to remove recent search', e);
    }
  };

  // Check if any filter is active
  const isAnyFilterActive = useMemo(() => {
    return (
      selectedCategories.length > 0 ||
      minRating > 0.0 ||
      verifiedOnly ||
      !!minPrice ||
      !!maxPrice ||
      sortOrder !== 'discover'
    );
  }, [selectedCategories, minRating, verifiedOnly, minPrice, maxPrice, sortOrder]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.length > 0) count += selectedCategories.length;
    if (minRating > 0.0) count += 1;
    if (verifiedOnly) count += 1;
    if (minPrice || maxPrice) count += 1;
    if (sortOrder !== 'discover') count += 1;
    return count;
  }, [selectedCategories, minRating, verifiedOnly, minPrice, maxPrice, sortOrder]);

  // TanStack React Query: Infinite provider list querying
  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: [
      'providers-search',
      debouncedQuery,
      selectedCategories,
      minRating,
      verifiedOnly,
      minPrice,
      maxPrice,
      sortOrder,
    ],
    queryFn: async ({ pageParam = 0 }) => {
      const minP = minPrice ? parseFloat(minPrice) : undefined;
      const maxP = maxPrice ? parseFloat(maxPrice) : undefined;
      return getProviders(
        undefined, // categoryName (legacy)
        minRating,
        pageParam as number,
        10, // size
        sortOrder,
        debouncedQuery.trim() || undefined,
        verifiedOnly,
        minP,
        maxP,
        selectedCategories.length > 0 ? selectedCategories : undefined
      );
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: any) => {
      return lastPage.currentPage < lastPage.totalPages - 1 ? lastPage.currentPage + 1 : undefined;
    },
    enabled: true,
  });

  const providers = useMemo(() => {
    return data?.pages.flatMap(page => page.content) || [];
  }, [data]);

  const totalResults = useMemo(() => {
    return data?.pages[0]?.totalElements || 0;
  }, [data]);

  const handleSearchSubmit = () => {
    saveSearch(searchQuery);
    setIsFocused(false);
    Keyboard.dismiss();
  };

  const handleSelectTerm = (term: string) => {
    setSearchQuery(term);
    saveSearch(term);
    setIsFocused(false);
    Keyboard.dismiss();
  };

  const openFilterModal = () => {
    setTempCategories([...selectedCategories]);
    setTempMinRating(minRating);
    setTempVerifiedOnly(verifiedOnly);
    setTempMinPrice(minPrice);
    setTempMaxPrice(maxPrice);
    setTempSortOrder(sortOrder);
    setIsFilterModalVisible(true);
  };

  const applyFilters = () => {
    setSelectedCategories([...tempCategories]);
    setMinRating(tempMinRating);
    setVerifiedOnly(tempVerifiedOnly);
    setMinPrice(tempMinPrice);
    setMaxPrice(tempMaxPrice);
    setSortOrder(tempSortOrder);
    setIsFilterModalVisible(false);
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setMinRating(0.0);
    setVerifiedOnly(false);
    setMinPrice('');
    setMaxPrice('');
    setSortOrder('discover');
    setTempCategories([]);
    setTempMinRating(0.0);
    setTempVerifiedOnly(false);
    setTempMinPrice('');
    setTempMaxPrice('');
    setTempSortOrder('discover');
  };

  const resetAll = () => {
    setSearchQuery('');
    clearAllFilters();
  };

  const toggleTempCategory = (catName: string) => {
    if (tempCategories.includes(catName)) {
      setTempCategories(tempCategories.filter(c => c !== catName));
    } else {
      setTempCategories([...tempCategories, catName]);
    }
  };

  const renderProviderItem = useCallback(({ item }: { item: ProviderResponse }) => (
    <ProviderFeedCard
      provider={item}
      onPress={() => navigation.navigate('ListingDetail', { providerId: (item as any).id || item.providerId })}
    />
  ), [navigation]);

  const showRecentSuggestions = isFocused && searchQuery.trim() === '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Search Header Bar */}
      <View style={styles.header}>
        <View style={[styles.searchBarContainer, { backgroundColor: colors.inputBackground }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search services, name, tags..."
            placeholderTextColor={colors.placeholderText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)} // delay to allow clicks
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.filterBtn, isAnyFilterActive ? { backgroundColor: colors.primary + '15' } : null]}
            onPress={openFilterModal}
          >
            <Ionicons name="filter-outline" size={18} color={isAnyFilterActive ? colors.primary : colors.text} />
            {activeFiltersCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={styles.badgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Filter Chips Scrollable Row */}
      {isAnyFilterActive && (
        <View style={styles.chipsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
            {selectedCategories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={() => setSelectedCategories(selectedCategories.filter(c => c !== cat))}
              >
                <Text style={[styles.chipText, { color: colors.text }]}>{cat}</Text>
                <Ionicons name="close-outline" size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}
            {minRating > 0 && (
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={() => setMinRating(0.0)}
              >
                <Text style={[styles.chipText, { color: colors.text }]}>{minRating}+ ★</Text>
                <Ionicons name="close-outline" size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}
            {verifiedOnly && (
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={() => setVerifiedOnly(false)}
              >
                <Text style={[styles.chipText, { color: colors.text }]}>Verified Only</Text>
                <Ionicons name="close-outline" size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}
            {(!!minPrice || !!maxPrice) && (
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={() => { setMinPrice(''); setMaxPrice(''); }}
              >
                <Text style={[styles.chipText, { color: colors.text }]}>
                  Price: GHS {minPrice || '0'} - {maxPrice || 'Any'}
                </Text>
                <Ionicons name="close-outline" size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}
            {sortOrder !== 'discover' && (
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={() => setSortOrder('discover')}
              >
                <Text style={[styles.chipText, { color: colors.text }]}>
                  Sort: {sortOrder.replace('-', ' ')}
                </Text>
                <Ionicons name="close-outline" size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={clearAllFilters} style={styles.clearAllBtn}>
              <Text style={[styles.clearAllText, { color: colors.primary }]}>Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Main Content Area */}
      {showRecentSuggestions ? (
        <KeyboardAvoidingView style={styles.historyContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Searches</Text>
              {recentSearches.map((term, index) => (
                <View key={index} style={styles.historyRow}>
                  <TouchableOpacity style={styles.historyTerm} onPress={() => handleSelectTerm(term)}>
                    <Ionicons name="time-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
                    <Text style={[styles.historyText, { color: colors.text }]}>{term}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeRecentSearch(term)} style={styles.removeBtn}>
                    <Ionicons name="close-outline" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular Searches</Text>
            <View style={styles.popularTags}>
              {POPULAR_SEARCHES.map((term, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.popularTag, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                  onPress={() => handleSelectTerm(term)}
                >
                  <Text style={[styles.popularTagText, { color: colors.text }]}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Results Count Banner */}
          {(debouncedQuery.trim() !== '' || isAnyFilterActive) && !isLoading && (
            <View style={styles.resultsCountBanner}>
              <Text style={[styles.resultsCountText, { color: colors.textMuted }]}>
                {totalResults} {totalResults === 1 ? 'provider' : 'providers'} found
              </Text>
            </View>
          )}

          {isLoading ? (
            <FlatList
              data={[1, 2, 3]}
              keyExtractor={(item) => item.toString()}
              renderItem={() => <SkeletonCard />}
              contentContainerStyle={styles.listContainer}
            />
          ) : (
            <FlatList
              data={providers}
              keyExtractor={(item) => (item as any).id || item.providerId}
              renderItem={renderProviderItem}
              contentContainerStyle={styles.listContainer}
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage) {
                  fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <View style={{ paddingVertical: 16 }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={48} color={colors.border} />
                  <Text style={[styles.emptyText, { color: colors.text }]}>No providers found</Text>
                  <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
                    Try modifying your search query or reset filters to view all listings.
                  </Text>
                  <TouchableOpacity style={[styles.resetBtn, { backgroundColor: colors.primary }]} onPress={resetAll}>
                    <Text style={styles.resetBtnText}>Reset Search & Filters</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* Elegant Slide-up Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isFilterModalVisible}
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={() => setIsFilterModalVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filters</Text>
              <TouchableOpacity onPress={clearAllFilters}>
                <Text style={[styles.resetFiltersLink, { color: colors.primary }]}>Reset All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Category selector */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.text }]}>Categories</Text>
                <View style={styles.categoryPillsGrid}>
                  {categories.map((cat: any) => {
                    const isSelected = tempCategories.includes(cat.name);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryPill,
                          { borderColor: colors.border, backgroundColor: colors.inputBackground },
                          isSelected ? { backgroundColor: colors.primary, borderColor: colors.primary } : null,
                        ]}
                        onPress={() => toggleTempCategory(cat.name)}
                      >
                        <Text style={[styles.categoryPillText, { color: colors.text }, isSelected ? { color: '#FFF' } : null]}>
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

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
                  <Text style={{ marginHorizontal: 12, color: colors.textMuted }}>to</Text>
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

            {/* Apply Button */}
            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={applyFilters}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
  },
  chipsWrapper: {
    marginBottom: 8,
  },
  chipsContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  historyTerm: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyText: {
    fontSize: 15,
  },
  removeBtn: {
    padding: 4,
  },
  popularTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  popularTagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: 100,
  },
  resultsCountBanner: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  resultsCountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  resetBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Skeleton styles
  skeletonCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    height: 220,
  },
  skeletonBanner: {
    height: 120,
    width: '100%',
  },
  skeletonContent: {
    padding: 16,
    gap: 8,
  },
  skeletonTitle: {
    height: 18,
    width: '40%',
    borderRadius: 4,
  },
  skeletonText: {
    height: 12,
    width: '85%',
    borderRadius: 4,
  },
  skeletonTextShort: {
    height: 12,
    width: '60%',
    borderRadius: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalCloseArea: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  resetFiltersLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalScroll: {
    paddingHorizontal: 24,
  },
  filterSection: {
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  categoryPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sortPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortPillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  ratingRowSelect: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  ratingPillText: {
    fontSize: 13,
    fontWeight: '500',
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
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  applyBtn: {
    marginHorizontal: 24,
    marginTop: 16,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
