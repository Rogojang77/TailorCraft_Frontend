import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/lib/i18n';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';
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

// Warm atelier accent pool for avatars
const AVATAR_PALETTE = [
  '#9C7A3E', '#3C5772', '#3D5C48', '#7B5EA7',
  '#A23E2E', '#6E5326', '#508070', '#4E7090',
];

function getClientColor(clientId: string): string {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export const ClientListItem = memo(function ClientListItem({ client, onPress, onDelete }: ClientListItemProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const avatarColor = useMemo(() => getClientColor(client.id), [client.id]);

  const initials = useMemo(() => {
    return client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }, [client.name]);

  const metadata = useMemo(() => {
    const parts: string[] = [];
    if (client.phone) parts.push(client.phone);
    if (client.totalOrders > 0) {
      parts.push(t(client.totalOrders === 1 ? 'clients.orderCountOne' : 'clients.orderCountOther', { count: client.totalOrders }));
    }
    if (client.lastOrder && client.lastOrder !== '—') {
      parts.push(`${t('clientDetails.lastOrderLabel')}: ${client.lastOrder}`);
    }
    return parts.join(' · ');
  }, [client.phone, client.totalOrders, client.lastOrder, t]);

  return (
    <Button
      variant="ghost"
      style={[
        styles.container,
        { backgroundColor: colors.card, borderBottomColor: colors.ruleSoft ?? colors.rule ?? colors.border },
        AtelierShadow.card,
      ]}
      onPress={onPress}
      onLongPress={onDelete}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={[styles.initials, { color: colors.paper ?? '#EFE9DC' }]}>{initials}</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{client.name}</Text>
        <Text style={[styles.meta, { color: colors.ink3 }]} numberOfLines={1}>{metadata || '—'}</Text>
      </View>
    </Button>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: AtelierRadius.md,
    padding: AtelierSpacing.md,
    marginBottom: AtelierSpacing.sm,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: AtelierRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AtelierSpacing.md,
  },
  initials: {
    fontFamily: FontFamily.serifItalic,
    fontSize: 16,
    lineHeight: 20,
  },
  content: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  name: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: AtelierSpacing.xs,
  },
  meta: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
});
