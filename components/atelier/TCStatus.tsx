/**
 * TCStatus — compact status pill for order lifecycle states.
 * Uses mono label type + color-coded background pill.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AtelierStatusKey, getStatusStyle, AtelierType } from '@/constants/atelierDesign';

const STATUS_LABELS: Record<AtelierStatusKey, string> = {
  pending: 'Pending',
  progress: 'In Progress',
  fitting: 'Fitting',
  completed: 'Completed',
  delivered: 'Delivered',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

interface TCStatusProps {
  status: AtelierStatusKey;
  label?: string;
}

export function TCStatus({ status, label }: TCStatusProps) {
  const s = getStatusStyle(status);
  return (
    <View style={s.pill}>
      <Text style={[s.label, styles.text]}>
        {label ?? STATUS_LABELS[status] ?? status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    ...AtelierType.monoLabel,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
