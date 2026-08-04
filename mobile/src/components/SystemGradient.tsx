import React from 'react';
import { View } from 'react-native';
import { LinearGradient, LinearGradientProps } from 'expo-linear-gradient';
import { useTheme } from '../styles/ThemeContext';

export default function SystemGradient({ colors, style, children, ...rest }: LinearGradientProps) {
  const { reduceMotion } = useTheme();

  // If reduceMotion (Low Power Mode) is enabled, render a simple View with the primary color
  if (reduceMotion) {
    // We use the first color in the array, or a default fallback if none provided
    const fallbackColor = (colors && colors.length > 0) ? colors[0] : 'transparent';
    return (
      <View style={[style, { backgroundColor: fallbackColor }]}>
        {children}
      </View>
    );
  }

  // Otherwise, render the standard LinearGradient
  return (
    <LinearGradient colors={colors} style={style} {...rest}>
      {children}
    </LinearGradient>
  );
}
