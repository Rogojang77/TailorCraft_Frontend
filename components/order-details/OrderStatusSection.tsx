import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, FileEdit } from 'lucide-react-native';
import { DeadlineProgressBar } from '@/components/DeadlineProgressBar';
import { InlineSpinner } from '@/components/InlineSpinner';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, Typography, Shadows, BorderRadius } from '@/constants/design';
import type { OrderDetailsData } from '@/types/orderDetails';

export interface OrderStatusSectionProps {
  orderData: OrderDetailsData;
  deliveryDateUpdating: boolean;
  onDeliveryDatePress: () => void;
  showDeliveryDatePicker: boolean;
  deliveryDateForPicker: Date;
  minDeliveryDate: Date;
  formatDeliveryDateDisplay: (date: Date) => string;
  onDeliveryDateChange: (event: { type: string }, selectedDate?: Date) => void;
  onCloseDeliveryDatePicker: () => void;
  isDark?: boolean;
}

export function OrderStatusSection({
  orderData,
  deliveryDateUpdating,
  onDeliveryDatePress,
  showDeliveryDatePicker,
  deliveryDateForPicker,
  minDeliveryDate,
  formatDeliveryDateDisplay,
  onDeliveryDateChange,
  onCloseDeliveryDatePicker,
  isDark = false,
}: OrderStatusSectionProps) {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <View style={[styles.deadlineSection, { backgroundColor: colors.surface }]}>
      <TouchableOpacity
        style={styles.deliveryDateRow}
        onPress={deliveryDateUpdating ? undefined : onDeliveryDatePress}
        activeOpacity={0.7}
        disabled={deliveryDateUpdating}
      >
        <Calendar size={18} color={colors.textSecondary} />
        <View style={styles.deliveryDateRowText}>
          <Text style={[styles.deliveryDateLabel, { color: colors.textSecondary }]}>
            {t('orderDetails.deliveryDateLabel')}
          </Text>
          {orderData.deliveryDate ? (
            <Text style={[styles.deliveryDateValue, { color: colors.textPrimary }]}>
              {formatDeliveryDateDisplay(new Date(orderData.deliveryDate))}
            </Text>
          ) : (
            <Text style={[styles.deliveryDateValue, { color: colors.primary }]}>
              {t('orderDetails.setDeliveryDate')}
            </Text>
          )}
        </View>
        {deliveryDateUpdating ? (
          <InlineSpinner size="small" />
        ) : (
          <FileEdit size={18} color={colors.textTertiary} />
        )}
      </TouchableOpacity>
      {orderData.deliveryDate ? (
        <View style={styles.deadlineProgressWrapper}>
          <DeadlineProgressBar
            orderDate={orderData.rawOrderDate}
            deliveryDate={orderData.deliveryDate}
            orderStatus={orderData.rawStatus}
            compact
          />
        </View>
      ) : null}
      {Platform.OS === 'ios' && showDeliveryDatePicker && (
        <View style={styles.deliveryDatePickerInline}>
          <View style={styles.deliveryDatePickerDoneRow}>
            <TouchableOpacity onPress={onCloseDeliveryDatePicker} activeOpacity={0.7}>
              <Text style={[styles.deliveryDatePickerDoneText, { color: colors.primary }]}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={deliveryDateForPicker}
            mode="date"
            display="spinner"
            onChange={onDeliveryDateChange}
            minimumDate={minDeliveryDate}
            textColor={colors.textPrimary}
            themeVariant={isDark ? 'dark' : 'light'}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  deadlineSection: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  deliveryDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  deliveryDateRowText: {
    flex: 1,
  },
  deliveryDateLabel: {
    ...Typography.caption,
  },
  deliveryDateValue: {
    ...Typography.body,
    fontWeight: '600',
    marginTop: 2,
  },
  deliveryDatePickerInline: {
    marginTop: Spacing.sm,
  },
  deliveryDatePickerDoneRow: {
    alignItems: 'flex-end',
    marginBottom: Spacing.xs,
  },
  deliveryDatePickerDoneText: {
    ...Typography.bodyBold,
  },
  deadlineProgressWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
});
