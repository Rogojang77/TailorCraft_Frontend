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
import { useTheme, ThemeColors } from '@/contexts/ThemeContext';
import { getTypography, getButtonStyles, Spacing, BorderRadius, getShadows, DENSITY } from '@/constants/design';

const _compact = DENSITY === 'compact';

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
  const buttonStyles = getButtonStyles(colors);
  const typography = getTypography(colors);
  
  const isIconOnly = iconVariants.includes(variant);
  const isDisabled = disabled || loading;
  const hasText = typeof children === 'string';

  const getIconVariantStyle = (v: ButtonVariant): ViewStyle => {
    switch (v) {
      case 'back':
        return buttonStyles.back;
      case 'primaryIcon':
        return buttonStyles.primaryIcon;
      case 'secondaryIcon':
        return buttonStyles.secondaryIcon;
      case 'dangerIcon':
        return buttonStyles.dangerIcon;
      default:
        return buttonStyles.primaryIcon;
    }
  };

  const getTextVariantStyle = (v: ButtonVariant, s: ButtonSize): ViewStyle => {
    const base: ViewStyle =
      v === 'primary'
        ? buttonStyles.primary
        : v === 'secondary'
          ? buttonStyles.secondary
          : v === 'ghost'
            ? buttonStyles.ghost
            : v === 'danger'
              ? { ...buttonStyles.primary, backgroundColor: colors.danger }
              : buttonStyles.primary;
    const sizeStyle: ViewStyle | undefined = s === 'sm' ? styles.sizeSm : s === 'lg' ? styles.sizeLg : undefined;
    return StyleSheet.flatten([base, sizeStyle]) as ViewStyle;
  };

  const getTextStyle = (v: ButtonVariant, iconOnly: boolean, s?: ButtonSize): TextStyle => {
    if (iconOnly) return {};
    const color =
      v === 'secondary' || v === 'ghost' ? colors.textPrimary : colors.textInverse;
    const typeStyle = s === 'sm' ? typography.captionBold : typography.bodyBold;
    return {
      ...typeStyle,
      color: v === 'danger' ? colors.textInverse : color,
    };
  };

  const iconVariantColor = (v: ButtonVariant): string => {
    switch (v) {
      case 'dangerIcon':
        return colors.danger;
      case 'secondaryIcon':
      case 'back':
        return colors.textPrimary;
      default:
        return colors.textInverse;
    }
  };

  const textVariantColor = (v: ButtonVariant): string => {
    return v === 'secondary' || v === 'ghost' ? colors.textPrimary : colors.textInverse;
  };

  const textColor = textVariantColor(variant);

  const pressableStyle = ({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> => {
    const base = isIconOnly ? getIconVariantStyle(variant) : getTextVariantStyle(variant, size);
    return [
      base,
      fullWidth && !isIconOnly && styles.fullWidth,
      isDisabled && buttonStyles.disabled,
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
  sizeSm: {
    minHeight: _compact ? 32 : 40,
    paddingVertical: _compact ? 6 : 10,
    paddingHorizontal: _compact ? 10 : 14,
  },
  sizeLg: {
    minHeight: _compact ? 44 : 56,
    paddingVertical: _compact ? 12 : 16,
    paddingHorizontal: _compact ? 14 : 18,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
