import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomIonicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

const POPULAR_SEARCHES = ['Laundry', 'Cleaning', 'Tutoring', 'Errands', 'Tech Repair'];
const RECENT_SEARCHES_KEY = '@recent_searches';

export default function SearchScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, isProvider } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadRecentSearches();
    fetchRequests();
    
    // Auto-focus the search bar when entering the screen
    const timeout = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      const list = allRequests.filter((r: any) =>
        r.description?.toLowerCase().includes(q) || r.category?.name?.toLowerCase().includes(q)
      );
      setFilteredRequests(list);
    } else {
      setFilteredRequests([]);
    }
  }, [debouncedQuery, allRequests]);

  const loadRecentSearches = async () => {
    try {
      const saved = await SecureStore.getItemAsync(RECENT_SEARCHES_KEY);
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch (e) {
      console.warn('Failed to load recent searches', e);
    }
  };

  const saveSearch = async (query: string) => {
    if (!query.trim()) return;
    try {
      let searches = [query, ...recentSearches.filter(s => s.toLowerCase() !== query.toLowerCase())];
      searches = searches.slice(0, 10); // Keep max 10
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

  const fetchRequests = async () => {
    try {
      const requestsRes = await api.get('/requests');
      const allReqs = requestsRes.data?.content || [];
      
      if (isProvider) {
        setAllRequests(allReqs);
      } else {
        setAllRequests(allReqs.filter((r: any) => r.requesterId === user?.id));
      }
    } catch (err) {
      console.log('Failed to fetch requests', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    saveSearch(searchQuery);
    Keyboard.dismiss();
  };

  const handleSelectTerm = (term: string) => {
    setSearchQuery(term);
    saveSearch(term);
    searchInputRef.current?.focus();
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
            {item.description || item.title || 'No description provided.'}
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

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBackground }]}>
          <CustomIonicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search services, categories..."
            placeholderTextColor={colors.placeholderText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <CustomIonicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : searchQuery.trim().length > 0 ? (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestCard}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CustomIonicons name="search-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No results found for "{searchQuery}"</Text>
            </View>
          }
        />
      ) : (
        <KeyboardAvoidingView style={styles.historyContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Searches</Text>
              {recentSearches.map((term, index) => (
                <View key={index} style={styles.historyRow}>
                  <TouchableOpacity style={styles.historyTerm} onPress={() => handleSelectTerm(term)}>
                    <CustomIonicons name="time-outline" size={16} color={colors.textMuted} />
                    <Text style={[styles.historyText, { color: colors.text }]}>{term}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeRecentSearch(term)} style={styles.removeBtn}>
                    <CustomIonicons name="close-outline" size={16} color={colors.textMuted} />
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginLeft: 12,
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
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    textAlign: 'center',
  },
  requestCard: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardStrip: {
    width: 6,
  },
  cardBody: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardCategory: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMetaText: {
    fontSize: 13,
    marginLeft: 4,
    fontWeight: '500',
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardChevron: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
