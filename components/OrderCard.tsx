import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, Package, CreditCard } from 'lucide-react-native';

interface Order {
  id: string;
  clientName: string;
  items: string[];
  total: number;
  status: string;
  pickupDate: string;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'În lucru':
        return '#F59E0B';
      case 'Finalizat':
        return '#10B981';
      case 'În așteptare':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={styles.header}>
        <Text style={styles.clientName}>{order.clientName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </View>
      
      <View style={styles.detail}>
        <Package size={16} color="#6B7280" />
        <Text style={styles.items}>{order.items.join(', ')}</Text>
      </View>
      
      <View style={styles.footer}>
        <View style={styles.detail}>
          <CreditCard size={16} color="#D4AF37" />
          <Text style={styles.total}>{order.total} RON</Text>
        </View>
        
        <View style={styles.detail}>
          <Calendar size={16} color="#6B7280" />
          <Text style={styles.pickupDate}>{order.pickupDate}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
    marginTop: 4,
  },
  total: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4AF37',
    marginLeft: 8,
  },
  pickupDate: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
});