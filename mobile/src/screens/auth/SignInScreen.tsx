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
const KNUST_EMAIL_REGEX = /^[^\s@]+@st\.knust\.edu\.gh$/i;
const logoImage = require('../../../assets/logo.png');

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: string;
  email: string;
  fullName: string;
  profilePictureUrl?: string;
  isVerified: boolean;
  verificationStatus: string;
  studentIdPhotoUrl?: string;
  serviceCategory?: string;
  accountStatus?: string;
  primaryRoleVerified?: boolean;
  rejectionReason?: string;
}

export default function SignInScreen({ route, navigation }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [activeRole, setActiveRole] = useState<'CLIENT' | 'PROVIDER'>(
    route?.params?.initialRole === 'PROVIDER' ? 'PROVIDER' : 'CLIENT',
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!KNUST_EMAIL_REGEX.test(email.trim()) && email.trim().toLowerCase() !== 'admin@campuserv.com') {
      newErrors.email = 'Must be a valid KNUST student email (@st.knust.edu.gh).';
    }
    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    setBannerError(null);
    if (!validate()) return;

    setIsLoading(true);
    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      const { 
        accessToken, refreshToken, userId: id, role, email: resEmail, 
        fullName, profilePictureUrl, isVerified, verificationStatus, 
        studentIdPhotoUrl, accountStatus, serviceCategory, 
        primaryRoleVerified, rejectionReason 
      } = response.data;

      const userObj = {
        id,
        email: resEmail,
        fullName,
        role: role as 'STUDENT' | 'PROVIDER' | 'ADMIN',
        isVerified,
        verificationStatus,
        profilePictureUrl,
        studentIdPhotoUrl,
        serviceCategory,
        primaryRoleVerified,
        rejectionReason,
        // Explicitly include accountStatus from the fresh server response so any
        // stale SUSPENDED/BANNED value from the old cached user object cannot
        // survive into the new session (a fresh login response always reflects
        // the real current state).
        accountStatus: (accountStatus as 'ACTIVE' | 'SUSPENDED' | 'BANNED' | undefined) ?? 'ACTIVE',
      };

      if (role === 'ADMIN') {
        setBannerError('Admin accounts cannot sign in on the mobile app. Use the admin dashboard.');
        setIsLoading(false);
        return;
      }

      if (role === 'PROVIDER') {
        if (activeRole === 'CLIENT') {
          setBannerError('Providers must sign in using the Provider tab.');
          setIsLoading(false);
          return;
        } else {
          await setAuth(accessToken, refreshToken, userObj, 'PROVIDER');
        }
        return;
      }

      if (role === 'STUDENT') {
        if (activeRole === 'PROVIDER') {
          setBannerError('Clients must sign in using the Client tab.');
          setIsLoading(false);
          return;
        }
        await setAuth(accessToken, refreshToken, userObj, 'CLIENT');
        return;
      }

      setBannerError('Unexpected account state. Please contact support.');
      setIsLoading(false);
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosErr = error as { response?: { status?: number; data?: any } };
        const status = axiosErr.response?.status;
        const data = axiosErr.response?.data;
        const msg = typeof data === 'string' ? data : (data && typeof data === 'object' && 'message' in data ? (data as any).message : null);

        if (status === 429) {
          setBannerError(msg || 'Too many failed login attempts. Please try again in 15 minutes.');
        } else if (status === 401) {
          setBannerError(msg || 'Incorrect email or password.');
        } else if (status === 403) {
          // Check if this is a pending-verification provider vs a general restriction
          const isPending = msg && (msg.toLowerCase().includes('pending') || msg.toLowerCase().includes('under review') || msg.toLowerCase().includes('verification'));
          if (isPending) {
            setBannerError('Your provider application is still under review — we\'ll notify you when a decision is made. Note: this is a provider-only account, so it won\'t have student access even after approval.');
          } else {
            setBannerError(msg || 'Account is restricted. Please contact support.');
          }
        } else {
          setBannerError(msg || 'Something went wrong. Check your connection and try again.');
        }
      } else {
        setBannerError('Something went wrong. Check your connection and try again.');
      }
      setIsLoading(false);
    }
  };

  const backgroundColors = isDark 
    ? (['#0B0F19', '#02040A'] as const)
    : (['#F3F6FA', '#E3E8F0'] as const);

  const clientBtnGradient = isDark ? (['#312E81', '#1E3A8A'] as const) : (['#4F46E5', '#3B82F6'] as const);
  const providerBtnGradient = isDark ? (['#7C2D12', '#78350F'] as const) : (['#F97316', '#EA580C'] as const);
  const submitBtnColors = activeRole === 'CLIENT' ? clientBtnGradient : providerBtnGradient;

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
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: 48 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back button */}
            {navigation.canGoBack() && (
              <TouchableOpacity
                style={[styles.backBtn, { backgroundColor: colors.cardBackground, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderWidth: 1 }]}
                onPress={() => navigation.goBack()}
                disabled={isLoading}
              >
                <Ionicons name="arrow-back" size={20} color={colors.text} />
              </TouchableOpacity>
            )}

            {/* Logo */}
            <Image 
              source={logoImage} 
              style={styles.logo} 
              resizeMode="contain"
            />

            {/* Header */}
            <Text style={[styles.heading, { color: colors.text }]}>Welcome back</Text>
            <Text style={[styles.subheading, { color: colors.textMuted }]}>
              Sign in to your CampuServ account.
            </Text>

            {/* Segmented Control */}
            <View style={[styles.segContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.inputBackground, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent', borderWidth: isDark ? 1 : 0 }]}>
              {(['CLIENT', 'PROVIDER'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.segTab, activeRole === r && (isDark ? styles.segTabActiveDark : styles.segTabActiveLight)]}
                  onPress={() => { setActiveRole(r); setBannerError(null); }}
                  disabled={isLoading}
                >
                  <Text style={[styles.segText, { color: activeRole === r ? colors.text : colors.textMuted }, activeRole === r && styles.segTextActive]}>
                    {r === 'CLIENT' ? 'Client' : 'Provider'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Error Banner */}
            {bannerError && (
              <View style={[styles.errorBanner, { backgroundColor: colors.errorLight }]}>
                <View style={[styles.errorStrip, { backgroundColor: colors.error }]} />
                <Ionicons name="alert-circle-outline" size={16} color={colors.error} style={{ marginLeft: 12 }} />
                <Text style={[styles.errorText, { color: colors.error }]}>{bannerError}</Text>
              </View>
            )}

            {/* Email Input */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>KNUST EMAIL</Text>
              <View style={[
                styles.inputWrap, 
                { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : colors.inputBackground, 
                  borderColor: emailFocused 
                    ? (activeRole === 'CLIENT' ? '#4F46E5' : '#F97316') 
                    : (isDark ? 'rgba(255,255,255,0.08)' : 'transparent') 
                }
              ]}>
                <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={email}
                  onChangeText={(v) => { setEmail(v); if (errors.email) setErrors((e) => ({ ...e, email: undefined })); }}
                  placeholder="your.name@st.knust.edu.gh"
                  placeholderTextColor={colors.placeholderText}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                  editable={!isLoading}
                />
              </View>
              {errors.email && <Text style={[styles.fieldError, { color: colors.error }]}>{errors.email}</Text>}
            </View>

            {/* Password Input */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>PASSWORD</Text>
              <View style={[
                styles.inputWrap, 
                { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : colors.inputBackground, 
                  borderColor: passwordFocused 
                    ? (activeRole === 'CLIENT' ? '#4F46E5' : '#F97316') 
                    : (isDark ? 'rgba(255,255,255,0.08)' : 'transparent') 
                }
              ]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { color: colors.text }]}
                  value={password}
                  onChangeText={(v) => { setPassword(v); if (errors.password) setErrors((e) => ({ ...e, password: undefined })); }}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.placeholderText}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  onSubmitEditing={handleSignIn}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={[styles.fieldError, { color: colors.error }]}>{errors.password}</Text>}
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={styles.submitBtnTouch}
              onPress={handleSignIn}
              disabled={isLoading}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={submitBtnColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textMuted }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('RoleSelect')} disabled={isLoading}>
                <Text style={[styles.footerLink, { color: isDark ? '#818CF8' : colors.primary }]}>Sign Up</Text>
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
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 48, paddingTop: 12 },
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
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  logo: {
    width: 68,
    height: 68,
    marginBottom: 20,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  heading: { fontSize: 32, fontWeight: '900', letterSpacing: -1, marginBottom: 8 },
  subheading: { fontSize: 15, lineHeight: 22, marginBottom: 28, fontWeight: '500' },
  segContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  segTab: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segTabActiveLight: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segTabActiveDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  segText: { fontSize: 15, fontWeight: '600' },
  segTextActive: { fontWeight: '800' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingRight: 12,
    gap: 8,
  },
  errorStrip: { width: 4, alignSelf: 'stretch' },
  errorText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  fieldGroup: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 15, fontWeight: '600' },
  eyeBtn: { padding: 4 },
  fieldError: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  submitBtnTouch: {
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  submitBtn: {
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28 },
  footerText: { fontSize: 14, fontWeight: '500' },
  footerLink: { fontSize: 14, fontWeight: '700' },
});
