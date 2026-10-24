export const colors = {
  // Backgrounds & Obsidian Surfaces
  background: '#07080B',
  surfacePrimary: '#10121A',
  surfaceSecondary: '#161924',
  surfaceElevated: '#1D212F',
  surfaceCard: '#13151F',
  surfaceCardSubtle: 'rgba(255, 255, 255, 0.04)',

  // Borders & Dividers
  borderSubtle: '#1C202C',
  borderProminent: '#2A3042',
  borderOrange: 'rgba(255, 107, 0, 0.35)',
  borderGlow: 'rgba(255, 107, 0, 0.35)',
  borderGold: 'rgba(245, 158, 11, 0.3)',

  // Brand Warm Orange & Amber Accents (matching reference image)
  orangePrimary: '#FF6B00',
  orangeSunset: '#FF5E3A',
  orangeLight: '#FF8A3D',
  orangeGlow: 'rgba(255, 107, 0, 0.3)',
  amberPrimary: '#F59E0B',
  amberLight: '#FBBF24',
  amberDark: '#D97706',
  amberGlow: 'rgba(245, 158, 11, 0.2)',

  // Primary brand accent is now warm orange
  primary: '#FF6B00',

  // Gradient Presets for Event Cards
  gradients: {
    sunset: ['#FF5E3A', '#D9381E', 'rgba(7, 8, 11, 0.96)'] as const,
    electricBlue: ['#00C6FF', '#7028E4', 'rgba(7, 8, 11, 0.96)'] as const,
    cyberPurple: ['#A855F7', '#6366F1', 'rgba(7, 8, 11, 0.96)'] as const,
    warmAmber: ['#F59E0B', '#EA580C', 'rgba(7, 8, 11, 0.96)'] as const,
    emeraldTeal: ['#10B981', '#0D9488', 'rgba(7, 8, 11, 0.96)'] as const,
    coralRose: ['#FF416C', '#FF4B2B', 'rgba(7, 8, 11, 0.96)'] as const,
    cardDarkOverlay: ['rgba(0,0,0,0.1)', 'rgba(7, 8, 11, 0.65)', '#07080B'] as const,
  },

  // Semantic & Auxiliary Colors
  success: '#10B981',
  info: '#38BDF8',
  danger: '#EF4444',
  tagPurple: '#8B5CF6',
  tagTeal: '#14B8A6',

  // Typography
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: '#475569',
  textOnPrimary: '#07080B',
  textOnAmber: '#07080B',

  // Overlays
  overlayGradientStart: 'transparent',
  overlayGradientEnd: 'rgba(7, 8, 11, 0.95)',
  backdrop: 'rgba(0, 0, 0, 0.85)',
};
