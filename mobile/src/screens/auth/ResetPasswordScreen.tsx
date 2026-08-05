import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function ResetPasswordScreen({ route, navigation }: any) {
  const { colors, isDark } = useTheme();
  const logout = useAuthStore((state) => state.logout);
  const { resetSessionToken } = route.params || {};

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isPasswordValid = PASSWORD_REGEX.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleResetPassword = async () => {
    setError(null);

    if (!resetSessionToken) {
      setError('Invalid or missing reset session token. Please request a new code.');
      return;
    }

    if (!isPasswordValid) {
      setError('Password must be at least 8 characters long and contain both letters and numbers.');
      return;
    }

    if (!isMatch) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token: resetSessionToken.trim(),
        newPassword,
      });

      // Clear local Zustand state to ensure fresh re-login
      await logout();
      setSuccess(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to reset password. The session may have expired or already been used.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('SignIn')}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerWrap}>
            <View style={[styles.iconWrap, { backgroundColor: isDark ? '#1E2D2D' : '#E6F0F0' }]}>
              <Ionicons name="lock-closed-outline" size={32} color="#008080" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Reset Your Password</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Create a new secure password for your CampusServ account.
            </Text>
          </View>

          {success ? (
            <View style={[styles.card, { backgroundColor: isDark ? '#1C2E2A' : '#E8F5E9', borderColor: '#4CAF50' }]}>
              <Ionicons name="checkmark-circle" size={56} color="#4CAF50" style={{ alignSelf: 'center', marginBottom: 12 }} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Password Reset Successful!</Text>
              <Text style={[styles.cardText, { color: colors.textMuted }]}>
                Your password has been updated and all existing sessions have been signed out. Please sign in with your new password.
              </Text>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#008080', marginTop: 24 }]}
                onPress={() => navigation.navigate('SignIn')}
              >
                <Text style={styles.primaryButtonText}>Sign In Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              {!resetSessionToken ? (
                <View style={[styles.errorBanner, { marginBottom: 20 }]}>
                  <Ionicons name="warning-outline" size={24} color="#D32F2F" />
                  <Text style={styles.errorBannerText}>
                    Missing reset session token. Please request a new code.
                  </Text>
                </View>
              ) : null}

              {error ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={20} color="#D32F2F" />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              ) : null}

              {/* New Password */}
              <View style={styles.inputWrap}>
                <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: passwordFocused ? '#008080' : colors.border,
                    },
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={passwordFocused ? '#008080' : colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Min 8 chars, letters & numbers"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Password strength checks */}
                <View style={styles.rulesWrap}>
                  <View style={styles.ruleItem}>
                    <Ionicons
                      name={newPassword.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={newPassword.length >= 8 ? '#4CAF50' : colors.textMuted}
                    />
                    <Text style={[styles.ruleText, { color: newPassword.length >= 8 ? '#4CAF50' : colors.textMuted }]}>
                      At least 8 characters
                    </Text>
                  </View>
                  <View style={styles.ruleItem}>
                    <Ionicons
                      name={PASSWORD_REGEX.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={PASSWORD_REGEX.test(newPassword) ? '#4CAF50' : colors.textMuted}
                    />
                    <Text style={[styles.ruleText, { color: PASSWORD_REGEX.test(newPassword) ? '#4CAF50' : colors.textMuted }]}>
                      Contains letters & numbers
                    </Text>
                  </View>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputWrap}>
                <Text style={[styles.label, { color: colors.text }]}>Confirm New Password</Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.cardBackground,
                      borderColor: confirmFocused ? '#008080' : colors.border,
                    },
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={20} color={confirmFocused ? '#008080' : colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Re-enter new password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && !isMatch && (
                  <Text style={styles.matchError}>Passwords do not match</Text>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: '#008080',
                    opacity: loading || !isPasswordValid || !isMatch || !resetSessionToken ? 0.6 : 1,
                  },
                ]}
                onPress={handleResetPassword}
                disabled={loading || !isPasswordValid || !isMatch || !resetSessionToken}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Reset Password</Text>
                )}
              </TouchableOpacity>

              {error ? (
                <TouchableOpacity
                  style={{ marginTop: 20, alignItems: 'center' }}
                  onPress={() => navigation.navigate('ForgotPassword')}
                >
                  <Text style={{ color: '#008080', fontWeight: '600', fontSize: 14 }}>
                    Request a new verification code
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    marginTop: 12,
    marginBottom: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerWrap: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  form: {
    width: '100%',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  errorBannerText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  inputWrap: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  rulesWrap: {
    marginTop: 8,
    gap: 4,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  matchError: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});
