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
      style={[styles.providerCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => navigation.navigate('ProviderProfile', { providerId: (item as any).id || item.providerId })}
      activeOpacity={0.8}
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
                ? `${item.rating.toFixed(1)} per ${item.completedJobsCount} jobs done`
                : 'New provider'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
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
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{categoryName || 'Providers'}</Text>
        <TouchableOpacity onPress={toggleSort} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={() => loadingMore ? <ActivityIndicator style={{ padding: 16 }} color={colors.primary} /> : null}
          ListEmptyComponent={() => (
            <View style={styles.center}>
              <Ionicons name="people-outline" size={60} color={colors.textMuted} />
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
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-SemiBold' },
  list: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  providerCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'Outfit-Bold',
  },
  cardBody: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  jobsText: {
    marginLeft: 8,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  bio: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    paddingHorizontal: 32,
  }
});
