/**
 * Toast.tsx — backward-compatibility shim
 * ─────────────────────────────────────────────────────────────────────────────
 * Screens that still use <Toast visible={x} message={y} type={z} /> continue
 * to work — this shim maps the old props onto the new StatusToast rendering.
 *
 * For new code, prefer useToast() from ToastContext directly.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { CustomIonicons as Ionicons } from './CustomIcons';
import { DialogStatus, getStatusTokens } from '../styles/dialogStatusStyles';
import { useTheme } from '../styles/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ToastProps {
  message: string;
  visible: boolean;
  type: 'success' | 'error' | 'info';
}

const TYPE_MAP: Record<string, DialogStatus> = {
  success: 'success',
  error:   'error',
  info:    'info',
};

export default function Toast({ message, visible, type }: ToastProps) {
  const { isDark } = useTheme();
  const insets    = useSafeAreaInsets();
  const status    = TYPE_MAP[type] ?? 'info';
  const tokens    = getStatusTokens(status);

  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 220 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const bg     = isDark ? tokens.bgDark     : tokens.bg;
  const iconBg = isDark ? tokens.iconBgDark : tokens.iconBg;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          borderColor: tokens.borderColor,
          top: insets.top + 12,
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
        <Ionicons name={tokens.icon} size={16} color={tokens.iconColor} />
      </View>
      <Text style={[styles.text, { color: tokens.titleColor }]} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    zIndex: 9999,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 8,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});
