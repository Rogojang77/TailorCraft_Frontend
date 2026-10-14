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
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';

const _inputMinHeight = 48;
const _codeBoxSize = 44;

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
  /** Starts one line tall and grows with the text (wraps instead of scrolling sideways). */
  autoGrow?: boolean;
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
    multiline: multilineProp,
    autoGrow = false,
    numberOfLines,
    textAlignVertical,
    editable = true,
    value: valueProp,
    ...rest
  },
  ref
) {
  const { colors } = useTheme();
  const multiline = multilineProp || autoGrow;
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
              borderColor: colors.rule ?? colors.border,
              borderRadius: AtelierRadius.md,
              fontFamily: FontFamily.serif,
              fontSize: 22,
              lineHeight: 28,
              textAlign: 'center',
              backgroundColor: colors.card,
              color: colors.textPrimary,
              padding: 0,
            },
            value && { borderColor: colors.textPrimary },
            hasError && { borderColor: colors.ember ?? colors.error },
          ]}
          placeholderTextColor={placeholderTextColor ?? (colors.ink4 ?? colors.textTertiary)}
          {...restProps}
          value={value}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text
          style={[
            styles.label,
            { color: optional ? (colors.ink4 ?? colors.textTertiary) : colors.textPrimary },
          ]}
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
            backgroundColor: colors.card,
            borderRadius: AtelierRadius.sm,
            paddingHorizontal: AtelierSpacing.md,
            borderWidth: 1.5,
            borderColor: colors.rule ?? colors.border,
            minHeight: _inputMinHeight,
          },
          optional && { borderColor: colors.ruleSoft ?? colors.rule ?? colors.border },
          multiline && !autoGrow && { alignItems: 'flex-start', paddingVertical: AtelierSpacing.md, minHeight: 80 },
          hasError && { borderColor: colors.ember ?? colors.error },
          focused && !hasError && { borderColor: colors.brass ?? colors.primary },
        ]}
      >
        {leftIcon ? <View style={{ marginRight: AtelierSpacing.md }}>{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          style={[
            {
              flex: 1,
              fontFamily: FontFamily.sans,
              fontSize: 15,
              lineHeight: 22,
              color: colors.textPrimary,
              paddingVertical: 13,
              marginVertical: 0,
              minHeight: _inputMinHeight,
              height: _inputMinHeight,
            },
            multiline && !autoGrow && {
              minHeight: 80,
              height: undefined,
              paddingTop: AtelierSpacing.sm,
              paddingBottom: AtelierSpacing.sm,
              textAlignVertical: 'top',
            },
            autoGrow && { height: undefined, paddingTop: 13, paddingBottom: 13 },
            rightElement ? { paddingRight: 44 } : null,
          ]}
          placeholderTextColor={placeholderTextColor ?? (colors.ink4 ?? colors.textTertiary)}
          multiline={multiline}
          numberOfLines={autoGrow ? undefined : numberOfLines ?? (multiline ? 4 : 1)}
          scrollEnabled={autoGrow ? false : undefined}
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
        <Text
          style={{ fontFamily: FontFamily.mono, fontSize: 11, lineHeight: 16, color: colors.ember ?? colors.error, marginTop: AtelierSpacing.xs }}
          numberOfLines={2}
        >
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
});

export const Input = InputComponent;

const styles = StyleSheet.create({
  container: {
    marginBottom: AtelierSpacing.sm,
  },
  label: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: AtelierSpacing.sm,
  },
});
