import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const logoImage = require('../../../assets/logo.png');

export default function RoleSelectScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const backgroundColors = isDark 
    ? (['#0B0F19', '#02040A'] as const)  // Deep professional dark space
    : (['#F3F6FA', '#E3E8F0'] as const); // Fresh slate-lavender light

  return (
    <LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />

        {/* Decorative Concentric Rings behind Logo */}
        <View style={styles.logoRingContainer}>
          <View style={[styles.logoRing, { borderColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(99,102,241,0.04)', width: 220, height: 220, borderRadius: 110 }]} />
          <View style={[styles.logoRing, { borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.07)', width: 170, height: 170, borderRadius: 85 }]} />
          <View style={[styles.logoRing, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.1)', width: 120, height: 120, borderRadius: 60 }]} />
        </View>

        {/* Logo Block */}
        <View style={styles.logoBlock}>
          <Image 
            source={logoImage} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Text style={[styles.appName, { color: colors.text }]}>CampuServ</Text>
          <Text style={[styles.tagline, { color: colors.textMuted }]}>
            Campus services, reimagined.
          </Text>
        </View>

        {/* Role Cards */}
        <View style={styles.cardsBlock}>
          <Text style={[styles.chooseLabel, { color: colors.textMuted }]}>CHOOSE HOW TO GET STARTED</Text>

          {/* Client Card */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.cardTouch}
            onPress={() => navigation.navigate('ClientSignUp')}
          >
            <LinearGradient
              colors={isDark ? ['#1E1E38', '#14142B'] : ['#4F46E5', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.roleCard, isDark && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }]}
            >
              <View style={[styles.cardIconWrap, { backgroundColor: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.15)' }]}>
                <Ionicons name="search" size={26} color={isDark ? '#818CF8' : '#FFF'} />
              </View>
              <View style={styles.cardTextBlock}>
                <Text style={styles.cardTitle}>I need help</Text>
                <Text style={styles.cardSubtitle}>Browse services, book providers, and get help with tasks around campus.</Text>
              </View>
              <View style={[styles.cardArrow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)' }]}>
                <Ionicons name="arrow-forward" size={16} color={isDark ? '#818CF8' : '#FFF'} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Provider Card */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.cardTouch}
            onPress={() => navigation.navigate('ProviderSignUp')}
          >
            <LinearGradient
              colors={isDark ? ['#2D1B13', '#1F120C'] : ['#F97316', '#EA580C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.roleCard, isDark && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }]}
            >
              <View style={[styles.cardIconWrap, { backgroundColor: isDark ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.15)' }]}>
                <Ionicons name="briefcase" size={26} color={isDark ? '#F97316' : '#FFF'} />
              </View>
              <View style={styles.cardTextBlock}>
                <Text style={styles.cardTitle}>I provide services</Text>
                <Text style={styles.cardSubtitle}>Offer your skills, accept jobs, earn money, and help fellow students.</Text>
                <Text style={styles.cardScopeNote}>Provider-only account — no student access. Need both? Use a separate email.</Text>
              </View>
              <View style={[styles.cardArrow, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)' }]}>
                <Ionicons name="arrow-forward" size={16} color={isDark ? '#F97316' : '#FFF'} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Sign In Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={[styles.footerLink, { color: isDark ? '#818CF8' : colors.primary }]}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  logoRingContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.04,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  logoRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'solid',
  },
  logoBlock: {
    alignItems: 'center',
    paddingTop: SCREEN_HEIGHT * 0.08,
    paddingBottom: 24,
    zIndex: 1,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  appName: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  cardsBlock: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    zIndex: 1,
    marginTop: 10,
  },
  chooseLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  cardTouch: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  roleCard: {
    borderRadius: 28,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 140,
  },
  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    flexShrink: 0,
  },
  cardTextBlock: { 
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
    fontWeight: '400',
  },
  cardScopeNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 15,
    fontWeight: '500',
    marginTop: 4,
    fontStyle: 'italic',
  },
  cardArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 24,
    paddingTop: 16,
    zIndex: 1,
  },
  footerText: { 
    fontSize: 14,
    fontWeight: '500',
  },
  footerLink: { 
    fontSize: 14, 
    fontWeight: '700',
  },
});
