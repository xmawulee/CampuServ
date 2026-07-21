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
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../styles/ThemeContext';

export default function ProviderBioScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const { user, updateUser, logout } = useAuthStore();

  const [bio, setBio] = useState(user?.bio || '');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(user?.whatsappNumber || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isUpgrade = route.params?.isUpgrade || false;

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? You can resume your application later.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive", 
          onPress: () => logout() 
        }
      ]
    );
  };

  const handleSubmit = async () => {
    if (!whatsappNumber.trim()) {
      setErrorMsg('WhatsApp Number is required.');
      return;
    }
    
    // Validate Ghanaian phone number format: +233 or 0 followed by 9 digits (total 10 or 13 chars)
    const phoneRegex = /^(?:\+233|0)[2-5]\d{8}$/;
    if (!phoneRegex.test(whatsappNumber.trim().replace(/\s/g, ''))) {
      setErrorMsg('Please enter a valid Ghanaian WhatsApp number (e.g., 0551234567 or +233551234567).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      if (user?.id) {
        // We update the user in user-service with bio, portfolio, and whatsappNumber
        await api.put(`/users/${user.id}/profile`, {
          bio: bio.trim(),
          whatsappNumber: whatsappNumber.trim().replace(/\s/g, ''),
          // we can send portfolio if needed, but bio is the core part
        });

        await updateUser({ 
          bio: bio.trim(), 
          whatsappNumber: whatsappNumber.trim().replace(/\s/g, '') 
        });
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
      <View style={styles.headerBar}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={handleSignOut}
            activeOpacity={0.7}
            accessibilityLabel="Sign Out"
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={20} color={colors.text} />
            <Text style={[styles.backButtonText, { color: colors.text }]}>Sign Out</Text>
          </TouchableOpacity>
      </View>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <Text style={[styles.heading, { color: colors.text }]}>
            Step 3: Build Your Profile
          </Text>
          <Text style={[styles.subheading, { color: colors.textMuted }]}>
            Write a short bio and optionally link your portfolio.
          </Text>

          {errorMsg ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.error + '20' }]}>
              <Ionicons name="warning" size={20} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Bio <Text style={{ color: colors.error }}>*</Text></Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Tell customers about your skills and experience..."
              placeholderTextColor={colors.textMuted}
              value={bio}
              onChangeText={setBio}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Portfolio / Work Link (Optional)</Text>
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

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>WhatsApp Number <Text style={{ color: colors.error }}>*</Text></Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="e.g. 0551234567"
              placeholderTextColor={colors.textMuted}
              value={whatsappNumber}
              onChangeText={setWhatsappNumber}
              keyboardType="phone-pad"
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
  headerBar: { flexDirection: 'row', justifyContent: 'flex-start', paddingHorizontal: 24, paddingTop: 16 },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  backButtonText: { marginLeft: 6, fontSize: 14, fontWeight: '600' },
  scrollContent: { padding: 24, paddingBottom: 48 },
  heading: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  stepIndicator: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  subheading: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: { marginLeft: 8, fontSize: 14, fontWeight: '500', flex: 1 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: { height: 120, paddingTop: 16 },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
