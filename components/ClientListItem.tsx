import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Phone, Calendar, Package, Trash2 } from 'lucide-react-native';

interface Client {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  lastOrder: string;
}

interface ClientListItemProps {
  client: Client;
  onPress?: () => void;
  onDelete?: () => void;
}

// Memoized component to prevent unnecessary re-renders in lists
// This reduces memory churn when scrolling through large lists
export const ClientListItem = memo(function ClientListItem({ client, onPress, onDelete }: ClientListItemProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.touchable} onPress={onPress} onLongPress={onDelete}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {client.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.name}>{client.name}</Text>
          </View>
          
          <View style={styles.details}>
            <View style={styles.detail}>
              <Phone size={14} color="#6B7280" />
              <Text style={styles.detailText}>{client.phone}</Text>
            </View>
            
            <View style={styles.detail}>
              <Package size={14} color="#6B7280" />
              <Text style={styles.detailText}>{client.totalOrders} comenzi</Text>
            </View>
            
            <View style={styles.detail}>
              <Calendar size={14} color="#6B7280" />
              <Text style={styles.detailText}>Ultima: {client.lastOrder}</Text>
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
    alignItems: 'center',
  },
  touchable: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
  },
  deleteBtn: {
    width: 48,
    height: '100%',
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  details: {
    gap: 4,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
  },
});