import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { useTheme } from '../../styles/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabSpacing } from '../../hooks/useBottomTabSpacing';
import AvatarUploader from '../../components/AvatarUploader';
import { useToast } from '../../styles/ToastContext';
import AnimatedBackground from '../../components/AnimatedBackground';

export default function SettingsScreen({ navigation }: any) {
  const { user, roleMode, logout, setAuth } = useAuthStore();
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomTabSpacing = useBottomTabSpacing();

  const activeRoleView = roleMode || (user?.role === 'PROVIDER' ? 'PROVIDER' : 'STUDENT');
  const isViewingAsProvider = activeRoleView === 'PROVIDER';

  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(user?.profilePictureUrl || null);
  const [notifyNewRequests, setNotifyNewRequests] = useState(true);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of CampusServ?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => await logout() },
    ]);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const response = await api.get(`/users/${user.id}`);
        setProfile(response.data);
        setFullName(response.data.fullName || user.fullName || '');
        setProfilePictureUrl(response.data.profilePictureUrl || user.profilePictureUrl || null);
        setNotifyNewRequests(response.data.notifyNewRequests !== false);
      } catch (e) {
        /* silent fallback */
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const roleLabel = user?.role === 'PROVIDER' ? 'Service Provider' : 'Student';

  return (
    <AnimatedBackground style={{ flex: 1 }}>
      {/* ── Fixed Header ── */}
      <View
        style={[
          styles.headerBar,
          { paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 12 }
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>Account & Settings</Text>
        <View style={[styles.roleBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
            {roleLabel}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: bottomTabSpacing + 32,
          paddingHorizontal: 20,
        }}
      >
        {/* ── Profile Hero Card ── */}
        <View
          style={[
            styles.profileHeroCard,
            {
              backgroundColor: isDark ? 'rgba(255, 107, 53, 0.08)' : '#FFF9F5',
              borderColor: isDark ? 'rgba(255, 107, 53, 0.25)' : '#FCE2D6',
            }
          ]}
        >
          <View style={styles.avatarWrap}>
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
          </View>

          <Text style={[styles.userName, { color: colors.text }]}>{fullName || 'Student User'}</Text>
          <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user?.email}</Text>

          {/* Verification Badge */}
          <View style={[styles.verifiedPill, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
            <Text style={[styles.verifiedPillText, { color: colors.primary }]}>
              Verified {roleLabel} • KNUST
            </Text>
          </View>
        </View>

        {/* ── Campus & Role Stats Card ── */}
        <View style={[styles.statsCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.statCol}>
            <Text style={[styles.statTitle, { color: colors.primary }]}>KNUST</Text>
            <Text style={[styles.statSubtitle, { color: colors.textMuted }]}>Campus Location</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statCol}>
            <Text style={[styles.statTitle, { color: colors.primary }]}>{roleLabel}</Text>
            <Text style={[styles.statSubtitle, { color: colors.textMuted }]}>Account Role</Text>
          </View>
        </View>

        {/* ── PREFERENCES SECTION ── */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PREFERENCES</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <View style={styles.menuRow}>
            <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.primary} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>Dark Mode</Text>
              <Text style={[styles.menuSub, { color: colors.textMuted }]}>
                {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {isViewingAsProvider && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.menuRow}>
                <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="notifications-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={[styles.menuTitle, { color: colors.text }]}>New Request Alerts</Text>
                  <Text style={[styles.menuSub, { color: colors.textMuted }]}>Get notified of new campus jobs</Text>
                </View>
                <Switch
                  value={notifyNewRequests}
                  onValueChange={async (val) => {
                    setNotifyNewRequests(val);
                    try {
                      await api.put(`/users/${user?.id}/profile`, {
                        fullName: fullName.trim(),
                        notifyNewRequests: val,
                      });
                      showToast({ status: 'success', title: 'Success', subtitle: 'Notification preference saved.' });
                    } catch (e) {
                      showToast({ status: 'error', title: 'Error', subtitle: 'Could not update settings.' });
                    }
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </>
          )}
        </View>

        {/* ── ACCOUNT & MESSAGES SECTION ── */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ACCOUNT & MESSAGES</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.menuRowTouchable}
            onPress={() => navigation.navigate('ChatList')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>My Chats</Text>
              <Text style={[styles.menuSub, { color: colors.textMuted }]}>View active conversations</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.menuRowTouchable}
            onPress={() => navigation.navigate('NotificationCenter')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="notifications-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>Notification Center</Text>
              <Text style={[styles.menuSub, { color: colors.textMuted }]}>View recent system notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.menuRowTouchable}
            onPress={() => {
              Alert.alert('Help & Support', 'Email: support@campusserv.com\nPhone: +233 20 535 2535\nKNUST Campus Care Office');
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>Help & Support</Text>
              <Text style={[styles.menuSub, { color: colors.textMuted }]}>Contact campus customer care</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── SESSION & SECURITY SECTION ── */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>SESSION & SECURITY</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.menuRowTouchable} onPress={handleLogout} activeOpacity={0.7}>
            <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={[styles.menuTitle, { color: '#DC2626' }]}>Sign Out</Text>
              <Text style={[styles.menuSub, { color: colors.textMuted }]}>Sign out of your CampusServ account</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.menuRowTouchable}
            onPress={() => navigation.navigate('DeleteAccount')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={[styles.menuTitle, { color: '#DC2626' }]}>Delete Account</Text>
              <Text style={[styles.menuSub, { color: colors.textMuted }]}>Permanently delete account and data</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  profileHeroCard: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarWrap: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  verifiedPillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  statsCard: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '80%',
    alignSelf: 'center',
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  menuRowTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuSub: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  divider: {
    height: 1,
    width: '100%',
  },
});
