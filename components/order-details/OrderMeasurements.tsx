import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LapelIcon, CollarIcon, LapelType, CollarType } from '@/components/garments';
import { ErrorText } from '@/components/ui/ErrorText';
import { getSnapshotEntriesInDefinitionOrder, getSnapshotDisplayLabel } from '@/utils';
import { resolveMeasurementDisplay } from '@/lib/measurement';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';
import type { OrderDetailsData } from '@/types/orderDetails';
import type { GarmentTypeRecord } from '@/types/templates';
import type { MeasurementDefinition } from '@/constants/garments';
import type { GarmentCatalogItem } from '@/types/catalog';

export interface OrderMeasurementsProps {
  orderData: OrderDetailsData;
  garmentTypes: GarmentTypeRecord[];
  orderGarmentIdsSorted: string[];
  enabledGarmentIdsForEdit: Set<string>;
  displayDefinitionsByGarment: Record<string, MeasurementDefinition[]>;
  displayDefinitionErrors: Record<string, boolean>;
  resolvedCatalogItems: Record<string, GarmentCatalogItem>;
  openEditMeasurementItemModal: (garmentId: string, measurementKey: string) => void;
  openEditCatalogItemModal: (garmentId: string, categoryCode: string) => void;
  preferredUnit: string;
  getGarmentDisplayName: (garment: GarmentTypeRecord, fallback: string) => string;
  garmentUnavailableLabel: string;
}

export function OrderMeasurements({
  orderData,
  garmentTypes,
  orderGarmentIdsSorted,
  enabledGarmentIdsForEdit,
  displayDefinitionsByGarment,
  displayDefinitionErrors,
  resolvedCatalogItems,
  openEditMeasurementItemModal,
  openEditCatalogItemModal,
  preferredUnit,
  getGarmentDisplayName,
  garmentUnavailableLabel,
}: OrderMeasurementsProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [maxMeasuredCardHeight, setMaxMeasuredCardHeight] = useState(0);
  const [measurementsGridWidth, setMeasurementsGridWidth] = useState(0);

  const measurementItemWidth = useMemo(() => {
    const availableWidth = measurementsGridWidth > 0 ? measurementsGridWidth : screenWidth - AtelierSpacing.md * 2;
    const columns = screenWidth > screenHeight ? 3 : 2;
    const totalGapWidth = AtelierSpacing.md * Math.max(0, columns - 1);
    return (availableWidth - totalGapWidth) / columns;
  }, [measurementsGridWidth, screenHeight, screenWidth]);

  const measurementsMap = orderData.measurements ?? {};
  const garmentNameById = new Map<string, string>();
  const garmentById = new Set<string>();
  const garmentTypeById = new Map<string, string>();
  for (const g of garmentTypes) {
    garmentNameById.set(g.id, getGarmentDisplayName(g, garmentUnavailableLabel));
    garmentById.add(g.id);
    const name = (g.name ?? '').toLowerCase();
    if (name.includes('sacou') || name.includes('jacket')) {
      garmentTypeById.set(g.id, 'jacket');
    } else if (name.includes('cămașă') || name.includes('shirt')) {
      garmentTypeById.set(g.id, 'shirt');
    }
  }

  const garmentIdsWithMeasurements = orderGarmentIdsSorted.filter((garmentId) => measurementsMap[garmentId]);

  return (
    <>
      {garmentIdsWithMeasurements.map((garmentId) => {
        const measurements = measurementsMap[garmentId];
        const displayName = garmentNameById.get(garmentId) ?? garmentUnavailableLabel;
        const canNavigate = garmentById.has(garmentId);
        const isEditable = orderData.rawStatus !== 'COMPLETED' && enabledGarmentIdsForEdit.has(garmentId);
        const defsLoadFailed = displayDefinitionErrors[garmentId];
        const defs = displayDefinitionsByGarment[garmentId] ?? [];
        const entries = getSnapshotEntriesInDefinitionOrder(measurements, defs);
        if (entries.length === 0) return null;

        const garmentType = garmentTypeById.get(garmentId);
        const isJacket = garmentType === 'jacket';
        const isShirt = garmentType === 'shirt';
        const selections = orderData.catalogSelections?.[garmentId] ?? {};
        const lapelItemId = selections['lapels'] != null ? (Array.isArray(selections['lapels']) ? selections['lapels'][0] : selections['lapels']) : null;
        const collarItemId = selections['collars'] != null ? (Array.isArray(selections['collars']) ? selections['collars'][0] : selections['collars']) : null;
        const lapelItem = lapelItemId ? resolvedCatalogItems[String(lapelItemId)] : null;
        const collarItem = collarItemId ? resolvedCatalogItems[String(collarItemId)] : null;
        const showLapelIcon = isJacket && !!(lapelItem?.imageUrl);
        const showCollarIcon = isShirt && !!(collarItem?.imageUrl);
        const hasVisualConfig = showLapelIcon || showCollarIcon;

        return (
          <View key={garmentId} style={styles.garmentSection}>
            <View style={styles.garmentSectionHeader}>
              <View style={styles.garmentSectionHeaderContent}>
                {canNavigate ? (
                  <TouchableOpacity onPress={() => router.push(`/garments/${garmentId}`)} activeOpacity={0.7}>
                    <Text style={[styles.garmentSectionTitle, { color: colors.brassDeep ?? colors.brass }]}>{displayName.toUpperCase()}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.garmentSectionTitle, { color: colors.textPrimary }]}>{displayName.toUpperCase()}</Text>
                )}
                <Text style={[styles.garmentSectionSubtitle, { color: colors.ink3 }]}>
                  {entries.length} {entries.length === 1 ? t('orderDetails.measurement') : t('orderDetails.measurementsCount')}
                </Text>
              </View>
            </View>

            {hasVisualConfig && (
              <View style={[styles.visualConfigRow, { backgroundColor: colors.ruleSoft ?? colors.rule }]}>
                {showLapelIcon && (
                  <TouchableOpacity
                    style={styles.visualConfigItem}
                    onPress={isEditable ? () => openEditCatalogItemModal(garmentId, 'lapels') : undefined}
                    activeOpacity={isEditable ? 0.7 : 1}
                    disabled={!isEditable}
                  >
                    <Text style={[styles.visualConfigLabel, { color: colors.ink3 }]}>{t('garmentForm.lapelType')}</Text>
                    <LapelIcon type={(measurements.lapelType as LapelType) || 'clasic'} active size="sm" />
                  </TouchableOpacity>
                )}
                {showCollarIcon && (
                  <TouchableOpacity
                    style={styles.visualConfigItem}
                    onPress={isEditable ? () => openEditCatalogItemModal(garmentId, 'collars') : undefined}
                    activeOpacity={isEditable ? 0.7 : 1}
                    disabled={!isEditable}
                  >
                    <Text style={[styles.visualConfigLabel, { color: colors.ink3 }]}>{t('garmentForm.collarType')}</Text>
                    <CollarIcon type={(measurements.collarType as CollarType) || 'clasic'} active size="sm" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {defsLoadFailed ? (
              <ErrorText style={styles.measurementsLoadError}>{t('orderDetails.definitionsLoadError')}</ErrorText>
            ) : (
              <View
                style={styles.measurementsGrid}
                onLayout={(event) => {
                  const nextWidth = event.nativeEvent.layout.width;
                  if (nextWidth > 0 && Math.abs(nextWidth - measurementsGridWidth) > 0.5) {
                    setMeasurementsGridWidth(nextWidth);
                  }
                }}
              >
                {entries.map(([key, value]) => {
                  const def = defs.find((d) => d.key === key);
                  const resolved = resolveMeasurementDisplay({
                    def: def ?? { key, label: key, displayOrder: 0, inputType: 'text' },
                    raw: value,
                    calculated: {},
                    displayUnitKey: preferredUnit,
                    t,
                  });
                  const label = def ? resolved.displayLabel : getSnapshotDisplayLabel(key, def);
                  const valueWithUnit = resolved.displayUnit
                    ? `${resolved.displayValue} ${resolved.displayUnit}`
                    : resolved.displayValue;
                  const row = (
                    <View
                      onLayout={(event) => {
                        const measuredHeight = Math.ceil(event.nativeEvent.layout.height);
                        if (measuredHeight > maxMeasuredCardHeight) {
                          setMaxMeasuredCardHeight(measuredHeight);
                        }
                      }}
                      style={[
                        styles.measurementItem,
                        {
                          backgroundColor: colors.ruleSoft ?? colors.rule,
                          width: measurementItemWidth,
                          minWidth: measurementItemWidth,
                          maxWidth: measurementItemWidth,
                          minHeight: maxMeasuredCardHeight || undefined,
                        },
                      ]}
                    >
                      <Text style={[styles.measurementLabel, { color: colors.ink3 }]}>{label}</Text>
                      <Text style={[styles.measurementValue, { color: colors.textPrimary }]}>{valueWithUnit}</Text>
                    </View>
                  );
                  return isEditable ? (
                    <TouchableOpacity
                      key={key}
                      onPress={() => openEditMeasurementItemModal(garmentId, key)}
                      activeOpacity={0.7}
                    >
                      {row}
                    </TouchableOpacity>
                  ) : (
                    <View key={key}>{row}</View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  garmentSection: {
    marginHorizontal: AtelierSpacing.md,
    marginBottom: AtelierSpacing.md,
    borderRadius: AtelierRadius.lg,
    overflow: 'hidden',
    ...AtelierShadow.elevated,
  },
  garmentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingLeft: 0,
    marginBottom: AtelierSpacing.md,
  },
  garmentSectionHeaderContent: {
    flex: 1,
  },
  garmentSectionTitle: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 1.5,
  },
  garmentSectionSubtitle: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  visualConfigRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AtelierSpacing.lg,
    padding: AtelierSpacing.md,
    marginHorizontal: AtelierSpacing.md,
    marginBottom: AtelierSpacing.md,
    borderRadius: AtelierRadius.sm,
  },
  visualConfigItem: {
    alignItems: 'center',
    gap: AtelierSpacing.xs,
  },
  visualConfigLabel: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: AtelierSpacing.xs,
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AtelierSpacing.md,
    width: '100%',
    alignSelf: 'stretch',
  },
  measurementItem: {
    borderRadius: AtelierRadius.sm,
    padding: AtelierSpacing.md,
    flexGrow: 0,
    flexShrink: 0,
  },
  measurementLabel: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 10,
    lineHeight: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: AtelierSpacing.xs,
  },
  measurementValue: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 20,
  },
  measurementsLoadError: {
    marginTop: AtelierSpacing.sm,
  },
});
