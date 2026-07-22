import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../styles/ThemeContext';

export default function ProviderReviewScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user, updateUser } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // Explicitly submit the application to enter PENDING_VERIFICATION queue
      await api.post(`/auth/submit-provider-application`);

      await updateUser({
        accountStatus: 'PENDING_VERIFICATION',
      });

      setIsSubmitting(false);
      // Because we updated the authStore state to PENDING_VERIFICATION,
      // AppNavigator will automatically drop us into PendingApproval screen.
    } catch (err: any) {
      setIsSubmitting(false);
      let message = 'Failed to submit application. Please try again.';
      if (err?.response?.data && typeof err.response.data === 'string') {
        message = err.response.data;
      }
      setErrorMsg(message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.stepIndicator, { color: colors.primary }]}>Step 4 of 4</Text>
        <Text style={[styles.heading, { color: colors.text }]}>Review & Submit</Text>
        <Text style={[styles.subheading, { color: colors.textMuted }]}>
          Please confirm your details before submitting. You cannot edit these while under review.
        </Text>

        {errorMsg ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={[styles.errorBannerText, { color: colors.error }]}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Summary Card */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Personal Details</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Name</Text>
            <Text style={[styles.value, { color: colors.text }]}>{user?.fullName || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Email</Text>
            <Text style={[styles.value, { color: colors.text }]}>{user?.email || 'N/A'}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={[styles.cardTitle, { color: colors.text }]}>Student ID</Text>
          {user?.studentIdPhotoUrl ? (
             <Text style={[styles.value, { color: colors.success }]}>ID Uploaded ✓</Text>
          ) : (
            <Text style={[styles.value, { color: colors.error }]}>Missing ID Photo</Text>
          )}

          <View style={styles.divider} />

          <Text style={[styles.cardTitle, { color: colors.text }]}>Service Category</Text>
          <Text style={[styles.value, { color: colors.text }]}>{user?.serviceCategory || 'None selected'}</Text>

          <View style={styles.divider} />

          <Text style={[styles.cardTitle, { color: colors.text }]}>Bio</Text>
          <Text style={[styles.value, { color: colors.text }]}>{user?.bio || 'No bio provided.'}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: colors.primary },
            isSubmitting && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Application</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  backBtn: { marginBottom: 16, width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  heading: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  stepIndicator: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  subheading: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
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
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
