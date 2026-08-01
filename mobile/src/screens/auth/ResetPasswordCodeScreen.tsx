import React, { useState, useEffect, useRef } from 'react';
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
import { api } from '../../services/api';

export default function ResetPasswordCodeScreen({ route, navigation }: any) {
  const { colors, isDark } = useTheme();
  const { email } = route.params || {};

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  const inputRef = useRef<TextInput>(null);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  }, []);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async (codeToSubmit: string) => {
    if (codeToSubmit.length !== 6 || loading) return;
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/verify-reset-code', {
        email,
        code: codeToSubmit,
      });

      const resetSessionToken = res.data.resetSessionToken;

      // Navigate to New Password screen
      navigation.navigate('ResetPassword', { resetSessionToken });
    } catch (err: any) {
      setCode('');
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setError(null);
    setResending(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setCountdown(60);
      setCode('');
      inputRef.current?.focus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const codeLength = 6;
  const digits = Array(codeLength).fill('');
  for (let i = 0; i < code.length; i++) {
    digits[i] = code[i];
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerWrap}>
            <View style={[styles.iconWrap, { backgroundColor: isDark ? '#1E2D2D' : '#E6F0F0' }]}>
              <Ionicons name="mail-unread-outline" size={32} color="#008080" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Enter Reset Code</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              We sent a 6-digit verification code to
            </Text>
            <Text style={[styles.emailText, { color: colors.text }]}>
              {email}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted, marginTop: 4 }]}>
              Enter the code below to authorize resetting your password.
            </Text>
          </View>

          <View style={styles.form}>
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={20} color="#D32F2F" />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            {/* Custom Segmented OTP Input */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
              style={styles.otpOuterContainer}
            >
              <View style={styles.otpBoxesContainer}>
                {digits.map((digit, index) => {
                  const isFocused = index === code.length;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpBox,
                        {
                          backgroundColor: colors.cardBackground,
                          borderColor: isFocused ? '#008080' : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.otpDigit, { color: colors.text }]}>{digit}</Text>
                    </View>
                  );
                })}
              </View>
              
              <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value={code}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '');
                  setCode(cleaned);
                  if (cleaned.length === 6) {
                    handleVerify(cleaned);
                  }
                }}
                maxLength={6}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoComplete="one-time-code"
                autoCorrect={false}
              />
            </TouchableOpacity>

            {loading && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#008080" />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>Verifying code...</Text>
              </View>
            )}

            <View style={styles.actionsWrap}>
              <TouchableOpacity
                onPress={handleResend}
                disabled={countdown > 0 || resending}
                style={[styles.resendBtn, (countdown > 0 || resending) && { opacity: 0.5 }]}
              >
                {resending ? (
                  <ActivityIndicator size="small" color="#008080" />
                ) : (
                  <Text style={styles.resendBtnText}>
                    {countdown > 0 ? `Resend Code (${countdown}s)` : 'Resend Code'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('SignIn')}
                style={styles.cancelBtn}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>
                  Cancel & Back to Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>

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
    paddingTop: 12,
    paddingBottom: 40,
  },
  backButton: {
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
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emailText: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
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
  },
  errorBannerText: {
    color: '#C62828',
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  otpOuterContainer: {
    width: '100%',
    position: 'relative',
    height: 60,
    marginBottom: 24,
  },
  otpBoxesContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  otpBox: {
    width: '14%',
    height: 56,
    borderWidth: 1.5,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '700',
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  actionsWrap: {
    alignItems: 'center',
    marginTop: 12,
    gap: 16,
  },
  resendBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  resendBtnText: {
    color: '#008080',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
