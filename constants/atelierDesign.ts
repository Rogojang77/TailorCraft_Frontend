/**
 * Atelier Design System
 * Editorial "paper & ink" aesthetic for TailorCraft.
 * All raw tokens mirror TC_TOKENS from shared.jsx.
 */

import { Platform } from 'react-native';
import { ThemeColors } from '@/contexts/ThemeContext';

// ─── Font families ────────────────────────────────────────────────────────────
export const FontFamily = {
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  sans: 'GeistMono_400Regular',
  sansLight: 'GeistMono_400Regular',
  sansMedium: 'GeistMono_500Medium',
  sansSemiBold: 'GeistMono_600SemiBold',
  sansBold: 'GeistMono_700Bold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
  monoSemiBold: 'GeistMono_600SemiBold',
  monoBold: 'GeistMono_700Bold',
} as const;

// ─── Raw palette (light / atelier) ───────────────────────────────────────────
export const AtelierPalette = {
  paper: '#EFE9DC',
  paperDeep: '#E6DECD',
  card: '#F7F2E6',
  cardSoft: '#FBF7EC',

  ink: '#1B1611',
  ink2: '#3F362A',
  ink3: '#7B7060',
  ink4: '#A89E8C',

  rule: '#D6CBB3',
  ruleSoft: '#E3D9C2',

  brass: '#9C7A3E',
  brassDeep: '#6E5326',
  brassPale: '#D9C18B',

  ember: '#A23E2E',
  pine: '#3D5C48',
  ocean: '#3C5772',
} as const;

// ─── Typography scales ────────────────────────────────────────────────────────
export const AtelierType = {
  // Display — Instrument Serif
  display: {
    fontFamily: FontFamily.serif,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  displaySm: {
    fontFamily: FontFamily.serif,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  headline: {
    fontFamily: FontFamily.serif,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0,
  },

  // UI — Geist Mono
  uiLg: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0,
  },
  uiMd: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
  uiSm: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
  uiXs: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.2,
  },

  // Numeric / labels — Geist Mono
  monoLg: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  monoMd: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  monoSm: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
  },
  monoLabel: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.8,
  },
} as const;

// ─── Rule / divider ───────────────────────────────────────────────────────────
export const AtelierRule = {
  horizontal: {
    height: 1,
    width: '100%' as const,
  },
  ornamental: {
    height: 1,
    width: '100%' as const,
  },
} as const;

// ─── Border radius ────────────────────────────────────────────────────────────
export const AtelierRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// ─── Spacing (atelier uses slightly looser rhythm than compact mode) ───────────
export const AtelierSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  pagePad: 20,
} as const;

// ─── Status colors (order lifecycle) ─────────────────────────────────────────
export const AtelierStatus = {
  pending: { fg: '#9C7A3E', bg: 'rgba(156, 122, 62, 0.10)' },
  progress: { fg: '#3C5772', bg: 'rgba(60, 87, 114, 0.10)' },
  fitting: { fg: '#7B5EA7', bg: 'rgba(123, 94, 167, 0.10)' },
  completed: { fg: '#3D5C48', bg: 'rgba(61, 92, 72, 0.10)' },
  delivered: { fg: '#3D5C48', bg: 'rgba(61, 92, 72, 0.06)' },
  overdue: { fg: '#A23E2E', bg: 'rgba(162, 62, 46, 0.10)' },
  cancelled: { fg: '#7B7060', bg: 'rgba(123, 112, 96, 0.10)' },
} as const;

export type AtelierStatusKey = keyof typeof AtelierStatus;

// ─── Shadows (iOS only) ───────────────────────────────────────────────────────
const noShadow = {
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
};

export const AtelierShadow = {
  card: Platform.select({
    android: noShadow,
    default: {
      shadowColor: '#3F362A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
  }),
  elevated: Platform.select({
    android: noShadow,
    default: {
      shadowColor: '#3F362A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
  }),
} as const;

// ─── Theme-aware style factories ──────────────────────────────────────────────

/** Returns the atelier surface color stack from the active theme colors. */
export const getAtelierSurfaces = (colors: ThemeColors) => ({
  page: colors.paper,
  pageDeep: colors.paperDeep,
  card: colors.card,
  cardSoft: colors.cardSoft,
  rule: colors.rule,
  ruleSoft: colors.ruleSoft,
});

/** Atelier ink text styles from active theme colors. */
export const getAtelierText = (colors: ThemeColors) => ({
  primary: { color: colors.ink },
  secondary: { color: colors.ink2 },
  tertiary: { color: colors.ink3 },
  muted: { color: colors.ink4 },
  brass: { color: colors.brass },
  ember: { color: colors.ember },
});

/** Status pill style for an order status. */
export const getStatusStyle = (status: AtelierStatusKey) => {
  const s = AtelierStatus[status] ?? AtelierStatus.pending;
  return {
    pill: {
      backgroundColor: s.bg,
      borderRadius: AtelierRadius.xs,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    label: {
      color: s.fg,
      ...AtelierType.monoLabel,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.8,
    },
    railColor: s.fg,
  };
};
