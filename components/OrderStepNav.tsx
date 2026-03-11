import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { getTypography, getShadows, Spacing, BorderRadius, Shadows } from '@/constants/design';

interface OrderStepNavProps {
  showPrev: boolean;
  showNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  prevLabel?: string;
  nextLabel?: string;
}

export function OrderStepNav({
  showPrev,
  showNext,
  onPrev,
  onNext,
  nextDisabled = false,
  nextLoading = false,
  prevLabel,
  nextLabel,
}: OrderStepNavProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const typography = getTypography(colors);
  const shadows = getShadows(colors);
  const displayPrevLabel = prevLabel ?? t('stepNav.back');
  const displayNextLabel = nextLabel ?? t('stepNav.next');
  
  return (
    <View style={[styles.container, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
      {showPrev ? (
        <TouchableOpacity
          style={[styles.prevButton, { borderColor: colors.primary, backgroundColor: colors.surface }]}
          onPress={onPrev}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={colors.primary} strokeWidth={2.5} />
          <Text style={[typography.bodyBold, { color: colors.primary }]}>{displayPrevLabel}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}
      {showNext ? (
        <TouchableOpacity
          style={[
            styles.nextButton, 
            { borderColor: colors.primary, backgroundColor: colors.primary },
            shadows.primary,
            nextDisabled && styles.nextButtonDisabled
          ]}
          onPress={onNext}
          disabled={nextDisabled || nextLoading}
          activeOpacity={0.7}
        >
          {nextLoading ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              <Text style={[typography.bodyBold, { color: colors.textInverse }]}>{displayNextLabel}</Text>
              <ChevronRight size={22} color={colors.textInverse} strokeWidth={2.5} />
            </>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    ...Shadows.sm,
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  spacer: {
    flex: 1,
  },
});
