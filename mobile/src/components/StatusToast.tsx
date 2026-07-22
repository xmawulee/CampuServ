/**
 * StatusToast.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Compact, non-blocking status notification pill.
 *
 * Layout:   [ColoredIconBadge]  [Title + Subtitle]  [× dismiss]
 * Motion:   slides + fades in from top, auto-dismisses after `duration` ms.
 * Stacking: ToastContext renders a vertical stack; each toast gets its own
 *           animated position — no overlapping.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CustomIonicons as Ionicons } from './CustomIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DialogStatus, getStatusTokens } from '../styles/dialogStatusStyles';
import { useTheme } from '../styles/ThemeContext';

export interface StatusToastProps {
  id: string;
  status: DialogStatus;
  title: string;
  subtitle?: string;
  duration?: number;     // ms before auto-dismiss; 0 = persistent
  stackIndex?: number;   // 0 = top of stack
  onDismiss: (id: string) => void;
}

export default function StatusToast({
  id,
  status,
  title,
  subtitle,
  duration = 4000,
  stackIndex = 0,
  onDismiss,
}: StatusToastProps) {
  const { isDark } = useTheme();
  const tokens = getStatusTokens(status);

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  const insets = useSafeAreaInsets();

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(id));
  };

  // Slide + fade in
  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 220,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    if (duration > 0) {
      const timer = setTimeout(dismiss, duration);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swipe-to-dismiss (horizontal swipe)
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
    onPanResponderMove: (_, g) => translateX.setValue(g.dx),
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > 80) {
        Animated.timing(translateX, {
          toValue: g.dx > 0 ? 400 : -400,
          duration: 180,
          useNativeDriver: true,
        }).start(() => onDismiss(id));
      } else {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  const bg          = isDark ? tokens.bgDark      : tokens.bg;
  const iconBg      = isDark ? tokens.iconBgDark  : tokens.iconBg;
  const titleColor  = isDark ? tokens.titleColorDark : tokens.titleColor;
  const TOP_OFFSET  = insets.top + 12 + stackIndex * 76;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          borderColor: tokens.borderColor,
          top: TOP_OFFSET,
          transform: [{ translateY }, { translateX }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Icon badge */}
      <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
        <Ionicons name={tokens.icon} size={18} color={tokens.iconColor} />
      </View>

      {/* Text */}
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Dismiss button */}
      <TouchableOpacity style={styles.closeBtn} onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={16} color="#888" />
      </TouchableOpacity>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 8,
    gap: 10,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  closeBtn: {
    padding: 2,
    flexShrink: 0,
  },
});
