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
import SystemGradient from '../../components/SystemGradient';
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
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />



        {/* Logo Block */}
        <View style={styles.logoBlock}>
          <Image 
            source={logoImage} 
            style={[styles.logo, { tintColor: colors.primary }]} 
            resizeMode="contain"
          />
          <Text style={[styles.appName, { color: colors.text }]}>Campu<Text style={{ color: colors.primary }}>Serv</Text></Text>
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
            <SystemGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.roleCard, isDark && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }]}
            >
              <View style={[styles.cardIconWrap, { backgroundColor: '#FFF', borderRadius: 26 }]}>
                <Ionicons name="search" size={28} color={colors.primary} />
              </View>
              <View style={styles.cardTextBlock}>
                <Text style={[styles.cardTitle, { color: '#FFF' }]}>I need help</Text>
                <Text style={[styles.cardSubtitle, { color: '#FFFFFF' }]}>Browse services, book providers, and get help with tasks around campus.</Text>
              </View>
              <View style={[styles.cardArrow, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </View>
            </SystemGradient>
          </TouchableOpacity>

          {/* Provider Card */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.cardTouch}
            onPress={() => navigation.navigate('ProviderSignUp')}
          >
            <SystemGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.roleCard, isDark && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }]}
            >
              <View style={[styles.cardIconWrap, { backgroundColor: '#FFF', borderRadius: 26 }]}>
                <Ionicons name="briefcase" size={28} color={colors.primary} />
              </View>
              <View style={styles.cardTextBlock}>
                <Text style={[styles.cardTitle, { color: '#FFF' }]}>I provide services</Text>
                <Text style={[styles.cardSubtitle, { color: '#FFFFFF' }]}>Offer your skills, accept jobs, earn money, and help fellow students.</Text>
                <Text style={[styles.cardScopeNote, { color: 'rgba(255,255,255,0.9)', marginTop: 6 }]}>Provider-only account — no student access. Need both? Use a separate email.</Text>
              </View>
              <View style={[styles.cardArrow, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </View>
            </SystemGradient>
          </TouchableOpacity>
        </View>

        {/* Sign In Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={[styles.footerLink, { color: isDark ? '#FF8A66' : '#FF5500' }]}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingHorizontal: 24,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: SCREEN_HEIGHT * 0.02,
    paddingBottom: 12,
    zIndex: 1,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 10,
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
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
    opacity: 0.75,
  },
  cardsBlock: {
    gap: 12,
    zIndex: 1,
    marginTop: 6,
  },
  chooseLabel: {
    fontSize: 13,
    fontFamily: 'Outfit-Bold',
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
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 160,
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
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: '#FFF',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
    fontFamily: 'Inter-Medium',
  },
  cardScopeNote: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
    fontFamily: 'Inter-Medium',
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
    paddingTop: 20,
    zIndex: 1,
  },
  footerText: { 
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  footerLink: { 
    fontSize: 18, 
    fontFamily: 'Outfit-Bold',
    fontWeight: '800',
  },
});
