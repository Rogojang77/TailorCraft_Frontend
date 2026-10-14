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
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';

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
  const displayPrevLabel = prevLabel ?? t('stepNav.back');
  const displayNextLabel = nextLabel ?? t('stepNav.next');
  const brassColor = colors.brass ?? colors.primary;
  const paperColor = colors.paper ?? '#EFE9DC';

  return (
    <View
      style={[
        styles.container,
        { borderTopColor: colors.rule ?? colors.border, backgroundColor: colors.paper ?? colors.background },
      ]}
    >
      {showPrev ? (
        <TouchableOpacity
          style={[styles.prevButton, { borderColor: brassColor, backgroundColor: colors.card }]}
          onPress={onPrev}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={brassColor} strokeWidth={2.5} />
          <Text style={[styles.btnLabel, { color: brassColor }]}>{displayPrevLabel}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}
      {showNext ? (
        <TouchableOpacity
          style={[
            styles.nextButton,
            { backgroundColor: brassColor },
            nextDisabled && styles.nextButtonDisabled,
          ]}
          onPress={onNext}
          disabled={nextDisabled || nextLoading}
          activeOpacity={0.7}
        >
          {nextLoading ? (
            <ActivityIndicator size="small" color={paperColor} />
          ) : (
            <>
              <Text style={[styles.btnLabel, { color: paperColor }]}>{displayNextLabel}</Text>
              <ChevronRight size={22} color={paperColor} strokeWidth={2.5} />
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
    paddingHorizontal: AtelierSpacing.md,
    paddingVertical: AtelierSpacing.lg,
    borderTopWidth: 1,
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.xs,
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.lg,
    borderRadius: AtelierRadius.md,
    borderWidth: 1.5,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.xs,
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.lg,
    borderRadius: AtelierRadius.md,
  },
  nextButtonDisabled: { opacity: 0.5 },
  btnLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  spacer: { flex: 1 },
});
