/**
 * Global Input component – single source for all text inputs.
 * Uses InputStyles from constants/design. No local input styles in screens.
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
import { Colors, Spacing, Typography, BorderRadius, InputStyles, Shadows, DENSITY } from '@/constants/design';

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
    placeholderTextColor = Colors.textTertiary,
    multiline,
    numberOfLines,
    textAlignVertical,
    editable = true,
    value: valueProp,
    ...rest
  },
  ref
) {
  const [focused, setFocused] = useState(false);
  const hasError = error === true || (typeof error === 'string' && error.length > 0);
  const errorMessage = typeof error === 'string' ? error : undefined;

  // Never pass null/undefined to TextInput so the placeholder shows instead of "null"
  const value = valueProp == null ? '' : String(valueProp);

  if (variant === 'code') {
    return (
      <View style={containerStyle}>
        <TextInput
          ref={ref}
          style={[
            styles.codeInput,
            value && styles.codeInputFilled,
            hasError && styles.codeInputError,
          ]}
          placeholderTextColor={placeholderTextColor}
          {...rest}
          value={value}
        />
      </View>
    );
  }

  const inputStyle = [
    styles.input,
    optional && styles.inputOptional,
    multiline && styles.textArea,
    leftIcon && styles.inputWithLeftIcon,
    rightElement && styles.inputWithRightElement,
    hasError && styles.inputError,
    focused && !hasError && styles.inputFocused,
  ];

  return (
    <View style={[InputStyles.container, containerStyle]}>
      {label ? (
        <Text style={optional ? styles.labelOptional : styles.label} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.wrapper,
          optional && styles.wrapperOptional,
          multiline && styles.wrapperMultiline,
          hasError && styles.wrapperError,
          focused && !hasError && styles.wrapperFocused,
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          style={inputStyle}
          placeholderTextColor={placeholderTextColor}
          multiline={multiline}
          numberOfLines={numberOfLines ?? (multiline ? 4 : 1)}
          textAlignVertical={textAlignVertical ?? (multiline ? 'top' : 'center')}
          editable={editable}
          value={value}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
      </View>
      {errorMessage ? (
        <Text style={styles.errorText} numberOfLines={2}>
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
});

export const Input = InputComponent;

const styles = StyleSheet.create({
  label: {
    ...InputStyles.label,
  },
  labelOptional: {
    ...Typography.label,
    marginBottom: Spacing.sm,
    color: Colors.textTertiary,
    fontSize: 12,
  },
  wrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.sm,
    minHeight: _inputMinHeight,
  },
  wrapperOptional: {
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  wrapperMultiline: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    minHeight: 80,
  },
  wrapperFocused: {
    borderColor: Colors.primary,
  },
  wrapperError: {
    borderColor: Colors.error,
  },
  leftIcon: {
    marginRight: Spacing.md,
  },
  rightElement: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    ...InputStyles.input,
    paddingVertical: _inputCompact ? 10 : 14,
    marginVertical: 0,
    minHeight: _inputMinHeight,
    height: _inputMinHeight,
  },
  inputOptional: {
    flex: 1,
    ...InputStyles.input,
    paddingVertical: _inputCompact ? 10 : 14,
    marginVertical: 0,
    minHeight: _inputMinHeight,
    height: _inputMinHeight,
  },
  inputWithLeftIcon: {},
  inputWithRightElement: {
    paddingRight: 44,
  },
  inputError: {},
  inputFocused: {},
  textArea: {
    minHeight: 80,
    height: undefined,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    textAlignVertical: 'top',
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  // Code variant (OTP boxes)
  codeInput: {
    width: _codeBoxSize,
    height: _codeBoxSize,
    minWidth: _codeBoxSize,
    minHeight: _codeBoxSize,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    ...Typography.h2,
    textAlign: 'center',
    backgroundColor: Colors.surface,
    padding: 0,
  },
  codeInputFilled: {
    borderColor: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  codeInputError: {
    borderColor: Colors.error,
  },
});
