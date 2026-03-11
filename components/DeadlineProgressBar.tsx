import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { AlertTriangle, Clock } from 'lucide-react-native';
import { useI18n } from '@/lib/i18n';
import { useTheme, ThemeColors } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { getTypography, Spacing, BorderRadius } from '@/constants/design';

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

/**
 * Calculates progress and status based only on order date and delivery date.
 * Progress = remaining time / total time (order → delivery). No deadline/warning-day settings.
 */
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
    progress = Math.max(0, Math.min(1, 1 - (elapsed / totalDuration)));
  }

  // Urgency and warning based only on progress (remaining fraction of order→delivery window)
  const isUrgent = !isOverdue && progress <= 0.2;
  const isWarning = !isOverdue && !isUrgent && progress <= 0.5;

  let color: string;
  if (isOverdue) {
    color = colors.error;
  } else if (progress <= 0.2 || isUrgent) {
    color = colors.error;
  } else if (progress <= 0.5 || isWarning) {
    color = colors.warning;
  } else {
    color = colors.success;
  }

  return { daysRemaining, progress, isOverdue, isUrgent, isWarning, color };
}

function isOrderCompleted(status: string | undefined | null): boolean {
  if (!status) return false;
  const completedStatuses = ['COMPLETED', 'DELIVERED', 'CANCELLED'];
  return completedStatuses.includes(status.toUpperCase());
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
  const typography = getTypography(colors);

  const deadlineInfo = useMemo(
    () => calculateDeadlineInfo(orderDate, deliveryDate, colors),
    [orderDate, deliveryDate, colors]
  );

  const isCompleted = isOrderCompleted(orderStatus);
  const shouldShow = showDeadlineBar && deadlineInfo && !isCompleted;

  if (!shouldShow || !deadlineInfo) {
    return null;
  }

  const getStatusText = () => {
    if (deadlineInfo.isOverdue) {
      return t('deadlineBar.overdue', { days: Math.abs(deadlineInfo.daysRemaining) });
    }
    if (deadlineInfo.daysRemaining === 0) {
      return t('deadlineBar.dueToday');
    }
    if (deadlineInfo.daysRemaining === 1) {
      return t('deadlineBar.dueTomorrow');
    }
    return t('deadlineBar.daysRemaining', { days: deadlineInfo.daysRemaining });
  };

  const showWarningIcon = deadlineInfo.isOverdue || deadlineInfo.isUrgent;
  const IconComponent = deadlineInfo.isOverdue || deadlineInfo.isUrgent ? AlertTriangle : Clock;

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactHeader}>
          {showWarningIcon && (
            <IconComponent size={14} color={deadlineInfo.color} />
          )}
          <Text style={[typography.caption, { color: deadlineInfo.color, fontWeight: '600' }]}>
            {getStatusText()}
          </Text>
        </View>
        <View style={[styles.compactProgressBarContainer, { backgroundColor: colors.borderLight }]}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.max(deadlineInfo.progress * 100, 3)}%`,
                backgroundColor: deadlineInfo.color,
              },
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: deadlineInfo.color }, style]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconComponent size={18} color={deadlineInfo.color} />
          <Text style={[typography.bodyBold, { color: deadlineInfo.color }]}>
            {t('deadlineBar.title')}
          </Text>
        </View>
        <Text style={[typography.caption, { color: deadlineInfo.color, fontWeight: '600' }]}>
          {getStatusText()}
        </Text>
      </View>
      <View style={[styles.progressBarContainer, { backgroundColor: colors.borderLight }]}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${Math.max(deadlineInfo.progress * 100, 3)}%`,
              backgroundColor: deadlineInfo.color,
            },
          ]}
        />
      </View>
      {(deadlineInfo.isOverdue || deadlineInfo.isUrgent) && (
        <Text style={[typography.caption, { color: deadlineInfo.color, marginTop: Spacing.xs }]}>
          {deadlineInfo.isOverdue
            ? t('deadlineBar.overdueWarning')
            : t('deadlineBar.urgentWarning')}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  compactContainer: {
    marginBottom: Spacing.md,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  compactProgressBarContainer: {
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
});
