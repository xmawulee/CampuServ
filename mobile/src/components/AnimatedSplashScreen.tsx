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
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const appOpacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Initial fade in and subtle scale up (breathing/booting effect)
    Animated.parallel([
      Animated.timing(opacityAnim, {
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
    // 2. Once app is ready (fonts/auth loaded), crossfade from splash to app
    if (isAppReady) {
      SplashScreen.hideAsync().then(() => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 600,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.2,
              duration: 600,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(appOpacityAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start(() => {
            setIsAnimationComplete(true);
            onAnimationComplete();
          });
        }, 400);
      });
    }
  }, [isAppReady]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.appContainer, { opacity: appOpacityAnim }]}>
        {children}
      </Animated.View>

      {!isAnimationComplete && (
        <Animated.View
          style={[
            styles.splashOverlay,
            { backgroundColor: isDark ? '#111827' : '#ffffff' },
          ]}
          pointerEvents="none"
        >
          <Animated.View style={{ alignItems: 'center', opacity: opacityAnim, transform: [{ scale: scaleAnim }] }}>
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
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
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
