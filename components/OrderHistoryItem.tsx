import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, Trash2, Banknote, Wallet } from 'lucide-react-native';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';
import { getOrderStatusDisplayConfig } from '@/lib/api';
import { DeadlineProgressBar } from './DeadlineProgressBar';

interface Order {
  id: string;
  orderNumber: string;
  clientName: string;
  total: number;
  advance: number;
  status: string;
  orderDate: string;
  rawOrderDate?: string;
  deliveryDate?: string | null;
}

interface OrderHistoryItemProps {
  order: Order;
  onPress?: () => void;
  onDelete?: () => void;
}

export const OrderHistoryItem = memo(function OrderHistoryItem({ order, onPress, onDelete }: OrderHistoryItemProps) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { preferredCurrency } = useSettings();
  const statusConfig = getOrderStatusDisplayConfig(order.status, colors);
  const total = Number(order.total) || 0;
  const advance = Number(order.advance) || 0;
  const remaining = useMemo(() => Math.max(0, total - advance), [total, advance]);
  const hasRemaining = remaining > 0;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderBottomColor: colors.ruleSoft ?? colors.rule ?? colors.border },
        AtelierShadow.card,
      ]}
    >
      <TouchableOpacity style={styles.touchable} onPress={onPress} onLongPress={onDelete} activeOpacity={0.7}>
        <View style={styles.identitySection}>
          <View style={styles.identityHeader}>
            <Text style={[styles.clientName, { color: colors.textPrimary }]} numberOfLines={1}>
              {order.clientName}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <Text style={[styles.statusBadgeText, { color: statusConfig.textColor }]}>
                {t(statusConfig.translationKey)}
              </Text>
            </View>
          </View>

          <View style={styles.identityMeta}>
            <Text style={[styles.orderNumber, { color: colors.ink4 ?? colors.textTertiary }]}>
              #{order.orderNumber ?? order.id.slice(0, 8)}
            </Text>
            <Text style={[styles.dot, { color: colors.ink4 ?? colors.textTertiary }]}>·</Text>
            <View style={styles.dateRow}>
              <Calendar size={12} color={colors.ink3} />
              <Text style={[styles.dateText, { color: colors.ink3 }]}>{order.orderDate}</Text>
            </View>
          </View>
        </View>

        <View style={styles.deadlineAndFinancialRow}>
          <View style={styles.financialSection}>
            <View style={styles.financialRow}>
              <View style={styles.financialIconLabel}>
                <Banknote size={12} color={colors.ink3} />
                <Text style={[styles.financialLabel, { color: colors.ink3 }]}>{t('orderHistoryItem.totalLabel')}</Text>
              </View>
              <Text style={[styles.financialValue, { color: colors.textPrimary }]}>
                {order.total} {preferredCurrency}
              </Text>
            </View>
            {hasRemaining ? (
              <View style={styles.financialRow}>
                <View style={styles.financialIconLabel}>
                  <Wallet size={12} color={colors.brassDeep ?? colors.brass} />
                  <Text style={[styles.financialLabel, { color: colors.brassDeep ?? colors.brass }]}>
                    {t('orderHistoryItem.leftToPayLabel')}
                  </Text>
                </View>
                <Text style={[styles.financialValue, { color: colors.brassDeep ?? colors.brass }]}>
                  {remaining} {preferredCurrency}
                </Text>
              </View>
            ) : (
              <View style={styles.paidBadge}>
                <Text style={[styles.paidBadgeText, { color: colors.pine ?? colors.success }]}>
                  {t('orderHistoryItem.fullyPaid')}
                </Text>
              </View>
            )}
          </View>
        </View>

        <DeadlineProgressBar
          orderDate={order.rawOrderDate ?? order.orderDate}
          deliveryDate={order.deliveryDate}
          orderStatus={order.status}
          compact
          style={styles.deadlineBar}
        />
      </TouchableOpacity>
      {onDelete ? (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={18} color={colors.ember ?? colors.error} strokeWidth={2.5} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: AtelierRadius.md,
    marginBottom: AtelierSpacing.sm,
    borderBottomWidth: 1,
    overflow: 'hidden',
    alignItems: 'stretch',
  },
  touchable: {
    flex: 1,
    padding: AtelierSpacing.md,
  },
  deleteBtn: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  identitySection: {
    marginBottom: AtelierSpacing.md,
  },
  identityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
  },
  clientName: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: AtelierSpacing.sm,
    paddingVertical: 2,
    borderRadius: AtelierRadius.xs,
  },
  statusBadgeText: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 10,
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  identityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.xs,
    marginTop: 2,
  },
  orderNumber: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  dot: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.xs,
  },
  dateText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  deadlineBar: {
    marginTop: AtelierSpacing.md,
    marginBottom: 0,
  },
  deadlineAndFinancialRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AtelierSpacing.md,
  },
  financialSection: {
    flex: 1,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AtelierSpacing.xs,
  },
  financialIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.xs,
  },
  financialLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  financialValue: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
  },
  paidBadge: {
    alignSelf: 'flex-start',
    marginTop: AtelierSpacing.xs,
  },
  paidBadgeText: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 10,
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
