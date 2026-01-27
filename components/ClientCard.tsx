import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Phone, Clock } from 'lucide-react-native';

interface Client {
  id: string;
  name: string;
  phone: string;
  lastOrder: string;
}

interface ClientCardProps {
  client: Client;
  onPress?: () => void;
}

export function ClientCard({ client, onPress }: ClientCardProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{client.name}</Text>
      </View>
      
      <View style={styles.detail}>
        <Phone size={14} color="#6B7280" />
        <Text style={styles.phone} numberOfLines={1}>{client.phone}</Text>
      </View>
      
      <View style={styles.detail}>
        <Clock size={14} color="#6B7280" />
        <Text style={styles.lastOrder}>{client.lastOrder}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 200,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  phone: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
    flex: 1,
  },
  lastOrder: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
  },
});