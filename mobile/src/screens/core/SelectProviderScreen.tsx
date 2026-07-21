import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, BASE_URL } from '../../services/api';
import { useTheme } from '../../styles/ThemeContext';

export default function SelectProviderScreen({ route, navigation }: any) {
  const { categoryId, categoryName } = route.params || {};
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await api.get('/users/providers', {
        params: categoryName ? { category: categoryName } : undefined
      });
      setProviders(res.data?.content || []);
    } catch (err) {
      console.error('SelectProviderScreen fetch error:', err);
    }
  }, [categoryName]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    setLoading(true);
    fetchProviders().finally(() => setLoading(false));
  }, [fetchProviders, navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProviders();
    setRefreshing(false);
  }, [fetchProviders]);

  const handleSelect = (provider: any) => {
    navigation.navigate({
      name: 'PostRequest',
      params: { selectedTargetProvider: provider },
      merge: true,
    });
  };

  const getFullImageUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) return url;
    return `${BASE_URL}${url}`;
  };

  const getInitials = (name: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const renderProviderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.cardBackground }]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarWrap}>
          {item.profilePictureUrl ? (
            <Image
              source={{ uri: getFullImageUrl(item.profilePictureUrl) || undefined }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: '#3b82f6' }]}>
              <Text style={styles.avatarPlaceholderText}>
                {getInitials(item.fullName || '')}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.details}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.fullName}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text style={[styles.ratingText, { color: colors.text }]}>
              {(item.completedJobsCount > 0 || item.rating > 0)
                ? `${Number(item.rating || 0).toFixed(1)} rating • ${item.completedJobsCount || 0} jobs done`
                : 'New provider'}
            </Text>
          </View>
        </View>
        <View style={[styles.chevronWrap, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </View>
      </View>
      {item.bio ? (
        <Text style={[styles.bio, { color: colors.textMuted }]} numberOfLines={2}>{item.bio}</Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: colors.cardBackground, paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.topBarContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>Select Provider</Text>
          <View style={{ width: 44 }} />
        </View>
      </View>
      
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {categoryName ? `${categoryName} Providers` : 'Select a Provider'}
        </Text>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>
          Choose a provider to send your request directly to them.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={providers}
          keyExtractor={(item) => item.id}
          renderItem={renderProviderItem}
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 40) }]}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconWrap, { backgroundColor: 'rgba(107, 114, 128, 0.1)' }]}>
                <Ionicons name="people" size={48} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Providers Found</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                No providers currently offer this service — try 'All matching providers' instead
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    zIndex: 10,
  },
  topBarContent: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
  headerSub: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 24, paddingTop: 8 },
  
  card: {
    borderRadius: 24,
    padding: 20,
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
  avatarWrap: { marginRight: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  details: { flex: 1 },
  name: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2, marginBottom: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { marginLeft: 6, fontSize: 13, fontWeight: '600' },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  bio: { fontSize: 14, lineHeight: 22, fontWeight: '500', marginTop: 16 },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 20 },
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
  emptySub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
