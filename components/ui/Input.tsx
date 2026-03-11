/**
 * Global Input component – single source for all text inputs.
 * Uses theme-aware styles from ThemeContext. No local input styles in screens.
 */
import React, { forwardRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextInput as RNTextInput,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, BorderRadius, Shadows, DENSITY, getTypography, getInputStyles } from '@/constants/design';

const _inputCompact = DENSITY === 'compact';
const _inputMinHeight = _inputCompact ? 44 : 54;
const _codeBoxSize = _inputCompact ? 40 : 48;

export type InputVariant = 'default' | 'code';

export interface InputProps extends Omit<React.ComponentPropsWithoutRef<typeof RNTextInput>, 'style'> {
  /** Optional label above the input */
  label?: string;
  /** Error message or true to show error state */
  error?: boolean | string;
  /** Optional left icon (e.g. User, Phone) */
  leftIcon?: React.ReactNode;
  /** Optional right element (e.g. password visibility toggle) */
  rightElement?: React.ReactNode;
  /** Lighter styling for optional fields */
  optional?: boolean;
  /** OTP/code single-char box variant */
  variant?: InputVariant;
  /** Container style (e.g. marginBottom) – no visual overrides */
  containerStyle?: ViewStyle;
  /** Ref for focus management */
  ref?: React.Ref<RNTextInput | null>;
}

const InputComponent = forwardRef<RNTextInput, InputProps>(function Input(
  {
    label,
    error = false,
    leftIcon,
    rightElement,
    optional = false,
    variant = 'default',
    containerStyle,
    placeholderTextColor,
    multiline,
    numberOfLines,
    textAlignVertical,
    editable = true,
    value: valueProp,
    ...rest
  },
  ref
) {
  const { colors } = useTheme();
  const typography = getTypography(colors);
  const inputStyles = getInputStyles(colors);
  const { onFocus: onFocusProp, onBlur: onBlurProp, ...restProps } = rest;

  const [focused, setFocused] = useState(false);
  const hasError = error === true || (typeof error === 'string' && error.length > 0);
  const errorMessage = typeof error === 'string' ? error : undefined;

  const value = valueProp == null ? '' : String(valueProp);

  if (variant === 'code') {
    return (
      <View style={containerStyle}>
        <TextInput
          ref={ref}
          onFocus={onFocusProp}
          onBlur={onBlurProp}
          style={[
            {
              width: _codeBoxSize,
              height: _codeBoxSize,
              minWidth: _codeBoxSize,
              minHeight: _codeBoxSize,
              borderWidth: 2,
              borderColor: colors.border,
              borderRadius: BorderRadius.md,
              ...typography.h2,
              textAlign: 'center',
              backgroundColor: colors.surface,
              padding: 0,
            },
            value && { borderColor: colors.textPrimary },
            hasError && { borderColor: colors.error },
          ]}
          placeholderTextColor={placeholderTextColor ?? colors.textTertiary}
          {...restProps}
          value={value}
        />
      </View>
    );
  }

  return (
    <View style={[inputStyles.container, containerStyle]}>
      {label ? (
        <Text 
          style={optional ? {
            ...typography.label,
            marginBottom: Spacing.sm,
            color: colors.textTertiary,
            fontSize: 12,
          } : inputStyles.label} 
          numberOfLines={1}
        >
          {label}
        </Text>
      ) : null}
      <View
        style={[
          {
            position: 'relative',
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: BorderRadius.sm,
            paddingHorizontal: Spacing.md,
            borderWidth: 1.5,
            borderColor: colors.border,
            ...Shadows.sm,
            minHeight: _inputMinHeight,
          },
          optional && { borderColor: colors.borderLight },
          multiline && { alignItems: 'flex-start', paddingVertical: Spacing.md, minHeight: 80 },
          hasError && { borderColor: colors.error },
          focused && !hasError && { borderColor: colors.primary },
        ]}
      >
        {leftIcon ? <View style={{ marginRight: Spacing.md }}>{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          style={[
            {
              flex: 1,
              ...inputStyles.input,
              paddingVertical: _inputCompact ? 10 : 14,
              marginVertical: 0,
              minHeight: _inputMinHeight,
              height: _inputMinHeight,
            },
            multiline && {
              minHeight: 80,
              height: undefined,
              paddingTop: Spacing.sm,
              paddingBottom: Spacing.sm,
              textAlignVertical: 'top',
            },
            rightElement ? { paddingRight: 44 } : null,
          ]}
          placeholderTextColor={placeholderTextColor ?? colors.textTertiary}
          multiline={multiline}
          numberOfLines={numberOfLines ?? (multiline ? 4 : 1)}
          textAlignVertical={textAlignVertical ?? (multiline ? 'top' : 'center')}
          editable={editable}
          value={value}
          onFocus={(e) => {
            setFocused(true);
            onFocusProp?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlurProp?.(e);
          }}
          {...restProps}
        />
        {rightElement ? (
          <View style={{ position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' }}>
            {rightElement}
          </View>
        ) : null}
      </View>
      {errorMessage ? (
        <Text style={{ ...typography.caption, color: colors.error, marginTop: Spacing.xs }} numberOfLines={2}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
});

export const Input = InputComponent;
