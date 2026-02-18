import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useI18n } from '@/lib/i18n';
import { FileEdit } from 'lucide-react-native';
import { useOrderDraft } from '@/contexts/OrderDraftContext';
import { AppFloatingFooter, FOOTER_CONTENT_HEIGHT } from '@/components/AppFloatingFooter';
import { MeasurementForm } from '@/components/MeasurementForm';
import { api, apiFetch } from '@/lib/api';
import { normalizeGarmentTypeRecord, definitionRecordToFormDefinition } from '@/lib/api-mappers';
import type { GarmentTypeRecord } from '@/types/templates';
import type { MeasurementDefinitionRecord } from '@/types/templates';
import { getLatestClientMeasurements } from '@/lib/clientMeasurements';
import { humanizeGarmentId } from '@/utils';
import { filterDefinitionsWithValidKey } from '@/lib/measurementDefensive';
import { getDisplayUnit } from '@/hooks/useResolvedDefinition';
import { buildPersistableMeasurements } from '@/lib/persistableMeasurements';
import { storageToMeasurementValue } from '@/lib/measurementValues';
import type { MeasurementValue } from '@/types/measurement';
import { Header } from '@/components/layout/Header';
import { Loader } from '@/components/ui/Loader';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/design';

interface GarmentSection {
  garmentId: string;
  name: string;
  label: string;
  definitions: ReturnType<typeof definitionRecordToFormDefinition>[];
}

function isSnapshotEmpty(snap: Record<string, string>): boolean {
  if (Object.keys(snap).length === 0) return true;
  return Object.values(snap).every((v) => v === '' || v === undefined);
}

type ValueSource = 'draft' | 'clientLatest' | 'default';

function getValueSource(
  key: string,
  formValue: MeasurementValue | undefined,
  existingData: Record<string, string>,
  clientLatest: Record<string, string> | null
): ValueSource {
  const existingVal = existingData[key];
  if (existingVal !== undefined && existingVal !== null && String(existingVal).trim() !== '') {
    const formStr = formValue !== undefined && formValue !== null ? String(formValue).trim() : '';
    const existingStr = String(existingVal).trim();
    if (formStr === existingStr) return 'draft';
  }
  if (clientLatest) {
    const latestVal = clientLatest[key];
    if (latestVal !== undefined && latestVal !== null && String(latestVal).trim() !== '') {
      const formStr = formValue !== undefined && formValue !== null ? String(formValue).trim() : '';
      const latestStr = String(latestVal).trim();
      if (formStr === latestStr) return 'clientLatest';
    }
  }
  return 'default';
}

function getSectionSourceLabel(
  sources: ValueSource[]
): 'prefilledFromLastOrder' | 'fromDraft' | 'defaultValues' | null {
  if (sources.some((s) => s === 'clientLatest')) return 'prefilledFromLastOrder';
  if (sources.some((s) => s === 'draft')) return 'fromDraft';
  if (sources.some((s) => s === 'default')) return 'defaultValues';
  return null;
}

export default function OrderMeasurementsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { draftOrder, updateMeasurements } = useOrderDraft();
  const selectedIds = draftOrder.selectedGarmentIds;

  const [sections, setSections] = useState<GarmentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [formDataByGarment, setFormDataByGarment] = useState<Record<string, Record<string, MeasurementValue>>>({});
  const [clientLatestByGarment, setClientLatestByGarment] = useState<Record<string, Record<string, string> | null>>({});
  const [loadingClientByGarment, setLoadingClientByGarment] = useState<Record<string, boolean>>({});

  const fetchSections = useCallback(async () => {
    if (selectedIds.length === 0) {
      setSections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const results = await Promise.all(
        selectedIds.map(async (id) => {
          const [garmentRes, defsRes] = await Promise.all([
            apiFetch(api.garmentTypes(id)).then((r: unknown) =>
              normalizeGarmentTypeRecord(r as Parameters<typeof normalizeGarmentTypeRecord>[0])
            ),
            apiFetch<
              | MeasurementDefinitionRecord[]
              | { measurementDefinitions?: MeasurementDefinitionRecord[]; definitions?: MeasurementDefinitionRecord[]; measurements?: MeasurementDefinitionRecord[] }
            >(api.garmentTypeDefinitions(id)),
          ]);
          const garment = garmentRes as GarmentTypeRecord;
          const raw = Array.isArray(defsRes)
            ? defsRes
            : (defsRes.measurementDefinitions ?? defsRes.definitions ?? defsRes.measurements ?? []);
          const defs = Array.isArray(raw)
            ? raw
                .map((d: MeasurementDefinitionRecord & { order?: number }) => definitionRecordToFormDefinition(d))
                .sort((a, b) => a.displayOrder - b.displayOrder)
            : [];
          const displayLabel =
            garment.label && garment.label.trim() !== ''
              ? garment.label
              : garment.name && garment.name !== id
                ? garment.name
                : humanizeGarmentId(id);
          return {
            garmentId: id,
            name: garment.name ?? id,
            label: displayLabel,
            definitions: filterDefinitionsWithValidKey(defs),
          };
        })
      );
      setSections(results);
    } catch (e) {
      console.error('Failed to load garment sections:', e);
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [selectedIds.join(',')]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const customerId = draftOrder.customer.id;

  useEffect(() => {
    if (!customerId || selectedIds.length === 0) {
      setClientLatestByGarment({});
      setLoadingClientByGarment({});
      return;
    }
    let cancelled = false;
    selectedIds.forEach((garmentId) => {
      setLoadingClientByGarment((prev) => ({ ...prev, [garmentId]: true }));
      getLatestClientMeasurements(customerId, garmentId)
        .then((data) => {
          if (!cancelled) {
            setClientLatestByGarment((prev) => ({ ...prev, [garmentId]: data }));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setClientLatestByGarment((prev) => ({ ...prev, [garmentId]: null }));
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoadingClientByGarment((prev) => ({ ...prev, [garmentId]: false }));
          }
        });
    });
    return () => {
      cancelled = true;
    };
  }, [customerId, selectedIds.join(',')]);

  const initializeFormForGarment = useCallback(
    (garmentId: string, defs: GarmentSection['definitions'], clientLatest: Record<string, string> | null) => {
      const existingData = draftOrder.measurements[garmentId] || {};
      const base =
        isSnapshotEmpty(existingData) && clientLatest && Object.keys(clientLatest).length > 0
          ? { ...clientLatest }
          : { ...existingData };
      const merged = { ...base, ...existingData };
      const data: Record<string, MeasurementValue> = {};
      const byKey = new Map(defs.map((d) => [d.key, d]));
      for (const k of Object.keys(merged)) {
        const def = byKey.get(k);
        if (!def) continue;
        const inputType = def.inputType ?? 'text';
        if (inputType === 'calculated') continue;
        data[k] = storageToMeasurementValue(merged[k], inputType);
      }
      defs.forEach((def) => {
        if (def.inputType === 'calculated') return;
        const current = data[def.key];
        const empty = current === undefined || current === '';
        if (empty) {
          data[def.key] = storageToMeasurementValue(def.defaultValue ?? '', def.inputType);
        }
      });
      return data;
    },
    [draftOrder.measurements]
  );

  useEffect(() => {
    setFormDataByGarment((prev) => {
      const next = { ...prev };
      sections.forEach((sec) => {
        const clientLatest = clientLatestByGarment[sec.garmentId] ?? null;
        next[sec.garmentId] = initializeFormForGarment(sec.garmentId, sec.definitions, clientLatest);
      });
      return next;
    });
  }, [sections, initializeFormForGarment, clientLatestByGarment]);

  // When client latest loads and snapshot is empty, prefill only empty fields (don't overwrite edits).
  // Single setState to avoid multiple updates in a loop and ensure correct batching.
  useEffect(() => {
    setFormDataByGarment((prev) => {
      let next = prev;
      for (const sec of sections) {
        const clientLatest = clientLatestByGarment[sec.garmentId];
        const existingData = draftOrder.measurements[sec.garmentId] || {};
        if (!clientLatest || Object.keys(clientLatest).length === 0 || !isSnapshotEmpty(existingData)) continue;
        const current = prev[sec.garmentId];
        if (!current) continue;
        let changed = false;
        const merged = { ...current };
        sec.definitions.forEach((def) => {
          if (def.inputType === 'calculated') return;
          const fromLatest = clientLatest[def.key];
          const cur = merged[def.key];
          const curEmpty = cur === undefined || cur === '';
          const hasLatest = fromLatest !== undefined && fromLatest !== '';
          if (curEmpty && hasLatest) {
            merged[def.key] = storageToMeasurementValue(fromLatest, def.inputType);
            changed = true;
          }
        });
        if (changed) {
          next = { ...next, [sec.garmentId]: merged };
        }
      }
      return next;
    });
  }, [sections, clientLatestByGarment, draftOrder.measurements]);

  const updateField = (garmentId: string, key: string, value: MeasurementValue) => {
    setFormDataByGarment((prev) => ({
      ...prev,
      [garmentId]: { ...(prev[garmentId] ?? {}), [key]: value },
    }));
  };

  const persistAll = useCallback(() => {
    sections.forEach((sec) => {
      const formData = formDataByGarment[sec.garmentId];
      if (sec.definitions.length > 0 && formData) {
        updateMeasurements(sec.garmentId, buildPersistableMeasurements(sec.definitions, formData));
      } else {
        updateMeasurements(sec.garmentId, {});
      }
    });
  }, [sections, formDataByGarment, updateMeasurements]);

  const handleNext = () => {
    persistAll();
    router.push('/new-order/summary');
  };

  const handlePrev = () => {
    persistAll();
    router.push('/new-order');
  };

  // Redirect when no garments selected (e.g. after draft cleared). Must run in effect to avoid setState-during-render.
  useEffect(() => {
    if (selectedIds.length === 0) {
      router.replace('/new-order');
    }
  }, [selectedIds.length, router]);

  if (selectedIds.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <ScreenContainer noPadding>
        <Header
          title={t('newOrder.measurements.pageTitle')}
          onBack={() => router.replace('/(tabs)/orders')}
          backAccessibilityLabel={t('common.back')}
        />
        <Loader message={t('common.loading')} style={styles.loadingContainer} />
      </ScreenContainer>
    );
  }

  const footerBottomOffset = FOOTER_CONTENT_HEIGHT + insets.bottom;

  return (
    <>
      <ScreenContainer noPadding>
        <Header
          title={t('newOrder.measurements.pageTitle')}
          onBack={() => router.replace('/(tabs)/orders')}
          backAccessibilityLabel={t('common.back')}
        />

        <View style={styles.contentWrapper}>
          <KeyboardAwareScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: footerBottomOffset }]}
            keyboardShouldPersistTaps="handled"
            bottomOffset={footerBottomOffset}
          >
            {sections.map((sec) => {
              const formData = formDataByGarment[sec.garmentId] ?? {};
              const clientLatest = clientLatestByGarment[sec.garmentId] ?? null;

              return (
                <View key={sec.garmentId} style={styles.garmentSection}>
                  <View style={styles.garmentSectionHeader}>
                    <FileEdit size={20} color={Colors.primary} />
                    <Text style={styles.garmentSectionTitle}>{sec.label}</Text>
                  </View>

                  {sec.definitions.length > 0 ? (
                    <View style={styles.formBlock}>
                      <View style={styles.formBlockTitleRow}>
                        <Text style={styles.formBlockTitle}>{t('newOrder.measurements.forThisOrder')}</Text>
                        {(() => {
                          const primaryUnit = sec.definitions.map((d) => getDisplayUnit(d)).find(Boolean);
                          return primaryUnit ? (
                            <Text style={styles.unitHint}>{t('modals.measurement.unitLabel')}: {primaryUnit}</Text>
                          ) : null;
                        })()}
                      </View>
                      {(() => {
                        const existingData = draftOrder.measurements[sec.garmentId] || {};
                        const clientLatest = clientLatestByGarment[sec.garmentId] ?? null;
                        const sources: ValueSource[] = sec.definitions
                          .filter((d) => d.inputType !== 'calculated')
                          .map((d) =>
                            getValueSource(
                              d.key,
                              formData[d.key],
                              existingData,
                              clientLatest
                            )
                          );
                        const labelKey = getSectionSourceLabel(sources);
                        return labelKey ? (
                          <Text style={styles.sourceLabel}>{t(`newOrder.measurements.${labelKey}`)}</Text>
                        ) : null;
                      })()}
                      <MeasurementForm
                        definitions={sec.definitions}
                        values={formData}
                        onChange={(key, value) => updateField(sec.garmentId, key, value)}
                        twoColumns
                        compact
                      />
                    </View>
                  ) : (
                    <Text style={styles.noDefinitionsHint}>
                      Acest articol nu are câmpuri de măsurători. Snapshot-ul va fi salvat gol.
                    </Text>
                  )}
                </View>
              );
            })}
          </KeyboardAwareScrollView>

          <AppFloatingFooter
            primaryLabel={t('stepNav.summary')}
            onPrimaryPress={handleNext}
            secondaryLabel={t('stepNav.back')}
            onSecondaryPress={handlePrev}
          />
        </View>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  contentWrapper: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  garmentSection: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  garmentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  garmentSectionTitle: {
    ...Typography.h3,
    marginLeft: Spacing.sm,
  },
  formBlock: {
    marginTop: 0,
  },
  formBlockTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  formBlockTitle: {
    ...Typography.captionBold,
    color: Colors.textPrimary,
  },
  unitHint: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  sourceLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
  },
  noDefinitionsHint: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
});
