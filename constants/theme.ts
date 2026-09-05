// Powered by OnSpace.AI
// Central Theme System — Dark-first Face Attendance App

export const Colors = {
  // Base palette
  primary: '#F5A623',       // Amber gold — key actions, highlights
  primaryDark: '#D4871A',   // Pressed state
  primaryLight: '#FFC34D',  // Hover/glow
  emphasis: '#FF6B35',      // Destructive / warning

  // Backgrounds
  bg: '#0D0D1A',            // Deepest background
  bgSurface: '#13131F',     // Card/panel background
  bgElevated: '#1A1A2E',    // Elevated surface
  bgCard: '#1E1E32',        // Card background
  bgInput: '#252538',       // Input fields

  // Borders
  border: '#2A2A42',
  borderLight: '#363650',

  // Text
  textPrimary: '#F0F0FF',
  textSecondary: '#9090B0',
  textMuted: '#5A5A78',
  textOnPrimary: '#0D0D1A',

  // Status
  success: '#4CAF50',
  successBg: '#1A2E1A',
  error: '#F44336',
  errorBg: '#2E1A1A',
  warning: '#FF9800',
  warningBg: '#2E2200',
  info: '#2196F3',
  infoBg: '#1A1E2E',

  // Camera/Recognition
  scanRing: '#F5A623',
  scanGlow: 'rgba(245, 166, 35, 0.3)',
  recognized: '#4CAF50',
  notRecognized: '#F44336',

  // Dark mode overrides (light mode)
  light: {
    bg: '#F5F5FA',
    bgSurface: '#FFFFFF',
    bgElevated: '#EDEDF5',
    bgCard: '#FFFFFF',
    bgInput: '#F0F0F8',
    border: '#E0E0F0',
    borderLight: '#EBEBF8',
    textPrimary: '#0D0D1A',
    textSecondary: '#5A5A78',
    textMuted: '#9090B0',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  body: 16,
  md: 18,
  lg: 20,
  xl: 24,
  xxl: 28,
  hero: 36,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Radius = {
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
  round: 999,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  glow: {
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
};

export default { Colors, Spacing, FontSize, FontWeight, Radius, Shadow };
