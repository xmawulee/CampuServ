import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Dimensions, Easing, View, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme } from '../styles/ThemeContext';

interface Props {
  onAnimationComplete: () => void;
  isAppReady: boolean;
  children: React.ReactNode;
}

const { width, height } = Dimensions.get('window');

export default function AnimatedSplashScreen({ onAnimationComplete, isAppReady, children }: Props) {
  const { isDark, colors } = useTheme();
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const logoOpacityAnim = useRef(new Animated.Value(0)).current;
  const overlayOpacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Initial fade in and subtle scale up (breathing/booting effect)
    Animated.parallel([
      Animated.timing(logoOpacityAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    // 2. Once app is ready, fade out the entire splash overlay smoothly
    if (isAppReady) {
      SplashScreen.hideAsync().catch(() => {}).finally(() => {
        // Fallback to ensure it always completes even if animations hang
        const fallbackTimer = setTimeout(() => {
          setIsAnimationComplete(true);
          onAnimationComplete();
        }, 3000);

        // Keep the splash screen visible for an extra 1.5 seconds
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(logoOpacityAnim, {
              toValue: 0,
              duration: 500,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(overlayOpacityAnim, {
              toValue: 0,
              duration: 700,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.05, // Gentle push back, not aggressive 1.2
              duration: 500,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start(() => {
            clearTimeout(fallbackTimer);
            setIsAnimationComplete(true);
            onAnimationComplete();
          });
        }, 1500);
      });
    }
  }, [isAppReady]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.appContainer}>
        {children}
      </View>

      {!isAnimationComplete && (
        <Animated.View
          style={[
            styles.splashOverlay,
            { backgroundColor: isDark ? '#111827' : '#ffffff', opacity: overlayOpacityAnim },
          ]}
          pointerEvents="none"
        >
          <Animated.View style={{ alignItems: 'center', opacity: logoOpacityAnim, transform: [{ scale: scaleAnim }] }}>
            <Animated.Image
              source={require('../../assets/logo-transparent.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: isDark ? '#ffffff' : '#f97316' }]}>
              CampuServ
            </Text>
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  appContainer: { flex: 1 },
  splashOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  logo: {
    width: width * 0.5,
    height: width * 0.5,
    maxWidth: 200,
    maxHeight: 200,
  },
  title: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
