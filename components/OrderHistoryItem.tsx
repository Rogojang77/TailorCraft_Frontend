import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, Package, Trash2 } from 'lucide-react-native';
import { useI18n } from '@/lib/i18n';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/design';

interface Order {
  id: string;
  orderNumber: string;
  clientName: string;
  items: string[];
  total: number;
  advance: number;
  status: string; // Raw status code (PENDING, IN_PROGRESS, etc.)
  orderDate: string;
}

interface OrderHistoryItemProps {
  order: Order;
  onPress?: () => void;
  onDelete?: () => void;
}

// Memoized component to prevent unnecessary re-renders in lists
// This reduces memory churn when scrolling through large lists
export const OrderHistoryItem = memo(function OrderHistoryItem({ order, onPress, onDelete }: OrderHistoryItemProps) {
  const { t } = useI18n();
  const remaining = useMemo(() => order.total - order.advance, [order.total, order.advance]);
  const hasRemaining = remaining > 0;
  const itemsLabel = order.items.length === 0
    ? t('orderHistoryItem.noItems')
    : order.items.length === 1
      ? `1 ${t('orderHistoryItem.item')}`
      : `${order.items.length} ${t('orderHistoryItem.items')}`;

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.touchable} 
        onPress={onPress} 
        onLongPress={onDelete}
        activeOpacity={0.7}
      >
        {/* Identity Section */}
        <View style={styles.identitySection}>
          <View style={styles.identityHeader}>
            <Text style={styles.clientName} numberOfLines={1}>{order.clientName}</Text>
          </View>
          
          <View style={styles.identityMeta}>
            <Text style={styles.orderNumber}>#{order.orderNumber ?? order.id.slice(0, 8)}</Text>
            <Text style={styles.metaSeparator}>·</Text>
            <View style={styles.dateRow}>
              <Calendar size={12} color={Colors.textSecondary} />
              <Text style={styles.orderDate}>{order.orderDate}</Text>
            </View>
          </View>
        </View>

        {/* Items Section — show count only; items array holds garment IDs, not names */}
        <View style={styles.itemsSection}>
          <Package size={14} color={Colors.textSecondary} />
          <Text style={styles.items} numberOfLines={1}>
            {itemsLabel}
          </Text>
        </View>

        {/* Financial Section - Visually Separated */}
        <View style={styles.financialSection}>
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>{t('orderHistoryItem.totalLabel')}</Text>
            <Text style={styles.totalAmount}>{order.total} RON</Text>
          </View>
          {hasRemaining && (
            <View style={styles.financialRow}>
              <Text style={styles.financialLabel}>{t('orderHistoryItem.balanceLabel')}</Text>
              <Text style={styles.remainingAmount}>{remaining} RON</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      {onDelete ? (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={18} color={Colors.error} strokeWidth={2.5} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
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
  // Identity Section
  identitySection: {
    marginBottom: Spacing.md,
  },
  identityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientName: {
    ...Typography.bodyBold,
    flex: 1,
  },
  identityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  orderNumber: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontFamily: 'monospace',
  },
  metaSeparator: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  orderDate: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  // Items Section
  itemsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  items: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
  },
  // Financial Section - Visually Separated
  financialSection: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.border,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  financialLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  totalAmount: {
    ...Typography.captionBold,
    color: Colors.textPrimary, // Neutral color
  },
  remainingAmount: {
    ...Typography.captionBold,
    color: Colors.warning, // Warning/accent color
  },
});