import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  ImageBackground,
} from 'react-native';
import { useTheme } from '../styles/ThemeContext';

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function AnimatedBackground({ children, style }: Props) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { opacity: isDark ? 0.08 : 0.04 },
        ]}
      >
        <ImageBackground
          source={isDark ? require('../../assets/images/animated_bg_dark.png') : require('../../assets/images/bg_tile.png')}
          style={StyleSheet.absoluteFillObject}
          resizeMode="repeat"
          imageStyle={{ resizeMode: 'repeat' }}
        />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
