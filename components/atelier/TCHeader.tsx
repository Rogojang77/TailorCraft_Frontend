/**
 * TCHeader — editorial nameplate header.
 * Eyebrow (mono caps) + serif title + optional subtitle.
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { AtelierType, AtelierSpacing, FontFamily } from '@/constants/atelierDesign';

interface TCHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  style?: ViewStyle;
}

export function TCHeader({ eyebrow, title, subtitle, align = 'left', style }: TCHeaderProps) {
  const { colors } = useTheme();
  const textAlign = align;

  return (
    <View style={[styles.container, style]}>
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: colors.brass, textAlign }]}>
          {eyebrow.toUpperCase()}
        </Text>
      ) : null}
      <Text style={[styles.title, { color: colors.textPrimary, textAlign }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.ink3 ?? colors.textSecondary, textAlign }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  eyebrow: {
    ...AtelierType.monoLabel,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  subtitle: {
    ...AtelierType.uiSm,
    marginTop: AtelierSpacing.xs,
  },
});
