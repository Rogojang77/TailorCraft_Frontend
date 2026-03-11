import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Input } from '@/components/ui/Input';
import type { MeasurementDefinition } from '@/constants/garments';
import { optionsFromSizeRange } from '@/constants/garments';
import { useI18n } from '@/lib/i18n';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  evaluateCalculatedFields,
  formatMeasurementValueForDisplay,
  normalizeMeasurementValue,
  resolveMeasurementDisplay,
  filterDefinitionsWithValidKey,
  safeDisplayOrder,
} from '@/lib/measurement';
import type { MeasurementValue } from '@/types/measurement';
import { Spacing, Typography, BorderRadius } from '@/constants/design';
import { NumericMeasurementInput } from './NumericMeasurementInput';

export interface MeasurementFormProps {
  definitions: MeasurementDefinition[];
  values: Record<string, MeasurementValue>;
  onChange: (key: string, value: MeasurementValue) => void;
  /** Optional: render fields in a grid (two per row) when true. */
  twoColumns?: boolean;
  /** Formal read-only mode. When true, all inputs are non-editable; calculated fields behave the same. Rendering concern only. */
  isReadOnly?: boolean;
  /** When true, use tighter vertical spacing between fields (e.g. on measurements screen). */
  compact?: boolean;
  /** Optional: convert numeric values to this unit for display. Defaults to app preferred unit from General Settings. */
  displayUnitKey?: string;
}

/**
 * Generic MeasurementForm renderer.
 * Renders inputs dynamically from MeasurementDefinitions only; no field names in code.
 * Uses displayOrder for ordering, metadata for required/optional, units and labels from config.
 */
export function MeasurementForm({
  definitions,
  values,
  onChange,
  twoColumns = true,
  isReadOnly = false,
  compact = false,
  displayUnitKey: displayUnitKeyProp,
}: MeasurementFormProps) {
  const { t } = useI18n();
  const { preferredUnit } = useSettings();
  const { colors } = useTheme();
  const displayUnitKey = displayUnitKeyProp ?? preferredUnit;
  const safeDefs = useMemo(
    () => filterDefinitionsWithValidKey(definitions ?? []),
    [definitions]
  );
  const safeValues = values ?? {};
  const sorted = [...safeDefs].sort(
    (a, b) => safeDisplayOrder(a) - safeDisplayOrder(b)
  );
  const calculated = useMemo(
    () => evaluateCalculatedFields(safeDefs, safeValues),
    [safeDefs, safeValues]
  );

  const getOptions = (def: MeasurementDefinition): string[] => {
    if (def.sizeRange) {
      return optionsFromSizeRange(def.sizeRange);
    }
    return def.options ?? [];
  };

  const renderInput = (def: MeasurementDefinition) => {
    const raw = safeValues[def.key] ?? def.defaultValue ?? '';
    const key = def.key;
    const resolved = resolveMeasurementDisplay({
      def,
      raw,
      calculated,
      displayUnitKey,
      t,
    });
    const placeholder = def.placeholder ?? (resolved.displayUnit ?? '');
    const displayStr = resolved.displayValue || placeholder || '—';
    const editable = !isReadOnly && !resolved.isCalculated;

    if (!editable) {
      return <Text style={[styles.readOnlyValue, { color: colors.textSecondary }]}>{displayStr}</Text>;
    }

    const handleChange = (v: MeasurementValue) => {
      onChange(key, normalizeMeasurementValue(v, def.inputType));
    };

    const sel = typeof raw === 'string' ? raw : formatMeasurementValueForDisplay(raw);

    switch (def.inputType) {
      case 'select': {
        const options = getOptions(def);
        if (options.length === 0) {
          return (
            <Input
              value={resolved.displayValue}
              onChangeText={(text) => handleChange(text)}
              placeholder={placeholder}
              containerStyle={styles.inputInField}
            />
          );
        }
        return (
          <View style={styles.selectContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionRow}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionButton,
                    { backgroundColor: colors.borderLight, borderColor: colors.border },
                    sel === opt && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => handleChange(opt)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, { color: colors.textSecondary }, sel === opt && { color: colors.textInverse }]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );
      }

      case 'number':
        return (
          <NumericMeasurementInput
            value={resolved.displayValue}
            onChange={(v) => handleChange(v)}
            placeholder={placeholder}
            editable={editable}
            step={0.5}
            containerStyle={styles.inputInField}
          />
        );

      case 'multiline':
        return (
          <Input
            value={resolved.displayValue}
            onChangeText={(text) => handleChange(text)}
            placeholder={placeholder}
            multiline
            numberOfLines={4}
            containerStyle={styles.inputInField}
          />
        );

      case 'text':
      default:
        return (
          <Input
            value={resolved.displayValue}
            onChangeText={(text) => handleChange(text)}
            placeholder={placeholder}
            numberOfLines={def.multiline ? 4 : 1}
            containerStyle={styles.inputInField}
          />
        );
    }
  };

  const renderLabel = (def: MeasurementDefinition) => {
    const raw = safeValues[def.key] ?? def.defaultValue ?? '';
    const resolved = resolveMeasurementDisplay({ def, raw, calculated, displayUnitKey, t });
    const parts: string[] = [resolved.displayLabel];
    if (resolved.displayUnit) {
      parts.push(` (${resolved.displayUnit})`);
    }
    if (def.required) {
      parts.push(' *');
    }
    return parts.join('');
  };

  const fieldRowStyle = compact ? styles.rowCompact : styles.row;
  const fieldHalfStyle = compact ? styles.halfInputCompact : styles.halfInput;
  const fieldWrapperStyle = compact ? styles.fieldWrapperCompact : styles.fieldWrapper;

  const renderSingleField = (def: MeasurementDefinition) => (
    <View style={fieldWrapperStyle}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>
        {renderLabel(def)}
      </Text>
      {renderInput(def)}
    </View>
  );

  const renderField = (def: MeasurementDefinition, index: number) => {
    const isFullWidth = def.inputType === 'multiline' || def.multiline;
    if (twoColumns && !isFullWidth) {
      const next = sorted[index + 1];
      const nextFullWidth = next && (next.inputType === 'multiline' || next.multiline);
      if (index % 2 === 0 && next && !nextFullWidth) {
        return (
          <View style={fieldRowStyle} key={def.key}>
            <View style={fieldHalfStyle}>{renderSingleField(def)}</View>
            <View style={fieldHalfStyle}>{renderSingleField(next)}</View>
          </View>
        );
      }
      if (index % 2 === 1) {
        return null;
      }
    }

    return <View key={def.key}>{renderSingleField(def)}</View>;
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {sorted.map((def, index) => renderField(def, index))}
    </View>
  );
}

/** Props for read-only display of measurement key-value pairs (e.g. client's latest). */
export interface MeasurementDisplayProps {
  definitions: import('@/constants/garments').MeasurementDefinition[];
  values: Record<string, string>;
  /** When true, use two-column layout like the form. */
  twoColumns?: boolean;
  /** Optional: convert numeric values to this unit for display only. Stored values unchanged. */
  displayUnitKey?: string;
  /** When true, use tighter row spacing for reference/summary context. */
  compact?: boolean;
}

/**
 * Read-only display of measurements. Used to show "Client's latest" vs editable "This order" snapshot.
 */
export function MeasurementDisplay({
  definitions,
  values,
  twoColumns = true,
  displayUnitKey: displayUnitKeyProp,
  compact = false,
}: MeasurementDisplayProps) {
  const { t } = useI18n();
  const { preferredUnit } = useSettings();
  const { colors } = useTheme();
  const displayUnitKey = displayUnitKeyProp ?? preferredUnit;
  const safeDefs = filterDefinitionsWithValidKey(definitions ?? []);
  const safeValues = values ?? {};
  const sorted = [...safeDefs].sort(
    (a, b) => safeDisplayOrder(a) - safeDisplayOrder(b)
  );

  const rowStyle = compact ? styles.displayRowCompact : styles.displayRow;
  const layoutRowStyle = compact ? styles.rowCompact : styles.row;
  const halfStyle = compact ? styles.halfInputCompact : styles.halfInput;

  const renderRow = (def: import('@/constants/garments').MeasurementDefinition) => {
    const raw = safeValues[def.key];
    if (raw === undefined || raw === '') return null;
    const resolved = resolveMeasurementDisplay({
      def,
      raw,
      calculated: {},
      displayUnitKey,
      t,
    });
    const label = resolved.displayUnit
      ? `${resolved.displayLabel} (${resolved.displayUnit})`
      : resolved.displayLabel;
    return (
      <View style={rowStyle} key={def.key}>
        <Text style={[styles.displayLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.displayValue, { color: colors.textPrimary }]}>{resolved.displayValue}</Text>
      </View>
    );
  };

  if (!twoColumns) {
    return (
      <View style={[styles.container, compact && styles.containerCompact]}>
        {sorted.map((def) => renderRow(def))}
      </View>
    );
  }
  const rows: React.ReactNode[] = [];
  for (let i = 0; i < sorted.length; i += 2) {
    const a = sorted[i];
    const b = sorted[i + 1];
    rows.push(
      <View style={layoutRowStyle} key={a.key}>
        <View style={halfStyle}>{renderRow(a)}</View>
        <View style={halfStyle}>{b ? renderRow(b) : null}</View>
      </View>
    );
  }
  return <View style={[styles.container, compact && styles.containerCompact]}>{rows}</View>;
}

const styles = StyleSheet.create({
  displayContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  displayRow: {
    marginBottom: 0,
  },
  displayRowCompact: {
    marginBottom: Spacing.xs,
  },
  displayLabel: {
    ...Typography.captionBold,
    marginBottom: Spacing.xs,
  },
  displayValue: {
    ...Typography.body,
  },
  container: {
    gap: Spacing.lg,
  },
  containerCompact: {
    gap: Spacing.formFieldGap,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  rowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  fieldWrapper: {
    marginBottom: Spacing.xs,
  },
  fieldWrapperCompact: {
    marginBottom: Spacing.xs,
  },
  inputInField: {
    marginBottom: 0,
  },
  halfInput: {
    flex: 1,
    marginBottom: Spacing.xs,
  },
  halfInputCompact: {
    flex: 1,
    marginBottom: Spacing.xs,
  },
  label: {
    ...Typography.captionBold,
    marginBottom: Spacing.sm,
  },
  selectContainer: {
    minHeight: 44,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    height: 48,
  },
  selectedOption: {
  },
  optionText: {
    ...Typography.captionBold,
  },
  selectedOptionText: {
  },
  readOnlyValue: {
    ...Typography.body,
    paddingVertical: Spacing.sm,
  },
});
