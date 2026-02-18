/**
 * Global Button component – single source for all buttons.
 * Uses ButtonStyles from constants/design. No local button styles in screens.
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
import { Colors, Typography, ButtonStyles, DENSITY } from '@/constants/design';

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
  const isIconOnly = iconVariants.includes(variant);
  const isDisabled = disabled || loading;
  const hasText = typeof children === 'string';
  const textColor = textVariantColor(variant);

  const pressableStyle = ({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> => {
    const base = isIconOnly ? getIconVariantStyle(variant) : getTextVariantStyle(variant, size);
    return [
      base,
      fullWidth && !isIconOnly && styles.fullWidth,
      isDisabled && ButtonStyles.disabled,
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

function getIconVariantStyle(variant: ButtonVariant): ViewStyle {
  switch (variant) {
    case 'back':
      return ButtonStyles.back;
    case 'primaryIcon':
      return ButtonStyles.primaryIcon;
    case 'secondaryIcon':
      return ButtonStyles.secondaryIcon;
    case 'dangerIcon':
      return ButtonStyles.dangerIcon;
    default:
      return ButtonStyles.primaryIcon;
  }
}

function getTextVariantStyle(variant: ButtonVariant, size: ButtonSize): ViewStyle {
  const base: ViewStyle =
    variant === 'primary'
      ? ButtonStyles.primary
      : variant === 'secondary'
        ? ButtonStyles.secondary
        : variant === 'ghost'
          ? ButtonStyles.ghost
          : variant === 'danger'
            ? { ...ButtonStyles.primary, ...styles.dangerBg }
            : ButtonStyles.primary;
  const sizeStyle: ViewStyle | undefined = size === 'sm' ? styles.sizeSm : size === 'lg' ? styles.sizeLg : undefined;
  return StyleSheet.flatten([base, sizeStyle]) as ViewStyle;
}

function getTextStyle(variant: ButtonVariant, isIconOnly: boolean, size?: ButtonSize): TextStyle {
  if (isIconOnly) return {};
  const color =
    variant === 'secondary' || variant === 'ghost' ? Colors.textPrimary : Colors.textInverse;
  const typeStyle = size === 'sm' ? Typography.captionBold : Typography.bodyBold;
  return {
    ...typeStyle,
    color: variant === 'danger' ? Colors.textInverse : color,
  };
}

function iconVariantColor(variant: ButtonVariant): string {
  switch (variant) {
    case 'dangerIcon':
      return Colors.danger;
    case 'secondaryIcon':
    case 'back':
      return Colors.textPrimary;
    default:
      return Colors.textInverse;
  }
}

function textVariantColor(variant: ButtonVariant): string {
  return variant === 'secondary' || variant === 'ghost' ? Colors.textPrimary : Colors.textInverse;
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.85,
  },
  dangerBg: {
    backgroundColor: Colors.danger,
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
