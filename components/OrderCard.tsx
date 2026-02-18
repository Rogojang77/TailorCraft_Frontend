import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, Package, CreditCard } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows, CardStyles } from '@/constants/design';

interface Order {
  id: string;
  clientName: string;
  items: string[];
  total: number;
  status: string; // Raw status code (PENDING, IN_PROGRESS, etc.)
  orderDate: string;
}

interface OrderCardProps {
  order: Order;
  onPress?: () => void;
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  // Show only item count; items array holds garment IDs, not user-friendly names
  const itemsDisplay =
    order.items.length > 0
      ? `${order.items.length} ${order.items.length === 1 ? 'item' : 'items'}`
      : 'No items';

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={styles.header}>
        <Text style={styles.clientName}>{order.clientName}</Text>
      </View>
      
      <View style={styles.itemsRow}>
        <Package size={14} color={Colors.textSecondary} />
        <Text style={styles.items}>{itemsDisplay}</Text>
      </View>
      
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <CreditCard size={14} color={Colors.primary} />
          <Text style={styles.total}>{order.total} RON</Text>
        </View>
        <View style={styles.footerItem}>
          <Calendar size={14} color={Colors.textSecondary} />
          <Text style={styles.orderDate}>{order.orderDate}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    ...CardStyles.card, // Border radius 14px, padding 16px, subtle shadow
    marginHorizontal: Spacing.md, // 16px screen horizontal padding
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
  },
  clientName: {
    ...Typography.bodyBold,
    flex: 1,
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  items: {
    ...Typography.caption,
    marginLeft: Spacing.xs,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  total: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
  orderDate: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});