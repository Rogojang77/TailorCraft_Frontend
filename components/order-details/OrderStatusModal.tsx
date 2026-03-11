import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InlineSpinner } from '@/components/InlineSpinner';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, Typography, BorderRadius } from '@/constants/design';
import { getAllOrderStatuses } from '@/lib/api';
import type { OrderDetailsData } from '@/types/orderDetails';

export interface OrderStatusModalConfig {
  bgColor: string;
  textColor: string;
  translationKey: string;
}

export interface OrderStatusModalProps {
  visible: boolean;
  onClose: () => void;
  orderData: OrderDetailsData | null;
  statusUpdating: boolean;
  getStatusDisplayConfig: (rawStatus: string) => OrderStatusModalConfig;
  onStatusSelect: (newStatus: string) => Promise<void>;
}

export function OrderStatusModal({
  visible,
  onClose,
  orderData,
  statusUpdating,
  getStatusDisplayConfig,
  onStatusSelect,
}: OrderStatusModalProps) {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => !statusUpdating && onClose()}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('orderDetails.updateStatusModal')}</Text>
          <TouchableOpacity
            onPress={() => !statusUpdating && onClose()}
            style={styles.closeButton}
            disabled={statusUpdating}
          >
            <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAwareScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
            {t('orderDetails.orderNumber', { number: orderData?.orderNumber ?? orderData?.id ?? '' })}
          </Text>

          {getAllOrderStatuses().map((statusOption) => {
            const isSelected = orderData?.rawStatus === statusOption.code;
            const statusConfig = getStatusDisplayConfig(statusOption.code);
            return (
              <TouchableOpacity
                key={statusOption.code}
                style={[
                  styles.statusOption,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isSelected && { backgroundColor: colors.successBg, borderColor: colors.success },
                ]}
                onPress={() => !statusUpdating && onStatusSelect(statusOption.code)}
                disabled={statusUpdating || isSelected}
              >
                <View style={styles.statusOptionContent}>
                  <View style={[styles.statusOptionBadge, { backgroundColor: statusConfig.bgColor }]}>
                    <Text style={[styles.statusOptionBadgeText, { color: statusConfig.textColor }]}>
                      {t(statusConfig.translationKey)}
                    </Text>
                  </View>
                  {isSelected && (
                    <Text style={[styles.statusOptionSelectedText, { color: colors.success }]}>
                      {t('orderDetails.currentStatus')}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {statusUpdating && (
            <View style={styles.statusUpdatingContainer}>
              <InlineSpinner size="small" />
              <Text style={[styles.statusUpdatingText, { color: colors.textSecondary }]}>{t('orderDetails.updating')}</Text>
            </View>
          )}
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...Typography.h3,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: '300',
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  modalSubtitle: {
    ...Typography.caption,
    marginBottom: Spacing.lg,
  },
  statusOption: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 2,
  },
  statusOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusOptionBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  statusOptionBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  statusOptionSelectedText: {
    ...Typography.small,
    fontWeight: '600',
  },
  statusUpdatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  statusUpdatingText: {
    fontSize: 14,
  },
});
