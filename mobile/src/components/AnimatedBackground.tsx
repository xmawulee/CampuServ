import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { useTheme } from '../styles/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const TILE = 256;
const TOTAL_W = SCREEN_W + TILE * 2;
const TOTAL_H = SCREEN_H + TILE * 2;

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function AnimatedBackground({ children, style }: Props) {
  const { colors, isDark, reduceMotion } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.stopAnimation();
      return;
    }

    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 30000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();

    return () => {
      progress.stopAnimation();
    };
  }, [reduceMotion]);

  const translateVal = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TILE],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      {reduceMotion ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { opacity: isDark ? 0.12 : 0.55 },
          ]}
        >
          <ImageBackground
            source={isDark ? require('../../assets/images/animated_bg_dark.png') : require('../../assets/images/bg_tile.png')}
            style={{ width: '100%', height: '100%' }}
            imageStyle={{ resizeMode: 'repeat' }}
          />
        </View>
      ) : (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.strip,
            {
              width: TOTAL_W,
              height: TOTAL_H,
              opacity: isDark ? 0.12 : 0.55,
              transform: [
                { translateX: translateVal },
                { translateY: translateVal },
              ],
            },
          ]}
        >
          <ImageBackground
            source={isDark ? require('../../assets/images/animated_bg_dark.png') : require('../../assets/images/bg_tile.png')}
            style={{ width: '100%', height: '100%' }}
            imageStyle={{ resizeMode: 'repeat' }}
          />
        </Animated.View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  strip: {
    position: 'absolute',
    top: -TILE,
    left: -TILE,
  },
});
