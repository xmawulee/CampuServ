import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, RefreshControl,
} from 'react-native';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { useTheme } from '../../styles/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AvatarUploader from '../../components/AvatarUploader';
import { useToast } from '../../styles/ToastContext';
import StatusDialog from '../../components/StatusDialog';
import type { ProviderProfileData } from '../../types/provider';

export default function ProviderProfileScreen({ navigation }: any) {
  const { user, logout, setAuth } = useAuthStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<ProviderProfileData | null>(null);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    user?.profilePictureUrl || null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);

  const { showToast } = useToast();
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const response = await api.get(`/users/${user.id}`);
      const data: ProviderProfileData = response.data;
      setProfile(data);
      setFullName(data.fullName || '');
      setProfilePictureUrl(data.profilePictureUrl || null);

      try {
        const reviewsRes = await api.get(`/reviews/provider/${user.id}`);
        setReviews(reviewsRes.data || []);
      } catch (e) {
        console.warn("Failed to fetch reviews");
      }
    } catch {
      // Keep current user data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProfile();
    }, [fetchProfile])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleLogout = async () => {
    setLogoutDialogVisible(true);
  };

  const isPendingVerification = !user?.isVerified;
  const rating = profile?.rating ?? 0;
  const completedJobs = profile?.completedJobsCount ?? 0;
  const activeListings = profile?.services?.length ?? 0;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {/* ── Profile Hero ── */}
        <View style={[styles.profileHero, { backgroundColor: colors.primary }]}>
          <AvatarUploader
            currentAvatarUrl={profilePictureUrl}
            userId={user?.id || ''}
            displayName={fullName}
            onUploadSuccess={async (newUrl) => {
              setProfilePictureUrl(newUrl);
              if (user) {
                const { accessToken, refreshToken } = useAuthStore.getState();
                if (accessToken && refreshToken) {
                  await setAuth(accessToken, refreshToken, {
                    ...user,
                    profilePictureUrl: newUrl || undefined,
                  });
                }
              }
            }}
            onToast={(t) => showToast({ status: t.type === 'error' ? 'error' : 'success', title: t.message })}
          />
          <Text style={styles.heroName}>{fullName}</Text>
          <Text style={styles.heroEmail}>{user?.email}</Text>

          {isPendingVerification ? (
            <View style={[styles.verificationBadge, { backgroundColor: 'rgba(255,165,0,0.85)' }]}>
              <Ionicons name="hourglass-outline" size={13} color="#FFF" />
              <Text style={styles.verificationText}>Pending Verification</Text>
            </View>
          ) : (
            <View style={[styles.verificationBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Ionicons name="shield-checkmark" size={13} color="#FFF" />
              <Text style={styles.verificationText}>Verified Provider</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* ── Pending Banner ── */}
          {isPendingVerification && (
            <View style={[styles.pendingBanner, { backgroundColor: 'rgba(255,165,0,0.08)', borderColor: 'rgba(255,165,0,0.5)' }]}>
              <Ionicons name="information-circle" size={22} color="orange" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.pendingTitle, { color: colors.text }]}>Verification Pending</Text>
                <Text style={[styles.pendingSub, { color: colors.textMuted }]}>
                  Your services won't be visible until your account is approved by admin.
                </Text>
              </View>
            </View>
          )}

          {/* ── Bio ── */}
          {profile?.bio ? (
            <View style={[styles.bioCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Text style={[styles.bioText, { color: colors.text }]}>{profile.bio}</Text>
            </View>
          ) : null}

          {/* ── Stats row ── */}
          <View style={[styles.statsRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{activeListings}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Services</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{completedJobs}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Completed</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {rating > 0 ? rating.toFixed(1) : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rating</Text>
            </View>
          </View>

          {/* ── Reviews ── */}
          {reviews && reviews.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Reviews ({reviews.length})</Text>
              {reviews.map((review: any) => (
                <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                  <View style={styles.reviewHeader}>
                    <Text style={[styles.reviewerName, { color: colors.text }]}>
                      {review.direction === 'REQUESTER_TO_PROVIDER' ? 'Client Review' : 'Provider Review'}
                    </Text>
                    <View style={styles.starsRow}>
                      <Ionicons name="star" size={14} color="#FFD700" />
                      <Text style={[styles.reviewRating, { color: colors.text }]}>{review.rating}</Text>
                    </View>
                  </View>
                  {review.comment ? (
                    <Text style={[styles.reviewComment, { color: colors.textMuted }]}>{review.comment}</Text>
                  ) : null}
                  <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
                </View>
              ))}
            </>
          )}

          {/* ── Actions ── */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 4 }]}>Actions</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <TouchableOpacity 
              style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]} 
              onPress={handleLogout} 
              activeOpacity={0.7}
            >
              <View style={[styles.settingIconWrap, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                <Ionicons name="log-out" size={18} color="#FF3B30" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingTitle, { color: '#FF3B30' }]}>Log Out</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingRow} 
              onPress={() => navigation.navigate('DeleteAccount')} 
              activeOpacity={0.7}
            >
              <View style={[styles.settingIconWrap, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingTitle, { color: '#FF3B30' }]}>Delete Account</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <StatusDialog
        visible={logoutDialogVisible}
        status="warning"
        title="Log Out"
        description="Are you sure you want to log out?"
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        destructive={true}
        onConfirm={async () => {
          setLogoutDialogVisible(false);
          await logout();
        }}
        onCancel={() => setLogoutDialogVisible(false)}
        onClose={() => setLogoutDialogVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  profileHero: {
    paddingTop: 60, paddingBottom: 40,
    alignItems: 'center', justifyContent: 'center',
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  heroName: { fontSize: 22, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  verificationBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
  verificationText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  content: { padding: 24, paddingBottom: 40 },
  pendingBanner: {
    flexDirection: 'row', padding: 14, borderRadius: 16, borderWidth: 1,
    gap: 12, marginBottom: 20, alignItems: 'flex-start',
  },
  pendingTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  pendingSub: { fontSize: 12, lineHeight: 17 },

  bioCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 20 },
  bioText: { fontSize: 14, lineHeight: 20 },

  statsRow: { flexDirection: 'row', borderRadius: 20, paddingVertical: 20, borderWidth: 1, marginBottom: 28 },
  statItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '500' },
  statDivider: { width: 1 },

  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10, marginLeft: 4 },
  settingsCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  settingIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingTitle: { fontSize: 15, fontWeight: '600' },
  settingSub: { fontSize: 12, marginTop: 2 },
  toggleBtn: { width: 44, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
  toggleKnob: { width: 20, height: 20, borderRadius: 10 },

  reviewCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewerName: { fontSize: 14, fontWeight: '700' },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewRating: { fontSize: 14, fontWeight: '600' },
  reviewComment: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  reviewDate: { fontSize: 11, color: '#888' },
});
