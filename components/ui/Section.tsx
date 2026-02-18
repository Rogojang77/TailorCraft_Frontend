/**
 * Section block with optional title and header actions. Uses LayoutStyles.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LayoutStyles, Typography, Spacing } from '@/constants/design';

export interface SectionProps {
  /** Section title (uses h3 typography) */
  title?: string;
  /** Optional right-side actions (e.g. "See all" link) */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
  titleStyle?: TextStyle;
}

const SectionComponent = ({ title, headerRight, children, style, titleStyle }: SectionProps) => {
  return (
    <View style={[LayoutStyles.section, style]}>
      {(title != null || headerRight != null) && (
        <View style={[LayoutStyles.sectionHeader, styles.sectionHeaderWithPadding, headerRight != null && styles.headerRow]}>
          {title != null ? (
            <Text style={[styles.sectionTitle, headerRight != null && styles.sectionTitleFlex, titleStyle]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {headerRight != null ? headerRight : null}
        </View>
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    ...Typography.h3,
  },
  sectionTitleFlex: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderWithPadding: {
    paddingHorizontal: Spacing.md,
  },
});

export const Section = memo(SectionComponent);
