import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, Package, Trash2, Banknote, Wallet } from 'lucide-react-native';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { getTypography, Spacing, BorderRadius, Shadows } from '@/constants/design';
import { getOrderStatusDisplayConfig } from '@/lib/api';
import { DeadlineProgressBar } from './DeadlineProgressBar';

interface Order {
  id: string;
  orderNumber: string;
  clientName: string;
  total: number;
  advance: number;
  status: string;
  /** Display label (e.g. formatted date). */
  orderDate: string;
  /** Raw ISO date for progress bar; if missing, orderDate is used (may be wrong if orderDate is locale-formatted). */
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
  const typography = getTypography(colors);
  const statusConfig = getOrderStatusDisplayConfig(order.status, colors);
  const total = Number(order.total) || 0;
  const advance = Number(order.advance) || 0;
  const remaining = useMemo(() => Math.max(0, total - advance), [total, advance]);
  const hasRemaining = remaining > 0;
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
      <TouchableOpacity 
        style={styles.touchable} 
        onPress={onPress} 
        onLongPress={onDelete}
        activeOpacity={0.7}
      >
        <View style={styles.identitySection}>
          <View style={styles.identityHeader}>
            <Text style={[typography.bodyBold, styles.clientName]} numberOfLines={1}>{order.clientName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <Text style={[styles.statusBadgeText, { color: statusConfig.textColor }]}>
                {t(statusConfig.translationKey)}
              </Text>
            </View>
          </View>
          
          <View style={styles.identityMeta}>
            <Text style={[typography.caption, { color: colors.textTertiary, fontFamily: 'monospace' }]}>
              #{order.orderNumber ?? order.id.slice(0, 8)}
            </Text>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>·</Text>
            <View style={styles.dateRow}>
              <Calendar size={12} color={colors.textSecondary} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{order.orderDate}</Text>
            </View>
          </View>
        </View>


        <View style={styles.deadlineAndFinancialRow}>
          {/* Financial summary */}
          <View style={styles.financialSection}>
            <View style={styles.financialRow}>
              <View style={styles.financialIconLabel}>
                <Banknote size={12} color={colors.textSecondary} />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{t('orderHistoryItem.totalLabel')}</Text>
              </View>
              <Text style={[typography.captionBold, { color: colors.textPrimary }]}>{order.total} RON</Text>
            </View>
            {hasRemaining ? (
              <View style={styles.financialRow}>
                <View style={styles.financialIconLabel}>
                  <Wallet size={12} color={colors.warning} />
                  <Text style={[typography.caption, { color: colors.warning }]}>{t('orderHistoryItem.leftToPayLabel')}</Text>
                </View>
                <Text style={[typography.captionBold, { color: colors.warning }]}>{remaining} RON</Text>
              </View>
            ) : (
              <View style={styles.paidBadge}>
                <Text style={[styles.paidBadgeText, { color: colors.success }]}>{t('orderHistoryItem.fullyPaid')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Compact progress bar below — use raw ISO date so progress matches order details */}
        <DeadlineProgressBar
          orderDate={order.rawOrderDate ?? order.orderDate}
          deliveryDate={order.deliveryDate}
          orderStatus={order.status}
          compact
        />
      </TouchableOpacity>
      {onDelete ? (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={18} color={colors.error} strokeWidth={2.5} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    overflow: 'hidden',
    alignItems: 'stretch',
    ...Shadows.sm,
  },
  touchable: {
    flex: 1,
    padding: Spacing.md,
  },
  deleteBtn: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  identitySection: {
    marginBottom: Spacing.md,
  },
  identityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  clientName: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  identityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  itemsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  items: {
    flex: 1,
  },
  deadlineAndFinancialRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  financialSection: {
    flex: 1,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  financialIconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  paidBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
