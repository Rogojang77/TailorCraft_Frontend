/**
 * Section block with optional title and header actions.
 * Uses theme-aware styles from ThemeContext.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { getLayoutStyles, getTypography, Spacing } from '@/constants/design';

export interface SectionProps {
  /** Section title (uses h3 typography) */
  title?: string;
  /** Optional right-side actions (e.g. "See all" link) */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  titleStyle?: TextStyle;
}

const SectionComponent = ({ title, headerRight, children, style, titleStyle }: SectionProps) => {
  const { colors } = useTheme();
  const layoutStyles = getLayoutStyles(colors);
  const typography = getTypography(colors);

  return (
    <View style={[layoutStyles.section, style]}>
      {(title != null || headerRight != null) && (
        <View style={[layoutStyles.sectionHeader, styles.sectionHeaderWithPadding, headerRight != null && styles.headerRow]}>
          {title != null ? (
            <Text style={[typography.h3, headerRight != null && styles.sectionTitleFlex, titleStyle]} numberOfLines={1}>
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
