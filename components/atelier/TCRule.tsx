/**
 * TCRule — section divider rule with optional label + count badge.
 * Renders a hairline rule or a labelled section header with count.
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { AtelierType, AtelierSpacing, FontFamily } from '@/constants/atelierDesign';

interface TCRuleProps {
  label?: string;
  count?: number;
  style?: ViewStyle;
  /** 'rule' = thin hairline only; 'section' = label + rule (default) */
  variant?: 'rule' | 'section';
}

export function TCRule({ label, count, style, variant = 'section' }: TCRuleProps) {
  const { colors } = useTheme();
  const ruleColor = colors.rule ?? colors.border;

  if (variant === 'rule' || !label) {
    return <View style={[styles.hairline, { backgroundColor: ruleColor }, style]} />;
  }

  return (
    <View style={[styles.sectionRow, style]}>
      <Text style={[styles.label, { color: colors.ink3 ?? colors.textSecondary }]}>
        {label.toUpperCase()}
      </Text>
      {count !== undefined && (
        <View style={[styles.countBadge, { backgroundColor: colors.ruleSoft ?? colors.borderLight }]}>
          <Text style={[styles.countText, { color: colors.ink3 ?? colors.textSecondary }]}>
            {count}
          </Text>
        </View>
      )}
      <View style={[styles.flex1, styles.hairline, { backgroundColor: ruleColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  hairline: {
    height: 1,
    width: '100%',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.sm,
  },
  label: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.0,
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  countText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  flex1: {
    flex: 1,
  },
});
