import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { getTypography, Spacing, BorderRadius, Shadows, AccentPalette } from '@/constants/design';
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

function getClientColor(clientId: string): string {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AccentPalette[Math.abs(hash) % AccentPalette.length];
}

export const ClientListItem = memo(function ClientListItem({ client, onPress, onDelete }: ClientListItemProps) {
  const { colors } = useTheme();
  const typography = getTypography(colors);
  const avatarColor = useMemo(() => getClientColor(client.id), [client.id]);
  
  const initials = useMemo(() => {
    return client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }, [client.name]);

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
      style={[styles.container, { 
        backgroundColor: colors.surface, 
        borderBottomColor: colors.borderLight 
      }]}
      onPress={onPress}
      onLongPress={onDelete}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={[typography.bodyBold, { fontSize: 14, color: colors.textInverse }]}>{initials}</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={[typography.bodyBold, styles.name]} numberOfLines={1}>{client.name}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>{metadata || '—'}</Text>
      </View>
    </Button>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 1,
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
  content: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  name: {
    marginBottom: Spacing.xs,
  },
});
