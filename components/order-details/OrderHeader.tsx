import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User, Phone, Calendar, CreditCard, Trash2 } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, Typography, Shadows, BorderRadius } from '@/constants/design';
import type { OrderDetailsData } from '@/types/orderDetails';

export interface OrderHeaderStatusConfig {
  bgColor: string;
  textColor: string;
  translationKey: string;
}

export interface OrderHeaderProps {
  orderData: OrderDetailsData;
  onDeleteRequest: () => void;
  onEditOrderInfo: () => void;
  onStatusPress: () => void;
  statusConfig: OrderHeaderStatusConfig;
}

export function OrderHeader({
  orderData,
  onDeleteRequest,
  onEditOrderInfo,
  onStatusPress,
  statusConfig,
}: OrderHeaderProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const remaining = orderData.total - orderData.advance;

  return (
    <>
      <View style={styles.topActionsRow}>
        <View style={styles.statusContainer}>
          <Text style={[styles.orderNumber, { color: colors.textPrimary }]}>
            {t('orderDetails.orderNumber', { number: orderData.orderNumber ?? orderData.id })}
          </Text>
        </View>
        <View style={styles.actionButtons}>
          <Button variant="dangerIcon" onPress={onDeleteRequest} accessibilityLabel={t('common.delete')}>
            <Trash2 size={18} color={colors.error} strokeWidth={2.5} />
          </Button>
        </View>
      </View>

      <View style={[styles.section]}>
        <View style={styles.sectionHeader}>
          <User size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('orderDetails.clientInfo')}</Text>
        </View>
        <View style={styles.clientCard}>
          <View style={styles.clientRow}>
            <View style={styles.clientInfo}>
              <Text style={[styles.clientName, { color: colors.textPrimary }]}>{orderData.clientName}</Text>
              <View style={styles.contactRow}>
                <Phone size={16} color={colors.textSecondary} />
                <Text style={[styles.contactText, { color: colors.textSecondary }]}>{orderData.clientPhone}</Text>
              </View>
              {orderData.clientEmail ? (
                <View style={styles.contactRow}>
                  <Text style={[styles.contactText, { color: colors.textSecondary }]}>{orderData.clientEmail}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Calendar size={16} color={colors.textSecondary} />
              <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
                {t('orderDetails.orderDateLabel', { date: orderData.orderDate })}
              </Text>
            </View>
            <TouchableOpacity onPress={onStatusPress} activeOpacity={0.7} style={styles.statusBadgeTouchable}>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                <Text style={[styles.statusText, { color: statusConfig.textColor }]}>
                  {t(statusConfig.translationKey)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          {orderData.lastUpdated ? (
            <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>
              {t('common.lastUpdated')}: {orderData.lastUpdated}
            </Text>
          ) : null}
        </View>
      </View>

      <TouchableOpacity style={[styles.section]} onPress={onEditOrderInfo} activeOpacity={0.9}>
        <View style={styles.sectionHeader}>
          <CreditCard size={20} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('orderDetails.paymentInfo')}</Text>
        </View>
        <View style={styles.paymentGrid}>
          <View style={[styles.paymentItem, { backgroundColor: colors.successBg }]}>
            <Text style={[styles.paymentLabel, { color: colors.successText }]}>{t('orderDetails.totalOrder')}</Text>
            <Text style={[styles.paymentValue, { color: colors.successText }]}>{orderData.total} RON</Text>
          </View>
          <View style={[styles.paymentItem, { backgroundColor: colors.successBg }]}>
            <Text style={[styles.paymentLabel, { color: colors.successText }]}>{t('orderDetails.advancePaid')}</Text>
            <Text style={[styles.paymentValue, { color: colors.successText }]}>{orderData.advance} RON</Text>
          </View>
          <View style={[styles.paymentItem, { backgroundColor: colors.successBg }]}>
            <Text style={[styles.paymentLabel, { color: colors.successText }]}>{t('orderDetails.toPay')}</Text>
            <Text style={[styles.paymentValue, { color: colors.error }]}>{remaining} RON</Text>
          </View>
        </View>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusContainer: {
    flex: 1,
  },
  orderNumber: {
    ...Typography.bodyBold,
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadgeTouchable: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    flexWrap: 'wrap',
  },
  section: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.bodyBold,
    fontSize: 18,
    fontWeight: '700',
  },
  clientCard: {
    borderRadius: BorderRadius.sm,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    ...Typography.bodyBold,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    ...Typography.caption,
    marginLeft: Spacing.xs + 2,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    ...Typography.small,
    marginLeft: Spacing.xs + 2,
  },
  lastUpdated: {
    fontSize: 11,
    marginTop: Spacing.xs + 2,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  paymentItem: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    minWidth: '45%',
    flex: 1,
    alignItems: 'center',
  },
  paymentLabel: {
    ...Typography.small,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  paymentValue: {
    ...Typography.bodyBold,
    fontWeight: '700',
    textAlign: 'center',
  },
});
