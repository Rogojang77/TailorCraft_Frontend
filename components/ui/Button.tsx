/**
 * Global Button component – single source for all buttons.
 * Uses theme-aware styles from ThemeContext. No local button styles in screens.
 */
import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  StyleProp,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierRadius } from '@/constants/atelierDesign';

const _iconSize = 36;
const _primaryHeight = 36;
const _primaryPadding = 8;

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'back'
  | 'primaryIcon'
  | 'secondaryIcon'
  | 'dangerIcon';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  /** Button style variant */
  variant?: ButtonVariant;
  /** Size (affects padding/height for non-icon variants) */
  size?: ButtonSize;
  /** Press handler */
  onPress?: () => void;
  /** Optional long-press handler (e.g. list item context menu) */
  onLongPress?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state (shows spinner, typically disables press) */
  loading?: boolean;
  /** Label for accessibility */
  accessibilityLabel?: string;
  /** Full width (for text buttons) */
  fullWidth?: boolean;
  /** Content: text string or icon node (for icon-only use ReactNode) */
  children: React.ReactNode;
  /** Optional left icon (for text buttons) */
  leftIcon?: React.ReactNode;
  /** Optional right icon (for text buttons) */
  rightIcon?: React.ReactNode;
  /** Optional container style (layout only, e.g. marginTop) – no visual overrides */
  style?: ViewStyle;
}

const iconVariants: ButtonVariant[] = ['back', 'primaryIcon', 'secondaryIcon', 'dangerIcon'];

export function Button({
  variant = 'primary',
  size = 'md',
  onPress,
  onLongPress,
  disabled = false,
  loading = false,
  accessibilityLabel,
  fullWidth = false,
  children,
  leftIcon,
  rightIcon,
  style,
}: ButtonProps) {
  const { colors } = useTheme();

  const isIconOnly = iconVariants.includes(variant);
  const isDisabled = disabled || loading;
  const hasText = typeof children === 'string';

  const iconBase: ViewStyle = {
    width: _iconSize, height: _iconSize, minWidth: _iconSize, minHeight: _iconSize,
    borderRadius: AtelierRadius.full, justifyContent: 'center', alignItems: 'center',
  };

  const getIconVariantStyle = (v: ButtonVariant): ViewStyle => {
    switch (v) {
      case 'back': return iconBase;
      case 'primaryIcon': return { ...iconBase, backgroundColor: colors.brass ?? colors.primary };
      case 'secondaryIcon': return { ...iconBase, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.rule ?? colors.border };
      case 'dangerIcon': return { ...iconBase, backgroundColor: (colors.ember ?? colors.error) + '1F' };
      default: return { ...iconBase, backgroundColor: colors.brass ?? colors.primary };
    }
  };

  const textBase: ViewStyle = {
    minHeight: _primaryHeight, paddingVertical: _primaryPadding,
    borderRadius: AtelierRadius.md, alignItems: 'center', justifyContent: 'center',
  };

  const getTextVariantStyle = (v: ButtonVariant, s: ButtonSize): ViewStyle => {
    let variantStyle: ViewStyle;
    switch (v) {
      case 'secondary': variantStyle = { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.rule ?? colors.border }; break;
      case 'ghost': variantStyle = {}; break;
      case 'danger': variantStyle = { backgroundColor: colors.ember ?? colors.error }; break;
      default: variantStyle = { backgroundColor: colors.brass ?? colors.primary }; break;
    }
    const sizeStyle: ViewStyle | undefined = s === 'sm' ? styles.sizeSm : s === 'lg' ? styles.sizeLg : undefined;
    return StyleSheet.flatten([textBase, variantStyle, sizeStyle]) as ViewStyle;
  };

  const getTextStyle = (v: ButtonVariant, iconOnly: boolean, s?: ButtonSize): TextStyle => {
    if (iconOnly) return {};
    const paperColor = colors.paper ?? '#EFE9DC';
    const inkColor = colors.textPrimary;
    const color = v === 'secondary' || v === 'ghost' ? inkColor : paperColor;
    const typeStyle: TextStyle = s === 'sm'
      ? { fontFamily: FontFamily.mono, fontSize: 13, lineHeight: 16 }
      : { fontFamily: FontFamily.sansMedium, fontSize: 15, lineHeight: 22 };
    return { ...typeStyle, color: v === 'danger' ? paperColor : color };
  };

  const iconVariantColor = (v: ButtonVariant): string => {
    switch (v) {
      case 'dangerIcon': return colors.ember ?? colors.error;
      case 'secondaryIcon':
      case 'back': return colors.textPrimary;
      default: return colors.paper ?? '#EFE9DC';
    }
  };

  const textVariantColor = (v: ButtonVariant): string => {
    return v === 'secondary' || v === 'ghost' ? (colors.textPrimary) : (colors.paper ?? '#EFE9DC');
  };

  const textColor = textVariantColor(variant);

  const pressableStyle = ({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> => {
    const base = isIconOnly ? getIconVariantStyle(variant) : getTextVariantStyle(variant, size);
    return [
      base,
      fullWidth && !isIconOnly && styles.fullWidth,
      isDisabled && styles.disabled,
      pressed && !isDisabled && styles.pressed,
      !isIconOnly && (leftIcon || rightIcon) && styles.rowContent,
      style,
    ] as StyleProp<ViewStyle>;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="small"
          color={isIconOnly ? iconVariantColor(variant) : textColor}
        />
      );
    }
    if (isIconOnly) {
      return children;
    }
    return (
      <>
        {leftIcon}
        {hasText ? (
          <Text style={getTextStyle(variant, false, size)}>{children}</Text>
        ) : (
          children
        )}
        {rightIcon}
      </>
    );
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={pressableStyle}
    >
      {renderContent()}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  sizeSm: {
    minHeight: 32,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  sizeLg: {
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
