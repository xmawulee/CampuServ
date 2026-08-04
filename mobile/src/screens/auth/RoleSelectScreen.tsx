import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomIonicons as Ionicons } from '../../components/CustomIcons';
import { useTheme } from '../../styles/ThemeContext';

import AnimatedBackground from '../../components/AnimatedBackground';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const logoImage = require('../../../assets/logo.png');

export default function RoleSelectScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <AnimatedBackground style={{ flex: 1 }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.container}>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Logo & Header Section */}
        <View style={styles.headerBlock}>
          <View style={[styles.logoIconWrap, { backgroundColor: colors.primaryLight, shadowColor: colors.primary }]}>
            <Image
              source={logoImage}
              style={[styles.logoImage, { tintColor: colors.primary }]}
              resizeMode="contain"
            />
          </View>

          <Text style={[styles.appName, { color: colors.text }]}>
            Campu<Text style={{ color: colors.primary }}>Serv</Text>
          </Text>

          <Text style={[styles.tagline, { color: colors.textMuted }]}>
            Campus services, reimagined.
          </Text>
        </View>

        {/* Role Cards Block */}
        <View style={styles.cardsBlock}>
          <Text style={[styles.chooseLabel, { color: colors.textMuted }]}>
            CHOOSE HOW TO GET STARTED
          </Text>

          {/* Option 1: Student / Client Card */}
          <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.cardTouch, { shadowColor: colors.primary }]}
            onPress={() => navigation.navigate('ClientSignUp')}
          >
            <View style={[styles.roleCard, { backgroundColor: colors.primary }]}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="search" size={24} color={colors.primary} />
              </View>

              <View style={styles.cardTextBlock}>
                <Text style={styles.clientTitle}>I need help</Text>
                <Text style={styles.clientSubtitle}>
                  Browse services, book providers, and get help with tasks around campus.
                </Text>
              </View>

              <View style={styles.cardArrowWrap}>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Option 2: Provider Card */}
          <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.cardTouch, styles.providerCardShadow]}
            onPress={() => navigation.navigate('ProviderSignUp')}
          >
            <View
              style={[
                styles.roleCard,
                {
                  backgroundColor: isDark ? colors.cardBackground : '#2D3748',
                  borderColor: isDark ? colors.border : 'transparent',
                  borderWidth: isDark ? 1 : 0,
                }
              ]}
            >
              <View style={[styles.cardIconWrap, { backgroundColor: '#FFFFFF' }]}>
                <Ionicons name="briefcase" size={24} color="#2D3748" />
              </View>

              <View style={styles.cardTextBlock}>
                <Text style={styles.providerTitle}>I provide services</Text>
                <Text style={styles.providerSubtitle}>
                  Offer your skills, accept jobs, earn money, and help fellow students.
                </Text>

                <View style={styles.scopeNoteRow}>
                  <Ionicons name="information-circle-outline" size={13} color="rgba(255, 255, 255, 0.75)" style={{ marginTop: 2 }} />
                  <Text style={styles.scopeNoteText}>
                    Provider-only account — no student access. Need both? Use a separate email.
                  </Text>
                </View>
              </View>

              <View style={[styles.cardArrowWrap, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>

        </View>

        {/* Footer Link */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('SignIn')} 
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.footerLink, { color: colors.primary }]}>Sign in</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 16,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  headerBlock: {
    alignItems: 'center',
    marginTop: SCREEN_HEIGHT * 0.02,
    marginBottom: 28,
  },
  logoIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  appName: {
    fontSize: 32,
    fontFamily: 'System',
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'System',
    fontWeight: '500',
  },
  cardsBlock: {
    gap: 16,
  },
  chooseLabel: {
    fontSize: 12,
    fontFamily: 'System',
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  cardTouch: {
    width: '100%',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 14,
    elevation: 5,
  },
  providerCardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 5,
  },
  roleCard: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 120,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTextBlock: {
    flex: 1,
    paddingRight: 8,
  },
  clientTitle: {
    fontSize: 21,
    fontFamily: 'System',
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  clientSubtitle: {
    fontSize: 14,
    fontFamily: 'System',
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  providerTitle: {
    fontSize: 21,
    fontFamily: 'System',
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  providerSubtitle: {
    fontSize: 14,
    fontFamily: 'System',
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.92)',
    lineHeight: 20,
  },
  scopeNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 8,
  },
  scopeNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'System',
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  cardArrowWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 20,
  },
  footerText: {
    fontSize: 15,
    fontFamily: 'System',
    fontWeight: '500',
  },
  footerLink: {
    fontSize: 16,
    fontFamily: 'System',
    fontWeight: '800',
  },
});
