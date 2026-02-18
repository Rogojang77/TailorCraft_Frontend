import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Phone, Clock } from 'lucide-react-native';
import { Colors, Typography, Spacing, CardStyles } from '@/constants/design';
import { Button } from '@/components/ui/Button';

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
  return (
    <Button variant="ghost" style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{client.name}</Text>
      </View>
      
      <View style={styles.detail}>
        <Phone size={14} color={Colors.textSecondary} />
        <Text style={styles.phone} numberOfLines={1}>{client.phone}</Text>
      </View>
      
      <View style={styles.detail}>
        <Clock size={14} color={Colors.textSecondary} />
        <Text style={styles.lastOrder}>{client.lastOrder}</Text>
      </View>
    </Button>
  );
}

const styles = StyleSheet.create({
  card: {
    ...CardStyles.card,
    marginRight: Spacing.sm,
    alignItems: 'stretch',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Spacing.sm,
  },
  name: {
    ...Typography.bodySemiBold, // 16px / SemiBold
    flex: 1,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  phone: {
    ...Typography.statLabel, // 12px
    marginLeft: Spacing.xs,
    flex: 1,
  },
  lastOrder: {
    ...Typography.statLabel, // 12px
    marginLeft: Spacing.xs,
  },
});