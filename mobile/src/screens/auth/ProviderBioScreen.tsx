import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../styles/ThemeContext';

export default function ProviderBioScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const { user, updateUser } = useAuthStore();

  const [bio, setBio] = useState(user?.bio || '');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isUpgrade = route.params?.isUpgrade || false;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (user?.id) {
        // We update the user in user-service with bio and portfolio.
        await api.put(`/users/${user.id}/profile`, {
          bio: bio.trim(),
          // we can send portfolio if needed, but bio is the core part
        });

        await updateUser({ bio: bio.trim() });
      }

      setIsSubmitting(false);
      navigation.navigate('ProviderReview');
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.response?.data || 'Failed to save bio. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.stepIndicator, { color: colors.primary }]}>Step 3 of 4</Text>
          <Text style={[styles.heading, { color: colors.text }]}>Tell us about yourself</Text>
          <Text style={[styles.subheading, { color: colors.textMuted }]}>
            Write a short bio. This will be shown on your provider profile to help clients know more about you.
          </Text>

          {errorMsg ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
              <Ionicons name="alert-circle" size={20} color={colors.error} />
              <Text style={[styles.errorBannerText, { color: colors.error }]}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Professional Bio (Optional)</Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="e.g. I am a final year CS student specializing in laptop repairs..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={bio}
              onChangeText={setBio}
              maxLength={255}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Portfolio Link (Optional)</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="https://yourportfolio.com"
              placeholderTextColor={colors.textMuted}
              value={portfolioLink}
              onChangeText={setPortfolioLink}
              autoCapitalize="none"
              keyboardType="url"
            />
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
              <Text style={styles.submitBtnText}>Continue</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
  },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
