import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Plus, Edit, Trash2, Copy, GripVertical } from 'lucide-react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import type { DragEndParams } from 'react-native-draggable-flatlist';
import { api, apiFetch, ApiError, HttpStatus } from '@/lib/api';
import { invalidateGarmentTypesCache } from '@/lib/apiCache';
import { getGarmentTypeIdFromPostResponse, normalizeGarmentTypeRecord } from '@/lib/api-mappers';
import type {
  GarmentTypeRecord,
  MeasurementDefinitionRecord,
  CreateMeasurementDefinitionPayload,
  UpdateMeasurementDefinitionPayload,
} from '@/types/templates';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useTemplates } from '@/contexts/TemplatesContext';
import { TemplateSourceBadge } from '@/components/TemplateSourceBadge';
import { MeasurementDefinitionEditorModal } from '@/components/MeasurementDefinitionEditorModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { Loader } from '@/components/ui/Loader';
import { ErrorText } from '@/components/ui/ErrorText';
import { Section } from '@/components/ui/Section';
import { EmptyState } from '@/components/ui/EmptyState';
import { useI18n } from '@/lib/i18n';
import { getUnitDisplay } from '@/constants/units';
import { Colors, Spacing, Typography, BorderRadius, Shadows, CompactLayoutStyles } from '@/constants/design';

function inputTypeLabel(type: string): string {
  const map: Record<string, string> = {
    number: 'Number',
    text: 'Text',
    select: 'Select',
    calculated: 'Calculated',
  };
  return map[type] ?? type;
}

function statusLabel(status: string): string {
  if (status === 'active') return 'Enabled';
  if (status === 'disabled') return 'Disabled';
  return status;
}

/** Next displayOrder when adding a measurement: max(existing) + 1, or 1 if none. Handles missing/duplicate values. */
function getNextDisplayOrder(definitions: MeasurementDefinitionRecord[]): number {
  if (definitions.length === 0) return 1;
  const orders = definitions.map(
    (d) => d.displayOrder ?? (d as { order?: number }).order ?? 0
  );
  return Math.max(0, ...orders) + 1;
}

/** Stable sort by displayOrder (then by id). Handles duplicate or missing displayOrder gracefully. */
function sortDefinitionsByDisplayOrder(
  list: MeasurementDefinitionRecord[]
): MeasurementDefinitionRecord[] {
  return [...list].sort((a, b) => {
    const orderA = a.displayOrder ?? (a as { order?: number }).order ?? 0;
    const orderB = b.displayOrder ?? (b as { order?: number }).order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return (a.id ?? '').localeCompare(b.id ?? '');
  });
}

export default function GarmentDetailScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ garmentId: string }>();
  const router = useRouter();
  const rawId = (params.garmentId as string) ?? '';
  const garmentId = rawId && rawId !== 'undefined' ? rawId : '';
  const [garment, setGarment] = useState<GarmentTypeRecord | null>(null);
  const [definitions, setDefinitions] = useState<MeasurementDefinitionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorMode, setEditorMode] = useState<'add' | 'edit'>('add');
  const [editorInitial, setEditorInitial] = useState<MeasurementDefinitionRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MeasurementDefinitionRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const { sharedTemplateUsageStatus } = useSubscription();
  const { isDuplicated, duplicateTemplate } = useTemplates();
  const duplicateStatus = sharedTemplateUsageStatus();

  const insets = useSafeAreaInsets();
  const isShared = garment ? (garment.source === 'shared' || garment.source === 'api') : false;
  const isDisabled = garment?.status === 'disabled';
  const canToggleStatus =
    garment && (!isShared || (garment.templateId && isDuplicated(garment.templateId)));
  const canEdit =
    garment &&
    !isDisabled &&
    (!isShared || (garment.templateId && isDuplicated(garment.templateId)));
  const fetchGarment = useCallback(async () => {
    if (!garmentId) return;
    try {
      setError(null);
      const [garmentRes, defsRes] = await Promise.all([
        apiFetch(api.garmentTypes(garmentId)).then(normalizeGarmentTypeRecord),
        apiFetch<
          | MeasurementDefinitionRecord[]
          | {
            measurementDefinitions?: MeasurementDefinitionRecord[];
            definitions?: MeasurementDefinitionRecord[];
            measurements?: MeasurementDefinitionRecord[];
          }
        >(api.garmentTypeDefinitions(garmentId)),
      ]);
      setGarment(garmentRes);
      setEditingName(garmentRes.name ?? '');
      const raw = Array.isArray(defsRes)
        ? defsRes
        : (defsRes.measurementDefinitions ?? defsRes.definitions ?? defsRes.measurements ?? []);
      const list = Array.isArray(raw)
        ? raw.map((d: MeasurementDefinitionRecord & { order?: number }) => ({
          ...d,
          displayOrder: d.displayOrder ?? d.order ?? 0,
        }))
        : [];
      setDefinitions(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('garments.loadSingleError'));
      setGarment(null);
      setDefinitions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [garmentId]);

  useFocusEffect(
    useCallback(() => {
      if (garmentId) {
        setLoading(true);
        fetchGarment();
      }
    }, [garmentId, fetchGarment])
  );

  useEffect(() => {
    if (garment?.name != null) setEditingName(garment.name);
  }, [garment?.name]);

  const handleSaveName = useCallback(async () => {
    if (!garmentId || !garment || nameSaving) return;
    const trimmed = editingName.trim();
    if (trimmed === garment.name) return;
    if (!trimmed) {
      setEditingName(garment.name ?? '');
      return;
    }
    setNameSaving(true);
    try {
      const updated = await apiFetch(api.garmentTypes(garmentId), {
        method: 'PUT',
        body: JSON.stringify({ name: trimmed }),
      }).then(normalizeGarmentTypeRecord);
      invalidateGarmentTypesCache();
      setGarment(updated);
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('garments.saveNameError'));
    } finally {
      setNameSaving(false);
    }
  }, [garmentId, garment, editingName, nameSaving]);

  const handleStatusToggle = useCallback(
    async (enabled: boolean) => {
      if (!garmentId || !garment || !canToggleStatus) return;
      try {
        const updated = await apiFetch(api.garmentTypes(garmentId), {
          method: 'PUT',
          body: JSON.stringify({ enabled }),
        }).then(normalizeGarmentTypeRecord);
        invalidateGarmentTypesCache();
        setGarment(updated);
      } catch (e) {
        Alert.alert(t('common.error'), e instanceof Error ? e.message : t('garments.updateStatusError'));
      }
    },
    [garmentId, garment, canToggleStatus]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGarment();
  }, [fetchGarment]);

  const handleDuplicate = useCallback(async () => {
    if (!garmentId || !duplicateStatus.allowed) return;
    try {
      const res = await apiFetch<unknown>(api.garmentTypes(), {
        method: 'POST',
        body: JSON.stringify({
          name: `Copy of ${garment?.name ?? 'template'}`,
          copyFromId: garmentId,
        }),
      });
      invalidateGarmentTypesCache();
      const id = getGarmentTypeIdFromPostResponse(res);
      duplicateTemplate(garmentId);
      if (id) {
        router.replace(`/garments/${id}`);
      } else {
        Alert.alert(t('garments.duplicated'), t('garments.duplicatedMessage'));
        fetchGarment();
      }
    } catch (e) {
      Alert.alert(
        t('common.error'),
        e instanceof Error ? e.message : t('garments.duplicateError')
      );
    }
  }, [garmentId, garment?.name, duplicateStatus.allowed, duplicateTemplate, router]);

  const nextDisplayOrder = useMemo(
    () => getNextDisplayOrder(definitions),
    [definitions]
  );

  const handleAddMeasurement = useCallback(() => {
    setEditorInitial(null);
    setEditorMode('add');
    setEditorVisible(true);
  }, []);

  const handleEditMeasurement = useCallback((def: MeasurementDefinitionRecord) => {
    setEditorInitial(def);
    setEditorMode('edit');
    setEditorVisible(true);
  }, []);

  const handleSaveMeasurement = useCallback(
    async (payload: CreateMeasurementDefinitionPayload | UpdateMeasurementDefinitionPayload) => {
      if (!garmentId) return;
      if (editorMode === 'add') {
        await apiFetch<MeasurementDefinitionRecord>(api.garmentTypeDefinitions(garmentId), {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else if (editorInitial) {
        await apiFetch(api.garmentTypeDefinitions(garmentId, editorInitial.id), {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      setEditorVisible(false);
      setEditorInitial(null);
      fetchGarment();
    },
    [garmentId, editorMode, editorInitial, fetchGarment]
  );

  const handleDeleteMeasurement = useCallback(async () => {
    if (!garmentId || !deleteTarget) return;
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await apiFetch(api.garmentTypeDefinitions(garmentId, deleteTarget.id), {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      setDeleteError(null);
      fetchGarment();
    } catch (e) {
      if (e instanceof ApiError && e.status === HttpStatus.Conflict) {
        setDeleteError(t('garments.measurementInUse'));
      } else {
        setDeleteError(e instanceof Error ? e.message : t('garments.deleteMeasurementError'));
      }
    } finally {
      setDeleteLoading(false);
    }
  }, [garmentId, deleteTarget, fetchGarment, t]);

  const closeDeleteModal = useCallback(() => {
    setDeleteTarget(null);
    setDeleteError(null);
  }, []);

  const sortedDefinitions = useMemo(
    () => sortDefinitionsByDisplayOrder(definitions),
    [definitions]
  );

  const handleDragEnd = useCallback(
    async ({ data: reordered }: DragEndParams<MeasurementDefinitionRecord>) => {
      // Renumber to 1..n (no gaps). Persist only definitions whose order actually changed.
      const updated = reordered.map((def, index) => ({
        ...def,
        displayOrder: index + 1,
      }));
      setDefinitions(updated);
      if (!garmentId) return;
      const toPatch = updated.filter((_, index) => {
        const newOrder = index + 1;
        const originalDef = reordered[index];
        const prevOrder =
          originalDef.displayOrder ?? (originalDef as { order?: number }).order ?? 0;
        return prevOrder !== newOrder;
      });
      try {
        await Promise.all(
          toPatch.map((def) =>
            apiFetch(api.garmentTypeDefinitions(garmentId, def.id), {
              method: 'PATCH',
              body: JSON.stringify({ order: def.displayOrder }),
            })
          )
        );
      } catch (e) {
        Alert.alert(
          t('common.error'),
          e instanceof Error ? e.message : t('garments.saveOrderError')
        );
        fetchGarment();
      }
    },
    [garmentId, fetchGarment, t]
  );

  if (!garmentId) {
    return (
      <ScreenContainer noPadding>
        <Header
          title={t('garments.singleTitle')}
          onBack={() => router.back()}
          backAccessibilityLabel={t('common.back')}
        />
        <View style={styles.centered}>
          <ErrorText>{t('garments.garmentIdMissing')}</ErrorText>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer noPadding>
      <Header
        title={garment?.name ?? '…'}
        onBack={() => router.back()}
        backAccessibilityLabel={t('common.back')}
        titleNumberOfLines={1}
      />

      {loading ? (
        <Loader message={t('common.loading')} style={styles.centered} />
      ) : error || !garment ? (
        <View style={styles.centered}>
          <ErrorText>{error ?? t('garments.garmentNotFound')}</ErrorText>
          <Button variant="primary" size="sm" onPress={() => { setLoading(true); fetchGarment(); }} style={styles.retryBtn}>
            {t('garments.retry')}
          </Button>
        </View>
      ) : canEdit && sortedDefinitions.length > 0 ? (
        <View style={styles.mainWithFooter}>
          <GestureHandlerRootView style={styles.draggableRoot}>
            <DraggableFlatList
              data={sortedDefinitions}
              keyExtractor={(item) => item.id}
              onDragEnd={handleDragEnd}
              style={styles.draggableList}
              contentContainerStyle={styles.draggableListContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
              }
              ListHeaderComponent={
                <>
                  <View style={styles.headerCard}>
                    {canToggleStatus && (
                      <View style={styles.statusRow}>
                        <Text style={styles.statusRowLabel}>{t('garments.enabled')}</Text>
                        <Switch
                          value={garment.status === 'active'}
                          onValueChange={(v) => handleStatusToggle(v)}
                          trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                          thumbColor={garment.status === 'active' ? Colors.primary : Colors.surface}
                        />
                      </View>
                    )}
                    {!canToggleStatus && (
                      <View style={styles.badges}>
                        <View style={[styles.statusBadge, isDisabled && styles.statusDisabled]}>
                          <Text style={styles.statusText}>{statusLabel(garment.status)}</Text>
                        </View>
                        {(garment.source === 'shared' || garment.source === 'api') && (
                          <TemplateSourceBadge source={garment.source} />
                        )}
                      </View>
                    )}
                    {canEdit && garment.source !== 'local' && (
                      <View style={styles.badges}>
                        <TemplateSourceBadge source={garment.source} />
                      </View>
                    )}
                    {garment.orderCount != null && garment.orderCount > 0 && (
                      <Text style={styles.orderCount}>{t('garments.usedInOrders', { count: garment.orderCount })}</Text>
                    )}
                    {isShared && !isDuplicated(garment.templateId ?? garment.id) && (
                      <View style={styles.sharedNotice}>
                        <Text style={styles.sharedNoticeText}>
                          {t('garments.sharedTemplateNotice')}
                        </Text>
                        <Button
                          variant="secondary"
                          size="sm"
                          onPress={handleDuplicate}
                          disabled={!duplicateStatus.allowed}
                          leftIcon={<Copy size={16} color={duplicateStatus.allowed ? Colors.primary : Colors.textTertiary} />}
                          style={styles.duplicateBtn}
                        >
                          {t('garments.duplicateAsLocal')}
                        </Button>
                        {!duplicateStatus.allowed && duplicateStatus.message ? (
                          <Text style={styles.limitHint}>{duplicateStatus.message}</Text>
                        ) : null}
                      </View>
                    )}
                  </View>
                  <Section title={t('garments.sectionMeasurements')} style={CompactLayoutStyles.compactSection}>
                    <View />
                  </Section>
                </>
              }
              renderItem={({ item: def, drag, isActive }) => (
              <ScaleDecorator activeScale={1.02}>
                <View style={[styles.defRow, isActive && styles.defRowActive]}>
                  <TouchableOpacity
                    onLongPress={drag}
                    style={styles.dragHandle}
                    accessibilityLabel={t('garments.dragToReorder')}
                  >
                    <GripVertical size={20} color={Colors.textTertiary} />
                  </TouchableOpacity>
                  <View style={styles.defMain}>
                    <Text style={styles.defLabel}>{def.label}</Text>
                    <View style={styles.defMeta}>
                      <Text style={styles.defMetaText}>{inputTypeLabel(def.inputType)}</Text>
                      {(def.unitKey || def.unit) && (
                        <Text style={styles.defMetaText}>
                          {getUnitDisplay(def.unitKey ?? undefined) ?? def.unit ?? ''}
                        </Text>
                      )}
                      <Text style={styles.defMetaText}>
                        {def.required ? t('common.required') : t('common.optional')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.defActions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => handleEditMeasurement(def)}
                      leftIcon={<Edit size={16} color={Colors.primary} />}
                      style={styles.defActionBtn}
                    >
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => { setDeleteError(null); setDeleteTarget(def); }}
                      leftIcon={<Trash2 size={16} color={Colors.error} />}
                      style={styles.defActionBtn}
                    >
                      <Text style={[styles.defActionText, { color: Colors.error }]}>{t('garments.defActionDelete')}</Text>
                    </Button>
                  </View>
                </View>
              </ScaleDecorator>
            )}
          />
        </GestureHandlerRootView>
          {canEdit ? (
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
              <Button
                variant="primary"
                size="lg"
                onPress={handleAddMeasurement}
                leftIcon={<Plus size={18} color={Colors.textInverse} />}
                style={styles.addButton}
              >
                {t('garments.addMeasurementFirst')}
              </Button>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.mainWithFooter}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
        >
          <View style={styles.headerCard}>
            {canToggleStatus && (
              <View style={styles.statusRow}>
                <Text style={styles.statusRowLabel}>{t('garments.enabled')}</Text>
                <Switch
                  value={garment.status === 'active'}
                  onValueChange={(v) => handleStatusToggle(v)}
                  trackColor={{ false: Colors.border, true: Colors.primaryLight }}
                  thumbColor={garment.status === 'active' ? Colors.primary : Colors.surface}
                />
              </View>
            )}
            {!canToggleStatus && (
              <View style={styles.badges}>
                <View style={[styles.statusBadge, isDisabled && styles.statusDisabled]}>
                  <Text style={styles.statusText}>{statusLabel(garment.status)}</Text>
                </View>
                {(garment.source === 'shared' || garment.source === 'api') && (
                  <TemplateSourceBadge source={garment.source} />
                )}
              </View>
            )}
            {canEdit && garment.source !== 'local' && (
              <View style={styles.badges}>
                <TemplateSourceBadge source={garment.source} />
              </View>
            )}
            {garment.orderCount != null && garment.orderCount > 0 && (
              <Text style={styles.orderCount}>{t('garments.usedInOrders', { count: garment.orderCount })}</Text>
            )}
            {isShared && !isDuplicated(garment.templateId ?? garment.id) && (
              <View style={styles.sharedNotice}>
                <Text style={styles.sharedNoticeText}>
                  {t('garments.sharedTemplateNotice')}
                </Text>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={handleDuplicate}
                  disabled={!duplicateStatus.allowed}
                  leftIcon={<Copy size={16} color={duplicateStatus.allowed ? Colors.primary : Colors.textTertiary} />}
                  style={styles.duplicateBtn}
                >
                  {t('garments.duplicateAsLocal')}
                </Button>
                {!duplicateStatus.allowed && duplicateStatus.message ? (
                  <Text style={styles.limitHint}>{duplicateStatus.message}</Text>
                ) : null}
              </View>
            )}
          </View>

          <Section title={t('garments.sectionMeasurements')} style={CompactLayoutStyles.compactSection}>
            {sortedDefinitions.length === 0 ? (
              <EmptyState
                title={t('garments.noMeasurementsYet')}
                style={styles.emptyMeasurements}
              />
            ) : (
              <>
                {sortedDefinitions.map((def) => (
                  <View key={def.id} style={styles.defRow}>
                    <View style={styles.defMain}>
                      <Text style={styles.defLabel}>{def.label}</Text>
                      <View style={styles.defMeta}>
                        <Text style={styles.defMetaText}>{inputTypeLabel(def.inputType)}</Text>
                        {(def.unitKey || def.unit) && (
                          <Text style={styles.defMetaText}>
                            {getUnitDisplay(def.unitKey ?? undefined) ?? def.unit ?? ''}
                          </Text>
                        )}
                        <Text style={styles.defMetaText}>
                          {def.required ? 'Required' : 'Optional'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}
          </Section>
        </ScrollView>
          {canEdit ? (
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
              <Button
                variant="primary"
                size="lg"
                onPress={handleAddMeasurement}
                leftIcon={<Plus size={18} color={Colors.textInverse} />}
                style={styles.addButton}
              >
                {t('garments.addMeasurementFirst')}
              </Button>
            </View>
          ) : null}
        </View>
      )}

      <MeasurementDefinitionEditorModal
        visible={editorVisible}
        onClose={() => { setEditorVisible(false); setEditorInitial(null); }}
        mode={editorMode}
        initial={editorInitial}
        existingDefinitions={definitions}
        suggestedDisplayOrder={nextDisplayOrder}
        onSubmit={handleSaveMeasurement}
      />

      <DeleteConfirmModal
        visible={!!deleteTarget}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteMeasurement}
        title={t('modals.deleteMeasurement.title')}
        message={
          deleteTarget
            ? t('modals.deleteMeasurement.messageWithLabel', { label: deleteTarget.label })
            : t('modals.deleteMeasurement.cannotUndo')
        }
        errorMessage={deleteError}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleteLoading}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  retryBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  headerTitleInput: {
    flex: 1,
    ...Typography.h3,
    color: Colors.textPrimary,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, // 14px cards
    padding: Spacing.md, // 16px card internal padding
    marginHorizontal: Spacing.md, // 16px horizontal margin (replaces content padding for this card)
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Reduced: last item in card doesn't need full md spacing
  },
  statusRowLabel: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginBottom: Spacing.xs, // Reduced: tighter spacing within card
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.success + '24',
  },
  statusDisabled: {
    backgroundColor: Colors.textTertiary + '24',
  },
  statusText: {
    ...Typography.small,
    fontWeight: '600',
  },
  orderCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs, // Reduced: tighter spacing within card
  },
  sharedNotice: {
    marginTop: Spacing.md, // Single source: marginTop only (removed redundant paddingTop)
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md, // Padding for content after border
  },
  sharedNoticeText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs, // Reduced: tighter spacing within notice section
  },
  duplicateBtn: {
    alignSelf: 'flex-start',
  },
  limitHint: {
    ...Typography.caption,
    color: Colors.warning,
    marginTop: Spacing.xs,
  },
  draggableRoot: {
    flex: 1,
  },
  draggableList: {
    flex: 0,
  },
  draggableListContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  emptyMeasurements: {
    marginHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  mainWithFooter: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addButton: {
    width: '100%',
  },
  defRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  defRowActive: {
    opacity: 0.95,
    ...Shadows.md,
  },
  dragHandle: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
    justifyContent: 'center',
  },
  defMain: {
    flex: 1,
  },
  defLabel: {
    ...Typography.bodyBold,
    marginBottom: Spacing.xs,
  },
  defMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  defMetaText: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  defActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  defActionBtn: {
    minHeight: 36,
    minWidth: 36,
    paddingHorizontal: Spacing.xs,
  },
  defActionText: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
});
