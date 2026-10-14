/**
 * Standard error message text.
 * Uses theme-aware colors from ThemeContext.
 */
import React, { memo } from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily } from '@/constants/atelierDesign';

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
  const color = variant === 'dark' ? (colors.brassDeep ?? colors.ember ?? colors.error) : (colors.ember ?? colors.error);

  return (
    <Text
      style={[{ fontFamily: FontFamily.mono, fontSize: 11, lineHeight: 16, color }, style]}
      numberOfLines={numberOfLines ?? 2}
    >
      {children}
    </Text>
  );
};

export const ErrorText = memo(ErrorTextComponent);
