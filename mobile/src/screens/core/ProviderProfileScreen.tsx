import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Dimensions, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { getProviderProfile, ProviderResponse } from '../../services/userService';
import RatingBadge from '../../components/RatingBadge';

const { width } = Dimensions.get('window');

export default function ProviderProfileScreen({ route, navigation }: any) {
  const { providerId } = route.params;
  const { colors, isDark } = useTheme();
  
  const [profile, setProfile] = useState<ProviderResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const res = await getProviderProfile(providerId);
      setProfile(res);
    } catch (e) {
      console.error(e);
    }
  }, [providerId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadProfile().finally(() => setLoading(false));
    }, [loadProfile])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, [loadProfile]);

  const handleRequestService = () => {
    navigation.navigate('PostRequest');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={{ color: colors.text }}>Profile not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Provider Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{profile.fullName.charAt(0)}</Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{profile.fullName}</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.statIconWrap, { backgroundColor: 'rgba(255, 184, 0, 0.1)' }]}>
                <Ionicons name="star" size={22} color="#FFB800" />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{profile.rating.toFixed(1)}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rating</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.cardBackground }]}>
              <View style={[styles.statIconWrap, { backgroundColor: `${colors.primary}1A` }]}>
                <Ionicons name="briefcase" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{profile.completedJobsCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Jobs Done</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
          <Text style={[styles.bio, { color: profile.bio ? colors.text : colors.textMuted }]}>
            {profile.bio || "This provider hasn't written a bio yet."}
          </Text>
        </View>

        {(profile as any).categoryRatings && (profile as any).categoryRatings.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Ratings</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
              {(profile as any).categoryRatings.map((cr: any) => (
                <View key={cr.categoryId} style={[styles.catRatingBox, { backgroundColor: colors.cardBackground }]}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 }}>{cr.categoryId.replace('_', ' ')}</Text>
                  <RatingBadge
                    rating={cr.rating}
                    reviewCount={cr.reviewCount}
                    size="medium"
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Offered Service Categories</Text>
          {profile.services && profile.services.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {profile.services.map((svc: any, idx: number) => (
                <View
                  key={idx}
                  style={[styles.servicePill, { backgroundColor: `${colors.primary}1A` }]}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>
                    {svc.category?.name || svc.title || 'Service'}
                  </Text>
                  {svc.basePrice !== undefined && (
                    <View style={[styles.priceTag, { backgroundColor: colors.primary }]}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFF' }}>
                        GHS {svc.basePrice}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.textMuted }}>No service categories listed yet.</Text>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity
          style={[styles.requestBtn, { backgroundColor: colors.primary }]}
          onPress={handleRequestService}
          activeOpacity={0.85}
        >
          <Text style={styles.requestBtnText}>Request Service</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  scrollContent: {
    paddingBottom: 120,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 40,
    fontWeight: '800',
  },
  name: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    gap: 16,
  },
  statBox: {
    flex: 1,
    maxWidth: 160,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  statIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  bio: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
  },
  catRatingBox: {
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    flex: 1,
    minWidth: 140,
  },
  servicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 100,
  },
  priceTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 32, // Extra padding for safe area
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  requestBtn: {
    paddingVertical: 18,
    borderRadius: 100,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  requestBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
