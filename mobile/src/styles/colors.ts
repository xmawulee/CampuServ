export type ThemeColors = {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  accent: string;
  secondary: string;
  background: string;
  screenBackground: string;
  cardBackground: string;
  inputBackground: string;
  border: string;
  text: string;
  textMuted: string;
  placeholderText: string;
  navIcon: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
};

// ── Light Mode ────────────────────────────────────────────────────────────────
export const LightColors: ThemeColors = {
  primary: '#FF7846',        // Coral Orange (accent.default)
  primaryLight: '#FFEBE3',   // accent.subtle
  primaryDark: '#D9663C',    // accent.pressed
  accent: '#FF7846',         // Coral Orange
  secondary: '#736E69',      // Ironside Gray (text.body)
  background: '#E6E6E6',     // White Rock (surface.lightBase)
  screenBackground: '#E6E6E6',
  cardBackground: '#FFFFFF', // surface.lightCard
  inputBackground: '#FFFFFF',
  border: '#D8D8D8',         // border.light
  text: '#5C5854',           // text.heading
  textMuted: '#736E69',      // text.body
  placeholderText: '#C0BEBC',// text.placeholder
  navIcon: '#736E69',
  success: '#1B8A55',        // Muted forest green
  successLight: '#EAF6F0',
  warning: '#F59E0B',        // Amber
  warningLight: '#FEF3D7',
  error: '#C0392B',          // Warm crimson
  errorLight: '#FDECEB',
};

// ── Dark Mode ─────────────────────────────────────────────────────────────────
export const DarkColors: ThemeColors = {
  primary: '#FF7846',        // Coral Orange
  primaryLight: 'rgba(255, 120, 70, 0.15)',
  primaryDark: '#D9663C',
  accent: '#FF7846',
  secondary: '#96928E',      // text.secondary
  background: '#3F3D3A',     // surface.darkBase
  screenBackground: '#3F3D3A',
  cardBackground: '#45423F', // surface.darkCard
  inputBackground: '#4E4B48',
  border: '#5C5854',
  text: '#FFFFFF',
  textMuted: '#E6E6E6',      // White Rock
  placeholderText: '#C0BEBC',// text.placeholder
  navIcon: '#E6E6E6',
  success: '#27AE6E',
  successLight: 'rgba(27,138,85,0.14)',
  warning: '#FBBF24',
  warningLight: 'rgba(245,158,11,0.14)',
  error: '#E05B4B',
  errorLight: 'rgba(192,57,43,0.14)',
};

// Static fallback (used before ThemeContext initialises)
export const Colors = LightColors;
