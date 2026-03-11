/**
 * Design System Constants
 * Modern 2026 aesthetic with consistent styling across the app
 * Following 8pt grid system and accessibility standards
 * 
 * Theme-aware: Use `useTheme().colors` from ThemeContext for dynamic theming.
 * The `Colors` export below is the light theme for backward compatibility.
 */

import { Platform } from 'react-native';
import { LightColors, DarkColors, ThemeColors } from '@/contexts/ThemeContext';

export type Density = 'comfortable' | 'compact';
export const DENSITY: Density = 'compact';
const isCompact = DENSITY === 'compact';

/**
 * @deprecated Use `useTheme().colors` from ThemeContext for theme-aware colors.
 * This export is kept for backward compatibility and represents the light theme.
 */
export const Colors = LightColors;

export { LightColors, DarkColors };
export type { ThemeColors };

// Accent palette for avatars/badges (consistent order across app)
export const AccentPalette = [
  Colors.primary,
  Colors.info,
  Colors.success,
  '#8B5CF6', // purple
  Colors.warning,
  Colors.error,
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#84CC16', // lime
  '#F97316', // orange
] as const;

// 8pt grid system (compact density reduces spacing ~25–35%)
export const Spacing = {
  xxxs: 1,
  xxs: 2,
  xs: 4,
  sm: isCompact ? 6 : 8,
  md: isCompact ? 12 : 16,
  lg: isCompact ? 18 : 24,
  xl: isCompact ? 24 : 32,
  xxl: isCompact ? 32 : 40,
  xxxl: isCompact ? 36 : 48,
  formFieldGap: isCompact ? 10 : 14,
};

export const BorderRadius = {
  sm: 10,  // Inputs: 10px
  md: 12,  // Buttons: 12px
  lg: 14,  // Cards: 14px
  xl: 20,
  xxl: 24,
  full: 9999,
};

const noShadow = {
  shadowColor: 'transparent',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
};

export const Shadows = {
  // Very subtle shadow for cards (2026 standard) — iOS only; no shadow on Android
  sm: Platform.select({
    android: noShadow,
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 2,
      elevation: 1,
    },
  }),
  md: Platform.select({
    android: noShadow,
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
  }),
  lg: Platform.select({
    android: noShadow,
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
  }),
  xl: Platform.select({
    android: noShadow,
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
  }),
  primary: Platform.select({
    android: noShadow,
    default: {
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    },
  }),
  /** Floating glass footer – upward subtle shadow — iOS only */
  floatingFooter: Platform.select({
    android: noShadow,
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 10,
    },
  }),
  /** Premium CTA pill (gold) — iOS only */
  ctaPill: Platform.select({
    android: noShadow,
    default: {
      shadowColor: Colors.ctaGold,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
  }),
};

// Typography System (2026 standards); compact reduces fontSize only
const _h1Fs = isCompact ? 22 : 24;
const _h2Fs = isCompact ? 22 : 24;
const _h3Fs = isCompact ? 18 : 20;
const _bodyFs = isCompact ? 14 : 16;
const _captionFs = isCompact ? 13 : 14;
const _buttonFs = isCompact ? 15 : 16; // button text -1px vs body

export const Typography = {
  h1: {
    fontSize: _h1Fs,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    lineHeight: _h1Fs * 1.5,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: _h2Fs,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    lineHeight: _h2Fs * 1.5,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: _h3Fs,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    lineHeight: _h3Fs * 1.5,
  },
  body: {
    fontSize: _bodyFs,
    fontWeight: '400' as const,
    color: Colors.textPrimary,
    lineHeight: _bodyFs * 1.5,
  },
  bodyBold: {
    fontSize: _buttonFs,
    fontWeight: '500' as const,
    color: Colors.textPrimary,
    lineHeight: _buttonFs * 1.5,
  },
  bodySemiBold: {
    fontSize: _bodyFs,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    lineHeight: _bodyFs * 1.5,
  },
  caption: {
    fontSize: _captionFs,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: _captionFs * 1.2,
  },
  captionBold: {
    fontSize: _captionFs,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    lineHeight: _captionFs * 1.2,
  },
  label: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 13 * 1.5,
  },
  small: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    lineHeight: 12 * 1.5,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    lineHeight: 18 * 1.4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 12 * 1.5,
  },
};

// Standardized Button Styles (2026 standards); compact reduces heights
const _iconSize = isCompact ? 36 : 44;
const _primaryHeight = isCompact ? 36 : 48;
const _primaryPadding = isCompact ? 8 : 14;

export const ButtonStyles = {
  primaryIcon: {
    width: _iconSize,
    height: _iconSize,
    minWidth: _iconSize,
    minHeight: _iconSize,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...Shadows.primary,
  },
  secondaryIcon: {
    width: _iconSize,
    height: _iconSize,
    minWidth: _iconSize,
    minHeight: _iconSize,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  dangerIcon: {
    width: _iconSize,
    height: _iconSize,
    minWidth: _iconSize,
    minHeight: _iconSize,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  back: {
    width: _iconSize,
    height: _iconSize,
    minWidth: _iconSize,
    minHeight: _iconSize,
    borderRadius: BorderRadius.full,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...Shadows.sm,
  },
  primary: {
    backgroundColor: Colors.primary,
    minHeight: _primaryHeight,
    paddingVertical: _primaryPadding,
    borderRadius: BorderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...Shadows.primary,
  },
  secondary: {
    backgroundColor: Colors.surface,
    minHeight: _primaryHeight,
    paddingVertical: _primaryPadding,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  ghost: {
    minHeight: _primaryHeight,
    paddingVertical: _primaryPadding,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  disabled: {
    opacity: 0.5,
  },
};

// Standardized Header Styles (compact: smaller padding, h3 title)
export const HeaderStyles = {
  container: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: Spacing.md,
    paddingTop: isCompact ? Spacing.lg : Spacing.xl,
    paddingBottom: Spacing.md,
  },
  title: {
    ...(isCompact ? Typography.h3 : Typography.h2),
    flex: 1,
    textAlign: 'center' as const,
  },
  titleLeft: {
    ...(isCompact ? Typography.h3 : Typography.h2),
  },
  actions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
  },
};

/** Back button / placeholder width for header alignment */
export const HeaderBackButtonSize = _iconSize;

// Input Styles (2026 standards)
// Height: 46px
// Border radius: 10px
// Labels always visible (13px)
// Input text: 16px
export const InputStyles = {
  container: {
    marginBottom: Spacing.formFieldGap,
  },
  label: {
    ...Typography.label, // 13px
    marginBottom: Spacing.sm, // 8px
    color: Colors.textPrimary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm, // 10px
    paddingHorizontal: Spacing.xs, 
    height: 38,
    minHeight: 38,
    lineHeight: 20,
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '400' as const,
  },
  inputFocused: {
    borderColor: Colors.primary,
  },
  inputError: {
    borderColor: Colors.error,
  },
};

// Card Styles (2026 standards); compact uses smaller padding
export const CardStyles = {
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: isCompact ? Spacing.md : Spacing.lg,
    ...Shadows.sm,
  },
  cardElevated: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: isCompact ? Spacing.md : Spacing.lg,
    ...Shadows.md,
  },
};

// Layout primitives – use for screen containers and sections
export const LayoutStyles = {
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  section: {
    marginBottom: isCompact ? Spacing.lg : Spacing.xl,
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  rowBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
};

/** Overrides to reduce stacked vertical spacing when Section wraps Card or EmptyState. Apply via style prop. */
export const CompactLayoutStyles = {
  compactSection: { marginBottom: Spacing.md, flex: 1 },
  compactCard: { paddingVertical: Spacing.sm },
};

// Modal overlay/content – for consistent modal chrome
export const ModalStyles = {
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlayModal,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  overlayLight: {
    flex: 1,
    backgroundColor: Colors.overlayLight,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: '100%' as const,
    maxWidth: 400,
    ...Shadows.xl,
  },
};

// Status-specific surface styles (alerts, banners)
export const StatusStyles = {
  success: {
    backgroundColor: Colors.successBg,
    borderColor: Colors.successBorder,
  },
  successText: { color: Colors.successText },
  error: {
    backgroundColor: Colors.errorBg,
    borderColor: Colors.errorBorder,
  },
  errorText: { color: Colors.errorTextDark },
  warning: {
    backgroundColor: Colors.warningBg,
    borderColor: Colors.warningBorder,
  },
  warningText: { color: Colors.warningText },
  info: {
    backgroundColor: Colors.infoBg,
    borderColor: Colors.infoBorder,
  },
  infoText: { color: Colors.infoText },
};

// ============================================================================
// THEME-AWARE STYLE FACTORIES
// Use these with useTheme().colors for dynamic light/dark mode support
// ============================================================================

/**
 * Theme-aware button styles factory
 */
export const getButtonStyles = (colors: ThemeColors) => ({
  primaryIcon: {
    width: _iconSize,
    height: _iconSize,
    minWidth: _iconSize,
    minHeight: _iconSize,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...getShadows(colors).primary,
  },
  secondaryIcon: {
    width: _iconSize,
    height: _iconSize,
    minWidth: _iconSize,
    minHeight: _iconSize,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...Shadows.sm,
  },
  dangerIcon: {
    width: _iconSize,
    height: _iconSize,
    minWidth: _iconSize,
    minHeight: _iconSize,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.dangerBg,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  back: {
    width: _iconSize,
    height: _iconSize,
    minWidth: _iconSize,
    minHeight: _iconSize,
    borderRadius: BorderRadius.full,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...Shadows.sm,
  },
  primary: {
    backgroundColor: colors.primary,
    minHeight: _primaryHeight,
    paddingVertical: _primaryPadding,
    borderRadius: BorderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...getShadows(colors).primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    minHeight: _primaryHeight,
    paddingVertical: _primaryPadding,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  ghost: {
    minHeight: _primaryHeight,
    paddingVertical: _primaryPadding,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  disabled: {
    opacity: 0.5,
  },
});

/**
 * Theme-aware card styles factory
 */
export const getCardStyles = (colors: ThemeColors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: isCompact ? Spacing.md : Spacing.lg,
    ...Shadows.sm,
  },
  cardElevated: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: isCompact ? Spacing.md : Spacing.lg,
    ...Shadows.md,
  },
});

/**
 * Theme-aware layout styles factory
 */
export const getLayoutStyles = (colors: ThemeColors) => ({
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  section: {
    marginBottom: isCompact ? Spacing.lg : Spacing.xl,
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  rowBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
});

/**
 * Theme-aware input styles factory
 */
export const getInputStyles = (colors: ThemeColors) => ({
  container: {
    marginBottom: Spacing.formFieldGap,
  },
  label: {
    ...getTypography(colors).label,
    marginBottom: Spacing.sm,
    color: colors.textPrimary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    height: 38,
    minHeight: 38,
    lineHeight: 20,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '400' as const,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputError: {
    borderColor: colors.error,
  },
});

/**
 * Theme-aware modal styles factory
 */
export const getModalStyles = (colors: ThemeColors) => ({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayModal,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  overlayLight: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  content: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: '100%' as const,
    maxWidth: 400,
    ...Shadows.xl,
  },
});

/**
 * Theme-aware status styles factory
 */
export const getStatusStyles = (colors: ThemeColors) => ({
  success: {
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
  },
  successText: { color: colors.successText },
  error: {
    backgroundColor: colors.errorBg,
    borderColor: colors.errorBorder,
  },
  errorText: { color: colors.errorTextDark },
  warning: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
  },
  warningText: { color: colors.warningText },
  info: {
    backgroundColor: colors.infoBg,
    borderColor: colors.infoBorder,
  },
  infoText: { color: colors.infoText },
});

/**
 * Theme-aware header styles factory
 */
export const getHeaderStyles = (colors: ThemeColors) => ({
  container: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: Spacing.md,
    paddingTop: isCompact ? Spacing.lg : Spacing.xl,
    paddingBottom: Spacing.md,
  },
  title: {
    ...getTypography(colors)[isCompact ? 'h3' : 'h2'],
    flex: 1,
    textAlign: 'center' as const,
  },
  titleLeft: {
    ...getTypography(colors)[isCompact ? 'h3' : 'h2'],
  },
  actions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
  },
});

/**
 * Theme-aware typography factory
 */
export const getTypography = (colors: ThemeColors) => ({
  h1: {
    fontSize: _h1Fs,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    lineHeight: _h1Fs * 1.5,
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: _h2Fs,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    lineHeight: _h2Fs * 1.5,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: _h3Fs,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    lineHeight: _h3Fs * 1.5,
  },
  body: {
    fontSize: _bodyFs,
    fontWeight: '400' as const,
    color: colors.textPrimary,
    lineHeight: _bodyFs * 1.5,
  },
  bodyBold: {
    fontSize: _buttonFs,
    fontWeight: '500' as const,
    color: colors.textPrimary,
    lineHeight: _buttonFs * 1.5,
  },
  bodySemiBold: {
    fontSize: _bodyFs,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    lineHeight: _bodyFs * 1.5,
  },
  caption: {
    fontSize: _captionFs,
    fontWeight: '400' as const,
    color: colors.textSecondary,
    lineHeight: _captionFs * 1.2,
  },
  captionBold: {
    fontSize: _captionFs,
    fontWeight: '500' as const,
    color: colors.textSecondary,
    lineHeight: _captionFs * 1.2,
  },
  label: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: colors.textSecondary,
    lineHeight: 13 * 1.5,
  },
  small: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.textTertiary,
    lineHeight: 12 * 1.5,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    lineHeight: 18 * 1.4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: colors.textSecondary,
    lineHeight: 12 * 1.5,
  },
});

/**
 * Theme-aware shadows factory (for shadows that use theme colors). Android gets no shadow.
 */
export const getShadows = (colors: ThemeColors) => ({
  ...Shadows,
  primary: Platform.select({
    android: noShadow,
    default: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    },
  }),
  ctaPill: Platform.select({
    android: noShadow,
    default: {
      shadowColor: colors.ctaGold,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
  }),
});
