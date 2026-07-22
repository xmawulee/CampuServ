/**
 * StatusDialog.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Blocking modal with colored status-tint header + body wash.
 *
 * Layout:
 *   ┌─────────────────────────────────────────┐
 *   │  [Header strip]  StatusLabel     ×       │  ← tinted header
 *   ├─────────────────────────────────────────┤
 *   │  [Icon-in-circle]                        │
 *   │   Title (bold, status-colored)           │  ← tinted body wash
 *   │   Description (muted)                   │
 *   ├─────────────────────────────────────────┤
 *   │  [Secondary]            [Primary CTA]   │  ← footer
 *   └─────────────────────────────────────────┘
 *
 * Motion:  scale-up + fade-in from center, distinct from toast slide.
 * Variants: 1-button (confirmLabel only) or 2-button (cancelLabel + confirmLabel).
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CustomIonicons as Ionicons } from './CustomIcons';
import { DialogStatus, getStatusTokens } from '../styles/dialogStatusStyles';
import { useTheme } from '../styles/ThemeContext';

export interface StatusDialogProps {
  visible: boolean;
  status: DialogStatus;
  /** Optional override for the small header label (defaults to token label) */
  headerLabel?: string;
  /** Optional override icon (defaults to token icon) */
  icon?: any;
  title: string;
  description?: string;
  /** Primary action label (right button, filled) */
  confirmLabel: string;
  /** Secondary action label (left button, outlined). Omit for 1-button layout. */
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  /** Called when × close button is pressed; defaults to onCancel if omitted */
  onClose?: () => void;
  /** When true the confirm button renders in error/destructive style */
  destructive?: boolean;
}

export default function StatusDialog({
  visible,
  status,
  headerLabel,
  icon,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  onClose,
  destructive = false,
}: StatusDialogProps) {
  const { isDark, colors } = useTheme();
  const tokens = getStatusTokens(status);

  const scale   = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 20,
          stiffness: 260,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.88,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const headerBg    = isDark ? tokens.headerBgDark  : tokens.headerBg;
  const bodyBg      = isDark ? tokens.bgDark         : tokens.bg;
  const iconBg      = isDark ? tokens.iconBgDark     : tokens.iconBg;
  const titleColor  = isDark ? tokens.titleColorDark : tokens.titleColor;
  const cardBg      = bodyBg;

  const resolvedIcon  = icon ?? tokens.icon;
  const resolvedLabel = headerLabel ?? tokens.label;

  const handleClose  = onClose ?? onCancel ?? (() => {});
  const handleCancel = onCancel ?? (() => {});

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: cardBg,
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          {/* ── Header strip ──────────────────────────────────── */}
          <View style={[styles.header, { backgroundColor: headerBg, borderColor: tokens.borderColor }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconDot, { backgroundColor: iconBg }]} />
              <Text style={[styles.headerLabel, { color: titleColor }]}>
                {resolvedLabel}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color={titleColor} />
            </TouchableOpacity>
          </View>

          {/* ── Body ─────────────────────────────────────────── */}
          <View style={styles.body}>
            {/* Large icon-in-circle */}
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              <Ionicons name={resolvedIcon} size={30} color={tokens.iconColor} />
            </View>

            <Text style={[styles.title, { color: titleColor }]}>
              {typeof title === 'string' ? title : JSON.stringify(title)}
            </Text>

            {description ? (
              <Text style={[styles.description, { color: colors.textMuted }]}>
                {typeof description === 'string' ? description : JSON.stringify(description)}
              </Text>
            ) : null}
          </View>

          {/* ── Footer ───────────────────────────────────────── */}
          <View style={[styles.footer, { borderTopColor: tokens.borderColor }]}>
            {cancelLabel ? (
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: tokens.borderColor }]}
                onPress={handleCancel}
                activeOpacity={0.75}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>
                  {cancelLabel}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: destructive
                    ? getStatusTokens('error').actionBg
                    : tokens.actionBg,
                  flex: cancelLabel ? 1 : undefined,
                  alignSelf: cancelLabel ? undefined : 'stretch',
                },
              ]}
              onPress={onConfirm}
              activeOpacity={0.82}
            >
              <Text style={[styles.primaryBtnText, { color: tokens.actionText }]}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 14,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  // Body
  body: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    gap: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryBtn: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
