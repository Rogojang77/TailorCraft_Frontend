/**
 * Section block with optional title and header actions.
 * Uses theme-aware styles from ThemeContext.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing } from '@/constants/atelierDesign';

export interface SectionProps {
  /** Section title (uses serif headline typography) */
  title?: string;
  /** Optional right-side actions (e.g. "See all" link) */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  titleStyle?: TextStyle;
}

const SectionComponent = ({ title, headerRight, children, style, titleStyle }: SectionProps) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.section, style]}>
      {(title != null || headerRight != null) && (
        <View style={[styles.sectionHeader, headerRight != null && styles.headerRow]}>
          {title != null ? (
            <Text
              style={[
                styles.title,
                { color: colors.textPrimary },
                headerRight != null && styles.titleFlex,
                titleStyle,
              ]}
              numberOfLines={1}
            >
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
  section: {
    marginBottom: AtelierSpacing.lg,
  },
  sectionHeader: {
    marginBottom: AtelierSpacing.sm,
    paddingHorizontal: AtelierSpacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
  },
  titleFlex: {
    flex: 1,
    marginRight: AtelierSpacing.sm,
  },
});

export const Section = memo(SectionComponent);
