import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import type { TemplateSource } from '@/types/templates';
import { getTemplateSourceLabel } from '@/lib/templateUtils';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/design';

const SOURCE_COLORS: Record<TemplateSource, { bg: string; text: string }> = {
  local: { bg: Colors.borderLight, text: Colors.textSecondary },
  shared: { bg: Colors.info + '20', text: Colors.info },
  api: { bg: Colors.primaryLight, text: Colors.primaryDark },
};

const DEFAULT_SOURCE_STYLE = SOURCE_COLORS.local;

interface TemplateSourceBadgeProps {
  source: TemplateSource | string | null | undefined;
  style?: ViewStyle;
}

function getSourceStyle(source: TemplateSource | string | null | undefined): { bg: string; text: string } {
  if (source === 'local' || source === 'shared' || source === 'api') {
    return SOURCE_COLORS[source];
  }
  return DEFAULT_SOURCE_STYLE;
}

/**
 * Badge indicating template source (Local / Shared / API).
 * Use when displaying garment templates to make source clear.
 * Handles unknown or missing source from API (falls back to local style).
 */
export function TemplateSourceBadge({ source, style }: TemplateSourceBadgeProps) {
  const label = getTemplateSourceLabel(source as TemplateSource);
  const { bg, text } = getSourceStyle(source);
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
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
  label: {
    ...Typography.small,
    fontWeight: '600',
  },
});
