/**
 * dialogStatusStyles.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all status colors used in StatusToast and
 * StatusDialog. Every screen pulls { bg, iconBg, iconColor, titleColor,
 * borderColor } by status key — never hardcodes colors directly.
 *
 * New colors (not previously in brand palette):
 *   Success  #1B8A55 — muted forest green, chosen to sit calmly beside
 *                       Brand Blue #004E98 and CTA Orange #FF6700.
 *   Error    #C0392B — warm crimson, clearly destructive but visually
 *                       distinct from the orange CTA.
 */

import { CustomIonicons as Ionicons } from '../components/CustomIcons';

export type DialogStatus = 'success' | 'warning' | 'info' | 'error' | 'cta';

export interface StatusTokens {
  /** Full-card background tint (low opacity wash) */
  bg: string;
  bgDark: string;
  /** Solid-fill circle behind icon */
  iconBg: string;
  iconBgDark: string;
  /** Icon colour inside badge */
  iconColor: string;
  /** Title / heading colour */
  titleColor: string;
  titleColorDark: string;
  /** Subtle border / header-strip colour */
  borderColor: string;
  /** Header strip (slightly more saturated than body wash) */
  headerBg: string;
  headerBgDark: string;
  /** Primary action button fill colour */
  actionBg: string;
  /** Primary action button text colour */
  actionText: string;
  /** Ionicons icon name */
  icon: any;
  /** Short human-readable label shown in dialog header strip */
  label: string;
}

export const STATUS_TOKENS: Record<DialogStatus, StatusTokens> = {
  success: {
    bg:            '#1B8A55',
    bgDark:        '#1B8A55',
    iconBg:        'rgba(255,255,255,0.20)',
    iconBgDark:    'rgba(255,255,255,0.20)',
    iconColor:     '#FFFFFF',
    titleColor:    '#FFFFFF',
    titleColorDark:'#FFFFFF',
    borderColor:   '#14704A',
    headerBg:      '#14704A',
    headerBgDark:  '#14704A',
    actionBg:      '#145C39',
    actionText:    '#FFFFFF',
    icon:          'checkmark-circle',
    label:         'Success',
  },
  warning: {
    bg:            '#D97706',
    bgDark:        '#D97706',
    iconBg:        'rgba(255,255,255,0.20)',
    iconBgDark:    'rgba(255,255,255,0.20)',
    iconColor:     '#FFFFFF',
    titleColor:    '#FFFFFF',
    titleColorDark:'#FFFFFF',
    borderColor:   '#B45309',
    headerBg:      '#B45309',
    headerBgDark:  '#B45309',
    actionBg:      '#B45309',
    actionText:    '#FFFFFF',
    icon:          'warning',
    label:         'Warning',
  },
  info: {
    bg:            '#1D6FBF',
    bgDark:        '#1D6FBF',
    iconBg:        'rgba(255,255,255,0.20)',
    iconBgDark:    'rgba(255,255,255,0.20)',
    iconColor:     '#FFFFFF',
    titleColor:    '#FFFFFF',
    titleColorDark:'#FFFFFF',
    borderColor:   '#155A9C',
    headerBg:      '#155A9C',
    headerBgDark:  '#155A9C',
    actionBg:      '#155A9C',
    actionText:    '#FFFFFF',
    icon:          'information-circle',
    label:         'Info',
  },
  error: {
    bg:            '#C0392B',
    bgDark:        '#C0392B',
    iconBg:        'rgba(255,255,255,0.20)',
    iconBgDark:    'rgba(255,255,255,0.20)',
    iconColor:     '#FFFFFF',
    titleColor:    '#FFFFFF',
    titleColorDark:'#FFFFFF',
    borderColor:   '#9B2D22',
    headerBg:      '#9B2D22',
    headerBgDark:  '#9B2D22',
    actionBg:      '#9B2D22',
    actionText:    '#FFFFFF',
    icon:          'close-circle',
    label:         'Error',
  },
  cta: {
    bg:            '#E85D26',
    bgDark:        '#E85D26',
    iconBg:        'rgba(255,255,255,0.20)',
    iconBgDark:    'rgba(255,255,255,0.20)',
    iconColor:     '#FFFFFF',
    titleColor:    '#FFFFFF',
    titleColorDark:'#FFFFFF',
    borderColor:   '#C44D1C',
    headerBg:      '#C44D1C',
    headerBgDark:  '#C44D1C',
    actionBg:      '#C44D1C',
    actionText:    '#FFFFFF',
    icon:          'star-outline',
    label:         'Action Required',
  },
};

/** Quick accessor — returns token set for the given status */
export function getStatusTokens(status: DialogStatus): StatusTokens {
  return STATUS_TOKENS[status];
}
