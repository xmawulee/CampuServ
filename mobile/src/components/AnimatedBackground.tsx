import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  View,
  Image,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Dimensions,
} from 'react-native';
import { useTheme } from '../styles/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// The source image is 1024x1024. We scale it to half (512x512) visually.
const TILE = 256;

// How many columns and rows of tiles we need to fill the screen + one extra for looping
const COLS = Math.ceil(SCREEN_W / TILE) + 2;
const ROWS = Math.ceil(SCREEN_H / TILE) + 2;

// Total strip width = COLS tiles. We animate by exactly one TILE so the seam is invisible.
const TOTAL_W = COLS * TILE;
const TOTAL_H = ROWS * TILE;

// Duration per tile scroll (each tile takes this many ms to scroll past)
const MS_PER_TILE = 60000; // 60 seconds per tile — very slow, ambient drift

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function AnimatedBackground({ children, style }: Props) {
  const { colors, isDark } = useTheme();
  const offsetX = useRef(new Animated.Value(0)).current;
  const offsetY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate X by exactly one tile width, then loop — seamlessly
    Animated.loop(
      Animated.timing(offsetX, {
        toValue: -TILE,
        duration: MS_PER_TILE,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Animate Y much slower for a very gentle diagonal drift
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

  // Build a grid of image tiles
  const tiles = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      tiles.push(
        <Image
          key={`${row}-${col}`}
          source={require('../../assets/images/app_bg_pattern.png')}
          style={{
            position: 'absolute',
            width: TILE,
            height: TILE,
            left: col * TILE,
            top: row * TILE,
          }}
        />
      );
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <Animated.View
        style={[
          styles.strip,
          {
            width: TOTAL_W,
            height: TOTAL_H,
            opacity: isDark ? 0.1 : 0.55,
            transform: [
              { translateX: offsetX },
              { translateY: offsetY },
            ],
          },
        ]}
      >
        {tiles}
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
