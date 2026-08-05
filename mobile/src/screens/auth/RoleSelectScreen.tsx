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
import AnimatedBackground from '../../components/AnimatedBackground';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const logoImage = require('../../../assets/logo.png');

export default function RoleSelectScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <AnimatedBackground style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { paddingBottom: insets.bottom }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />

        {/* Top Centered Brand Header */}
        <View style={styles.brandHeader}>
          <Text style={[styles.brandTitle, { color: colors.text }]}>
            Campu<Text style={{ color: colors.primary }}>Serv</Text>
          </Text>
          <Text style={[styles.tagline, { color: colors.textMuted }]}>
            Campus services, reimagined.
          </Text>
        </View>

        {/* Main Content Area */}
        <View style={styles.contentBlock}>
          <Text style={[styles.chooseLabel, { color: colors.textMuted }]}>
            CHOOSE HOW TO GET STARTED
          </Text>

          {/* Client Card */}
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.cardTouch}
            onPress={() => navigation.navigate('ClientSignUp')}
          >
            <SystemGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.roleCard}
            >
              <View style={styles.cardIconWrap}>
                <Ionicons name="search" size={26} color={colors.primary} />
              </View>

              <View style={styles.cardTextBlock}>
                <Text style={styles.cardTitle}>I need help</Text>
                <Text style={styles.cardSubtitle}>
                  Browse services, book providers, and get help with tasks around campus.
                </Text>
              </View>

              <View style={styles.cardArrow}>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </View>
            </SystemGradient>
          </TouchableOpacity>

          {/* Provider Card */}
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.cardTouch}
            onPress={() => navigation.navigate('ProviderSignUp')}
          >
            <SystemGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.roleCard}
            >
              <View style={styles.cardIconWrap}>
                <Ionicons name="briefcase" size={26} color={colors.primary} />
              </View>

              <View style={styles.cardTextBlock}>
                <Text style={styles.cardTitle}>I provide services</Text>
                <Text style={styles.cardSubtitle}>
                  Offer your skills, accept jobs, earn money, and help fellow students.
                </Text>
                <Text style={styles.cardScopeNote}>
                  Provider-only account — no student access. Need both? Use a separate email.
                </Text>
              </View>

              <View style={styles.cardArrow}>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </View>
            </SystemGradient>
          </TouchableOpacity>
        </View>

        {/* Sign In Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')} activeOpacity={0.7}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  brandHeader: {
    alignItems: 'center',
    paddingTop: SCREEN_HEIGHT * 0.03,
    paddingBottom: 8,
  },
  brandIcon: {
    width: 46,
    height: 46,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1.2,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.2,
  },
  contentBlock: {
    gap: 16,
    width: '100%',
  },
  chooseLabel: {
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
    letterSpacing: 1.5,
    marginBottom: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  cardTouch: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 6,
  },
  roleCard: {
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTextBlock: { 
    flex: 1,
    paddingRight: 10,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Outfit-Bold',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 20,
    fontFamily: 'Inter-Medium',
  },
  cardScopeNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 17,
    fontFamily: 'Inter-Medium',
    marginTop: 6,
    fontStyle: 'italic',
  },
  cardArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: { 
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  footerLink: { 
    fontSize: 17, 
    fontFamily: 'Outfit-Bold',
    fontWeight: '800',
  },
});
