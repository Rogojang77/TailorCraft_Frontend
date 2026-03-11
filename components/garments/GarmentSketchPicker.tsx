import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/lib/i18n';
import { Spacing, Typography, BorderRadius } from '@/constants/design';
import { LapelIcon, LapelType, LAPEL_TYPES } from './LapelIcon';
import { CollarIcon, CollarType, COLLAR_TYPES } from './CollarIcon';

interface LapelPickerProps {
  variant: 'lapel';
  value: LapelType | null;
  onChange: (value: LapelType) => void;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

interface CollarPickerProps {
  variant: 'collar';
  value: CollarType | null;
  onChange: (value: CollarType) => void;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

type GarmentSketchPickerProps = LapelPickerProps | CollarPickerProps;

export function GarmentSketchPicker(props: GarmentSketchPickerProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { variant, value, onChange, size = 'md', label } = props;

  if (variant === 'lapel') {
    return (
      <View style={styles.container}>
        {label && (
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        )}
        <View style={styles.optionsRow}>
          {LAPEL_TYPES.map((lapel) => (
            <TouchableOpacity
              key={lapel.id}
              style={styles.option}
              onPress={() => onChange(lapel.id)}
              activeOpacity={0.7}
            >
              <LapelIcon
                type={lapel.id}
                active={value === lapel.id}
                size={size}
              />
              <Text
                style={[
                  styles.optionLabel,
                  { color: value === lapel.id ? colors.primary : colors.textSecondary },
                  value === lapel.id && styles.optionLabelActive,
                ]}
              >
                {t(lapel.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      )}
      <View style={styles.optionsRow}>
        {COLLAR_TYPES.map((collar) => (
          <TouchableOpacity
            key={collar.id}
            style={styles.option}
            onPress={() => (onChange as (value: CollarType) => void)(collar.id)}
            activeOpacity={0.7}
          >
            <CollarIcon
              type={collar.id}
              active={value === collar.id}
              size={size}
            />
            <Text
              style={[
                styles.optionLabel,
                { color: value === collar.id ? colors.primary : colors.textSecondary },
                value === collar.id && styles.optionLabelActive,
              ]}
            >
              {t(collar.labelKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.label,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  option: {
    alignItems: 'center',
  },
  optionLabel: {
    ...Typography.small,
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 10,
  },
  optionLabelActive: {
    fontWeight: '700',
  },
});
