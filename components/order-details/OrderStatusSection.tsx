import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, FileEdit } from 'lucide-react-native';
import { DeadlineProgressBar } from '@/components/DeadlineProgressBar';
import { InlineSpinner } from '@/components/InlineSpinner';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';
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
    <View style={[styles.deadlineSection, { backgroundColor: colors.card }]}>
      <TouchableOpacity
        style={styles.deliveryDateRow}
        onPress={deliveryDateUpdating ? undefined : onDeliveryDatePress}
        activeOpacity={0.7}
        disabled={deliveryDateUpdating}
      >
        <Calendar size={18} color={colors.ink3} />
        <View style={styles.deliveryDateRowText}>
          <Text style={[styles.deliveryDateLabel, { color: colors.ink3 }]}>
            {t('orderDetails.deliveryDateLabel')}
          </Text>
          {orderData.deliveryDate ? (
            <Text style={[styles.deliveryDateValue, { color: colors.textPrimary }]}>
              {formatDeliveryDateDisplay(new Date(orderData.deliveryDate))}
            </Text>
          ) : (
            <Text style={[styles.deliveryDateValue, { color: colors.brass }]}>
              {t('orderDetails.setDeliveryDate')}
            </Text>
          )}
        </View>
        {deliveryDateUpdating ? (
          <InlineSpinner size="small" />
        ) : (
          <FileEdit size={18} color={colors.ink4} />
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
              <Text style={[styles.deliveryDatePickerDoneText, { color: colors.brass }]}>{t('common.done')}</Text>
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
    marginHorizontal: AtelierSpacing.md,
    marginBottom: AtelierSpacing.md,
    borderRadius: AtelierRadius.md,
    padding: AtelierSpacing.md,
    ...AtelierShadow.card,
  },
  deliveryDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.sm,
  },
  deliveryDateRowText: {
    flex: 1,
  },
  deliveryDateLabel: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    lineHeight: 18,
  },
  deliveryDateValue: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 2,
  },
  deliveryDatePickerInline: {
    marginTop: AtelierSpacing.sm,
  },
  deliveryDatePickerDoneRow: {
    alignItems: 'flex-end',
    marginBottom: AtelierSpacing.xs,
  },
  deliveryDatePickerDoneText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
  },
  deadlineProgressWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
});
