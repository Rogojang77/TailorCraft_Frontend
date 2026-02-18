import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows, AccentPalette } from '@/constants/design';
import { Button } from '@/components/ui/Button';

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

// Generate consistent color from client ID using global accent palette
function getClientColor(clientId: string): string {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AccentPalette[Math.abs(hash) % AccentPalette.length];
}

// Memoized component to prevent unnecessary re-renders in lists
// This reduces memory churn when scrolling through large lists
export const ClientListItem = memo(function ClientListItem({ client, onPress, onDelete }: ClientListItemProps) {
  const avatarColor = useMemo(() => getClientColor(client.id), [client.id]);
  
  const initials = useMemo(() => {
    return client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }, [client.name]);

  // Format metadata: "Phone · X orders · Last: Date"
  const metadata = useMemo(() => {
    const parts: string[] = [];
    if (client.phone) parts.push(client.phone);
    if (client.totalOrders > 0) {
      parts.push(`${client.totalOrders} ${client.totalOrders === 1 ? 'comandă' : 'comenzi'}`);
    }
    if (client.lastOrder && client.lastOrder !== '—') {
      parts.push(`Ultima: ${client.lastOrder}`);
    }
    return parts.join(' · ');
  }, [client.phone, client.totalOrders, client.lastOrder]);

  return (
    <Button
      variant="ghost"
      style={styles.container}
      onPress={onPress}
      onLongPress={onDelete}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{client.name}</Text>
        <Text style={styles.metadata} numberOfLines={1}>{metadata || '—'}</Text>
      </View>
    </Button>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    ...Shadows.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    ...Typography.bodyBold,
    fontSize: 14,
    color: Colors.textInverse,
  },
  content: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  name: {
    ...Typography.bodyBold,
    marginBottom: Spacing.xs,
  },
  metadata: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});