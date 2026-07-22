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
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Provider Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.topSection}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{profile.fullName.charAt(0)}</Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{profile.fullName}</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="star" size={20} color="#FFB800" />
              <Text style={[styles.statValue, { color: colors.text }]}>{profile.rating.toFixed(1)}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rating</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Ionicons name="briefcase" size={20} color={colors.primary} />
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {(profile as any).categoryRatings.map((cr: any) => (
                <View key={cr.categoryId} style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>{cr.categoryId.replace('_', ' ')}</Text>
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {profile.services.map((svc: any, idx: number) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.cardBackground,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                    {svc.category?.name || svc.title || 'Service'}
                  </Text>
                  {svc.basePrice !== undefined && (
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                      GHS {svc.basePrice}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.textMuted }}>No service categories listed yet.</Text>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.requestBtn, { backgroundColor: colors.primary }]}
          onPress={handleRequestService}
          activeOpacity={0.8}
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
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontFamily: 'Outfit-SemiBold' },
  scrollContent: {
    paddingBottom: 100,
  },
  topSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 32,
    fontFamily: 'Outfit-Bold',
  },
  name: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    gap: 16,
  },
  statBox: {
    flex: 1,
    maxWidth: 140,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Outfit-Bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-SemiBold',
    marginBottom: 12,
  },
  bio: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  serviceCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Medium',
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
  },
  servicePrice: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  requestBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  requestBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});
