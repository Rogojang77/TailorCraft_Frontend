/**
 * Screen header: back button (left), title (center or left), optional right actions.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing } from '@/constants/atelierDesign';
import { Button } from '@/components/ui/Button';

const BACK_SIZE = 36;

export interface HeaderProps {
  title: string;
  onBack?: () => void;
  backAccessibilityLabel?: string;
  rightActions?: React.ReactNode;
  titleAlign?: 'center' | 'left';
  titleNumberOfLines?: number;
  style?: ViewStyle;
}

const HeaderComponent = ({
  title,
  onBack,
  backAccessibilityLabel,
  rightActions,
  titleAlign = 'center',
  titleNumberOfLines = 1,
  style,
}: HeaderProps) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {onBack != null ? (
        <Button
          variant="back"
          onPress={onBack}
          accessibilityLabel={backAccessibilityLabel}
        >
          <ArrowLeft size={24} color={colors.textPrimary} strokeWidth={2} />
        </Button>
      ) : (
        <View style={styles.placeholder} />
      )}
      <Text
        style={[
          styles.title,
          { color: colors.textPrimary },
          titleAlign === 'left' && styles.titleLeft,
        ]}
        numberOfLines={titleNumberOfLines}
      >
        {title}
      </Text>
      {rightActions != null ? (
        <View style={styles.actions}>{rightActions}</View>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.md,
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    flex: 1,
    textAlign: 'center',
  },
  titleLeft: {
    textAlign: 'left',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
  },
  placeholder: {
    width: BACK_SIZE,
    minWidth: BACK_SIZE,
  },
});

export const Header = memo(HeaderComponent);
