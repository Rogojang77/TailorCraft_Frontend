import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/lib/i18n';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';
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
          <Text style={[styles.label, { color: colors.ink3 }]}>{label}</Text>
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
                  { color: value === lapel.id ? colors.brass ?? colors.primary : colors.ink3 },
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
        <Text style={[styles.label, { color: colors.ink3 }]}>{label}</Text>
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
                { color: value === collar.id ? colors.brass ?? colors.primary : colors.ink3 },
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
    marginBottom: AtelierSpacing.md,
  },
  label: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: AtelierSpacing.sm,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AtelierSpacing.md,
  },
  option: {
    alignItems: 'center',
  },
  optionLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    lineHeight: 16,
    marginTop: AtelierSpacing.xs,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  optionLabelActive: {
    fontWeight: '700',
  },
});
