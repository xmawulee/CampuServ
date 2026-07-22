import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../styles/ThemeContext';
import { ActivityIndicator } from 'react-native';

export default function RejectedApplicationScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user, logout, updateUser } = useAuthStore();

  // TODO: Confirm field name for rejection reason against live API response.
  // The admin rejection flow stores notes in the user profile.
  // Current expected field: user.rejectionReason (see User interface in authStore.ts)
  const rejectionReason = user?.rejectionReason ?? null;

  const rejectionCount = user?.rejectionCount ?? 0;
  const isMaxRejectionsReached = rejectionCount >= 3;

  const [isResetting, setIsResetting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  const handleResubmit = async () => {
    setIsResetting(true);
    setErrorMsg('');
    try {
      await api.post(`/auth/reset-provider-application`);
      await updateUser({ accountStatus: 'INCOMPLETE' });
      // AppNavigator will detect INCOMPLETE and immediately route the user to providerOnboarding
    } catch (err: any) {
      setIsResetting(false);
      setErrorMsg(err?.response?.data || 'Failed to reset application. Please try again.');
    }
  };

  const handleContactSupport = () => {
    // Open email client with template prefilled
    const email = 'support@campusserv.com';
    const subject = 'CampusServ Application Rejection Appeal';
    const body = `Hello Support Team,\n\nMy provider application (User ID: ${user?.id}) has been rejected 3 times. I would like to request manual verification.`;
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Attempt to open email client
    import('react-native').then(({ Linking }) => {
      Linking.canOpenURL(mailtoUrl).then((supported) => {
        if (supported) {
          Linking.openURL(mailtoUrl);
        } else {
          import('react-native').then(({ Alert }) => {
            Alert.alert(
              'Cannot Open Email Client',
              'Please send an email manually to support@campusserv.com with your User ID: ' + user?.id
            );
          });
        }
      });
    });
  };

  const handleSignOut = async () => {
    await logout();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: colors.errorLight }]}>
          <Ionicons name="close-circle-outline" size={52} color={colors.error} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Application Rejected</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {isMaxRejectionsReached
            ? `Your verification has been rejected ${rejectionCount} times. You have reached the maximum number of attempts.`
            : 'Unfortunately, your Student ID verification was not approved. Please review the reason below and resubmit a clear photo of your ID.'
          }
        </Text>

        {/* Rejection reason */}
        <View style={[styles.reasonCard, { backgroundColor: colors.cardBackground, borderColor: colors.error }]}>
          <View style={styles.reasonHeader}>
            <Ionicons name="document-text-outline" size={18} color={colors.error} />
            <Text style={[styles.reasonTitle, { color: colors.error }]}>Admin Notes (Attempt {rejectionCount})</Text>
          </View>
          {rejectionReason ? (
            <Text style={[styles.reasonText, { color: colors.text }]}>{rejectionReason}</Text>
          ) : (
            <Text style={[styles.reasonText, { color: colors.textMuted }]}>
              No specific notes were provided. Common reasons include: blurry photo, card not fully visible, or ID not recognised as a valid KNUST card.
            </Text>
          )}
        </View>

        {/* Tips to fix or Support Note */}
        {!isMaxRejectionsReached ? (
          <View style={[styles.tipsCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <Text style={[styles.tipsTitle, { color: colors.text }]}>Tips for resubmission:</Text>
            {[
              'Ensure all four corners of the card are visible',
              'Use good lighting — no shadows or glare',
              'Hold the card steady for a sharp, clear image',
              'Confirm it is your current KNUST Student ID',
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.tipText, { color: colors.textMuted }]}>{tip}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.tipsCard, { backgroundColor: colors.cardBackground, borderColor: colors.error, borderWidth: 1 }]}>
            <Text style={[styles.tipsTitle, { color: colors.text }]}>Manual Verification Required</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>
              To ensure platform safety, we limit resubmission attempts to 3. Please contact CampusServ Support to appeal this decision or request a manual review of your student credentials.
            </Text>
          </View>
        )}

        {errorMsg ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={[styles.errorBannerText, { color: colors.error }]}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Actions */}
        {isMaxRejectionsReached ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#E53E3E' }]}
            onPress={handleContactSupport}
          >
            <Ionicons name="mail-outline" size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>Contact Support</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#7C3AED' }, isResetting && { opacity: 0.5 }]}
            onPress={handleResubmit}
            disabled={isResetting}
          >
            {isResetting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="create-outline" size={18} color="#FFF" />
                <Text style={styles.primaryBtnText}>Resubmit Application</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={[styles.secondaryBtnText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>

        {/* Provider-only scope reminder — consistent with RoleSelectScreen */}
        <Text style={[styles.scopeNote, { color: colors.textMuted }]}>
          Reminder: this is a provider-only account — no student access on this account, regardless of approval outcome.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 28, alignItems: 'center', paddingBottom: 48 },
  iconCircle: {
    width: 104, height: 104, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24, marginTop: 16,
  },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 28 },
  reasonCard: {
    width: '100%', borderRadius: 16, borderWidth: 1.5, padding: 18, marginBottom: 20,
  },
  reasonHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  reasonTitle: { fontSize: 14, fontWeight: '700' },
  reasonText: { fontSize: 14, lineHeight: 22 },
  tipsCard: {
    width: '100%', borderRadius: 16, borderWidth: 1, padding: 18, gap: 10, marginBottom: 32,
  },
  tipsTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 56, width: '100%', borderRadius: 16, justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    marginBottom: 16,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },
  scopeNote: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 24,
    fontStyle: 'italic',
    paddingHorizontal: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorBannerText: { flex: 1, fontSize: 13, fontWeight: '500' },
});
