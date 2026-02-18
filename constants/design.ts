/**
 * Design System Constants
 * Modern 2026 aesthetic with consistent styling across the app
 * Following 8pt grid system and accessibility standards
 */

export type Density = 'comfortable' | 'compact';
export const DENSITY: Density = 'compact';
const isCompact = DENSITY === 'compact';

export const Colors = {
  // Primary (reduced saturation by ~15%)
  primary: '#C4A02D', // Reduced saturation from #D4AF37
  primaryDark: '#A88A1A',
  primaryLight: '#E8D9A0',
  
  // Neutral
  background: '#F8F9FB', // Pure app background
  surface: '#FFFFFF', // Pure white cards
  surfaceElevated: '#FFFFFF',
  
  // Text (2026 standards)
  textPrimary: '#111111', // #111 for primary text
  textSecondary: '#6B7280', // Secondary text
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  
  // Status (error only for errors, never warnings/info)
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444', // Only for errors
  danger: '#F43F5E', // Destructive actions (e.g. delete)
  dangerDark: '#E11D48',
  dangerBg: 'rgba(244, 63, 94, 0.12)',
  info: '#3B82F6',
  
  // Borders & Dividers
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayDark: 'rgba(0, 0, 0, 0.8)',
  overlayModal: 'rgba(15, 23, 42, 0.72)', // Modal backdrop (web-friendly)
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  overlayGradientEnd: 'rgba(0, 0, 0, 0.98)',

  // Status backgrounds (tinted surfaces for alerts/cards)
  successBg: '#ECFDF5',
  successBorder: '#10B981',
  successText: '#065F46',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',
  errorText: '#991B1B',
  errorTextDark: '#B91C1C',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  warningText: '#92400E',
  warningTextDark: '#A16207',
  infoBg: '#EFF6FF',
  infoBorder: '#BFDBFE',
  infoText: '#1E40AF',

  // Icon/default accent (for icons when not primary)
  iconDefault: '#333333',
  // Legacy primary used in some icons; prefer Colors.primary
  primaryLegacy: '#D4AF37',

  // Floating footer CTA (luxury gold pill)
  ctaGold: '#C9A227',
  ctaGoldDisabled: '#E5D3A1',

  transparent: "transparent", 
};

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

export const Shadows = {
  // Very subtle shadow for cards (2026 standard)
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  primary: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  /** Floating glass footer – upward subtle shadow */
  floatingFooter: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  /** Premium CTA pill (gold) */
  ctaPill: {
    shadowColor: Colors.ctaGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
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
    paddingBottom: Spacing.xs,
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
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
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
  compactSection: { marginBottom: Spacing.md },
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
