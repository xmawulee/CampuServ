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
    bg:            '#EAF6F0',
    bgDark:        'rgba(27,138,85,0.14)',
    iconBg:        '#1B8A55',
    iconBgDark:    '#27AE6E',
    iconColor:     '#FFFFFF',
    titleColor:    '#145C39',
    titleColorDark:'#27AE6E',
    borderColor:   '#A8DCC3',
    headerBg:      '#C8EDDB',
    headerBgDark:  'rgba(27,138,85,0.28)',
    actionBg:      '#1B8A55',
    actionText:    '#FFFFFF',
    icon:          'checkmark-circle',
    label:         'Success',
  },
  warning: {
    bg:            '#FEF3D7',
    bgDark:        'rgba(245,158,11,0.14)',
    iconBg:        '#F59E0B',
    iconBgDark:    '#FBBF24',
    iconColor:     '#FFFFFF',
    titleColor:    '#92400E',
    titleColorDark:'#FBBF24',
    borderColor:   '#FBD47C',
    headerBg:      '#FBEAB4',
    headerBgDark:  'rgba(245,158,11,0.28)',
    actionBg:      '#F59E0B',
    actionText:    '#FFFFFF',
    icon:          'warning',
    label:         'Warning',
  },
  info: {
    bg:            'rgba(115, 110, 105, 0.08)',
    bgDark:        'rgba(115, 110, 105, 0.16)',
    iconBg:        '#736E69',
    iconBgDark:    '#96928E',
    iconColor:     '#FFFFFF',
    titleColor:    '#5C5854',
    titleColorDark:'#E6E6E6',
    borderColor:   '#CACACA',
    headerBg:      'rgba(115, 110, 105, 0.18)',
    headerBgDark:  'rgba(115, 110, 105, 0.30)',
    actionBg:      '#736E69',
    actionText:    '#FFFFFF',
    icon:          'information-circle',
    label:         'Info',
  },
  error: {
    bg:            '#FDECEB',
    bgDark:        'rgba(192,57,43,0.14)',
    iconBg:        '#C0392B',
    iconBgDark:    '#E05B4B',
    iconColor:     '#FFFFFF',
    titleColor:    '#7B1D14',
    titleColorDark:'#E05B4B',
    borderColor:   '#F0A89F',
    headerBg:      '#FAC9C4',
    headerBgDark:  'rgba(192,57,43,0.28)',
    actionBg:      '#C0392B',
    actionText:    '#FFFFFF',
    icon:          'close-circle',
    label:         'Error',
  },
  cta: {
    bg:            'rgba(255,120,70,0.08)',
    bgDark:        'rgba(255,120,70,0.14)',
    iconBg:        '#FF7846',
    iconBgDark:    '#FF7846',
    iconColor:     '#FFFFFF',
    titleColor:    '#D9663C',
    titleColorDark:'#FF7846',
    borderColor:   '#FFA787',
    headerBg:      'rgba(255,120,70,0.18)',
    headerBgDark:  'rgba(255,120,70,0.30)',
    actionBg:      '#FF7846',
    actionText:    '#FFFFFF',
    icon:          'star-outline',
    label:         'Action Required',
  },
};

/** Quick accessor — returns token set for the given status */
export function getStatusTokens(status: DialogStatus): StatusTokens {
  return STATUS_TOKENS[status];
}
