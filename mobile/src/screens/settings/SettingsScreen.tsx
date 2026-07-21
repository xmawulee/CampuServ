import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { useTheme } from '../../styles/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AvatarUploader from '../../components/AvatarUploader';
import { useToast } from '../../styles/ToastContext';

export default function SettingsScreen({ navigation }: any) {
  const { user, roleMode, logout, setAuth } = useAuthStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const activeRoleView = roleMode || (user?.role === 'PROVIDER' ? 'PROVIDER' : 'STUDENT');
  const isViewingAsProvider = activeRoleView === 'PROVIDER';

  const [profile, setProfile] = useState<any>(null);
  const isNameAlreadySet = !!(profile?.fullName || user?.fullName);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(user?.profilePictureUrl || null);
  const [bio, setBio] = useState('');
  const [serviceCategory, setServiceCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { showToast } = useToast();

  const handleLogout = async () => {
    await logout();
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const response = await api.get(`/users/${user.id}`);
        setProfile(response.data);
        setFullName(response.data.fullName || '');
        setProfilePictureUrl(response.data.profilePictureUrl || null);
        setBio(response.data.bio || '');
        setServiceCategory(response.data.serviceCategory || null);
      } catch (e) { /* silent */ } finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  const handleSave = async () => {
    if (!fullName.trim()) { showToast({ status: 'error', title: 'Error', subtitle: 'Full Name is required.' }); return; }
    setSaving(true);
    try {
      await api.put(`/users/${user?.id}/profile`, {
        fullName: fullName.trim(),
        bio: bio.trim(),
        serviceCategory: serviceCategory,
      });
      if (user) {
        const updatedUser = { ...user, fullName: fullName.trim() };
        const { accessToken, refreshToken } = useAuthStore.getState();
        if (accessToken && refreshToken) await setAuth(accessToken, refreshToken, updatedUser);
      }
      showToast({ status: 'success', title: 'Success', subtitle: 'Profile updated successfully.' });
    } catch { showToast({ status: 'error', title: 'Error', subtitle: 'Failed to update profile.' }); } finally { setSaving(false); }
  };


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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
      >
        {/* ── Profile Hero Section ── */}
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
                  await setAuth(accessToken, refreshToken, { ...user, profilePictureUrl: newUrl || undefined });
                }
              }
            }}
            onToast={(t) => showToast({ status: t.type === 'error' ? 'error' : 'success', title: t.message })}
          />

          <Text style={styles.heroName}>{fullName}</Text>
          <Text style={styles.heroEmail}>{user?.email}</Text>

          {/* Verification badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
            {profile?.isVerified && (
              <View style={[styles.verificationBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Ionicons name="shield-checkmark" size={14} color="#FFF" />
                <Text style={styles.verificationText}>Verified Student</Text>
              </View>
            )}
            <View style={[styles.verificationBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name={user?.role === 'PROVIDER' ? "briefcase-outline" : "school-outline"} size={14} color="#FFF" />
              <Text style={styles.verificationText}>Role: {user?.role === 'PROVIDER' ? "Provider" : "Student"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* ── Stats row ── */}
          <View style={[styles.statsRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>KNUST</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>University</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{user?.role === 'PROVIDER' ? 'Provider' : 'Student'}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Account Role</Text>
            </View>
            {user?.role === 'PROVIDER' && (
              <>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>5.0 ⭐</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rating</Text>
                </View>
              </>
            )}
          </View>

          {/* ── Settings Menu Items ── */}
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            {[
              {
                icon: 'shield-outline',
                label: 'Privacy & Security',
                sub: 'Manage account security',
                onPress: () => { }
              },
              {
                icon: 'help-circle-outline',
                label: 'Help & Support',
                sub: 'Get assistance',
                onPress: () => {
                  Alert.alert(
                    "Help & Support",
                    "Email: allenhodoameda@gmail.com\nPhone: +233 20 535 2535"
                  );
                }
              },
            ].map((item, idx, arr) => (
              <TouchableOpacity
                key={item.label}
                onPress={item.onPress}
                style={[
                  styles.menuRow,
                  idx !== arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                ]}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name={item.icon as any} size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.menuSub, { color: colors.textMuted }]}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Logout ── */}
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: colors.errorLight, borderColor: colors.error }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.error} style={{ marginRight: 8 }} />
            <Text style={[styles.logoutBtnText, { color: colors.error }]}>Log Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: 'transparent', borderColor: colors.error, marginTop: 12 }]}
            onPress={() => navigation.navigate('DeleteAccount')}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} style={{ marginRight: 8 }} />
            <Text style={[styles.logoutBtnText, { color: colors.error }]}>Delete Account</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  profileHero: {
    paddingTop: 40, paddingBottom: 32,
    alignItems: 'center', gap: 8,
  },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatar: { width: 90, height: 90, borderRadius: 28, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 38, fontWeight: '800', color: '#FFF' },
  uploadingOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 28, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  avatarEditBadge: {
    position: 'absolute', bottom: -4, right: -4,
    width: 24, height: 24, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  heroName: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  verificationBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginTop: 4 },
  verificationText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  content: { padding: 16 },

  statsRow: {
    flexDirection: 'row', borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statValue: { fontSize: 15, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 3 },
  statDivider: { width: 1, marginVertical: 12 },

  card: {
    borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 14 },

  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 12 },
  themeIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  themeLabel: { fontSize: 14, fontWeight: '700' },
  themeSub: { fontSize: 11, marginTop: 2 },
  toggleTrack: { width: 44, height: 26, borderRadius: 13, justifyContent: 'center' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },

  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderRadius: 12, height: 48, paddingHorizontal: 14, borderWidth: 1, fontSize: 14 },
  textArea: { borderRadius: 12, padding: 14, minHeight: 80, borderWidth: 1, fontSize: 14 },
  saveBtn: { borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  menuIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '600' },
  menuSub: { fontSize: 11, marginTop: 2 },

  logoutBtn: { flexDirection: 'row', borderWidth: 1.5, borderRadius: 16, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  logoutBtnText: { fontSize: 15, fontWeight: '700' },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  providerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  providerSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  prefLabel: { fontSize: 14, fontWeight: '600' },
  prefSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  divider: { height: 1, marginVertical: 4 },
});
