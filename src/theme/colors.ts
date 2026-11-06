import { colors as backupColors } from '../theme_backup/colors';

export const colors = {
  ...backupColors,

  // Enhanced Obsidian & Glassmorphism Surfaces
  background: '#07080B',
  surfacePrimary: '#0E1017',
  surfaceSecondary: '#141722',
  surfaceElevated: '#1A1E2C',
  surfaceCard: '#11141E',
  surfaceCardSubtle: 'rgba(255, 255, 255, 0.04)',
  surfaceGlass: 'rgba(18, 21, 31, 0.78)',
  surfaceGlassElevated: 'rgba(26, 30, 44, 0.88)',

  // Luminous Edge Highlights
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  borderProminent: 'rgba(255, 255, 255, 0.16)',
  borderGlass: 'rgba(255, 255, 255, 0.12)',

  // Category-Adaptive Accent Palettes
  category: {
    // 1. Music & Concerts (Neon Cyber Electric)
    music: {
      primary: '#FF2E7E',
      secondary: '#8B5CF6',
      glow: 'rgba(255, 46, 126, 0.35)',
      gradient: ['#FF2E7E', '#7928CA', 'rgba(7, 8, 11, 0.95)'] as const,
      badgeBg: 'rgba(255, 46, 126, 0.15)',
      badgeBorder: 'rgba(255, 46, 126, 0.4)',
      tag: 'LIVE CONCERT',
      icon: 'musical-notes',
    },
    // 2. Hackathons & Tech Sprints (Royal Cyber Violet / Neon Blue)
    hackathons: {
      primary: '#8B5CF6',
      secondary: '#00F0FF',
      glow: 'rgba(139, 92, 246, 0.35)',
      gradient: ['#8B5CF6', '#00F0FF', 'rgba(7, 8, 11, 0.95)'] as const,
      badgeBg: 'rgba(139, 92, 246, 0.15)',
      badgeBorder: 'rgba(139, 92, 246, 0.4)',
      tag: 'TECH HACKATHON',
      icon: 'code-slash',
    },
    // 3. Competitions & Sports (Electric Golden Yellow / Blaze)
    competitions: {
      primary: '#FFB800',
      secondary: '#FF5400',
      glow: 'rgba(255, 184, 0, 0.35)',
      gradient: ['#FFB800', '#FF5400', 'rgba(7, 8, 11, 0.95)'] as const,
      badgeBg: 'rgba(255, 184, 0, 0.15)',
      badgeBorder: 'rgba(255, 184, 0, 0.4)',
      tag: 'ARENA & PRIZE',
      icon: 'trophy',
    },
    // 4. Workshops & Design Labs (Electric Purple / Fuchsia)
    workshops: {
      primary: '#A855F7',
      secondary: '#EC4899',
      glow: 'rgba(168, 85, 247, 0.35)',
      gradient: ['#A855F7', '#EC4899', 'rgba(7, 8, 11, 0.95)'] as const,
      badgeBg: 'rgba(168, 85, 247, 0.15)',
      badgeBorder: 'rgba(168, 85, 247, 0.4)',
      tag: 'TECH SPRINT & LAB',
      icon: 'laptop-outline',
    },
    // 5. Comedy & Meetups (Golden Yellow & Coral Flame)
    meetups: {
      primary: '#FFD700',
      secondary: '#FF3366',
      glow: 'rgba(255, 215, 0, 0.35)',
      gradient: ['#FFD700', '#FF3366', 'rgba(7, 8, 11, 0.95)'] as const,
      badgeBg: 'rgba(255, 215, 0, 0.15)',
      badgeBorder: 'rgba(255, 215, 0, 0.4)',
      tag: 'COMEDY & SOCIAL',
      icon: 'people',
    },
    // 6. Parties & Nightlife (Electric Hot Pink / Ultraviolet)
    parties: {
      primary: '#EC4899',
      secondary: '#8B5CF6',
      glow: 'rgba(236, 72, 153, 0.35)',
      gradient: ['#EC4899', '#8B5CF6', 'rgba(7, 8, 11, 0.95)'] as const,
      badgeBg: 'rgba(236, 72, 153, 0.15)',
      badgeBorder: 'rgba(236, 72, 153, 0.4)',
      tag: 'NIGHTLIFE & PARTY',
      icon: 'sparkles',
    },
  },
};

export const getCategoryTheme = (category?: string) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('music') || cat.includes('concert') || cat.includes('band') || cat.includes('jam')) {
    return colors.category.music;
  }
  if (cat.includes('hack') || cat.includes('tech') || cat.includes('coding') || cat.includes('dev') || cat.includes('robot')) {
    return colors.category.hackathons;
  }
  if (cat.includes('sport') || cat.includes('compet') || cat.includes('arena') || cat.includes('tourn') || cat.includes('run') || cat.includes('race')) {
    return colors.category.competitions;
  }
  if (cat.includes('workshop') || cat.includes('college') || cat.includes('design') || cat.includes('learn')) {
    return colors.category.workshops;
  }
  if (cat.includes('party') || cat.includes('night') || cat.includes('club') || cat.includes('dj') || cat.includes('synth')) {
    return colors.category.parties;
  }
  return colors.category.meetups;
};
