import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { AlertTriangle, Clock } from 'lucide-react-native';
import { useI18n } from '@/lib/i18n';
import { useTheme, ThemeColors } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';

export interface DeadlineProgressBarProps {
  orderDate: string;
  deliveryDate: string | null | undefined;
  orderStatus: string;
  compact?: boolean;
  style?: ViewStyle;
}

export interface DeadlineInfo {
  daysRemaining: number;
  progress: number;
  isOverdue: boolean;
  isUrgent: boolean;
  isWarning: boolean;
  color: string;
}

export function calculateDeadlineInfo(
  orderDate: string,
  deliveryDate: string | null | undefined,
  colors: ThemeColors
): DeadlineInfo | null {
  if (!deliveryDate) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const order = new Date(orderDate);
  order.setHours(0, 0, 0, 0);
  const delivery = new Date(deliveryDate);
  delivery.setHours(0, 0, 0, 0);

  const totalDuration = delivery.getTime() - order.getTime();
  const elapsed = now.getTime() - order.getTime();
  const daysRemaining = Math.ceil((delivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysRemaining < 0;

  let progress: number;
  if (totalDuration <= 0) {
    progress = isOverdue ? 0 : 1;
  } else {
    progress = Math.max(0, Math.min(1, 1 - elapsed / totalDuration));
  }

  const isUrgent = !isOverdue && progress <= 0.2;
  const isWarning = !isOverdue && !isUrgent && progress <= 0.5;

  let color: string;
  if (isOverdue || isUrgent) {
    color = colors.ember ?? colors.error;
  } else if (isWarning) {
    color = colors.brassDeep ?? colors.brass ?? colors.warning;
  } else {
    color = colors.pine ?? colors.success;
  }

  return { daysRemaining, progress, isOverdue, isUrgent, isWarning, color };
}

function isOrderCompleted(status: string | undefined | null): boolean {
  if (!status) return false;
  return ['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(status.toUpperCase());
}

export const DeadlineProgressBar = memo(function DeadlineProgressBar({
  orderDate,
  deliveryDate,
  orderStatus,
  compact = false,
  style,
}: DeadlineProgressBarProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { showDeadlineBar } = useSettings();

  const deadlineInfo = useMemo(
    () => calculateDeadlineInfo(orderDate, deliveryDate, colors),
    [orderDate, deliveryDate, colors]
  );

  const isCompleted = isOrderCompleted(orderStatus);
  if (!showDeadlineBar || !deadlineInfo || isCompleted) return null;

  const getStatusText = () => {
    if (deadlineInfo.isOverdue) return t('deadlineBar.overdue', { days: Math.abs(deadlineInfo.daysRemaining) });
    if (deadlineInfo.daysRemaining === 0) return t('deadlineBar.dueToday');
    if (deadlineInfo.daysRemaining === 1) return t('deadlineBar.dueTomorrow');
    return t('deadlineBar.daysRemaining', { days: deadlineInfo.daysRemaining });
  };

  const IconComponent = deadlineInfo.isOverdue || deadlineInfo.isUrgent ? AlertTriangle : Clock;

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactHeader}>
          {(deadlineInfo.isOverdue || deadlineInfo.isUrgent) && (
            <IconComponent size={14} color={deadlineInfo.color} />
          )}
          <Text style={[styles.statusText, { color: deadlineInfo.color }]}>{getStatusText()}</Text>
        </View>
        <View style={[styles.compactProgressBarContainer, { backgroundColor: colors.ruleSoft ?? colors.rule ?? colors.border }]}>
          <View
            style={[
              styles.progressBar,
              { width: `${Math.max(deadlineInfo.progress * 100, 3)}%`, backgroundColor: deadlineInfo.color },
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: deadlineInfo.color }, style]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconComponent size={18} color={deadlineInfo.color} />
          <Text style={[styles.titleText, { color: deadlineInfo.color }]}>{t('deadlineBar.title')}</Text>
        </View>
        <Text style={[styles.statusText, { color: deadlineInfo.color }]}>{getStatusText()}</Text>
      </View>
      <View style={[styles.progressBarContainer, { backgroundColor: colors.ruleSoft ?? colors.rule ?? colors.border }]}>
        <View
          style={[
            styles.progressBar,
            { width: `${Math.max(deadlineInfo.progress * 100, 3)}%`, backgroundColor: deadlineInfo.color },
          ]}
        />
      </View>
      {(deadlineInfo.isOverdue || deadlineInfo.isUrgent) && (
        <Text style={[styles.warningText, { color: deadlineInfo.color, marginTop: AtelierSpacing.xs }]}>
          {deadlineInfo.isOverdue ? t('deadlineBar.overdueWarning') : t('deadlineBar.urgentWarning')}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: AtelierSpacing.md,
    borderRadius: AtelierRadius.md,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AtelierSpacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.xs,
  },
  titleText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  statusText: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: AtelierRadius.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: AtelierRadius.full,
  },
  warningText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  compactContainer: {
    marginBottom: AtelierSpacing.md,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.xs,
    marginBottom: AtelierSpacing.xs,
  },
  compactProgressBarContainer: {
    height: 6,
    borderRadius: AtelierRadius.full,
    overflow: 'hidden',
  },
});
