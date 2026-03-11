import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import type { TemplateSource } from '@/types/templates';
import { getTemplateSourceLabel } from '@/lib/templateUtils';
import { useTheme, ThemeColors } from '@/contexts/ThemeContext';
import { getTypography, Spacing, BorderRadius } from '@/constants/design';

function getSourceColors(source: TemplateSource | string | null | undefined, colors: ThemeColors): { bg: string; text: string } {
  const sourceColors: Record<TemplateSource, { bg: string; text: string }> = {
    local: { bg: colors.borderLight, text: colors.textSecondary },
    shared: { bg: colors.info + '20', text: colors.info },
    api: { bg: colors.primaryLight, text: colors.primaryDark },
  };
  
  if (source === 'local' || source === 'shared' || source === 'api') {
    return sourceColors[source];
  }
  return sourceColors.local;
}

interface TemplateSourceBadgeProps {
  source: TemplateSource | string | null | undefined;
  style?: ViewStyle;
}

/**
 * Badge indicating template source (Local / Shared / API).
 * Use when displaying garment templates to make source clear.
 * Handles unknown or missing source from API (falls back to local style).
 */
export function TemplateSourceBadge({ source, style }: TemplateSourceBadgeProps) {
  const { colors } = useTheme();
  const typography = getTypography(colors);
  const label = getTemplateSourceLabel(source as TemplateSource);
  const { bg, text } = getSourceColors(source, colors);
  
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[typography.small, { color: text, fontWeight: '600' }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
});
