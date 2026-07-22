import React, { useState, useRef } from 'react';
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
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const KNUST_EMAIL_REGEX = /^[^\s@]+@(st\.)?knust\.edu\.gh$/i;
const PASSWORD_POLICY_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const logoImage = require('../../../assets/logo.png');

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function ClientSignUpScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [bannerError, setBannerError] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Live validation calculations
  const isMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const isPasswordValid = isMinLength && hasLetter && hasNumber;
  const isEmailDomainValid = KNUST_EMAIL_REGEX.test(email.trim());
  const isConfirmMatch = password.length > 0 && confirmPassword.length > 0 && confirmPassword === password;
  const isFormValid = name.trim().length >= 2 && isEmailDomainValid && isPasswordValid && isConfirmMatch;

  const validate = (): boolean => {
    const err: FormErrors = {};
    if (!name.trim()) {
      err.name = 'Full Name is required.';
    } else if (name.trim().length < 2) {
      err.name = 'Name must be at least 2 characters.';
    }

    if (!email.trim()) {
      err.email = 'Email is required.';
    } else if (!isEmailDomainValid) {
      err.email = 'Please use your valid KNUST email (@st.knust.edu.gh).';
    }

    if (!password) {
      err.password = 'Password is required.';
    } else if (!isPasswordValid) {
      err.password = 'Password must be at least 8 characters long and contain a letter and a number.';
    }

    if (confirmPassword !== password) {
      err.confirmPassword = 'Passwords do not match.';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async () => {
    setBannerError(null);
    if (!validate() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', {
        email: email.trim().toLowerCase(),
        password,
        fullName: name.trim(),
        role: 'STUDENT',
      });

      const {
        accessToken,
        refreshToken,
        userId: id,
        role: userRole,
        email: resEmail,
        fullName,
        profilePictureUrl,
        isVerified,
        verificationStatus,
        studentIdPhotoUrl,
      } = response.data;

      const userObj = {
        id,
        email: resEmail || email.trim().toLowerCase(),
        fullName: fullName || name.trim(),
        role: (userRole || 'STUDENT') as 'STUDENT' | 'PROVIDER' | 'ADMIN',
        isVerified: true,
        verificationStatus,
        profilePictureUrl,
        studentIdPhotoUrl,
      };

      await setAuth(accessToken, refreshToken, userObj, 'CLIENT');
    } catch (error: any) {
      const responseData = error.response?.data;
      let serverMessage: string | null = null;
      if (typeof responseData === 'string') {
        serverMessage = responseData;
      } else if (responseData && typeof responseData === 'object') {
        serverMessage = responseData.message || responseData.error || null;
      }

      if (error.response?.status === 409) {
        setBannerError(serverMessage || 'An account with this email already exists. Please sign in instead.');
      } else if (error.response?.status === 400) {
        setBannerError(serverMessage || 'Registration failed. Please check your details.');
      } else {
        setBannerError(serverMessage || 'Something went wrong. Check your connection and try again.');
      }
      setIsLoading(false);
    }
  };

  const backgroundColors = isDark 
    ? (['#0B0F19', '#02040A'] as const)
    : (['#F3F6FA', '#E3E8F0'] as const);

  const clientBtnGradient = isDark ? (['#312E81', '#1E3A8A'] as const) : (['#4F46E5', '#3B82F6'] as const);

  return (
    <LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />

        {/* Decorative Concentric Rings in Background */}
        <View style={styles.logoRingContainer}>
          <View style={[styles.logoRing, { borderColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(99,102,241,0.04)', width: 180, height: 180, borderRadius: 90 }]} />
          <View style={[styles.logoRing, { borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.06)', width: 140, height: 140, borderRadius: 70 }]} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Top Bar */}
            <TouchableOpacity 
              style={styles.backBtn} 
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              disabled={isLoading}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>

            {/* Logo */}
            <Image 
              source={logoImage} 
              style={styles.logo} 
              resizeMode="contain"
            />

            <Text style={[styles.heading, { color: colors.text }]}>Create Account</Text>
            <Text style={[styles.subheading, { color: colors.textMuted }]}>
              Sign up as a Client to hire campus service providers.
            </Text>

            {/* Banner error */}
            {bannerError && (
              <View style={[styles.errorBanner, { backgroundColor: colors.errorLight, borderColor: colors.error }]}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                <Text style={[styles.errorBannerText, { color: colors.error }]}>{bannerError}</Text>
              </View>
            )}

            {/* Form */}
            <View style={styles.form}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Full Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : colors.inputBackground, color: colors.text, borderColor: errors.name ? colors.error : (isDark ? 'rgba(255,255,255,0.08)' : 'transparent'), borderWidth: 1.5 }]}
                value={name}
                onChangeText={(v) => { setName(v); if (errors.name) setErrors((e) => ({ ...e, name: undefined })); }}
                placeholder="e.g. Kofi Mensah"
                placeholderTextColor={colors.placeholderText}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
                editable={!isLoading}
              />
              {errors.name && <Text style={[styles.fieldError, { color: colors.error }]}>{errors.name}</Text>}

              <Text style={[styles.label, styles.labelTop, { color: colors.textMuted }]}>KNUST Email</Text>
              <TextInput
                ref={emailRef}
                style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : colors.inputBackground, color: colors.text, borderColor: errors.email ? colors.error : (isDark ? 'rgba(255,255,255,0.08)' : 'transparent'), borderWidth: 1.5 }]}
                value={email}
                onChangeText={(v) => { setEmail(v); if (errors.email) setErrors((e) => ({ ...e, email: undefined })); }}
                placeholder="your.name@st.knust.edu.gh"
                placeholderTextColor={colors.placeholderText}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
                editable={!isLoading}
              />
              {email.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                  <Ionicons name={isEmailDomainValid ? "checkmark-circle" : "alert-circle-outline"} size={14} color={isEmailDomainValid ? (isDark ? '#34D399' : '#059669') : colors.error} />
                  <Text style={{ fontSize: 12, color: isEmailDomainValid ? (isDark ? '#34D399' : '#059669') : colors.error }}>
                    {isEmailDomainValid ? 'Valid KNUST email domain' : 'Must end in @st.knust.edu.gh'}
                  </Text>
                </View>
              )}
              {errors.email && <Text style={[styles.fieldError, { color: colors.error }]}>{errors.email}</Text>}

              <Text style={[styles.label, styles.labelTop, { color: colors.textMuted }]}>Password</Text>
              <View style={[styles.passwordRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : colors.inputBackground, borderColor: errors.password ? colors.error : (isDark ? 'rgba(255,255,255,0.08)' : 'transparent'), borderWidth: 1.5 }]}>
                <TextInput
                  ref={passwordRef}
                  style={[styles.passwordInput, { color: colors.text }]}
                  value={password}
                  onChangeText={(v) => { setPassword(v); if (errors.password) setErrors((e) => ({ ...e, password: undefined })); }}
                  placeholder="Create a strong password"
                  placeholderTextColor={colors.placeholderText}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  blurOnSubmit={false}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              {password.length > 0 && (
                <View style={{ marginTop: 6, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name={isMinLength ? "checkmark-circle" : "ellipse-outline"} size={14} color={isMinLength ? (isDark ? '#34D399' : '#059669') : colors.textMuted} />
                    <Text style={{ fontSize: 12, color: isMinLength ? (isDark ? '#34D399' : '#059669') : colors.textMuted }}>At least 8 characters</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name={hasLetter ? "checkmark-circle" : "ellipse-outline"} size={14} color={hasLetter ? (isDark ? '#34D399' : '#059669') : colors.textMuted} />
                    <Text style={{ fontSize: 12, color: hasLetter ? (isDark ? '#34D399' : '#059669') : colors.textMuted }}>At least 1 letter</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name={hasNumber ? "checkmark-circle" : "ellipse-outline"} size={14} color={hasNumber ? (isDark ? '#34D399' : '#059669') : colors.textMuted} />
                    <Text style={{ fontSize: 12, color: hasNumber ? (isDark ? '#34D399' : '#059669') : colors.textMuted }}>At least 1 number</Text>
                  </View>
                </View>
              )}
              {errors.password && <Text style={[styles.fieldError, { color: colors.error }]}>{errors.password}</Text>}

              <Text style={[styles.label, styles.labelTop, { color: colors.textMuted }]}>Confirm Password</Text>
              <View style={[styles.passwordRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : colors.inputBackground, borderColor: errors.confirmPassword ? colors.error : (isDark ? 'rgba(255,255,255,0.08)' : 'transparent'), borderWidth: 1.5 }]}>
                <TextInput
                  ref={confirmPasswordRef}
                  style={[styles.passwordInput, { color: colors.text }]}
                  value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); if (errors.confirmPassword) setErrors((e) => ({ ...e, confirmPassword: undefined })); }}
                  placeholder="Re-enter your password"
                  placeholderTextColor={colors.placeholderText}
                  secureTextEntry={!showConfirmPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                  <Ionicons name={isConfirmMatch ? "checkmark-circle" : "close-circle-outline"} size={14} color={isConfirmMatch ? (isDark ? '#34D399' : '#059669') : colors.error} />
                  <Text style={{ fontSize: 12, color: isConfirmMatch ? (isDark ? '#34D399' : '#059669') : colors.error }}>
                    {isConfirmMatch ? 'Passwords match' : 'Passwords do not match'}
                  </Text>
                </View>
              )}
              {errors.confirmPassword && <Text style={[styles.fieldError, { color: colors.error }]}>{errors.confirmPassword}</Text>}
            </View>

            {/* Create Account Button */}
            <TouchableOpacity
              style={styles.submitBtnTouch}
              onPress={handleSubmit}
              disabled={!isFormValid || isLoading}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={clientBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.submitBtn, (!isFormValid || isLoading) && styles.submitBtnDisabled]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Account</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: colors.textMuted }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignIn', { initialRole: 'CLIENT' })} disabled={isLoading}>
                <Text style={[styles.footerLink, { color: isDark ? '#818CF8' : colors.primary }]}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 48, paddingTop: 12 },
  logoRingContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.05,
    left: 24,
    width: 200,
    height: 200,
    zIndex: 0,
  },
  logoRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'solid',
  },
  backBtn: { 
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 20,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  heading: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8 },
  subheading: { fontSize: 14, lineHeight: 20, marginBottom: 24, fontWeight: '500' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 20,
  },
  errorBannerText: { flex: 1, fontSize: 13, fontWeight: '600' },
  form: { gap: 4 },
  label: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  labelTop: { marginTop: 14 },
  input: {
    borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontWeight: '600',
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  passwordInput: { flex: 1, paddingVertical: 14, fontSize: 15, fontWeight: '600' },
  eyeBtn: { padding: 4 },
  fieldError: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  submitBtnTouch: {
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  submitBtn: {
    height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  footerText: { fontSize: 14, fontWeight: '500' },
  footerLink: { fontSize: 14, fontWeight: '700' },
});
