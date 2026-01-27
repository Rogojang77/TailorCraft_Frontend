import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, CreditCard, Package, ArrowUpRight, Trash2 } from 'lucide-react-native';

interface Order {
  id: string;
  clientName: string;
  items: string[];
  total: number;
  advance: number;
  status: string;
  orderDate: string;
  pickupDate: string;
}

interface OrderHistoryItemProps {
  order: Order;
  onPress?: () => void;
  onDelete?: () => void;
}

// Memoized component to prevent unnecessary re-renders in lists
// This reduces memory churn when scrolling through large lists
export const OrderHistoryItem = memo(function OrderHistoryItem({ order, onPress, onDelete }: OrderHistoryItemProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'În lucru':
        return '#F59E0B';
      case 'Finalizat':
        return '#10B981';
      case 'În așteptare':
        return '#6B7280';
      case 'Anulat':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const remaining = order.total - order.advance;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.touchable} onPress={onPress} onLongPress={onDelete}>
        <View style={styles.header}>
          <View>
            <Text style={styles.clientName}>{order.clientName}</Text>
            <Text style={styles.orderId}>Comanda #{order.id}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>{order.status}</Text>
            </View>
            <ArrowUpRight size={20} color="#D4AF37" />
          </View>
        </View>
        
        <View style={styles.detail}>
          <Package size={16} color="#6B7280" />
          <Text style={styles.items}>{order.items.join(', ')}</Text>
        </View>
        
        <View style={styles.footer}>
          <View style={styles.priceSection}>
            <View style={styles.priceRow}>
              <CreditCard size={14} color="#D4AF37" />
              <Text style={styles.total}>Total: {order.total} RON</Text>
            </View>
            <Text style={styles.remaining}>
              Restant: {remaining} RON
            </Text>
          </View>
          
          <View style={styles.dateSection}>
            <View style={styles.detail}>
              <Calendar size={14} color="#6B7280" />
              <Text style={styles.date}>Preluare: {order.pickupDate}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      {onDelete ? (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={18} color="#F43F5E" strokeWidth={2.5} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
    alignItems: 'stretch',
  },
  touchable: {
    flex: 1,
    padding: 16,
  },
  deleteBtn: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  orderId: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  items: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceSection: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  total: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4AF37',
    marginLeft: 6,
  },
  remaining: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  dateSection: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
  },
});