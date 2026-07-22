import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import type { ServiceListing } from '../../types/provider';

const CATEGORY_ICONS: Record<string, { icon: string; color: string }> = {
  'Laundry':  { icon: 'water',         color: '#0096FF' },
  'Cleaning': { icon: 'sparkles',      color: '#00C896' },
  'Tutoring': { icon: 'book',          color: '#9600FF' },
  'Delivery': { icon: 'bicycle',       color: '#FF6400' },
  'Design':   { icon: 'color-palette', color: '#FF0096' },
  'Repairs':  { icon: 'hammer',        color: '#646464' },
};

export default function MyListingsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchListings = useCallback(async () => {
    if (!user) return;
    try {
      // Provider's listings live in the /users/{id} response under 'services'
      const res = await api.get(`/users/${user.id}`);
      const services: ServiceListing[] = res.data?.services ?? [];
      setListings(services);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchListings();
    }, [fetchListings])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchListings();
  };

  const renderItem = ({ item }: { item: ServiceListing }) => {
    const catConfig = CATEGORY_ICONS[item.category?.name] ?? { icon: 'apps-outline', color: colors.primary };
    return (
      <TouchableOpacity
        style={[styles.listingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        onPress={() => navigation.navigate('CreateEditListing', { listing: item })}
        activeOpacity={0.8}
      >
        {/* Icon block */}
        <View style={[styles.iconBlock, { backgroundColor: catConfig.color + '18' }]}>
          <Ionicons name={catConfig.icon as any} size={26} color={catConfig.color} />
        </View>

        <View style={styles.cardContent}>
          <Text style={[styles.cardCategory, { color: catConfig.color }]}>
            {item.category?.name || 'Service'}
          </Text>
          <Text style={[styles.cardPrice, { color: colors.text }]}>
            {Number(item.basePrice).toFixed(2)}{' '}
            <Text style={[styles.cardPriceSub, { color: colors.textMuted }]}>GHS</Text>
          </Text>
          <Text style={[styles.cardId, { color: colors.textMuted }]}>
            ID: {item.id.slice(-6).toUpperCase()}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Services</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('CreateEditListing')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 110 + insets.bottom },
            listings.length === 0 && styles.listContentEmpty
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.inputBackground }]}>
                <Ionicons name="briefcase-outline" size={44} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Listings Yet</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Add your first service to start appearing in student requests.
              </Text>
              <TouchableOpacity
                style={[styles.emptyAddBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('CreateEditListing')}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyAddBtnText}>Add a Service</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: '800' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 4,
  },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  listContent: { paddingHorizontal: 24, paddingBottom: 110, gap: 14, paddingTop: 8 },
  listContentEmpty: { flexGrow: 1 },

  listingCard: {
    flexDirection: 'row', borderRadius: 18, borderWidth: 1,
    padding: 16, gap: 14, alignItems: 'center',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  iconBlock: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardCategory: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  cardPrice: { fontSize: 22, fontWeight: '800' },
  cardPriceSub: { fontSize: 14, fontWeight: '500' },
  cardId: { fontSize: 11, marginTop: 2 },

  emptyIconWrap: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 19, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyAddBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  emptyAddBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
