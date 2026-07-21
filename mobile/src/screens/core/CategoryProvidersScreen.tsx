import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Image, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { getProviders, ProviderResponse } from '../../services/userService';

const { width } = Dimensions.get('window');

export default function CategoryProvidersScreen({ route, navigation }: any) {
  const { categoryId, categoryName } = route.params;
  const { colors } = useTheme();
  
  const [providers, setProviders] = useState<ProviderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [sortOption, setSortOption] = useState<'rating' | 'newest'>('rating');
  const [refreshing, setRefreshing] = useState(false);

  const fetchProviders = useCallback(async (pageNum: number, sort: string) => {
    try {
      const res = await getProviders(categoryName, 0.0, pageNum, 10, sort);
      if (pageNum === 0) {
        setProviders(res.content);
      } else {
        setProviders(prev => [...prev, ...res.content]);
      }
      setHasMore(pageNum < res.totalPages - 1);
      setPage(pageNum);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [categoryId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProviders(0, sortOption);
    setRefreshing(false);
  }, [fetchProviders, sortOption]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProviders(0, sortOption);
    }, [fetchProviders, sortOption])
  );

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      fetchProviders(page + 1, sortOption);
    }
  };

  const toggleSort = () => {
    const nextSort = sortOption === 'rating' ? 'newest' : 'rating';
    setSortOption(nextSort);
  };

  const renderItem = ({ item }: { item: ProviderResponse }) => (
    <TouchableOpacity
      style={[styles.providerCard, { backgroundColor: colors.cardBackground }]}
      onPress={() => navigation.navigate('ProviderProfile', { providerId: (item as any).id || item.providerId })}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>{item.fullName.charAt(0)}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {item.fullName}
          </Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text style={[styles.ratingText, { color: colors.text }]}>
              {(item.completedJobsCount > 0 || item.rating > 0)
                ? `${item.rating.toFixed(1)} rating • ${item.completedJobsCount} jobs done`
                : 'New provider'}
            </Text>
          </View>
        </View>
        <View style={[styles.chevronWrap, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </View>
      </View>
      {item.bio ? (
        <Text style={[styles.bio, { color: colors.textMuted }]} numberOfLines={2}>
          {item.bio}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{categoryName || 'Providers'}</Text>
        <TouchableOpacity style={styles.sortBtn} onPress={toggleSort} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name={sortOption === 'rating' ? 'star' : 'time'} size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item) => (item as any).id || item.providerId}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ padding: 16 }} color={colors.primary} /> : null}
          ListEmptyComponent={() => (
            <View style={styles.center}>
              <View style={[styles.emptyIconWrap, { backgroundColor: 'rgba(107, 114, 128, 0.1)' }]}>
                <Ionicons name="people" size={48} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Providers Found</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Try again later when providers sign up for this category.
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sortBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  providerCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
  cardBody: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  bio: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    marginTop: 16,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  emptySub: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  }
});
