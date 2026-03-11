/**
 * Standard error message text.
 * Uses theme-aware colors from ThemeContext.
 */
import React, { memo } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { getTypography } from '@/constants/design';

export interface ErrorTextProps {
  children: string;
  /** Use darker error color where needed */
  variant?: 'default' | 'dark';
  style?: TextStyle;
  numberOfLines?: number;
}

const ErrorTextComponent = ({
  children,
  variant = 'default',
  style,
  numberOfLines,
}: ErrorTextProps) => {
  const { colors } = useTheme();
  const typography = getTypography(colors);
  const color = variant === 'dark' ? colors.errorTextDark : colors.error;
  
  return (
    <Text style={[typography.caption, { color }, style]} numberOfLines={numberOfLines ?? 2}>
      {children}
    </Text>
  );
};

export const ErrorText = memo(ErrorTextComponent);
