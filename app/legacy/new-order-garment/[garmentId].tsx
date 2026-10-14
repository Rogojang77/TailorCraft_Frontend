/**
 * @deprecated Legacy screen — moved from app/new-order/[garmentId].tsx (2025-01-31).
 * Not reachable from the primary new-order flow. Uses constants/garments instead of API.
 * See app/legacy/README.md for details.
 * Route: /legacy/new-order-garment/[garmentId]
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Save, User, FileEdit, Copy } from 'lucide-react-native';
import { useOrderDraft } from '@/contexts/OrderDraftContext';
import { useTemplates } from '@/contexts/TemplatesContext';
import { OrderStepNav } from '@/components/OrderStepNav';
import { MeasurementForm, MeasurementDisplay } from '@/components/MeasurementForm';
import { TemplateSourceBadge } from '@/components/TemplateSourceBadge';
import { getLatestClientMeasurements } from '@/lib/measurement';
import { getEffectiveTemplateSource, getMeasurementFormReadOnly } from '@/lib/templateUtils';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/lib/i18n';
import { getGarmentTypeById, getMeasurementDefinitions, GARMENT_TYPES } from '@/constants/garments';
import {
  filterDefinitionsWithValidKey,
  buildPersistableMeasurements,
  storageToMeasurementValue,
} from '@/lib/measurement';
import type { MeasurementValue } from '@/types/measurement';

function isSnapshotEmpty(snap: Record<string, string>): boolean {
  if (Object.keys(snap).length === 0) return true;
  return Object.values(snap).every((v) => v === '' || v === undefined);
}

function DuplicateBlock({
  templateId,
  onDuplicate,
  colors,
}: {
  templateId: string;
  onDuplicate: (id: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <TouchableOpacity
      style={[
        duplicateButtonStyles.button,
        { backgroundColor: (colors.brassPale ?? colors.brass ?? colors.primary) + '18', borderColor: colors.brass ?? colors.primary },
      ]}
      onPress={() => onDuplicate(templateId)}
      activeOpacity={0.7}
    >
      <Copy size={18} color={colors.brass ?? colors.primary} />
      <Text style={[duplicateButtonStyles.text, { color: colors.brass ?? colors.primary }]}>
        Duplică ca șablon local
      </Text>
    </TouchableOpacity>
  );
}

const duplicateButtonStyles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: AtelierSpacing.sm,
    paddingVertical: AtelierSpacing.sm,
    paddingHorizontal: AtelierSpacing.md,
    marginBottom: AtelierSpacing.lg,
    borderRadius: AtelierRadius.sm,
    borderWidth: 1,
  },
  text: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
  },
});

export default function GarmentFormScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ garmentId: string }>();
  const { draftOrder, updateMeasurements } = useOrderDraft();

  const garmentId = params.garmentId || '';
  const garmentType = getGarmentTypeById(garmentId);
  const { isDuplicated, duplicateTemplate } = useTemplates();

  const effectiveSource = garmentType
    ? getEffectiveTemplateSource(garmentType, isDuplicated)
    : 'local';
  const isReadOnly = getMeasurementFormReadOnly(garmentType ?? null, isDuplicated);

  const [clientLatest, setClientLatest] = useState<Record<string, string> | null>(null);
  const [loadingClientLatest, setLoadingClientLatest] = useState(false);

  // Redirect if garment type not found
  useEffect(() => {
    if (!garmentType) {
      router.replace('/new-order');
    }
  }, [garmentType, router]);

  // Load latest client measurements when we have a customer id
  useEffect(() => {
    const customerId = draftOrder.customer.id;
    if (!customerId || !garmentId) {
      setClientLatest(null);
      return;
    }
    let cancelled = false;
    setLoadingClientLatest(true);
    getLatestClientMeasurements(customerId, garmentId)
      .then((data) => {
        if (!cancelled) setClientLatest(data);
      })
      .catch(() => {
        if (!cancelled) setClientLatest(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingClientLatest(false);
      });
    return () => {
      cancelled = true;
    };
  }, [draftOrder.customer.id, garmentId]);

  if (!garmentType) {
    return null;
  }

  const existingData = draftOrder.measurements[garmentId] || {};
  const definitions = useMemo(() => getMeasurementDefinitions(garmentType), [garmentType]);
  const safeDefs = useMemo(
    () => filterDefinitionsWithValidKey(definitions),
    [definitions]
  );

  const initializeFormData = (): Record<string, MeasurementValue> => {
    const base = isSnapshotEmpty(existingData) && clientLatest && Object.keys(clientLatest).length > 0
      ? { ...clientLatest }
      : { ...existingData };
    const merged = { ...base, ...existingData };
    const data: Record<string, MeasurementValue> = {};
    const byKey = new Map(safeDefs.map((d) => [d.key, d]));
    for (const k of Object.keys(merged)) {
      const def = byKey.get(k);
      if (!def) continue;
      const inputType = def.inputType ?? 'text';
      if (inputType === 'calculated') continue;
      data[k] = storageToMeasurementValue(merged[k], inputType);
    }
    safeDefs.forEach((def) => {
      if (def.inputType === 'calculated') return;
      const current = data[def.key];
      const empty = current === undefined || current === '';
      if (empty) {
        data[def.key] = storageToMeasurementValue(def.defaultValue ?? '', def.inputType);
      }
    });
    return data;
  };

  const [formData, setFormData] = useState<Record<string, MeasurementValue>>(initializeFormData);

  // Reinit form when garment, draft snapshot, or definitions change
  useEffect(() => {
    setFormData(initializeFormData());
  }, [garmentId, draftOrder.measurements[garmentId], safeDefs]);

  // When client latest loads and snapshot is empty, prefill only empty fields (don't overwrite edits)
  useEffect(() => {
    if (!clientLatest || Object.keys(clientLatest).length === 0 || !isSnapshotEmpty(existingData)) return;
    setFormData((prev) => {
      const merged = { ...prev };
      let changed = false;
      safeDefs.forEach((def) => {
        if (def.inputType === 'calculated') return;
        const fromLatest = clientLatest[def.key];
        const current = merged[def.key];
        const currentEmpty = current === undefined || current === '';
        const hasLatest = fromLatest !== undefined && fromLatest !== '';
        if (currentEmpty && hasLatest) {
          merged[def.key] = storageToMeasurementValue(fromLatest, def.inputType);
          changed = true;
        } else if (currentEmpty) {
          merged[def.key] = storageToMeasurementValue(def.defaultValue ?? '', def.inputType);
          changed = true;
        }
      });
      return changed ? merged : prev;
    });
  }, [clientLatest, safeDefs]);

  // Get next garment in sequence (uses GARMENT_TYPES from constants - legacy)
  const getNextGarment = (): string | null => {
    const currentIndex = GARMENT_TYPES.findIndex((g) => g.id === garmentId);
    if (currentIndex >= 0 && currentIndex < GARMENT_TYPES.length - 1) {
      return GARMENT_TYPES[currentIndex + 1].route;
    }
    return null;
  };

  // Get previous garment in sequence
  const getPrevGarment = (): string | null => {
    const currentIndex = GARMENT_TYPES.findIndex((g) => g.id === garmentId);
    if (currentIndex > 0) {
      return GARMENT_TYPES[currentIndex - 1].route;
    }
    return 'client-data';
  };

  const handleSave = () => {
    updateMeasurements(garmentId, buildPersistableMeasurements(safeDefs, formData));
    router.back();
  };

  const handleNext = () => {
    updateMeasurements(garmentId, buildPersistableMeasurements(safeDefs, formData));
    const nextRoute = getNextGarment();
    if (nextRoute) {
      // Per-garment routes removed from new-order; redirect to measurements (main flow)
      router.push('/new-order/measurements');
    } else {
      router.push('/new-order/summary');
    }
  };

  const handlePrev = () => {
    updateMeasurements(garmentId, buildPersistableMeasurements(safeDefs, formData));
    const prevRoute = getPrevGarment();
    if (prevRoute === 'client-data') {
      router.push('/new-order/client-data');
    } else {
      // Stay in legacy flow for prev garment
      router.push(`/legacy/new-order-garment/${prevRoute}` as const);
    }
  };

  const updateField = (key: string, value: MeasurementValue) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <ScreenContainer noPadding>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color={colors.textPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('legacy.measurementsTitle', { name: garmentType.name })}</Text>
            <TemplateSourceBadge source={effectiveSource} style={styles.sourceBadge} />
          </View>
          {isReadOnly ? (
            <View style={styles.headerRightPlaceholder} />
          ) : (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Save size={20} color={colors.paper ?? '#EFE9DC'} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {draftOrder.customer.id && (
            <View style={[styles.section, styles.clientSection, { backgroundColor: colors.card, borderLeftColor: colors.ocean ?? colors.brass ?? colors.primary }]}>
              <View style={styles.sectionHeader}>
                <User size={20} color={colors.ocean ?? colors.brass ?? colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('legacy.clientDataSection')}</Text>
              </View>
              <Text style={[styles.sectionHint, { color: colors.ink3 }]}>
                {t('legacy.clientSectionHint')}
              </Text>
              {loadingClientLatest ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.ocean ?? colors.brass ?? colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.ink3 }]}>{t('legacy.loading')}</Text>
                </View>
              ) : clientLatest && Object.keys(clientLatest).length > 0 ? (
                <MeasurementDisplay
                  definitions={safeDefs}
                  values={clientLatest}
                  twoColumns
                />
              ) : (
                <Text style={[styles.emptyHint, { color: colors.ink4 ?? colors.textTertiary }]}>{t('legacy.emptyMeasurements')}</Text>
              )}
            </View>
          )}

          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <FileEdit size={20} color={colors.brass ?? colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t('legacy.forThisOrderSnapshot')}
                {isReadOnly && (
                  <Text style={[styles.readOnlyHint, { color: colors.ink4 ?? colors.textTertiary }]}>{t('legacy.readOnlyHint')}</Text>
                )}
              </Text>
            </View>
            <Text style={[styles.sectionHint, { color: colors.ink3 }]}>
              {isReadOnly
                ? t('legacy.sharedReadOnlyHint')
                : t('legacy.savedForOrderHint')}
            </Text>
            {isReadOnly && garmentType.templateMeta && (
              <DuplicateBlock
                templateId={garmentType.templateMeta.templateId}
                onDuplicate={duplicateTemplate}
                colors={colors}
              />
            )}
            <MeasurementForm
              definitions={safeDefs}
              values={formData}
              onChange={updateField}
              twoColumns
              isReadOnly={isReadOnly}
            />
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </ScreenContainer>
      <OrderStepNav
        showPrev
        showNext
        onPrev={handlePrev}
        onNext={handleNext}
        prevLabel={t('stepNav.back')}
        nextLabel={t('stepNav.next')}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: AtelierRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },
  sourceBadge: {
    marginTop: AtelierSpacing.xs,
  },
  headerRightPlaceholder: {
    width: 44,
    height: 44,
  },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: AtelierRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readOnlyHint: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  content: {
    flex: 1,
  },
  section: {
    marginHorizontal: AtelierSpacing.md,
    marginBottom: AtelierSpacing.lg,
    borderRadius: AtelierRadius.md,
    padding: AtelierSpacing.md,
    ...AtelierShadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AtelierSpacing.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    marginLeft: AtelierSpacing.sm,
  },
  clientSection: {
    borderLeftWidth: 4,
  },
  sectionHint: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: AtelierSpacing.lg,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
    paddingVertical: AtelierSpacing.lg,
  },
  loadingText: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  emptyHint: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
    paddingVertical: AtelierSpacing.md,
  },
  bottomSpacer: {
    height: AtelierSpacing.xxl,
  },
});
