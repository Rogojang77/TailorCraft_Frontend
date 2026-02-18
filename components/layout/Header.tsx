/**
 * Screen header: back button (left), title (center or left), optional right actions.
 * Uses HeaderStyles from design system.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { HeaderStyles, Colors, HeaderBackButtonSize } from '@/constants/design';
import { Button } from '@/components/ui/Button';

export interface HeaderProps {
  /** Title text */
  title: string;
  /** Back press handler (if set, shows back button) */
  onBack?: () => void;
  /** Accessibility label for back button */
  backAccessibilityLabel?: string;
  /** Right-side actions (e.g. icon buttons) */
  rightActions?: React.ReactNode;
  /** Title alignment: center (default) or left */
  titleAlign?: 'center' | 'left';
  /** Title number of lines */
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
  const titleStyle = titleAlign === 'left' ? HeaderStyles.titleLeft : HeaderStyles.title;
  return (
    <View style={[HeaderStyles.container, style]}>
      {onBack != null ? (
        <Button
          variant="back"
          onPress={onBack}
          accessibilityLabel={backAccessibilityLabel}
        >
          <ArrowLeft size={24} color={Colors.textPrimary} strokeWidth={2} />
        </Button>
      ) : (
        <View style={styles.placeholder} />
      )}
      <Text style={titleStyle} numberOfLines={titleNumberOfLines}>
        {title}
      </Text>
      {rightActions != null ? (
        <View style={HeaderStyles.actions}>{rightActions}</View>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    width: HeaderBackButtonSize,
    minWidth: HeaderBackButtonSize,
  },
});

export const Header = memo(HeaderComponent);
