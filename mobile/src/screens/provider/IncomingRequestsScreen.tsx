import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import type { OpenRequest } from '../../types/provider';

const PAGE_SIZE = 20;

export default function IncomingRequestsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState<OpenRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);

  const fetchRequests = useCallback(async (page: number, isRefresh = false) => {
    try {
      const res = await api.get('/requests', {
        params: { page, size: PAGE_SIZE },
      });
      const data: OpenRequest[] = res.data?.content ?? res.data ?? [];
      const totalPages: number = res.data?.totalPages ?? 1;

      if (isRefresh || page === 0) {
        setRequests(data);
      } else {
        setRequests((prev) => [...prev, ...data]);
      }
      setHasMore(page < totalPages - 1);
      pageRef.current = page;
    } catch {
      // Silent — keep whatever is already displayed
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      pageRef.current = 0;
      fetchRequests(0, true);
    }, [fetchRequests])
  );

  const onRefresh = () => {
    setRefreshing(true);
    pageRef.current = 0;
    fetchRequests(0, true);
  };

  const onEndReached = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      fetchRequests(pageRef.current + 1);
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderItem = ({ item }: { item: OpenRequest }) => {
    const budgetText =
      item.budgetMin && item.budgetMax
        ? item.budgetMin === item.budgetMax
          ? `${Number(item.budgetMin).toFixed(0)} GHS`
          : `${Number(item.budgetMin).toFixed(0)}–${Number(item.budgetMax).toFixed(0)} GHS`
        : 'Open Budget';

    const deadline = item.bidWindowCloses
      ? new Date(item.bidWindowCloses)
      : null;
    const isExpired = deadline ? deadline < new Date() : false;

    return (
      <TouchableOpacity
        style={[styles.requestCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        onPress={() => navigation.navigate('RequestDetailForProvider', { requestId: item.id })}
        activeOpacity={0.85}
      >
        {/* Left accent strip */}
        <View style={[styles.cardStrip, { backgroundColor: isExpired ? colors.textMuted : colors.primary }]} />

        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={[styles.cardBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.cardBadgeText, { color: colors.primary }]}>
                {item.category?.name || 'Service'}
              </Text>
            </View>
            {isExpired ? (
              <View style={[styles.statusPill, { backgroundColor: colors.inputBackground }]}>
                <Text style={[styles.statusPillText, { color: colors.textMuted }]}>CLOSED</Text>
              </View>
            ) : (
              <View style={[styles.statusPill, { backgroundColor: colors.successLight }]}>
                <Text style={[styles.statusPillText, { color: colors.success }]}>OPEN</Text>
              </View>
            )}
          </View>

          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title || item.description?.slice(0, 60)}
          </Text>
          <Text style={[styles.cardDesc, { color: colors.textMuted }]} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.cardMeta}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.cardMetaText, { color: colors.textMuted }]}>
                {item.location || item.locationType || 'Campus'}
              </Text>
            </View>
            <Text style={[styles.cardPrice, { color: colors.primary }]}>{budgetText}</Text>
          </View>
        </View>

        <View style={styles.cardChevron}>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyView = () => (
    <View style={styles.center}>
      <View style={[styles.emptyIconWrap, { backgroundColor: colors.inputBackground }]}>
        <Ionicons name="options-outline" size={44} color={colors.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Matching Requests</Text>
      <Text style={[styles.emptySub, { color: colors.textMuted }]}>
        There are no open requests matching your opted service categories right now. Pull down to refresh.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerBlock}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Opportunity Feed</Text>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>
          Open student requests — tap to place a bid
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 110 + insets.bottom },
            requests.length === 0 && styles.listContentEmpty
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyView />}
          ListFooterComponent={renderFooter}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  headerBlock: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', marginBottom: 2 },
  headerSub: { fontSize: 13, fontWeight: '500' },

  listContent: { paddingHorizontal: 24, paddingBottom: 110, gap: 14, paddingTop: 12 },
  listContentEmpty: { flexGrow: 1 },

  footerLoader: { paddingVertical: 16, alignItems: 'center' },

  requestCard: {
    flexDirection: 'row', borderRadius: 16, borderWidth: 1,
    overflow: 'hidden', alignItems: 'center',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardStrip: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cardBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  cardBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cardDesc: { fontSize: 12, lineHeight: 17, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  cardMetaText: { fontSize: 11, fontWeight: '500' },
  cardPrice: { fontSize: 13, fontWeight: '800' },
  cardChevron: { paddingRight: 16 },

  emptyIconWrap: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 19, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
