import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { ChevronDown, ChevronUp, Ruler, Palette, MessageSquare } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/lib/i18n';
import { MeasurementForm } from './MeasurementForm';
import { GarmentSketchPicker, LapelType, CollarType } from './garments';
import type { MeasurementDefinition } from '@/constants/garments';
import type { MeasurementValue } from '@/types/measurement';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';
import { Input } from './ui/Input';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface GarmentDesignConfig {
  lapel?: LapelType;
  collar?: CollarType;
  lapelMaterial?: string;
  model?: string;
  lining?: string;
  personalization?: string;
  collarEmbroidery?: string;
  embroideryColor?: string;
}

export interface GarmentFormSectionProps {
  garmentId: string;
  garmentName: string;
  garmentType?: 'jacket' | 'trousers' | 'vest' | 'shirt' | 'other';
  definitions: MeasurementDefinition[];
  values: Record<string, MeasurementValue>;
  onValueChange: (key: string, value: MeasurementValue) => void;
  size?: string;
  onSizeChange?: (size: string) => void;
  designConfig?: GarmentDesignConfig;
  onDesignConfigChange?: (config: GarmentDesignConfig) => void;
  notes?: string;
  onNotesChange?: (notes: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showSelectCheckbox?: boolean;
  disabled?: boolean;
}

const LAPEL_MATERIAL_OPTIONS = ['Mătase', 'La culoare'];
const MODEL_OPTIONS = ['721', '639', '838'];
const PERSONALIZATION_OPTIONS = ['Broderie', 'Imprimare etichetă'];

export function GarmentFormSection({
  garmentId,
  garmentName,
  garmentType = 'other',
  definitions,
  values,
  onValueChange,
  size,
  onSizeChange,
  designConfig,
  onDesignConfigChange,
  notes,
  onNotesChange,
  isExpanded: isExpandedProp,
  onToggleExpand,
  isSelected = true,
  onToggleSelect,
  showSelectCheckbox = false,
  disabled = false,
}: GarmentFormSectionProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [internalExpanded, setInternalExpanded] = useState(true);

  const isExpanded = isExpandedProp ?? internalExpanded;

  const handleToggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  const hasMeasurements = definitions.length > 0;
  const hasDesignOptions = garmentType === 'jacket' || garmentType === 'shirt';

  const updateDesignConfig = (updates: Partial<GarmentDesignConfig>) => {
    if (onDesignConfigChange && designConfig) {
      onDesignConfigChange({ ...designConfig, ...updates });
    } else if (onDesignConfigChange) {
      onDesignConfigChange(updates);
    }
  };

  const renderDesignOptions = () => {
    if (garmentType === 'jacket') {
      return (
        <View style={styles.designSection}>
          <View style={styles.sectionHeaderRow}>
            <Palette size={16} color={colors.brass ?? colors.primary} />
            <Text style={[styles.sectionLabel, { color: colors.ink3 }]}>
              {t('garmentForm.designOptions')}
            </Text>
          </View>

          <GarmentSketchPicker
            variant="lapel"
            value={designConfig?.lapel ?? null}
            onChange={(value) => updateDesignConfig({ lapel: value })}
            label={t('garmentForm.lapelType')}
            size="md"
          />

          <View style={styles.optionGroup}>
            <Text style={[styles.optionLabel, { color: colors.ink3 }]}>
              {t('garmentForm.lapelMaterial')}
            </Text>
            <View style={styles.optionButtonsRow}>
              {LAPEL_MATERIAL_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionButton,
                    { backgroundColor: colors.ruleSoft ?? colors.rule ?? colors.border, borderColor: colors.rule ?? colors.border },
                    designConfig?.lapelMaterial === opt && {
                      backgroundColor: colors.brass ?? colors.primary,
                      borderColor: colors.brass ?? colors.primary,
                    },
                  ]}
                  onPress={() => updateDesignConfig({ lapelMaterial: opt })}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      { color: colors.ink3 },
                      designConfig?.lapelMaterial === opt && { color: colors.paper ?? '#EFE9DC' },
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.optionGroup}>
            <Text style={[styles.optionLabel, { color: colors.ink3 }]}>
              {t('garmentForm.model')}
            </Text>
            <View style={styles.optionButtonsRow}>
              {MODEL_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionButton,
                    { backgroundColor: colors.ruleSoft ?? colors.rule ?? colors.border, borderColor: colors.rule ?? colors.border },
                    designConfig?.model === opt && {
                      backgroundColor: colors.brass ?? colors.primary,
                      borderColor: colors.brass ?? colors.primary,
                    },
                  ]}
                  onPress={() => updateDesignConfig({ model: opt })}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      { color: colors.ink3 },
                      designConfig?.model === opt && { color: colors.paper ?? '#EFE9DC' },
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input
            label={t('garmentForm.lining')}
            value={designConfig?.lining ?? ''}
            onChangeText={(text) => updateDesignConfig({ lining: text })}
            placeholder={t('garmentForm.liningPlaceholder')}
            optional
          />

          <View style={styles.optionGroup}>
            <Text style={[styles.optionLabel, { color: colors.ink3 }]}>
              {t('garmentForm.personalization')}
            </Text>
            <View style={styles.optionButtonsRow}>
              {PERSONALIZATION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionButton,
                    { backgroundColor: colors.ruleSoft ?? colors.rule ?? colors.border, borderColor: colors.rule ?? colors.border },
                    designConfig?.personalization === opt && {
                      backgroundColor: colors.brass ?? colors.primary,
                      borderColor: colors.brass ?? colors.primary,
                    },
                  ]}
                  onPress={() => updateDesignConfig({ personalization: opt })}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      { color: colors.ink3 },
                      designConfig?.personalization === opt && { color: colors.paper ?? '#EFE9DC' },
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input
            label={t('garmentForm.collarEmbroidery')}
            value={designConfig?.collarEmbroidery ?? ''}
            onChangeText={(text) => updateDesignConfig({ collarEmbroidery: text })}
            placeholder={t('garmentForm.collarEmbroideryPlaceholder')}
            optional
          />
        </View>
      );
    }

    if (garmentType === 'shirt') {
      return (
        <View style={styles.designSection}>
          <View style={styles.sectionHeaderRow}>
            <Palette size={16} color={colors.brass ?? colors.primary} />
            <Text style={[styles.sectionLabel, { color: colors.ink3 }]}>
              {t('garmentForm.designOptions')}
            </Text>
          </View>

          <GarmentSketchPicker
            variant="collar"
            value={designConfig?.collar ?? null}
            onChange={(value) => updateDesignConfig({ collar: value })}
            label={t('garmentForm.collarType')}
            size="md"
          />
        </View>
      );
    }

    return null;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: isSelected ? colors.brass ?? colors.primary : colors.rule ?? colors.border,
        },
        disabled && styles.containerDisabled,
      ]}
    >
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={handleToggleExpand}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <View style={styles.headerLeft}>
          {showSelectCheckbox && (
            <TouchableOpacity
              style={[
                styles.checkbox,
                { borderColor: colors.rule ?? colors.border },
                isSelected && { backgroundColor: colors.brass ?? colors.primary, borderColor: colors.brass ?? colors.primary },
              ]}
              onPress={onToggleSelect}
              activeOpacity={0.7}
            >
              {isSelected && (
                <Text style={[styles.checkmark, { color: colors.paper ?? '#EFE9DC' }]}>✓</Text>
              )}
            </TouchableOpacity>
          )}
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <View style={[styles.accentBar, { backgroundColor: colors.brass ?? colors.primary }]} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>{garmentName}</Text>
            </View>
            {size && (
              <Text style={[styles.sizeLabel, { color: colors.ink3 }]}>
                {t('garmentForm.size')}: {size}
              </Text>
            )}
          </View>
        </View>
        {isExpanded ? (
          <ChevronUp size={24} color={colors.ink3} />
        ) : (
          <ChevronDown size={24} color={colors.ink3} />
        )}
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.content}>
          {/* Size Input */}
          {onSizeChange && (
            <View style={styles.sizeInputContainer}>
              <Text style={[styles.sizeInputLabel, { color: colors.ink3 }]}>
                {t('garmentForm.size')}
              </Text>
              <TextInput
                style={[
                  styles.sizeInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.brass ?? colors.primary,
                    color: colors.brass ?? colors.primary,
                  },
                ]}
                value={size ?? ''}
                onChangeText={onSizeChange}
                placeholder="—"
                placeholderTextColor={colors.ink4 ?? colors.textTertiary}
                keyboardType="default"
                maxLength={10}
              />
            </View>
          )}

          {/* Measurements */}
          {hasMeasurements && (
            <View style={styles.measurementsSection}>
              <View style={styles.sectionHeaderRow}>
                <Ruler size={16} color={colors.brass ?? colors.primary} />
                <Text style={[styles.sectionLabel, { color: colors.ink3 }]}>
                  {t('garmentForm.measurements')}
                </Text>
              </View>
              <MeasurementForm
                definitions={definitions}
                values={values}
                onChange={onValueChange}
                twoColumns
                compact
              />
            </View>
          )}

          {/* Design Options */}
          {hasDesignOptions && renderDesignOptions()}

          {/* Production Notes */}
          {onNotesChange && (
            <View style={styles.notesSection}>
              <View style={styles.sectionHeaderRow}>
                <MessageSquare size={16} color={colors.brass ?? colors.primary} />
                <Text style={[styles.sectionLabel, { color: colors.ink3 }]}>
                  {t('garmentForm.productionNotes')}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.notesInput,
                  { backgroundColor: colors.ruleSoft ?? colors.rule ?? colors.border, color: colors.textPrimary },
                ]}
                value={notes ?? ''}
                onChangeText={onNotesChange}
                placeholder={t('garmentForm.productionNotesPlaceholder')}
                placeholderTextColor={colors.ink4 ?? colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: AtelierRadius.lg,
    borderWidth: 1.5,
    marginBottom: AtelierSpacing.md,
    overflow: 'hidden',
    ...AtelierShadow.card,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: AtelierSpacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: AtelierRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AtelierSpacing.md,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accentBar: {
    width: 3,
    height: 20,
    borderRadius: 2,
    marginRight: AtelierSpacing.sm,
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sizeLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginTop: AtelierSpacing.xs,
    marginLeft: AtelierSpacing.sm + 3,
  },
  content: {
    padding: AtelierSpacing.md,
    paddingTop: 0,
  },
  sizeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  sizeInputLabel: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    textTransformValue: 'uppercase',
    marginRight: AtelierSpacing.md,
  },
  sizeInput: {
    width: 64,
    height: 36,
    borderWidth: 1.5,
    borderRadius: AtelierRadius.sm,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
  measurementsSection: {
    marginBottom: AtelierSpacing.lg,
  },
  designSection: {
    marginBottom: AtelierSpacing.lg,
    paddingTop: AtelierSpacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  notesSection: {
    paddingTop: AtelierSpacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.md,
  },
  sectionLabel: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  optionGroup: {
    marginBottom: AtelierSpacing.md,
  },
  optionLabel: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: AtelierSpacing.sm,
  },
  optionButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AtelierSpacing.sm,
  },
  optionButton: {
    paddingHorizontal: AtelierSpacing.md,
    paddingVertical: AtelierSpacing.sm,
    borderRadius: AtelierRadius.sm,
    borderWidth: 1,
  },
  optionButtonText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesInput: {
    minHeight: 80,
    borderRadius: AtelierRadius.sm,
    padding: AtelierSpacing.md,
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
