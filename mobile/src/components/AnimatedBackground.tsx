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

// The pattern tiles exactly at 256x256 logical points, while remaining retina crisp 
// because we generated @2x, @3x, and @4x assets for it!
const TILE = 256;
const MS_PER_TILE = 60000;

// We make the animated view slightly larger than the screen so we can scroll it 
// seamlessly by exactly one tile size.
const TOTAL_W = SCREEN_W + TILE * 2;
const TOTAL_H = SCREEN_H + TILE * 2;

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function AnimatedBackground({ children, style }: Props) {
  const { colors, isDark } = useTheme();
  const offsetX = useRef(new Animated.Value(0)).current;
  const offsetY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(offsetX, {
        toValue: -TILE,
        duration: MS_PER_TILE,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(offsetY, {
        toValue: -TILE,
        duration: MS_PER_TILE * 2.5,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    return () => {
      offsetX.stopAnimation();
      offsetY.stopAnimation();
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <Animated.View
        style={[
          styles.strip,
          {
            width: TOTAL_W,
            height: TOTAL_H,
            opacity: isDark ? 0.22 : 0.55,
            transform: [
              { translateX: offsetX },
              { translateY: offsetY },
            ],
          },
        ]}
      >
        <ImageBackground
          source={require('../../assets/images/bg_tile.png')}
          style={{ width: '100%', height: '100%' }}
          imageStyle={{
            resizeMode: 'repeat',
            ...(isDark ? { tintColor: '#8888AA' } : {}),
          }}
        />
      </Animated.View>
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
