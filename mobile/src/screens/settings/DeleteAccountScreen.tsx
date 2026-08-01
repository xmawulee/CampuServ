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
import { useToast } from '../../styles/ToastContext';
import AnimatedBackground from '../../components/AnimatedBackground';

export default function DeleteAccountScreen({ navigation }: any) {
  const { logout } = useAuthStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [checking, setChecking] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const checkEligibility = async () => {
    setChecking(true);
    try {
      const response = await api.get('/auth/account/delete/check');
      setEligible(response.data.eligible);
      setBlockers(response.data.blockers || []);
    } catch (e: any) {
      showToast({
        status: 'error',
        title: 'Error',
        subtitle: 'Failed to verify account deletion eligibility.'
      });
      navigation.goBack();
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkEligibility();
  }, []);

  const handleDelete = async () => {
    if (!password.trim()) return;

    Alert.alert(
      "Confirm Irreversible Deletion",
      "Are you absolutely sure you want to permanently delete your CampusServ account? This action is instant, irreversible, and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete My Account",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const res = await api.post('/auth/account/delete', { password: password.trim() });
              if (res.data.success) {
                Alert.alert(
                  "Account Deleted",
                  "Your account and personal data have been permanently deleted. You will now be logged out.",
                  [
                    {
                      text: "OK",
                      onPress: async () => {
                        await logout();
                      }
                    }
                  ]
                );
              }
            } catch (err: any) {
              const errMsg = err.response?.data?.message || 'Failed to delete account. Please verify your password.';
              showToast({
                status: 'error',
                title: 'Deletion Failed',
                subtitle: errMsg
              });
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  if (checking) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Checking account status...</Text>
      </View>
    );
  }

  return (
    <AnimatedBackground style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 20) }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Delete Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
      >
        {!eligible ? (
          // Blocked view
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.warningHeader}>
              <Ionicons name="alert-circle" size={40} color={colors.error} />
              <Text style={[styles.cardTitle, { color: colors.error }]}>Action Required</Text>
            </View>
            <Text style={[styles.cardSub, { color: colors.textMuted }]}>
              Your account has unresolved obligations and cannot be deleted at this time. Please resolve the following first:
            </Text>

            <View style={styles.blockerList}>
              {blockers.map((blocker, index) => (
                <View key={index} style={styles.blockerRow}>
                  <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                  <Text style={[styles.blockerText, { color: colors.text }]}>{blocker}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.actionBtnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Eligible view - Password confirmation gate
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning" size={40} color={colors.error} />
              <Text style={[styles.cardTitle, { color: colors.error }]}>Warning: Irreversible Action</Text>
            </View>

            <Text style={[styles.warningText, { color: colors.text }]}>
              Deleting your account is permanent and cannot be undone. All logins, active sessions, and profile listings will be immediately terminated.
            </Text>

            <Text style={[styles.detailsTitle, { color: colors.text }]}>What will be permanently deleted:</Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletItem, { color: colors.textMuted }]}>• Profile information and settings</Text>
              <Text style={[styles.bulletItem, { color: colors.textMuted }]}>• Uploaded files, portfolio photos, and verification documents</Text>
              <Text style={[styles.bulletItem, { color: colors.textMuted }]}>• Unaccepted offers and active service listings</Text>
              <Text style={[styles.bulletItem, { color: colors.textMuted }]}>• All notifications and push device bindings</Text>
            </View>

            <Text style={[styles.detailsTitle, { color: colors.text }]}>What will be retained & anonymized:</Text>
            <View style={styles.bulletList}>
              <Text style={[styles.bulletItem, { color: colors.textMuted }]}>• Completed transactions (retained for platform financial audit trails)</Text>
              <Text style={[styles.bulletItem, { color: colors.textMuted }]}>• Completed jobs, review ratings, and chat message history (anonymized to "Deleted User" so active counterparties retain historical context)</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Re-enter password to confirm</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBackground }]}
                placeholder="Enter current password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!deleting}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.deleteBtn,
                { backgroundColor: password.trim() ? colors.error : colors.border }
              ]}
              onPress={handleDelete}
              disabled={!password.trim() || deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.deleteBtnText}>Delete My Account Permanently</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '600' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center' },
  container: { flex: 1, marginTop: 10 },
  card: {
    borderRadius: 20, borderWidth: 1, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardSub: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  warningText: { fontSize: 13, fontWeight: '600', lineHeight: 20, marginBottom: 16 },
  detailsTitle: { fontSize: 13, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  bulletList: { paddingLeft: 8, gap: 4, marginBottom: 12 },
  bulletItem: { fontSize: 12, lineHeight: 18 },
  blockerList: { gap: 10, marginVertical: 12, marginBottom: 20 },
  blockerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  blockerText: { fontSize: 13, fontWeight: '600', flex: 1 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 20 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderRadius: 12, height: 48, paddingHorizontal: 14, borderWidth: 1, fontSize: 14 },
  actionBtn: { borderRadius: 14, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  deleteBtn: { borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  deleteBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
