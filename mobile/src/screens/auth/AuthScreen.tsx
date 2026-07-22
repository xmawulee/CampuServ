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
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../styles/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../styles/ToastContext';


// Note: Ensure logo.png is placed in the assets folder later or use a generic require if it exists.
// Using a placeholder error-safe require or fallback for now.
const logoImage = require('../../../assets/logo.png'); 

type RootStackParamList = {
  Auth: undefined;
};

type AuthScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;

interface AuthScreenProps {
  navigation: AuthScreenNavigationProp;
}

export default function AuthScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { showToast } = useToast();

  // Shared State
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sign In State
  const [inEmail, setInEmail] = useState('');
  const [inPassword, setInPassword] = useState('');
  const [inShowPassword, setInShowPassword] = useState(false);
  const [inErrors, setInErrors] = useState<{ email?: string; password?: string }>({});

  // Sign Up State
  const [upName, setUpName] = useState('');
  const [upEmail, setUpEmail] = useState('');
  const [upPassword, setUpPassword] = useState('');
  const [upConfirmPassword, setUpConfirmPassword] = useState('');
  const [upRole, setUpRole] = useState<'CLIENT' | 'SERVICE_PROVIDER'>('CLIENT');
  const [upShowPassword, setUpShowPassword] = useState(false);
  const [upShowConfirmPassword, setUpShowConfirmPassword] = useState(false);
  const [upErrors, setUpErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Refs for keyboard advancing
  const inPasswordRef = useRef<TextInput>(null);
  const upEmailRef = useRef<TextInput>(null);
  const upPasswordRef = useRef<TextInput>(null);
  const upConfirmPasswordRef = useRef<TextInput>(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordComplexRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

  const clearBanner = () => {
    if (bannerError) setBannerError(null);
  };

  const handleSignIn = async () => {
    // Validate
    const errors: any = {};
    if (!inEmail) errors.email = 'Email is required.';
    else if (!emailRegex.test(inEmail)) errors.email = 'Enter a valid email.';

    if (!inPassword) errors.password = 'Password is required.';
    else if (inPassword.length < 6) errors.password = 'Password must be at least 6 characters.';

    setInErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    setBannerError(null);

    try {
      const response = await api.post('/auth/login', {
        email: inEmail,
        password: inPassword,
      });

      const { accessToken, refreshToken, userId: id, role, email: resEmail, fullName, isVerified, verificationStatus } = response.data;

      // The auth store automatically saves to SecureStore and updates state, which triggers
      // the AppNavigator to redirect to the correct stack based on the role.
      await setAuth(accessToken, refreshToken, {
        id,
        email: resEmail,
        fullName,
        role,
        isVerified,
        verificationStatus,
      });



    } catch (error: any) {
      const serverMessage = error.response?.data;
      const isStringMsg = typeof serverMessage === 'string';

      if (error.response?.status === 401) {
        setBannerError('Invalid email or password. Please try again.');
      } else {
        setBannerError(isStringMsg ? serverMessage : 'Something went wrong. Check your connection and try again.');
      }
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    // Validate
    const errors: any = {};
    if (!upName || upName.trim().length < 2) errors.name = 'Full Name must be at least 2 characters.';
    
    if (!upEmail) errors.email = 'Email is required.';
    else if (!emailRegex.test(upEmail)) errors.email = 'Enter a valid email.';
    else {
      const emailLower = upEmail.toLowerCase().trim();
      if (!emailLower.endsWith('@st.knust.edu.gh') && !emailLower.endsWith('@knust.edu.gh') && emailLower !== 'admin@campuserv.com') {
        errors.email = 'Registration requires a valid KNUST email address (@st.knust.edu.gh).';
      }
    }

    if (!upPassword) errors.password = 'Password is required.';
    else if (!passwordComplexRegex.test(upPassword)) errors.password = 'Min 8 chars, 1 uppercase, 1 digit.';

    if (upConfirmPassword !== upPassword) errors.confirmPassword = 'Passwords do not match.';

    setUpErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsLoading(true);
    setBannerError(null);

    try {
      await api.post('/auth/register', {
        fullName: upName,
        email: upEmail,
        password: upPassword,
        role: upRole === 'CLIENT' ? 'STUDENT' : 'PROVIDER',
      });

      // Success
      setIsLoading(false);
      setUpName('');
      setUpPassword('');
      setUpConfirmPassword('');
      setUpRole('CLIENT');
      setUpErrors({});
      
      setSuccessToast('Account created! Please sign in.');
      setTimeout(() => setSuccessToast(null), 3000);

      // Pre-fill sign in email and switch tab
      setInEmail(upEmail);
      setInPassword('');
      setInErrors({});
      setActiveTab('signin');

    } catch (error: any) {
      const serverMessage = error.response?.data;
      const isStringMsg = typeof serverMessage === 'string';

      if (error.response?.status === 409 || (isStringMsg && serverMessage.includes('registered'))) {
        setBannerError('An account with this email already exists. Try signing in instead.');
      } else if (error.response?.status === 400) {
        setBannerError(isStringMsg ? serverMessage : 'Registration failed. Please check your details and try again.');
      } else {
        setBannerError(isStringMsg ? serverMessage : 'Something went wrong. Check your connection and try again.');
      }
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#0A2E6E', '#1565C0']} style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* Logo Area */}
          <View style={styles.logoArea}>
            <Image source={logoImage} style={styles.logo} resizeMode="contain" />
            <Text style={styles.tagline}>Your campus. Your services.</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            
            {/* Success Toast */}
            {successToast && (
              <View style={styles.toast}>
                <Text style={styles.toastText}>{successToast}</Text>
              </View>
            )}

            {/* Error Banner */}
            {bannerError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{bannerError}</Text>
              </View>
            )}

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'signin' && styles.tabButtonActive]}
                onPress={() => { clearBanner(); setActiveTab('signin'); }}
                disabled={isLoading}
              >
                <Text style={[styles.tabText, activeTab === 'signin' && styles.tabTextActive]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'signup' && styles.tabButtonActive]}
                onPress={() => { clearBanner(); setActiveTab('signup'); }}
                disabled={isLoading}
              >
                <Text style={[styles.tabText, activeTab === 'signup' && styles.tabTextActive]}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Form */}
            {activeTab === 'signin' && (
              <View>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={[styles.input, inErrors.email ? styles.inputError : null]}
                  value={inEmail}
                  onChangeText={(val) => { setInEmail(val); clearBanner(); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="your.name@st.knust.edu.gh"
                  placeholderTextColor="#94A3B8"
                  returnKeyType="next"
                  onSubmitEditing={() => inPasswordRef.current?.focus()}
                  blurOnSubmit={false}
                  editable={!isLoading}
                  accessibilityLabel="Email address input"
                />
                {inErrors.email && <Text style={styles.errorText}>{inErrors.email}</Text>}

                <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    ref={inPasswordRef}
                    style={[styles.input, styles.passwordInput, inErrors.password ? styles.inputError : null]}
                    value={inPassword}
                    onChangeText={(val) => { setInPassword(val); clearBanner(); }}
                    secureTextEntry={!inShowPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#94A3B8"
                    returnKeyType="done"
                    onSubmitEditing={handleSignIn}
                    editable={!isLoading}
                    accessibilityLabel="Password input"
                  />
                  <TouchableOpacity 
                    style={styles.eyeIcon} 
                    onPress={() => setInShowPassword(!inShowPassword)}
                    accessibilityLabel={inShowPassword ? "Hide password" : "Show password"}
                  >
                    <Ionicons name={inShowPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                {inErrors.password && <Text style={styles.errorText}>{inErrors.password}</Text>}

                <TouchableOpacity 
                  style={styles.forgotBtn}
                  onPress={() => showToast({ status: 'info', title: 'Forgot Password', subtitle: 'Password reset coming soon.' })}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]} 
                  onPress={handleSignIn}
                  disabled={isLoading}
                  accessibilityLabel="Sign in to your account"
                >
                  {isLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.submitBtnText}>Sign In</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* Sign Up Form */}
            {activeTab === 'signup' && (
              <View>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={[styles.input, upErrors.name ? styles.inputError : null]}
                  value={upName}
                  onChangeText={(val) => { setUpName(val); clearBanner(); }}
                  autoCapitalize="words"
                  placeholder="e.g. Kofi Mensah"
                  placeholderTextColor="#94A3B8"
                  returnKeyType="next"
                  onSubmitEditing={() => upEmailRef.current?.focus()}
                  blurOnSubmit={false}
                  editable={!isLoading}
                  accessibilityLabel="Full Name input"
                />
                {upErrors.name && <Text style={styles.errorText}>{upErrors.name}</Text>}

                <Text style={[styles.label, { marginTop: 16 }]}>Email Address</Text>
                <TextInput
                  ref={upEmailRef}
                  style={[styles.input, upErrors.email ? styles.inputError : null]}
                  value={upEmail}
                  onChangeText={(val) => { setUpEmail(val); clearBanner(); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="your.name@st.knust.edu.gh"
                  placeholderTextColor="#94A3B8"
                  returnKeyType="next"
                  onSubmitEditing={() => upPasswordRef.current?.focus()}
                  blurOnSubmit={false}
                  editable={!isLoading}
                  accessibilityLabel="Email address input"
                />
                {upErrors.email && <Text style={styles.errorText}>{upErrors.email}</Text>}

                <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    ref={upPasswordRef}
                    style={[styles.input, styles.passwordInput, upErrors.password ? styles.inputError : null]}
                    value={upPassword}
                    onChangeText={(val) => { setUpPassword(val); clearBanner(); }}
                    secureTextEntry={!upShowPassword}
                    placeholder="Create a password"
                    placeholderTextColor="#94A3B8"
                    returnKeyType="next"
                    onSubmitEditing={() => upConfirmPasswordRef.current?.focus()}
                    blurOnSubmit={false}
                    editable={!isLoading}
                    accessibilityLabel="Password input"
                  />
                  <TouchableOpacity 
                    style={styles.eyeIcon} 
                    onPress={() => setUpShowPassword(!upShowPassword)}
                    accessibilityLabel={upShowPassword ? "Hide password" : "Show password"}
                  >
                    <Ionicons name={upShowPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                {upErrors.password && <Text style={styles.errorText}>{upErrors.password}</Text>}

                <Text style={[styles.label, { marginTop: 16 }]}>Confirm Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    ref={upConfirmPasswordRef}
                    style={[styles.input, styles.passwordInput, upErrors.confirmPassword ? styles.inputError : null]}
                    value={upConfirmPassword}
                    onChangeText={(val) => { setUpConfirmPassword(val); clearBanner(); }}
                    secureTextEntry={!upShowConfirmPassword}
                    placeholder="Confirm your password"
                    placeholderTextColor="#94A3B8"
                    returnKeyType="done"
                    editable={!isLoading}
                    accessibilityLabel="Confirm Password input"
                  />
                  <TouchableOpacity 
                    style={styles.eyeIcon} 
                    onPress={() => setUpShowConfirmPassword(!upShowConfirmPassword)}
                    accessibilityLabel={upShowConfirmPassword ? "Hide password" : "Show password"}
                  >
                    <Ionicons name={upShowConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                {upErrors.confirmPassword && <Text style={styles.errorText}>{upErrors.confirmPassword}</Text>}

                <Text style={[styles.label, { marginTop: 16 }]}>Account Type</Text>
                <View style={styles.roleContainer}>
                  <TouchableOpacity 
                    style={[styles.rolePill, upRole === 'CLIENT' && styles.rolePillActive]}
                    onPress={() => setUpRole('CLIENT')}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityState={{ selected: upRole === 'CLIENT' }}
                  >
                    <Text style={[styles.roleText, upRole === 'CLIENT' && styles.roleTextActive]}>I need a service</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.rolePill, upRole === 'SERVICE_PROVIDER' && styles.rolePillActive]}
                    onPress={() => setUpRole('SERVICE_PROVIDER')}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityState={{ selected: upRole === 'SERVICE_PROVIDER' }}
                  >
                    <Text style={[styles.roleText, upRole === 'SERVICE_PROVIDER' && styles.roleTextActive]}>I offer a service</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={[styles.submitBtn, { marginTop: 24 }, isLoading && styles.submitBtnDisabled]} 
                  onPress={handleSignUp}
                  disabled={isLoading}
                  accessibilityLabel="Create your account"
                >
                  {isLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.submitBtnText}>Create Account</Text>}
                </TouchableOpacity>

                <Text style={styles.termsText}>
                  By signing up, you agree to our{' '}
                  <Text style={styles.termsLink} onPress={() => showToast({ status: 'info', title: 'Terms', subtitle: 'Terms coming soon.' })}>
                    Terms of Service
                  </Text>.
                </Text>
              </View>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end', 
  },
  logoArea: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '30%',
    minHeight: 180,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  tagline: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    minHeight: '70%',
  },
  toast: {
    backgroundColor: '#2E7D32',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  toastText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#D32F2F',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#1565C0',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#1565C0',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    height: 52,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1E293B',
  },
  inputError: {
    borderColor: '#D32F2F',
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    height: '100%',
    justifyContent: 'center',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 12,
    marginBottom: 24,
  },
  forgotText: {
    color: '#1565C0',
    fontSize: 14,
    fontWeight: '500',
  },
  submitBtn: {
    height: 52,
    backgroundColor: '#1565C0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  rolePill: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  rolePillActive: {
    backgroundColor: '#1565C0',
  },
  roleText: {
    color: '#1565C0',
    fontSize: 14,
    fontWeight: '600',
  },
  roleTextActive: {
    color: '#FFFFFF',
  },
  termsText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 12,
    color: '#64748B',
  },
  termsLink: {
    color: '#1565C0',
    fontWeight: '600',
  },
});
