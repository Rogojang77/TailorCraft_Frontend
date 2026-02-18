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
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/design';

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
  const displayPrevLabel = prevLabel ?? t('stepNav.back');
  const displayNextLabel = nextLabel ?? t('stepNav.next');
  return (
    <View style={styles.container}>
      {showPrev ? (
        <TouchableOpacity
          style={styles.prevButton}
          onPress={onPrev}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={Colors.primary} strokeWidth={2.5} />
          <Text style={styles.prevLabel}>{displayPrevLabel}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}
      {showNext ? (
        <TouchableOpacity
          style={[styles.nextButton, nextDisabled && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={nextDisabled || nextLoading}
          activeOpacity={0.7}
        >
          {nextLoading ? (
            <ActivityIndicator size="small" color={Colors.textInverse} />
          ) : (
            <>
              <Text style={styles.nextLabel}>{displayNextLabel}</Text>
              <ChevronRight size={22} color={Colors.textInverse} strokeWidth={2.5} />
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
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
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  prevLabel: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
    ...Shadows.primary,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextLabel: {
    ...Typography.bodyBold,
    color: Colors.textInverse,
  },
  spacer: {
    flex: 1,
  },
});
