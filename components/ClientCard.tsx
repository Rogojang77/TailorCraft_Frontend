import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Phone, Clock } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { getTypography, getCardStyles, Spacing } from '@/constants/design';
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
  const cardStyles = getCardStyles(colors);
  const typography = getTypography(colors);

  return (
    <Button variant="ghost" style={[cardStyles.card, styles.card]} onPress={onPress}>
      <View style={styles.header}>
        <Text style={[typography.bodySemiBold, styles.name]} numberOfLines={1}>{client.name}</Text>
      </View>
      
      <View style={styles.detail}>
        <Phone size={14} color={colors.textSecondary} />
        <Text style={[typography.statLabel, styles.phone]} numberOfLines={1}>{client.phone}</Text>
      </View>
      
      <View style={styles.detail}>
        <Clock size={14} color={colors.textSecondary} />
        <Text style={typography.statLabel}>{client.lastOrder}</Text>
      </View>
    </Button>
  );
}

const styles = StyleSheet.create({
  card: {
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
    flex: 1,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  phone: {
    marginLeft: Spacing.xs,
    flex: 1,
  },
});
