import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { X, ChevronUp, ChevronDown } from 'lucide-react-native';
import {
  modalEntering,
  modalEnteringReducedMotion,
  modalExiting,
} from '@/constants/modalAnimation';
import type {
  MeasurementDefinitionRecord,
  MeasurementInputTypeApi,
  CreateMeasurementDefinitionPayload,
  UpdateMeasurementDefinitionPayload,
} from '@/types/templates';
import { useI18n } from '@/lib/i18n';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, Typography, BorderRadius } from '@/constants/design';

const INPUT_TYPES: { value: MeasurementInputTypeApi; label: string }[] = [
  { value: 'number', label: 'Number' },
  { value: 'text', label: 'Text' },
  { value: 'select', label: 'Select' },
  { value: 'calculated', label: 'Calculated' },
];

export interface MeasurementDefinitionEditorModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initial?: MeasurementDefinitionRecord | null;
  existingDefinitions: MeasurementDefinitionRecord[];
  /** When adding a new definition, use this as default displayOrder (e.g. max(existing) + 1). User can still edit. */
  suggestedDisplayOrder?: number;
  onSubmit: (payload: CreateMeasurementDefinitionPayload | UpdateMeasurementDefinitionPayload) => Promise<void>;
}

function parseOptionsString(raw: string): string[] {
  const lines = raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(lines)];
}

function formatOptionsForInput(options: string[] | null | undefined): string {
  if (!options || options.length === 0) return '';
  return options.join('\n');
}

/** Derive API key from label: lowercase, letters/digits/underscores, must start with letter. */
function labelToKey(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return 'm';
  let slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!slug) return 'm';
  if (!/^[a-z]/.test(slug)) slug = 'm_' + slug;
  return slug;
}

function uniqueKey(baseKey: string, existingKeys: Set<string>): string {
  if (!existingKeys.has(baseKey)) return baseKey;
  let n = 1;
  while (existingKeys.has(`${baseKey}_${n}`)) n++;
  return `${baseKey}_${n}`;
}

export function MeasurementDefinitionEditorModal({
  visible,
  onClose,
  mode,
  initial,
  existingDefinitions,
  suggestedDisplayOrder,
  onSubmit,
}: MeasurementDefinitionEditorModalProps) {
  const { t } = useI18n();
  const { preferredUnit } = useSettings();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [label, setLabel] = useState('');
  const [order, setOrder] = useState('');
  const [inputType, setInputType] = useState<MeasurementInputTypeApi>('number');
  const [optionsRaw, setOptionsRaw] = useState('');
  const [formula, setFormula] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const existingKeys = React.useMemo(() => {
    const keys = new Set<string>();
    for (const d of existingDefinitions) {
      if (d.key) keys.add(d.key);
    }
    return keys;
  }, [existingDefinitions]);

  // When opening Add modal: prefill displayOrder with next available (max+1 or 1). User can still edit.
  useEffect(() => {
    if (!visible) return;
    setKeyError(null);
    if (mode === 'edit' && initial) {
      setLabel(initial.label ?? '');
      setOrder(String((initial as { order?: number }).order ?? initial.displayOrder ?? 0));
      setInputType((initial.inputType as MeasurementInputTypeApi) ?? 'number');
      setOptionsRaw(formatOptionsForInput(initial.options ?? []));
      setFormula(initial.formula ?? '');
    } else {
      setLabel('');
      const defaultOrder =
        suggestedDisplayOrder != null && suggestedDisplayOrder > 0 ? suggestedDisplayOrder : 1;
      setOrder(String(defaultOrder));
      setInputType('number');
      setOptionsRaw('');
      setFormula('');
    }
  }, [visible, mode, initial, suggestedDisplayOrder]);

  const derivedKey = React.useMemo(() => {
    const base = labelToKey(label);
    return uniqueKey(base, existingKeys);
  }, [label, existingKeys]);

  const handleSubmit = async () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      Alert.alert(t('common.error'), t('modals.measurement.enterLabel'));
      return;
    }
    // When adding, fall back to suggestedDisplayOrder if order is blank/invalid so we always persist a valid order.
    const rawOrderNum = order.trim() === '' ? NaN : parseInt(order, 10);
    const orderNum =
      mode === 'add' && (Number.isNaN(rawOrderNum) || rawOrderNum < 1)
        ? (suggestedDisplayOrder ?? 1)
        : rawOrderNum;
    if (Number.isNaN(orderNum) || orderNum < 0) {
      Alert.alert(t('common.error'), t('modals.measurement.orderMustBeNonNegative'));
      return;
    }
    if (inputType === 'calculated' && !formula.trim()) {
      Alert.alert(t('common.error'), t('modals.measurement.calculatedRequiresFormula'));
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateMeasurementDefinitionPayload | UpdateMeasurementDefinitionPayload = {
        key: derivedKey,
        label: trimmedLabel,
        order: orderNum,
        inputType,
      };
      if (inputType === 'select' && optionsRaw.trim()) {
        payload.options = parseOptionsString(optionsRaw);
      }
      if (inputType === 'calculated' && formula.trim()) {
        payload.formula = formula.trim();
      }
      payload.unitKey = preferredUnit;
      await onSubmit(payload);
      onClose();
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('modals.measurement.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, styles.centered, { backgroundColor: colors.overlay }]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
        <Animated.View
          entering={reduceMotion ? modalEnteringReducedMotion : modalEntering}
          exiting={modalExiting}
          style={[styles.card, { backgroundColor: colors.surface }]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{mode === 'add' ? t('modals.measurement.add') : t('modals.measurement.edit')}</Text>
            <Button variant="ghost" onPress={onClose} accessibilityLabel={t('common.close')}>
              <X size={24} color={colors.textPrimary} />
            </Button>
          </View>
          <KeyboardAwareScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.field}>
              <Input
                label={t('modals.measurement.requiredLabel')}
                value={label}
                onChangeText={setLabel}
                placeholder={t('modals.measurement.labelPlaceholder')}
                autoCapitalize="none"
                autoCorrect={false}
                containerStyle={styles.inputInField}
              />
            </View>
            <View style={styles.field}>
              <Input
                label="Order"
                value={order}
                onChangeText={setOrder}
                placeholder={t('modals.measurement.orderPlaceholder')}
                keyboardType="number-pad"
                containerStyle={styles.inputInField}
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>{t('modals.measurement.typeLabel')}</Text>
              <View style={styles.typeRow}>
                {INPUT_TYPES.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.typeChip,
                      { backgroundColor: colors.borderLight },
                      inputType === opt.value && { backgroundColor: colors.primaryLight + '60', borderWidth: 1, borderColor: colors.primary }
                    ]}
                    onPress={() => setInputType(opt.value)}
                  >
                    <Text style={[styles.typeChipText, { color: colors.textSecondary }, inputType === opt.value && { ...Typography.captionBold, color: colors.primary }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {inputType === 'select' && (
              <View style={styles.field}>
                <Input
                  label="Options"
                  value={optionsRaw}
                  onChangeText={setOptionsRaw}
                  placeholder={t('modals.measurement.optionsPlaceholder')}
                  multiline
                  numberOfLines={2}
                  containerStyle={styles.inputInField}
                />
              </View>
            )}
            {inputType === 'calculated' && (
              <View style={styles.field}>
                <Input
                  label="Formula"
                  value={formula}
                  onChangeText={setFormula}
                  placeholder={t('modals.measurement.formulaPlaceholder')}
                  containerStyle={styles.inputInField}
                />
              </View>
            )}
            <Button
              variant="primary"
              fullWidth
              onPress={handleSubmit}
              disabled={submitting}
              loading={submitting}
              style={styles.saveBtn}
            >
              {mode === 'add' ? t('common.add') : t('common.save')}
            </Button>
          </KeyboardAwareScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    borderRadius: BorderRadius.lg,
    ...Typography.body,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.h3,
  },
  scroll: {
    maxHeight: 400,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  field: {
    marginBottom: Spacing.lg,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.captionBold,
    marginBottom: Spacing.xs,
  },
  inputInField: {
    marginBottom: 0,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  dependsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  typeChipActive: {
  },
  typeChipText: {
    ...Typography.caption,
  },
  typeChipTextActive: {
    ...Typography.captionBold,
  },
  hint: {
    ...Typography.caption,
  },
  helperText: {
    ...Typography.caption,
    fontSize: 12,
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
  exampleText: {
    ...Typography.caption,
    fontSize: 11,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  orderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  orderInput: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minWidth: 80,
    flex: 1,
  },
  orderButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  advancedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  advancedHeaderText: {
    ...Typography.captionBold,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  advancedContent: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  cancelText: {
    ...Typography.bodyBold,
  },
  saveBtn: {
    marginTop: Spacing.sm,
  },
});
