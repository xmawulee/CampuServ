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
  primary: '#FF7846',        // Coral Orange
  primaryLight: '#FFEBE3',   // Subtle orange tint
  primaryDark: '#FF7846',    // Same as primary (no dark gradient)
  accent: '#FF7846',         // Coral Orange
  secondary: '#4A4A4D',      // Darker muted grey for readability
  background: '#F5F6F8',     // Off-white screen background
  screenBackground: '#F5F6F8',
  cardBackground: '#FFFFFF', // Clean white cards & containers
  inputBackground: '#FFFFFF',
  border: '#E2E8F0',         // Soft subtle border
  text: '#1C1C1E',           // Almost black
  textMuted: '#2C2C2E',      // Darker muted for readability on patterns
  placeholderText: '#7A7A80',// Darker placeholder for readability
  navIcon: '#636366',
  success: '#34C759',        // Apple-style green
  successLight: '#E8F8ED',
  warning: '#F59E0B',        // Amber
  warningLight: '#FEF3D7',
  error: '#C0392B',          // Warm crimson
  errorLight: '#FDECEB',
};

// ── Dark Mode ─────────────────────────────────────────────────────────────────
export const DarkColors: ThemeColors = {
  primary: '#FF7846',        // Coral Orange (same across themes)
  primaryLight: 'rgba(255, 120, 70, 0.15)',
  primaryDark: '#D9663C',
  accent: '#FF7846',
  secondary: '#A0A0B0',      // Soft grey for secondary text
  background: '#1A1A2E',     // Deep navy-black
  screenBackground: '#1A1A2E',
  cardBackground: '#222240', // Slightly elevated surface
  inputBackground: '#2A2A48',// Subtle contrast for inputs
  border: '#3A3A55',         // Visible but subtle borders
  text: '#F0F0F5',           // Soft white (easier on the eyes than pure white)
  textMuted: '#D0D0E0',      // More opaque muted text for readability
  placeholderText: '#8A8A9E',// Brighter placeholder for readability
  navIcon: '#B0B0C0',
  success: '#34D399',
  successLight: 'rgba(52, 211, 153, 0.14)',
  warning: '#FBBF24',
  warningLight: 'rgba(251, 191, 36, 0.14)',
  error: '#F87171',
  errorLight: 'rgba(248, 113, 113, 0.14)',
};

// Static fallback (used before ThemeContext initialises)
export const Colors = LightColors;
