/**
 * Display definitions, resolved catalog for read view, and edit single measurement/catalog modal state and save.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { api, apiFetch } from '@/lib/api';
import { sortGarmentIdsByOrder } from '@/lib/order';
import { definitionRecordToFormDefinition } from '@/lib/api';
import { filterDefinitionsWithValidKey, measurementValueToStorage } from '@/lib/measurement';
import type { MeasurementValue } from '@/types/measurement';
import type { MeasurementDefinition } from '@/constants/garments';
import type { GarmentTypeRecord, MeasurementDefinitionRecord } from '@/types/templates';
import type { GarmentCatalogCategoryWithItems, GarmentCatalogItem, GarmentCatalogResponse } from '@/types/catalog';
import type { OrderDetailsData } from '@/types/orderDetails';
import type { EditItemModalState } from '@/types/orderDetails';

function str(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

export interface UseOrderMeasurementsArgs {
  orderData: OrderDetailsData | null;
  garmentTypes: GarmentTypeRecord[];
  orderId: string | undefined;
  onOrderUpdated: (updater: (prev: OrderDetailsData) => OrderDetailsData) => void;
  t: (key: string) => string;
}

export interface UseOrderMeasurementsResult {
  displayDefinitionsByGarment: Record<string, MeasurementDefinition[]>;
  displayDefinitionErrors: Record<string, boolean>;
  resolvedCatalogItems: Record<string, GarmentCatalogItem>;
  resolvedCatalogCategoryLabels: Record<string, string>;
  catalogSectionsExpanded: Record<string, boolean>;
  setCatalogSectionsExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  orderGarmentIdsSorted: string[];
  enabledGarmentIdsForEdit: Set<string>;
  editItemModal: EditItemModalState;
  editMeasurements: Record<string, Record<string, string>>;
  editDefinitionsByGarment: Record<string, MeasurementDefinition[]>;
  editDefinitionErrors: Record<string, boolean>;
  editDefinitionsLoading: boolean;
  editCatalogSelections: Record<string, Record<string, string | string[]>>;
  editCategoriesByGarment: Record<string, GarmentCatalogCategoryWithItems[]>;
  editItemsByCategoryByGarment: Record<string, Record<string, GarmentCatalogItem[]>>;
  editCatalogLoading: Record<string, boolean>;
  saveLoading: boolean;
  openEditMeasurementItemModal: (garmentId: string, measurementKey: string) => void;
  openEditCatalogItemModal: (garmentId: string, categoryCode: string) => void;
  handleCloseEditItemModal: () => void;
  updateEditMeasurementValue: (garmentId: string, key: string, value: MeasurementValue) => void;
  handleEditCatalogSelectionChange: (garmentId: string, categoryCode: string, itemId: string | null) => void;
  handleSaveEditItem: () => Promise<void>;
}

export function useOrderMeasurements({
  orderData,
  garmentTypes,
  orderId,
  onOrderUpdated,
  t,
}: UseOrderMeasurementsArgs): UseOrderMeasurementsResult {
  const [displayDefinitionsByGarment, setDisplayDefinitionsByGarment] = useState<Record<string, MeasurementDefinition[]>>({});
  const [displayDefinitionErrors, setDisplayDefinitionErrors] = useState<Record<string, boolean>>({});
  const [resolvedCatalogItems, setResolvedCatalogItems] = useState<Record<string, GarmentCatalogItem>>({});
  const [resolvedCatalogCategoryLabels, setResolvedCatalogCategoryLabels] = useState<Record<string, string>>({});
  const [catalogSectionsExpanded, setCatalogSectionsExpanded] = useState<Record<string, boolean>>({});

  const [editItemModal, setEditItemModal] = useState<EditItemModalState>(null);
  const [editMeasurements, setEditMeasurements] = useState<Record<string, Record<string, string>>>({});
  const [editDefinitionsByGarment, setEditDefinitionsByGarment] = useState<Record<string, MeasurementDefinition[]>>({});
  const [editDefinitionErrors, setEditDefinitionErrors] = useState<Record<string, boolean>>({});
  const [editDefinitionsLoading, setEditDefinitionsLoading] = useState(false);
  const [editCatalogSelections, setEditCatalogSelections] = useState<Record<string, Record<string, string | string[]>>>({});
  const [editCategoriesByGarment, setEditCategoriesByGarment] = useState<Record<string, GarmentCatalogCategoryWithItems[]>>({});
  const [editItemsByCategoryByGarment, setEditItemsByCategoryByGarment] = useState<Record<string, Record<string, GarmentCatalogItem[]>>>({});
  const [editCatalogLoading, setEditCatalogLoading] = useState<Record<string, boolean>>({});
  const [saveLoading, setSaveLoading] = useState(false);

  const enabledGarmentIdsForEdit = useMemo(
    () => new Set(garmentTypes.filter((g) => g.status === 'active').map((g) => g.id)),
    [garmentTypes]
  );

  const orderGarmentIdsSorted = useMemo(() => {
    const ids = new Set<string>([
      ...Object.keys(orderData?.measurements ?? {}),
      ...Object.keys(orderData?.catalogSelections ?? {}),
    ]);
    return sortGarmentIdsByOrder(Array.from(ids), garmentTypes);
  }, [orderData?.measurements, orderData?.catalogSelections, garmentTypes]);

  // Load display definitions when orderData.measurements changes
  useEffect(() => {
    const measurementGarmentIds = orderData?.measurements ? Object.keys(orderData.measurements) : [];
    if (measurementGarmentIds.length === 0) {
      setDisplayDefinitionsByGarment({});
      setDisplayDefinitionErrors({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      const next: Record<string, MeasurementDefinition[]> = {};
      const errors: Record<string, boolean> = {};
      await Promise.all(
        measurementGarmentIds.map(async (garmentId) => {
          try {
            const defsRes = await apiFetch<
              | MeasurementDefinitionRecord[]
              | { measurementDefinitions?: MeasurementDefinitionRecord[]; definitions?: MeasurementDefinitionRecord[]; measurements?: MeasurementDefinitionRecord[] }
            >(api.garmentTypeDefinitions(garmentId));
            const raw = Array.isArray(defsRes)
              ? defsRes
              : (defsRes as { measurementDefinitions?: MeasurementDefinitionRecord[] }).measurementDefinitions
                ?? (defsRes as { definitions?: MeasurementDefinitionRecord[] }).definitions
                ?? (defsRes as { measurements?: MeasurementDefinitionRecord[] }).measurements
                ?? [];
            const defs = Array.isArray(raw)
              ? raw
                  .map((d: MeasurementDefinitionRecord & { order?: number }) => definitionRecordToFormDefinition(d))
                  .sort((a, b) => a.displayOrder - b.displayOrder)
              : [];
            if (!cancelled) next[garmentId] = filterDefinitionsWithValidKey(defs);
          } catch {
            if (!cancelled) {
              next[garmentId] = [];
              errors[garmentId] = true;
            }
          }
        })
      );
      if (!cancelled) {
        setDisplayDefinitionsByGarment(next);
        setDisplayDefinitionErrors(errors);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [orderData?.measurements ? Object.keys(orderData.measurements).sort().join(',') : '']);

  // Load resolved catalog when orderData.catalogSelections changes
  useEffect(() => {
    if (!orderData?.catalogSelections || Object.keys(orderData.catalogSelections).length === 0) {
      setResolvedCatalogItems({});
      setResolvedCatalogCategoryLabels({});
      return;
    }
    let cancelled = false;
    const loadItems = async () => {
      const itemsById: Record<string, GarmentCatalogItem> = {};
      const categoryLabels: Record<string, string> = {};
      const garmentIds = Object.keys(orderData!.catalogSelections!);
      await Promise.all(
        garmentIds.map(async (garmentId) => {
          try {
            const res = await apiFetch<GarmentCatalogResponse>(
              api.garmentCatalog.forGarment(garmentId, true)
            );
            if (cancelled) return;
            for (const category of res.categories ?? []) {
              const label = category.name || category.code || category.id;
              categoryLabels[category.id] = label;
              categoryLabels[category.code] = label;
              for (const item of category.items ?? []) {
                itemsById[String(item.id)] = item;
              }
            }
          } catch {
            // skip
          }
        })
      );
      try {
        const resolved = await apiFetch<{ resolvedCatalogItems: Record<string, { name: string; color: string | null; categoryCode: string; categoryName: string | null; imageUrl?: string | null }> }>(
          api.ordersResolveCatalogItems,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ catalogSelections: orderData!.catalogSelections }),
          }
        );
        if (!cancelled && resolved?.resolvedCatalogItems) {
          for (const [itemId, info] of Object.entries(resolved.resolvedCatalogItems)) {
            const key = String(itemId);
            if (!itemsById[key]) {
              itemsById[key] = {
                id: itemId,
                categoryId: '',
                categoryCode: info.categoryCode,
                categoryName: info.categoryName ?? '',
                code: null,
                name: info.name,
                description: null,
                imageUrl: info.imageUrl ?? null,
                color: info.color,
                properties: null,
                sortOrder: 0,
                enabled: true,
                createdAt: '',
                updatedAt: '',
              };
            } else {
              itemsById[key] = { ...itemsById[key], name: info.name, color: info.color ?? itemsById[key].color, imageUrl: info.imageUrl ?? itemsById[key].imageUrl };
            }
          }
        }
      } catch {
        // keep items from catalog fetch only
      }
      if (!cancelled) {
        setResolvedCatalogItems(itemsById);
        setResolvedCatalogCategoryLabels(categoryLabels);
      }
    };
    loadItems();
    return () => { cancelled = true; };
  }, [orderData?.catalogSelections]);

  const openEditMeasurementItemModal = useCallback(
    (garmentId: string, measurementKey: string) => {
      if (!orderData || orderData.rawStatus === 'COMPLETED') return;
      if (!enabledGarmentIdsForEdit.has(garmentId)) return;
      const m = orderData.measurements?.[garmentId] ?? {};
      const currentValue = m[measurementKey] != null ? String(m[measurementKey]) : '';
      setEditMeasurements({ [garmentId]: { [measurementKey]: currentValue } });
      setEditDefinitionsByGarment({});
      setEditItemModal({ type: 'measurement', garmentId, measurementKey });
    },
    [orderData, enabledGarmentIdsForEdit]
  );

  const openEditCatalogItemModal = useCallback(
    (garmentId: string, categoryCode: string) => {
      if (!orderData || orderData.rawStatus === 'COMPLETED') return;
      if (!enabledGarmentIdsForEdit.has(garmentId)) return;
      const catalogForGarment = orderData.catalogSelections?.[garmentId] ?? {};
      const currentValue = catalogForGarment[categoryCode];
      const selection = currentValue != null
        ? (Array.isArray(currentValue) ? currentValue[0] ?? '' : currentValue)
        : '';
      setEditCatalogSelections({ [garmentId]: { [categoryCode]: selection } });
      setEditCategoriesByGarment({});
      setEditItemsByCategoryByGarment({});
      setEditItemModal({ type: 'catalog', garmentId, categoryCode });
    },
    [orderData, enabledGarmentIdsForEdit]
  );

  const handleCloseEditItemModal = useCallback(() => {
    if (saveLoading) return;
    setEditItemModal(null);
    setEditMeasurements({});
    setEditDefinitionsByGarment({});
    setEditDefinitionErrors({});
    setEditCatalogSelections({});
    setEditCategoriesByGarment({});
    setEditItemsByCategoryByGarment({});
  }, [saveLoading]);

  // Load definitions when edit measurement modal opens
  useEffect(() => {
    const garmentIds = editItemModal?.type === 'measurement' ? [editItemModal.garmentId] : [];
    if (garmentIds.length === 0) {
      setEditDefinitionsByGarment({});
      setEditDefinitionErrors({});
      return;
    }
    let cancelled = false;
    setEditDefinitionsLoading(true);
    const loadDefs = async () => {
      const next: Record<string, MeasurementDefinition[]> = {};
      const errors: Record<string, boolean> = {};
      for (const gid of garmentIds) {
        try {
          const defsRes = await apiFetch<
            | MeasurementDefinitionRecord[]
            | { measurementDefinitions?: MeasurementDefinitionRecord[]; definitions?: MeasurementDefinitionRecord[]; measurements?: MeasurementDefinitionRecord[] }
          >(api.garmentTypeDefinitions(gid));
          const raw = Array.isArray(defsRes)
            ? defsRes
            : (defsRes as { measurementDefinitions?: MeasurementDefinitionRecord[] }).measurementDefinitions
              ?? (defsRes as { definitions?: MeasurementDefinitionRecord[] }).definitions
              ?? (defsRes as { measurements?: MeasurementDefinitionRecord[] }).measurements
              ?? [];
          const defs = Array.isArray(raw)
            ? raw
                .map((d: MeasurementDefinitionRecord & { order?: number }) => definitionRecordToFormDefinition(d))
                .sort((a, b) => a.displayOrder - b.displayOrder)
            : [];
          if (!cancelled) next[gid] = filterDefinitionsWithValidKey(defs);
        } catch {
          if (!cancelled) {
            next[gid] = [];
            errors[gid] = true;
          }
        }
      }
      if (!cancelled) {
        setEditDefinitionsByGarment(next);
        setEditDefinitionErrors(errors);
        setEditDefinitionsLoading(false);
      }
    };
    loadDefs();
    return () => { cancelled = true; };
  }, [editItemModal?.type === 'measurement' ? editItemModal.garmentId : null]);

  // Load catalog when edit catalog modal opens
  useEffect(() => {
    const garmentIds = editItemModal?.type === 'catalog' ? [editItemModal.garmentId] : [];
    if (garmentIds.length === 0) {
      setEditCategoriesByGarment({});
      setEditItemsByCategoryByGarment({});
      return;
    }
    let cancelled = false;
    const loadCatalogData = async () => {
      const newCategoriesByGarment: Record<string, GarmentCatalogCategoryWithItems[]> = {};
      const newItemsByCategoryByGarment: Record<string, Record<string, GarmentCatalogItem[]>> = {};
      await Promise.all(
        garmentIds.map(async (gid) => {
          setEditCatalogLoading((prev) => ({ ...prev, [gid]: true }));
          try {
            const res = await apiFetch<GarmentCatalogResponse>(api.garmentCatalog.forGarment(gid, true));
            const categories = (res.categories ?? []).filter((c) => c.enabled);
            newCategoriesByGarment[gid] = categories;
            const itemsByCategory: Record<string, GarmentCatalogItem[]> = {};
            for (const category of categories) {
              itemsByCategory[category.code] = (category.items ?? []).filter((i) => i.enabled);
            }
            newItemsByCategoryByGarment[gid] = itemsByCategory;
          } catch {
            newCategoriesByGarment[gid] = [];
            newItemsByCategoryByGarment[gid] = {};
          } finally {
            if (!cancelled) {
              setEditCatalogLoading((prev) => ({ ...prev, [gid]: false }));
            }
          }
        })
      );
      if (!cancelled) {
        setEditCategoriesByGarment(newCategoriesByGarment);
        setEditItemsByCategoryByGarment(newItemsByCategoryByGarment);
      }
    };
    loadCatalogData();
    return () => { cancelled = true; };
  }, [editItemModal?.type === 'catalog' ? editItemModal.garmentId : null]);

  const updateEditMeasurementValue = useCallback((garmentId: string, key: string, value: MeasurementValue) => {
    setEditMeasurements((prev) => ({
      ...prev,
      [garmentId]: {
        ...(prev[garmentId] ?? {}),
        [key]: measurementValueToStorage(value),
      },
    }));
  }, []);

  const handleEditCatalogSelectionChange = useCallback(
    (garmentId: string, categoryCode: string, itemId: string | null) => {
      setEditCatalogSelections((prev) => {
        const garmentSelections = { ...(prev[garmentId] ?? {}) };
        if (itemId === null) {
          delete garmentSelections[categoryCode];
        } else {
          garmentSelections[categoryCode] = itemId;
        }
        return { ...prev, [garmentId]: garmentSelections };
      });
    },
    []
  );

  const handleSaveEditItem = useCallback(async () => {
    if (!orderId || !orderData || !editItemModal) return;
    const { garmentId } = editItemModal;

    if (editItemModal.type === 'measurement') {
      const { measurementKey } = editItemModal;
      const m = editMeasurements[garmentId];
      const newValue = m?.[measurementKey] ?? '';
      const measurementsForGarment = {
        ...(orderData.measurements?.[garmentId] ?? {}),
        [measurementKey]: newValue,
      };
      const measurementsToSend: Record<string, Record<string, string>> = {
        ...(orderData.measurements ?? {}),
        [garmentId]: measurementsForGarment,
      };
      const orderGarmentSnapshots = Object.keys(measurementsToSend).map((gid) => ({
        garmentTypeId: gid,
        values: measurementsToSend[gid] || {},
      }));
      setSaveLoading(true);
      try {
        const updated = await apiFetch<{
          id: string;
          orderNumber: string;
          status: string;
          totalAmount: number;
          paidAmount: number;
          orderDate: string;
          measurements: Record<string, Record<string, unknown>> | null;
          catalogSelections: Record<string, Record<string, string | string[]>> | null;
          notes?: string | null;
        }>(api.orders(orderId), {
          method: 'PUT',
          body: JSON.stringify({
            totalAmount: orderData.total,
            paidAmount: orderData.advance,
            status: orderData.rawStatus,
            notes: orderData.notes?.trim() || null,
            measurements: measurementsToSend,
            orderGarmentSnapshots,
            catalogSelections: orderData.catalogSelections ?? undefined,
          }),
        });
        const normalizedMeasurements: Record<string, Record<string, string>> | undefined =
          updated.measurements == null
            ? undefined
            : (() => {
                const out: Record<string, Record<string, string>> = {};
                for (const [gid, meas] of Object.entries(updated.measurements)) {
                  if (meas && typeof meas === 'object') {
                    const row: Record<string, string> = {};
                    for (const k of Object.keys(meas)) row[k] = str(meas[k]);
                    if (Object.keys(row).length > 0) out[gid] = row;
                  }
                }
                return Object.keys(out).length > 0 ? out : undefined;
              })();
        onOrderUpdated((prev) => ({ ...prev, measurements: normalizedMeasurements }));
        handleCloseEditItemModal();
        Alert.alert(t('common.success'), t('orderDetails.editSuccess'));
      } catch (e) {
        Alert.alert(t('common.error'), e instanceof Error ? e.message : t('orderDetails.editError'));
      } finally {
        setSaveLoading(false);
      }
      return;
    }

    if (editItemModal.type === 'catalog') {
      const { categoryCode } = editItemModal;
      const catalogForGarment = editCatalogSelections[garmentId] ?? {};
      const newSelection = catalogForGarment[categoryCode];
      const catalogSelectionsToSend: Record<string, Record<string, string | string[]>> = {
        ...(orderData.catalogSelections ?? {}),
        [garmentId]: {
          ...(orderData.catalogSelections?.[garmentId] ?? {}),
          [categoryCode]: newSelection ?? '',
        },
      };
      setSaveLoading(true);
      try {
        const updated = await apiFetch<{
          id: string;
          orderNumber: string;
          status: string;
          totalAmount: number;
          paidAmount: number;
          orderDate: string;
          measurements: Record<string, Record<string, unknown>> | null;
          catalogSelections: Record<string, Record<string, string | string[]>> | null;
          notes?: string | null;
        }>(api.orders(orderId), {
          method: 'PUT',
          body: JSON.stringify({
            totalAmount: orderData.total,
            paidAmount: orderData.advance,
            status: orderData.rawStatus,
            notes: orderData.notes?.trim() || null,
            measurements: orderData.measurements ?? undefined,
            catalogSelections: catalogSelectionsToSend,
          }),
        });
        onOrderUpdated((prev) => ({ ...prev, catalogSelections: updated.catalogSelections ?? undefined }));
        handleCloseEditItemModal();
        Alert.alert(t('common.success'), t('orderDetails.editSuccess'));
      } catch (e) {
        Alert.alert(t('common.error'), e instanceof Error ? e.message : t('orderDetails.editError'));
      } finally {
        setSaveLoading(false);
      }
    }
  }, [
    orderId,
    orderData,
    editItemModal,
    editMeasurements,
    editCatalogSelections,
    onOrderUpdated,
    t,
  ]);

  return {
    displayDefinitionsByGarment,
    displayDefinitionErrors,
    resolvedCatalogItems,
    resolvedCatalogCategoryLabels,
    catalogSectionsExpanded,
    setCatalogSectionsExpanded,
    orderGarmentIdsSorted,
    enabledGarmentIdsForEdit,
    editItemModal,
    editMeasurements,
    editDefinitionsByGarment,
    editDefinitionErrors,
    editDefinitionsLoading,
    editCatalogSelections,
    editCategoriesByGarment,
    editItemsByCategoryByGarment,
    editCatalogLoading,
    saveLoading,
    openEditMeasurementItemModal,
    openEditCatalogItemModal,
    handleCloseEditItemModal,
    updateEditMeasurementValue,
    handleEditCatalogSelectionChange,
    handleSaveEditItem,
  };
}
