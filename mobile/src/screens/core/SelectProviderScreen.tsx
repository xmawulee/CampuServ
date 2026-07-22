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
      const url = categoryName
        ? `/users/providers?category=${categoryName}`
        : '/users/providers';
      const res = await api.get(url);
      setProviders(res.data || []);
    } catch (err) {
      // silent
    }
  }, [categoryId]);

  useEffect(() => {
    setLoading(true);
    fetchProviders().finally(() => setLoading(false));
  }, [fetchProviders]);

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
      style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.8}
    >
      <View style={styles.avatarWrap}>
        {item.profilePictureUrl ? (
          <Image
            source={{ uri: getFullImageUrl(item.profilePictureUrl) || undefined }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.inputBackground }]}>
            <Text style={[styles.avatarPlaceholderText, { color: colors.textMuted }]}>
              {getInitials(item.fullName || '')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.details}>
        <Text style={[styles.name, { color: colors.text }]}>{item.fullName}</Text>
        <Text style={[styles.email, { color: colors.textMuted }]} numberOfLines={1}>{item.email}</Text>
        {item.bio ? (
          <Text style={[styles.bio, { color: colors.textMuted }]} numberOfLines={1}>{item.bio}</Text>
        ) : null}
      </View>

      <View style={styles.meta}>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color="#F1C40F" />
          <Text style={[styles.ratingText, { color: colors.text }]}>
            {(item.completedJobsCount > 0 || item.rating > 0)
              ? `${Number(item.rating || 0).toFixed(1)} per ${item.completedJobsCount || 0} jobs done`
              : 'New provider'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 24) }]}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.text, textAlign: 'center', marginTop: 12, paddingHorizontal: 24 }]}>
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
  header: { padding: 24, paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSub: { fontSize: 13, marginTop: 4 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 24, paddingTop: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  avatarWrap: { marginRight: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: { fontSize: 15, fontWeight: '700' },
  details: { flex: 1, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '700' },
  email: { fontSize: 11, marginTop: 1 },
  bio: { fontSize: 12, marginTop: 4 },
  meta: { alignItems: 'flex-end', gap: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 13, fontWeight: '700' },
  jobsText: { fontSize: 11 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
});
