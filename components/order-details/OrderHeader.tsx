import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User, Phone, Calendar, CreditCard, Trash2 } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';
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
  onMarkFullyPaid?: () => void;
  markFullyPaidLoading?: boolean;
  markFullyPaidDisabled?: boolean;
  statusConfig: OrderHeaderStatusConfig;
}

export function OrderHeader({
  orderData,
  onDeleteRequest,
  onEditOrderInfo,
  onStatusPress,
  onMarkFullyPaid,
  markFullyPaidLoading = false,
  markFullyPaidDisabled = false,
  statusConfig,
}: OrderHeaderProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { preferredCurrency } = useSettings();
  const remaining = orderData.total - orderData.advance;
  const isFullyPaid = orderData.advance >= orderData.total;
  const shouldShowMarkFullyPaid = !!onMarkFullyPaid && !isFullyPaid;

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
            <Trash2 size={18} color={colors.ember} strokeWidth={2.5} />
          </Button>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <User size={20} color={colors.brass} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('orderDetails.clientInfo')}</Text>
        </View>
        <View style={styles.clientCard}>
          <View style={styles.clientRow}>
            <View style={styles.clientInfo}>
              <Text style={[styles.clientName, { color: colors.textPrimary }]}>{orderData.clientName}</Text>
              <View style={styles.contactRow}>
                <Phone size={16} color={colors.ink3} />
                <Text style={[styles.contactText, { color: colors.ink3 }]}>{orderData.clientPhone}</Text>
              </View>
              {orderData.clientEmail ? (
                <View style={styles.contactRow}>
                  <Text style={[styles.contactText, { color: colors.ink3 }]}>{orderData.clientEmail}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Calendar size={16} color={colors.ink3} />
              <Text style={[styles.dateLabel, { color: colors.ink3 }]}>
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
            <Text style={[styles.lastUpdated, { color: colors.ink4 }]}>
              {t('common.lastUpdated')}: {orderData.lastUpdated}
            </Text>
          ) : null}
        </View>
      </View>

      <TouchableOpacity style={[styles.section, { backgroundColor: colors.card }]} onPress={onEditOrderInfo} activeOpacity={0.9}>
        <View style={styles.sectionHeader}>
          <CreditCard size={20} color={colors.brass} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('orderDetails.paymentInfo')}</Text>
        </View>
        {isFullyPaid ? (
          <>
            <Text style={[styles.fullyPaidText, { color: colors.pine }]}>{t('orders.filters.fullyPaid')}</Text>
            <View style={styles.paymentGrid}>
              <View style={[styles.paymentItem, { backgroundColor: colors.pine + '18' }]}>
                <Text style={[styles.paymentLabel, { color: colors.pine }]}>
                  {t('orderDetails.totalPaid')}
                </Text>
                <Text style={[styles.paymentValue, { color: colors.pine }]}>{orderData.advance} {preferredCurrency}</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.paymentGrid}>
            <View style={[styles.paymentItem, { backgroundColor: colors.paperDeep }]}>
              <Text style={[styles.paymentLabel, { color: colors.ink3 }]}>{t('orderDetails.totalOrder')}</Text>
              <Text style={[styles.paymentValue, { color: colors.textPrimary }]}>{orderData.total} {preferredCurrency}</Text>
            </View>
            <View style={[styles.paymentItem, { backgroundColor: colors.pine + '18' }]}>
              <Text style={[styles.paymentLabel, { color: colors.pine }]}>{t('orderDetails.advancePaid')}</Text>
              <Text style={[styles.paymentValue, { color: colors.pine }]}>{orderData.advance} {preferredCurrency}</Text>
            </View>
            <View style={[styles.paymentItem, { backgroundColor: colors.ember + '12' }]}>
              <Text style={[styles.paymentLabel, { color: colors.ember }]}>{t('orderDetails.toPay')}</Text>
              <Text style={[styles.paymentValue, { color: colors.ember }]}>{remaining} {preferredCurrency}</Text>
            </View>
          </View>
        )}
        {shouldShowMarkFullyPaid ? (
          <Button
            variant="primary"
            size="sm"
            onPress={onMarkFullyPaid}
            loading={markFullyPaidLoading}
            disabled={markFullyPaidDisabled}
            style={styles.fullPayButton}
            fullWidth
          >
            {t('orderDetails.markFullyPaid')}
          </Button>
        ) : null}
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.md,
    marginBottom: AtelierSpacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
  },
  statusContainer: {
    flex: 1,
  },
  orderNumber: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusBadgeTouchable: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  statusBadge: {
    paddingHorizontal: AtelierSpacing.sm,
    paddingVertical: 3,
    borderRadius: AtelierRadius.xs,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  statusText: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexWrap: 'wrap',
  },
  section: {
    marginBottom: AtelierSpacing.md,
    marginHorizontal: AtelierSpacing.md,
    borderRadius: AtelierRadius.md,
    padding: AtelierSpacing.md,
    ...AtelierShadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AtelierSpacing.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
    lineHeight: 22,
    marginLeft: AtelierSpacing.sm,
  },
  clientCard: {
    borderRadius: AtelierRadius.sm,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AtelierSpacing.md,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontFamily: FontFamily.serif,
    fontSize: 22,
    lineHeight: 28,
    marginBottom: AtelierSpacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
    marginLeft: AtelierSpacing.xs + 2,
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
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginLeft: AtelierSpacing.xs + 2,
  },
  lastUpdated: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    lineHeight: 14,
    marginTop: AtelierSpacing.xs + 2,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AtelierSpacing.md,
  },
  fullyPaidText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: AtelierSpacing.md,
  },
  paymentItem: {
    borderRadius: AtelierRadius.sm,
    padding: AtelierSpacing.md,
    minWidth: '45%',
    flex: 1,
    alignItems: 'center',
  },
  paymentLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: AtelierSpacing.xs,
    textAlign: 'center',
  },
  paymentValue: {
    fontFamily: FontFamily.sansBold,
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },
  fullPayButton: {
    marginTop: AtelierSpacing.md,
  },
});
