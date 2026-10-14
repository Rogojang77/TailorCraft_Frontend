import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Phone, Clock } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';
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
  const { colors } = useTheme();

  return (
    <Button
      variant="ghost"
      style={[styles.card, { backgroundColor: colors.card }, AtelierShadow.card]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {client.name}
        </Text>
      </View>

      <View style={styles.detail}>
        <Phone size={14} color={colors.ink3} />
        <Text style={[styles.phone, { color: colors.ink3 }]} numberOfLines={1}>
          {client.phone}
        </Text>
      </View>

      <View style={styles.detail}>
        <Clock size={14} color={colors.ink3} />
        <Text style={[styles.meta, { color: colors.ink3 }]}>{client.lastOrder}</Text>
      </View>
    </Button>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.md,
    marginRight: AtelierSpacing.sm,
    alignItems: 'stretch',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: AtelierSpacing.sm,
  },
  name: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AtelierSpacing.xs,
    gap: AtelierSpacing.xs,
  },
  phone: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  meta: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
});
