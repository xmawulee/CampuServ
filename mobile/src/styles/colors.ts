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

// ── Light Mode Design Tokens ──────────────────────────────────────────────────
export const LightColors: ThemeColors = {
  primary: '#FF6B35',        // Coral Orange Primary
  primaryLight: '#FFF5F0',   // Warm Cream Tint (12% accent)
  primaryDark: '#D9531E',    // Deep Terracotta Orange (High Contrast AA compliant)
  accent: '#FF6B35',
  secondary: '#52525B',      // Slate Charcoal
  background: '#FAF7F4',     // Warm Soft Off-White Screen Canvas
  screenBackground: '#FAF7F4',
  cardBackground: '#FFFFFF', // Crisp Surface Card
  inputBackground: '#F4F0EB',// Soft Warm Off-White Input Surface
  border: '#E6E0D9',         // Warm Soft Off-White Border
  text: '#18181B',           // Deep Charcoal Ink
  textMuted: '#52525B',      // Medium Charcoal Body
  placeholderText: '#A1A1AA',// Neutral Placeholder
  navIcon: '#71717A',
  success: '#059669',        // Emerald Green
  successLight: '#ECFDF5',
  warning: '#D97706',        // Warm Amber
  warningLight: '#FFFBEB',
  error: '#DC2626',          // Warm Crimson
  errorLight: '#FEF2F2',
};

// ── Dark Mode Design Tokens ───────────────────────────────────────────────────
export const DarkColors: ThemeColors = {
  primary: '#FF6B35',        // Coral Orange Primary
  primaryLight: 'rgba(255, 107, 53, 0.15)',
  primaryDark: '#D9531E',
  accent: '#FF6B35',
  secondary: '#A1A1AA',
  background: '#121215',     // Deep Obsidian Canvas
  screenBackground: '#121215',
  cardBackground: '#1C1C21', // Elevated Card Surface
  inputBackground: '#24242A',// Input Surface
  border: '#2E2E36',         // Subtle Structural Border
  text: '#FAFAFA',           // Soft Off-White Heading
  textMuted: '#A1A1AA',      // Muted Body Text
  placeholderText: '#71717A',
  navIcon: '#A1A1AA',
  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.14)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.14)',
  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.14)',
};

// Static fallback (used before ThemeContext initialises)
export const Colors = LightColors;
