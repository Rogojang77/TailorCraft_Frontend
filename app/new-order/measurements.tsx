import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { KeyboardAwareScrollViewWithAccessory } from '@/components/KeyboardAwareScrollViewWithAccessory';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useI18n } from '@/lib/i18n';
import { FileEdit, Plus } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { MeasurementDefinitionEditorModal } from '@/components/MeasurementDefinitionEditorModal';
import { useOrderDraft } from '@/contexts/OrderDraftContext';
import { AppFloatingFooter, FOOTER_CONTENT_HEIGHT } from '@/components/AppFloatingFooter';
import { MeasurementForm } from '@/components/MeasurementForm';
import { CatalogSelectionsForm } from '@/components/CatalogSelectionsForm';
import { api, apiFetch } from '@/lib/api';
import { normalizeGarmentTypeRecord, definitionRecordToFormDefinition } from '@/lib/api';
import type { GarmentTypeRecord } from '@/types/templates';
import type { MeasurementDefinitionRecord, CreateMeasurementDefinitionPayload, UpdateMeasurementDefinitionPayload } from '@/types/templates';
import type {
  GarmentCatalogCategoryWithItems,
  GarmentCatalogResponse,
} from '@/types/catalog';
import { getLatestClientMeasurements } from '@/lib/measurement';
import { humanizeGarmentId } from '@/utils';
import { filterDefinitionsWithValidKey } from '@/lib/measurement';
import { useSettings } from '@/contexts/SettingsContext';
import { getUnitDisplay } from '@/constants/units';
import { buildPersistableMeasurements } from '@/lib/measurement';
import { storageToMeasurementValue } from '@/lib/measurement';
import type { MeasurementValue } from '@/types/measurement';
import { useCustomBack } from '@/contexts/PageTitleContext';
import { Loader } from '@/components/ui/Loader';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';
import { useTheme } from '@/contexts/ThemeContext';
import { OrderSketchStepSection } from '@/components/new-order/OrderSketchStepSection';

interface GarmentSection {
  garmentId: string;
  name: string;
  label: string;
  definitions: ReturnType<typeof definitionRecordToFormDefinition>[];
  /** Raw records, needed by the "add measurement" editor (key uniqueness, next order). */
  records: MeasurementDefinitionRecord[];
}

type DefinitionsResponse =
  | MeasurementDefinitionRecord[]
  | { measurementDefinitions?: MeasurementDefinitionRecord[]; definitions?: MeasurementDefinitionRecord[]; measurements?: MeasurementDefinitionRecord[] };

async function loadGarmentDefinitions(garmentId: string) {
  const defsRes = await apiFetch<DefinitionsResponse>(api.garmentTypeDefinitions(garmentId));
  const raw = Array.isArray(defsRes)
    ? defsRes
    : (defsRes.measurementDefinitions ?? defsRes.definitions ?? defsRes.measurements ?? []);
  const records = Array.isArray(raw) ? raw : [];
  const definitions = records
    .map((d: MeasurementDefinitionRecord & { order?: number }) => definitionRecordToFormDefinition(d))
    .sort((a, b) => a.displayOrder - b.displayOrder);
  return { records, definitions: filterDefinitionsWithValidKey(definitions) };
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
  const { colors } = useTheme();
  const { preferredUnit } = useSettings();

  useCustomBack(() => router.replace('/(tabs)/orders'), t('common.back'));
  const preferredUnitSymbol = getUnitDisplay(preferredUnit) ?? preferredUnit;
  const { draftOrder, updateMeasurements, updateCatalogSelections, updateSketchDraftUri } = useOrderDraft();
  const selectedIds = draftOrder.selectedGarmentIds;

  const [sections, setSections] = useState<GarmentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [formDataByGarment, setFormDataByGarment] = useState<Record<string, Record<string, MeasurementValue>>>({});
  const [clientLatestByGarment, setClientLatestByGarment] = useState<Record<string, Record<string, string> | null>>({});
  const [loadingClientByGarment, setLoadingClientByGarment] = useState<Record<string, boolean>>({});
  
  const [categoriesByGarment, setCategoriesByGarment] = useState<Record<string, GarmentCatalogCategoryWithItems[]>>({});
  const [catalogLoading, setCatalogLoading] = useState<Record<string, boolean>>({});

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
          const [garmentRes, defs] = await Promise.all([
            apiFetch(api.garmentTypes(id)).then((r: unknown) =>
              normalizeGarmentTypeRecord(r as Parameters<typeof normalizeGarmentTypeRecord>[0])
            ),
            loadGarmentDefinitions(id),
          ]);
          const garment = garmentRes as GarmentTypeRecord;
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
            definitions: defs.definitions,
            records: defs.records,
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

  const fetchCatalogForGarments = useCallback(async () => {
    if (selectedIds.length === 0) {
      setCategoriesByGarment({});
      return;
    }

    const newCategoriesByGarment: Record<string, GarmentCatalogCategoryWithItems[]> = {};

    await Promise.all(
      selectedIds.map(async (garmentId) => {
        setCatalogLoading((prev) => ({ ...prev, [garmentId]: true }));
        try {
          const catalogRes = await apiFetch<GarmentCatalogResponse>(
            api.garmentCatalog.forGarment(garmentId)
          );
          newCategoriesByGarment[garmentId] = catalogRes.categories.filter((c) => c.enabled);
        } catch {
          newCategoriesByGarment[garmentId] = [];
        } finally {
          setCatalogLoading((prev) => ({ ...prev, [garmentId]: false }));
        }
      })
    );

    setCategoriesByGarment(newCategoriesByGarment);
  }, [selectedIds.join(',')]);

  useEffect(() => {
    fetchCatalogForGarments();
  }, [fetchCatalogForGarments]);

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
        const initialized = initializeFormForGarment(sec.garmentId, sec.definitions, clientLatest);
        // Keep what was already typed on this screen (it reaches the draft only on Next).
        const typed = prev[sec.garmentId] ?? {};
        for (const [key, value] of Object.entries(typed)) {
          if (key in initialized && value !== undefined && value !== '') initialized[key] = value;
        }
        next[sec.garmentId] = initialized;
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

  const [addMeasurementFor, setAddMeasurementFor] = useState<GarmentSection | null>(null);

  // Adds the field to the garment template, so it also appears in future orders.
  const handleAddMeasurement = async (payload: CreateMeasurementDefinitionPayload | UpdateMeasurementDefinitionPayload) => {
    const section = addMeasurementFor;
    if (!section) return;
    await apiFetch(api.garmentTypeDefinitions(section.garmentId), { method: 'POST', body: JSON.stringify(payload) });
    const defs = await loadGarmentDefinitions(section.garmentId);
    setSections((prev) => prev.map((sec) => (sec.garmentId === section.garmentId ? { ...sec, ...defs } : sec)));
    setAddMeasurementFor(null);
  };

  const updateField = (garmentId: string, key: string, value: MeasurementValue) => {
    setFormDataByGarment((prev) => ({
      ...prev,
      [garmentId]: { ...(prev[garmentId] ?? {}), [key]: value },
    }));
  };

  const handleCatalogSelectionChange = useCallback(
    (garmentId: string, categoryCode: string, itemId: string | null) => {
      if (itemId === null) {
        const currentSelections = draftOrder.catalogSelections[garmentId] ?? {};
        const { [categoryCode]: _, ...rest } = currentSelections;
        if (Object.keys(rest).length === 0) {
          updateCatalogSelections(garmentId, categoryCode, '');
        } else {
          updateCatalogSelections(garmentId, categoryCode, '');
        }
      } else {
        updateCatalogSelections(garmentId, categoryCode, itemId);
      }
    },
    [draftOrder.catalogSelections, updateCatalogSelections]
  );

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
        <Loader message={t('common.loading')} style={styles.loadingContainer} />
      </ScreenContainer>
    );
  }

  const footerBottomOffset = FOOTER_CONTENT_HEIGHT + insets.bottom;

  return (
    <>
      <ScreenContainer noPadding>
        <View style={styles.contentWrapper}>
          <KeyboardAwareScrollViewWithAccessory
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: footerBottomOffset }]}
            keyboardShouldPersistTaps="handled"
            bottomOffset={footerBottomOffset}
          >
            {sections.length > 0 && (() => {
              const totalPoints = sections.reduce(
                (sum, sec) => sum + sec.definitions.filter((d) => d.inputType !== 'calculated').length,
                0
              );
              const garmentNames = sections.map((s) => s.label).join(', ');
              return (
                <View style={styles.stepHeader}>
                  <Text style={[styles.stepIndicator, { color: colors.brass ?? colors.primary }]}>
                    {t('newOrder.measurements.stepLabel')}
                  </Text>
                  <Text style={[styles.stepTagline, { color: colors.textPrimary }]}>
                    {t('newOrder.measurements.tagline')}
                  </Text>
                  {totalPoints > 0 && (
                    <Text style={[styles.stepHint, { color: colors.ink3 }]}>
                      {t('newOrder.measurements.pointsHint', { count: totalPoints, garment: garmentNames })}
                    </Text>
                  )}
                </View>
              );
            })()}
            {sections.map((sec) => {
              const formData = formDataByGarment[sec.garmentId] ?? {};
              const clientLatest = clientLatestByGarment[sec.garmentId] ?? null;
              const categories = categoriesByGarment[sec.garmentId] ?? [];
              const selections = draftOrder.catalogSelections[sec.garmentId] ?? {};
              const isCatalogLoading = catalogLoading[sec.garmentId] ?? false;

              return (
                <View key={sec.garmentId} style={[styles.garmentSection, { backgroundColor: colors.card }]}>
                  <View style={[styles.garmentSectionHeader, { borderBottomColor: colors.ruleSoft ?? colors.rule ?? colors.border }]}>
                    <FileEdit size={18} color={colors.brass ?? colors.primary} />
                    <Text style={[styles.garmentSectionTitle, { color: colors.textPrimary }]}>{sec.label}</Text>
                  </View>

                  {sec.definitions.length > 0 ? (
                    <View style={styles.formBlock}>
                      <View style={styles.formBlockTitleRow}>
                        <Text style={[styles.formBlockTitle, { color: colors.textPrimary }]}>{t('newOrder.measurements.forThisOrder')}</Text>
                        {preferredUnitSymbol ? (
                          <Text style={[styles.unitHint, { color: colors.ink4 ?? colors.textTertiary }]}>{t('modals.measurement.unitLabel')}: {preferredUnitSymbol}</Text>
                        ) : null}
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
                          <Text style={[styles.sourceLabel, { color: colors.ink4 ?? colors.textTertiary }]}>{t(`newOrder.measurements.${labelKey}`)}</Text>
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
                    <Text style={[styles.noDefinitionsHint, { color: colors.ink4 ?? colors.textTertiary }]}>
                      {t('newOrder.measurements.noMeasurementFields')}
                    </Text>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => setAddMeasurementFor(sec)}
                    leftIcon={<Plus size={16} color={colors.brass ?? colors.primary} />}
                    style={styles.addMeasurementButton}
                  >
                    {t('garments.addMeasurementFirst')}
                  </Button>

                  {categories.length > 0 && (
                    <CatalogSelectionsForm
                      categories={categories}
                      selections={selections}
                      onSelectionChange={(categoryCode, itemId) =>
                        handleCatalogSelectionChange(sec.garmentId, categoryCode, itemId)
                      }
                      isLoading={isCatalogLoading}
                    />
                  )}
                </View>
              );
            })}
            {draftOrder.wantsOrderSketch && (
              <OrderSketchStepSection
                customerId={draftOrder.customer.id}
                currentOrderId={draftOrder.orderId}
                sketchDraftUri={draftOrder.sketchDraftUri}
                onOpenDrawing={() => router.push('/new-order/sketch')}
                onSetSketchUri={updateSketchDraftUri}
              />
            )}
          </KeyboardAwareScrollViewWithAccessory>
          <MeasurementDefinitionEditorModal
            visible={addMeasurementFor !== null}
            onClose={() => setAddMeasurementFor(null)}
            mode="add"
            existingDefinitions={addMeasurementFor?.records ?? []}
            suggestedDisplayOrder={
              Math.max(-1, ...(addMeasurementFor?.records ?? []).map((d) => d.displayOrder ?? 0)) + 1
            }
            onSubmit={handleAddMeasurement}
          />
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
    paddingVertical: AtelierSpacing.md,
  },
  stepHeader: {
    paddingHorizontal: AtelierSpacing.pagePad,
    paddingTop: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.md,
  },
  stepIndicator: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: AtelierSpacing.xs,
  },
  stepTagline: {
    fontFamily: FontFamily.serifItalic,
    fontSize: 22,
    lineHeight: 28,
    marginBottom: AtelierSpacing.xs,
  },
  stepHint: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  garmentSection: {
    marginHorizontal: AtelierSpacing.md,
    marginBottom: AtelierSpacing.md,
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.md,
    borderRadius: AtelierRadius.md,
    ...AtelierShadow.card,
  },
  garmentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AtelierSpacing.md,
    paddingBottom: AtelierSpacing.sm,
    borderBottomWidth: 1,
  },
  garmentSectionTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    marginLeft: AtelierSpacing.sm,
    flex: 1,
  },
  formBlock: {
    marginTop: 0,
  },
  formBlockTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.xs,
  },
  formBlockTitle: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unitHint: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  sourceLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    fontStyle: 'italic',
    marginBottom: AtelierSpacing.xs,
  },
  noDefinitionsHint: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  addMeasurementButton: {
    alignSelf: 'flex-start',
    marginTop: AtelierSpacing.sm,
  },
});
