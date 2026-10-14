import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { useCustomBack } from '@/contexts/PageTitleContext';
import { Section } from '@/components/ui/Section';
import { useRouter } from 'expo-router';
import { Calendar } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useAuth } from '@/contexts/AuthContext';
import { useOrderDraft } from '@/contexts/OrderDraftContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { clearDraftStorage } from '@/lib/order';
import { AppFloatingFooter, FOOTER_CONTENT_HEIGHT } from '@/components/AppFloatingFooter';
import { PaywallModal } from '@/components/subscription';
import {
  api,
  apiFetch,
  getErrorMessage,
  getLocalizedApiMessage,
  ApiError,
  ApiErrorCode,
  API_BASE_URL,
  uploadImage,
  fetchGarmentTypesList,
  normalizeGarmentTypeRecord,
  definitionRecordToFormDefinition,
} from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { sortGarmentIdsByOrder } from '@/lib/order';
import type { GarmentTypeRecord, MeasurementDefinitionRecord } from '@/types/templates';
import type { MeasurementDefinition } from '@/constants/garments';
import type { GarmentCatalogItem, GarmentCatalogResponse } from '@/types/catalog';
import {
  filterDefinitionsWithValidKey,
  formatMeasurementValueForDisplay,
} from '@/lib/measurement';
import { useSettings } from '@/contexts/SettingsContext';
import { getSnapshotEntriesInDefinitionOrder, getSnapshotDisplayLabel } from '@/utils';
import { ErrorText } from '@/components/ui/ErrorText';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';
import { useTheme } from '@/contexts/ThemeContext';
import { toFittingPayload } from '@/lib/fittings';

const DEFAULT_DELIVERY_WEEKS = 3;
const DEFAULT_FITTING_DAYS_BEFORE_DELIVERY = 7;

function getGarmentDisplayName(garment: GarmentTypeRecord, garmentUnavailableLabel: string): string {
  const name = (garment.label ?? garment.name ?? '').trim();
  return name || garmentUnavailableLabel;
}

/** Resolve stored value for select: index → option label (matches PDF). */
function resolveSelectDisplayValue(value: string, options?: string[] | null): string {
  if (!options?.length) return value;
  const trimmed = String(value).trim();
  const asIndex = parseInt(trimmed, 10);
  if (!Number.isNaN(asIndex) && asIndex >= 0 && asIndex < options.length) {
    return options[asIndex] ?? trimmed;
  }
  if (options.includes(trimmed)) return trimmed;
  return value;
}

export default function SummaryScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { colors, isDark } = useTheme();
  const { preferredCurrency } = useSettings();
  const { user } = useAuth();
  const { draftOrder, orderMode, updatePayment, updateDeliveryDate, updateFittings, updateSketchDraftUri } = useOrderDraft();
  const { upgradeToPro, checkCanCreateOrder, getLimitMessages } = useSubscription();
  const canCreateOrder = checkCanCreateOrder();
  const limitMsgs = getLimitMessages();

  useCustomBack(() => router.dismissTo('/new-order/measurements'), t('common.back'));
  
  const [totalAmount, setTotalAmount] = useState(() => {
    const v = draftOrder.payment.totalAmount;
    return v === undefined || v === 0 ? '' : String(v);
  });
  const [paidAmount, setPaidAmount] = useState(() => {
    const v = draftOrder.payment.paidAmount;
    return v === undefined || v === 0 ? '' : String(v);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [garments, setGarments] = useState<GarmentTypeRecord[]>([]);
  const [garmentsLoadError, setGarmentsLoadError] = useState<string | null>(null);
  const garmentsLoadingRef = useRef(false);
  const [summaryDefinitionsByGarment, setSummaryDefinitionsByGarment] = useState<Record<string, MeasurementDefinition[]>>({});
  const [summaryDefinitionErrors, setSummaryDefinitionErrors] = useState<Record<string, boolean>>({});
  const [resolvedCatalogItems, setResolvedCatalogItems] = useState<Record<string, GarmentCatalogItem>>({});
  const [showFittingDatePicker, setShowFittingDatePicker] = useState(false);
  const [selectedFittingIndex, setSelectedFittingIndex] = useState<number | null>(null);
  const [pendingNewFittingDate, setPendingNewFittingDate] = useState<Date | null>(null);

  const totalNum = parseFloat(String(totalAmount ?? '').trim()) || 0;
  const paidNum = parseFloat(String(paidAmount ?? '').trim()) || 0;
  const remaining = Math.max(0, totalNum - paidNum);

  // Set default delivery date on mount if not already set
  useEffect(() => {
    if (!draftOrder.deliveryDate) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + (DEFAULT_DELIVERY_WEEKS * 7));
      updateDeliveryDate(defaultDate.toISOString());
    }
  }, []);

  const deliveryDate = draftOrder.deliveryDate ? new Date(draftOrder.deliveryDate) : new Date();
  const fittings = draftOrder.fittings ?? [];
  const minDeliveryDate = new Date();
  minDeliveryDate.setDate(minDeliveryDate.getDate() + 1);

  const handleDateChange = (event: { type: string }, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate) {
      updateDeliveryDate(selectedDate.toISOString());
    }
  };

  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: deliveryDate,
        mode: 'date',
        minimumDate: minDeliveryDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) updateDeliveryDate(date.toISOString());
        },
      });
    } else {
      setShowDatePicker(true);
    }
  };

  const commitNewFitting = (date: Date) => {
    const next = [
      ...fittings,
      { scheduledAt: date.toISOString(), status: 'SCHEDULED' as const, notes: null },
    ];
    next.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    updateFittings(next);
  };

  const addFitting = () => {
    const nextDate = new Date(deliveryDate);
    nextDate.setDate(nextDate.getDate() - DEFAULT_FITTING_DAYS_BEFORE_DELIVERY);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: nextDate,
        mode: 'date',
        onChange: (event, date) => {
          if (event.type !== 'set' || !date) return;
          commitNewFitting(date);
        },
      });
      return;
    }
    setSelectedFittingIndex(null);
    setPendingNewFittingDate(nextDate);
    setShowFittingDatePicker(true);
  };

  const removeFitting = (index: number) => {
    const next = fittings.filter((_, i) => i !== index);
    updateFittings(next);
  };

  const openFittingDatePicker = (index: number) => {
    const fitting = fittings[index];
    if (!fitting) return;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: new Date(fitting.scheduledAt),
        mode: 'date',
        onChange: (event, date) => {
          if (event.type !== 'set' || !date) return;
          const next = [...fittings];
          next[index] = { ...next[index], scheduledAt: date.toISOString() };
          next.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
          updateFittings(next);
        },
      });
      return;
    }
    setSelectedFittingIndex(index);
    setShowFittingDatePicker(true);
  };

  const onFittingDateChange = (event: { type: string }, selectedDate?: Date) => {
    if (event.type !== 'set' || !selectedDate) return;
    if (selectedFittingIndex === null) {
      setPendingNewFittingDate(selectedDate);
      return;
    }
    const next = [...fittings];
    if (!next[selectedFittingIndex]) return;
    next[selectedFittingIndex] = {
      ...next[selectedFittingIndex],
      scheduledAt: selectedDate.toISOString(),
    };
    next.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    updateFittings(next);
  };

  const closeFittingPicker = () => {
    setShowFittingDatePicker(false);
    setSelectedFittingIndex(null);
    setPendingNewFittingDate(null);
  };

  const confirmAddFittingFromPicker = () => {
    if (!pendingNewFittingDate) return;
    commitNewFitting(pendingNewFittingDate);
    closeFittingPicker();
  };

  const formatDeliveryDate = (date: Date): string => {
    return date.toLocaleDateString(locale === 'ro' ? 'ro-RO' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  useEffect(() => {
    const ids = draftOrder.selectedGarmentIds;
    if (ids.length === 0) {
      setSummaryDefinitionsByGarment({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      const next: Record<string, MeasurementDefinition[]> = {};
      const errors: Record<string, boolean> = {};
      await Promise.all(
        ids.map(async (garmentId) => {
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
        setSummaryDefinitionsByGarment(next);
        setSummaryDefinitionErrors((prev) => ({ ...prev, ...errors }));
      }
    };
    load();
    return () => { cancelled = true; };
  }, [draftOrder.selectedGarmentIds.join(',')]);

  const fetchGarments = useCallback(async () => {
    if (garmentsLoadingRef.current) return;
    garmentsLoadingRef.current = true;
    try {
      const rawList = await fetchGarmentTypesList();
      const list = Array.isArray(rawList)
        ? rawList.map((g: unknown) => normalizeGarmentTypeRecord(g as Parameters<typeof normalizeGarmentTypeRecord>[0]))
        : [];
      setGarmentsLoadError(null);
      setGarments(list);
    } catch {
      setGarments([]);
      setGarmentsLoadError(t('garments.loadError'));
    } finally {
      garmentsLoadingRef.current = false;
    }
  }, [t]);

  useEffect(() => {
    fetchGarments();
  }, [fetchGarments]);

  // Fetch catalog items for display (from garment catalog)
  useEffect(() => {
    const catalogSelections = draftOrder.catalogSelections;
    if (!catalogSelections || Object.keys(catalogSelections).length === 0) {
      setResolvedCatalogItems({});
      return;
    }

    let cancelled = false;
    const loadItems = async () => {
      const itemsById: Record<string, GarmentCatalogItem> = {};
      const garmentIds = Object.keys(catalogSelections);
      await Promise.all(
        garmentIds.map(async (garmentId) => {
          try {
            const res = await apiFetch<GarmentCatalogResponse>(
              api.garmentCatalog.forGarment(garmentId, true)
            );
            if (cancelled) return;
            for (const category of res.categories ?? []) {
              for (const item of category.items ?? []) {
                itemsById[item.id] = item;
              }
            }
          } catch {
            // Garment catalog may be empty or unavailable; skip
          }
        })
      );
      if (!cancelled) {
        setResolvedCatalogItems(itemsById);
      }
    };
    loadItems();
    return () => { cancelled = true; };
  }, [draftOrder.catalogSelections]);

  const garmentNameById = new Map<string, string>();
  const garmentById = new Map<string, GarmentTypeRecord>();
  const garmentUnavailableLabel = t('orderDetails.garmentDeleted');
  for (const g of garments) {
    garmentNameById.set(g.id, getGarmentDisplayName(g, garmentUnavailableLabel));
    garmentById.set(g.id, g);
  }

  const sortedSelectedIds = sortGarmentIdsByOrder(draftOrder.selectedGarmentIds, garments);
  const garmentIdsWithMeasurements = sortedSelectedIds.filter(
    (id) => draftOrder.measurements[id] && Object.keys(draftOrder.measurements[id]).length > 0
  );
  const garmentIdsWithCatalog = sortedSelectedIds.filter((id) => {
    const sel = draftOrder.catalogSelections?.[id];
    return sel && Object.keys(sel).length > 0;
  });

  const handleFinalize = async () => {
    const isCreating = orderMode === 'create';
    if (isCreating && !canCreateOrder) return;
    if (!draftOrder.customer.id) {
      Alert.alert(t('common.error'), t('newOrder.summary.selectClient'));
      return;
    }
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      Alert.alert(t('common.error'), t('newOrder.summary.enterTotal'));
      return;
    }
    if (draftOrder.selectedGarmentIds.length === 0) {
      Alert.alert(t('common.error'), t('newOrder.summary.selectItems'));
      return;
    }

    setIsLoading(true);
    try {
      const rawList = await fetchGarmentTypesList();
      const list = Array.isArray(rawList)
        ? rawList.map((g: unknown) => normalizeGarmentTypeRecord(g as Parameters<typeof normalizeGarmentTypeRecord>[0]))
        : [];
      const enabledIds = new Set(list.filter((g) => g.status === 'active').map((g) => g.id));
      const disabledSelected = draftOrder.selectedGarmentIds.filter((id) => !enabledIds.has(id));
      if (disabledSelected.length > 0) {
        Alert.alert(
          t('newOrder.summary.itemUnavailable'),
          t('newOrder.summary.itemUnavailableMessage')
        );
        setIsLoading(false);
        return;
      }

      const paid = parseFloat(paidAmount || '0') || 0;
      updatePayment({
        totalAmount: parseFloat(totalAmount),
        paidAmount: paid,
      });

      const sortedIds = sortGarmentIdsByOrder(draftOrder.selectedGarmentIds, list);
      // One snapshot per selected garment only (empty object allowed for zero-definition garments)
      const measurements: Record<string, Record<string, string>> = {};
      for (const garmentId of sortedIds) {
        const garmentMeasurements = draftOrder.measurements[garmentId];
        measurements[garmentId] = garmentMeasurements && typeof garmentMeasurements === 'object'
          ? garmentMeasurements
          : {};
      }

      // Build catalog selections (filter out empty selections)
      const catalogSelections: Record<string, Record<string, string | string[]>> = {};
      for (const garmentId of sortedIds) {
        const garmentSelections = draftOrder.catalogSelections[garmentId];
        if (garmentSelections && typeof garmentSelections === 'object') {
          const filtered: Record<string, string | string[]> = {};
          for (const [categoryCode, itemId] of Object.entries(garmentSelections)) {
            if (itemId && (typeof itemId === 'string' ? itemId.trim() !== '' : itemId.length > 0)) {
              filtered[categoryCode] = itemId;
            }
          }
          if (Object.keys(filtered).length > 0) {
            catalogSelections[garmentId] = filtered;
          }
        }
      }

      // Build orderGarmentSnapshots for AI preview support (in display order)
      const orderGarmentSnapshots = sortedIds.map((garmentId) => ({
        garmentTypeId: garmentId,
        values: measurements[garmentId] || {},
      }));

      const orderPayload = {
        customerId: draftOrder.customer.id,
        totalAmount: parseFloat(totalAmount),
        paidAmount: paid,
        deliveryDate: draftOrder.deliveryDate || undefined,
        notes: draftOrder.notes || undefined,
        fittings: (draftOrder.fittings ?? []).map(toFittingPayload),
        measurements,
        orderGarmentSnapshots,
        catalogSelections: Object.keys(catalogSelections).length > 0 ? catalogSelections : undefined,
      };

      const isEditing = orderMode === 'edit';

      let order: { id: string; orderNumber: string };
      if (isEditing) {
        if (!draftOrder.orderId) {
          Alert.alert(t('common.error'), t('newOrder.summary.missingOrderId'));
          setIsLoading(false);
          return;
        }
        order = await apiFetch<{ id: string; orderNumber: string }>(api.orders(draftOrder.orderId), {
          method: 'PUT',
          body: JSON.stringify(orderPayload),
        });
      } else {
        // Create new order
        try {
          order = await apiFetch<{ id: string; orderNumber: string }>(api.orders(), {
            method: 'POST',
            body: JSON.stringify(orderPayload),
          });
        } catch (error: unknown) {
          const err = error instanceof ApiError ? error : (error as { code?: string; message?: string });
          console.log('Order creation error:', { code: err.code, message: err.message });
          if (
            err.code === ApiErrorCode.SUBSCRIPTION_LIMIT_REACHED ||
            (typeof err.message === 'string' &&
              (err.message.includes('Free plan allows only') || err.message.includes(ApiErrorCode.SUBSCRIPTION_LIMIT_REACHED)))
          ) {
            console.log('Subscription limit reached - showing paywall');
            setShowPaywall(true);
            setIsLoading(false);
            return;
          }
          throw error;
        }
      }

      if (draftOrder.sketchDraftUri) {
        try {
          const uploadedUrl = await uploadImage(draftOrder.sketchDraftUri);
          await apiFetch(api.orderSketches(order.id), {
            method: 'POST',
            body: JSON.stringify({
              imageUrl: uploadedUrl,
              title: `Order draft sketch ${new Date().toISOString()}`,
            }),
          });
          updateSketchDraftUri(undefined);
        } catch (sketchError) {
          console.warn('Failed to attach draft sketch to order:', sketchError);
        }
      }

      Alert.alert(
        t('common.success'),
        isEditing
          ? t('newOrder.summary.updateSuccess', { number: order.orderNumber })
          : t('newOrder.summary.createSuccess', { number: order.orderNumber }),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              const orderId = order.id;
              if (user?.id) clearDraftStorage(user.id).catch(() => {});
              router.replace(`/order-details/${orderId}`);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        t('common.error'),
        getLocalizedApiMessage(
          error,
          t,
          orderMode === 'edit' ? t('newOrder.summary.updateError') : t('newOrder.summary.createError')
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    setIsUpgrading(true);
    try {
      const result = await upgradeToPro(plan);
      if (result.success) {
        setShowPaywall(false);
      } else if (result.errorMessage) {
        Alert.alert(t('common.error'), result.errorMessage);
      }
    } catch (error) {
      Alert.alert(t('common.error'), getErrorMessage(error, t('subscription.checkoutError')));
    } finally {
      setIsUpgrading(false);
    }
  };

  const isCreating = orderMode === 'create';
  const hasValidTotal = totalNum > 0;
  const canFinalize =
    !!draftOrder.customer.id &&
    draftOrder.selectedGarmentIds.length >= 1 &&
    hasValidTotal &&
    (!isCreating || canCreateOrder);
  const insets = useSafeAreaInsets();
  const footerBottomOffset = FOOTER_CONTENT_HEIGHT + insets.bottom;

  return (
    <>
    <ScreenContainer noPadding>
      <View style={styles.contentWrapper}>
        <KeyboardAwareScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: footerBottomOffset }]}
          keyboardShouldPersistTaps="handled"
          bottomOffset={footerBottomOffset}
        >
          {garmentsLoadError ? (
            <ErrorText style={styles.loadErrorBanner}>{garmentsLoadError}</ErrorText>
          ) : null}
          <Section style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('newOrder.summary.sectionOrderInfo')}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.paper ?? colors.background, borderColor: colors.ruleSoft ?? colors.rule ?? colors.border }]}>
              <Text style={[styles.clientName, { color: colors.textPrimary }]}>{draftOrder.customer.name || '—'}</Text>
              <Text style={[styles.clientPhone, { color: colors.ink3 }]}>{draftOrder.customer.phone || '—'}</Text>
              <Text style={[styles.orderDate, { color: colors.ink3 }]}>
                Data comenzii: {new Date().toLocaleDateString('ro-RO')}
              </Text>
            </View>

            <Text style={[styles.deliveryLabel, { color: colors.ink3 }]}>{t('newOrder.summary.deliveryDateLabel')}</Text>
            <TouchableOpacity
              style={styles.dateDisplay}
              onPress={openDatePicker}
              activeOpacity={0.7}
            >
              <View style={styles.dateContent}>
                <Calendar size={20} color={colors.ink3} />
                <Text style={[styles.dateText, { color: colors.textPrimary }]}>{formatDeliveryDate(deliveryDate)}</Text>
              </View>
            </TouchableOpacity>
            {Platform.OS === 'ios' && showDatePicker && (
              <View style={styles.datePickerInline}>
                <View style={styles.datePickerDoneRow}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)} activeOpacity={0.7}>
                    <Text style={[styles.datePickerDoneText, { color: colors.brass ?? colors.primary }]}>{t('common.done')}</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={deliveryDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={minDeliveryDate}
                  textColor={colors.textPrimary}
                  themeVariant={isDark ? 'dark' : 'light'}
                />
              </View>
            )}

            <View style={styles.fittingsHeader}>
              <Text style={[styles.deliveryLabel, { color: colors.ink3 }]}>Date probe</Text>
              <TouchableOpacity onPress={addFitting} activeOpacity={0.7}>
                <Text style={[styles.addFittingText, { color: colors.brass ?? colors.primary }]}>+ Adaugă probă</Text>
              </TouchableOpacity>
            </View>
            {fittings.length === 0 ? (
              <Text style={[styles.fittingsEmptyText, { color: colors.ink3 }]}>
                Nu există probe planificate.
              </Text>
            ) : (
              fittings.map((fitting, index) => (
                <View key={`${fitting.id ?? 'new'}-${index}`} style={styles.fittingRow}>
                  <TouchableOpacity
                    style={styles.fittingDateButton}
                    onPress={() => openFittingDatePicker(index)}
                    activeOpacity={0.7}
                  >
                    <Calendar size={16} color={colors.ink3} />
                    <Text style={[styles.fittingDateText, { color: colors.textPrimary }]}>
                      {formatDeliveryDate(new Date(fitting.scheduledAt))}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeFitting(index)} activeOpacity={0.7}>
                    <Text style={[styles.removeFittingText, { color: colors.ember ?? colors.error }]}>Șterge</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
            {Platform.OS === 'ios' && showFittingDatePicker && (
              <View style={styles.datePickerInline}>
                <View style={styles.datePickerDoneRow}>
                  <TouchableOpacity onPress={closeFittingPicker} activeOpacity={0.7}>
                    <Text style={[styles.datePickerDoneText, { color: colors.ink3 }]}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  {selectedFittingIndex === null ? (
                    <TouchableOpacity onPress={confirmAddFittingFromPicker} activeOpacity={0.7}>
                      <Text style={[styles.datePickerDoneText, { color: colors.brass ?? colors.primary }]}>Salvează</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={closeFittingPicker} activeOpacity={0.7}>
                      <Text style={[styles.datePickerDoneText, { color: colors.brass ?? colors.primary }]}>{t('common.done')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <DateTimePicker
                  value={
                    selectedFittingIndex === null
                      ? (pendingNewFittingDate ?? new Date())
                      : new Date(fittings[selectedFittingIndex].scheduledAt)
                  }
                  mode="date"
                  display="spinner"
                  onChange={onFittingDateChange}
                  textColor={colors.textPrimary}
                  themeVariant={isDark ? 'dark' : 'light'}
                />
              </View>
            )}


            {/* Garments & measurements — PDF-style layout */}
            {garmentIdsWithMeasurements.length === 0 && garmentIdsWithCatalog.length === 0 ? (
              <View style={styles.pdfSection}>
                <Text style={[styles.pdfSectionTitle, { color: colors.textPrimary, borderBottomColor: colors.rule ?? colors.border }]}>{t('newOrder.summary.noItemsSelected')}</Text>
              </View>
            ) : null}
            {garmentIdsWithMeasurements.map((garmentId) => {
              const displayName = garmentNameById.get(garmentId) ?? garmentUnavailableLabel;
              const entries = draftOrder.measurements[garmentId];
              const defs = summaryDefinitionsByGarment[garmentId] ?? [];
              const rows =
                defs.length > 0
                  ? getSnapshotEntriesInDefinitionOrder(entries, defs)
                  : Object.entries(entries ?? {}).filter(([, v]) => v != null && String(v).trim() !== '');
              return (
                <View key={`meas-${garmentId}`} style={styles.pdfSection}>
                  {summaryDefinitionErrors[garmentId] ? (
                    <ErrorText style={styles.pdfTableError}>{t('orderDetails.definitionsLoadError')}</ErrorText>
                  ) : null}
                  <Text style={[styles.pdfSectionTitle, { color: colors.textPrimary, borderBottomColor: colors.rule ?? colors.border }]}>{displayName}</Text>
                  <View style={styles.pdfTable}>
                    {rows.map(([key, value]) => {
                      const def = defs.find((d) => d.key === key);
                      const label = def ? getSnapshotDisplayLabel(key, def) : getSnapshotDisplayLabel(key, null);
                      const isSelect = def?.inputType === 'select' && def?.options?.length;
                      const displayValue = isSelect ? resolveSelectDisplayValue(value, def?.options) : formatMeasurementValueForDisplay(value);
                      return (
                        <View key={key} style={[styles.pdfTableRow, { borderBottomColor: colors.ruleSoft ?? colors.rule ?? colors.border }]}>
                          <Text style={[styles.pdfTableLabel, { color: colors.textPrimary }]}>{label}</Text>
                          <Text style={[styles.pdfTableValue, { color: colors.ink3 }]}>{displayValue}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
            {garmentIdsWithCatalog.map((garmentId) => {
              const displayName = garmentNameById.get(garmentId) ?? garmentUnavailableLabel;
              const selections = draftOrder.catalogSelections?.[garmentId] ?? {};
              const stylesLabel = t('catalog.styleAndMaterials');
              return (
                <View key={`cat-${garmentId}`} style={styles.pdfSection}>
                  <Text style={[styles.pdfSectionTitle, { color: colors.textPrimary, borderBottomColor: colors.rule ?? colors.border }]}>{displayName} - {stylesLabel}</Text>
                  <View style={styles.pdfTable}>
                    {Object.entries(selections).map(([categoryCode, itemIdOrIds]) => {
                      const itemId = Array.isArray(itemIdOrIds) ? itemIdOrIds[0] : itemIdOrIds;
                      if (!itemId) return null;
                      const catalogItem = resolvedCatalogItems[itemId];
                      const categoryLabel = (catalogItem?.categoryName ?? '').trim() || categoryCode;
                      const itemName = catalogItem?.name ?? itemId;
                      return (
                        <View key={categoryCode} style={[styles.pdfTableRow, { borderBottomColor: colors.ruleSoft ?? colors.rule ?? colors.border }]}>
                          <Text style={[styles.pdfTableLabel, { color: colors.textPrimary }]}>{categoryLabel}</Text>
                          <View style={styles.pdfTableValueCell}>
                            {catalogItem?.imageUrl ? (
                              <Image source={{ uri: catalogItem.imageUrl.startsWith('http') ? catalogItem.imageUrl : `${API_BASE_URL}${catalogItem.imageUrl}` }} style={styles.pdfCatalogThumb} />
                            ) : null}
                            {catalogItem?.color ? (
                              <View style={[styles.pdfColorSwatch, { backgroundColor: catalogItem.color }]} />
                            ) : null}
                            <Text style={[styles.pdfTableValue, { color: colors.ink3 }]}>{itemName}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </Section>

          <Section style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('newOrder.summary.paymentSection')}</Text>
            </View>
            <Input
              label={`${t('newOrder.summary.totalAmount')} (${preferredCurrency})`}
              value={totalAmount}
              onChangeText={(text) => {
                setTotalAmount(text);
                updatePayment({ totalAmount: parseFloat(text) || undefined });
              }}
              placeholder={t('newOrder.summary.amountPlaceholder')}
              keyboardType="numeric"
              containerStyle={styles.inputGroup}
            />

            <Input
              label={`${t('newOrder.summary.paidAmount')} (${preferredCurrency})`}
              value={paidAmount}
              onChangeText={(text) => {
                setPaidAmount(text);
                updatePayment({ paidAmount: parseFloat(text) || undefined });
              }}
              placeholder={t('newOrder.summary.amountPlaceholder')}
              keyboardType="numeric"
              containerStyle={styles.inputGroup}
            />

            {remaining > 0 && (
              <View style={[styles.remainingContainer, { backgroundColor: (colors.brassPale ?? colors.brass) + '18', borderRadius: AtelierRadius.sm }]}>
                <Text style={[styles.remainingLabel, { color: colors.brassDeep ?? colors.brass }]}>{t('newOrder.summary.remainingLabel')}</Text>
                <Text style={[styles.remainingAmount, { color: colors.brassDeep ?? colors.brass }]}>{remaining.toFixed(2)} {preferredCurrency}</Text>
              </View>
            )}
          </Section>

          {isCreating && !canCreateOrder && (
            <Text style={[styles.limitMessage, { color: colors.ink3 }]}>{limitMsgs.orderLimitReached}</Text>
          )}
        </KeyboardAwareScrollView>

        <AppFloatingFooter
          primaryLabel={orderMode === 'edit' ? t('newOrder.summary.saveChanges') : t('newOrder.summary.finalizeButton')}
          onPrimaryPress={handleFinalize}
          primaryDisabled={!canFinalize || isLoading}
          primaryLoading={isLoading}
          secondaryLabel={t('stepNav.back')}
          onSecondaryPress={() => router.dismissTo('/new-order/measurements')}
        />
      </View>
    </ScreenContainer>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onUpgrade={handleUpgrade}
        loading={isUpgrading}
      />
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
    paddingTop: AtelierSpacing.md,
    paddingBottom: AtelierSpacing.xxl,
  },
  loadErrorBanner: {
    marginHorizontal: AtelierSpacing.md,
    marginBottom: AtelierSpacing.md,
  },
  section: {
    marginHorizontal: AtelierSpacing.md,
    marginBottom: AtelierSpacing.md,
    borderRadius: AtelierRadius.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: AtelierSpacing.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
  },
  summaryCard: {
    borderRadius: AtelierRadius.sm,
    marginBottom: AtelierSpacing.md,
    padding: AtelierSpacing.md,
    borderWidth: 1,
  },
  clientName: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: AtelierSpacing.sm,
  },
  clientPhone: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: AtelierSpacing.sm,
  },
  orderDate: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  pdfSection: {
    marginTop: 25,
    marginBottom: AtelierSpacing.sm,
  },
  pdfSectionTitle: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    paddingBottom: 5,
    marginBottom: 10,
  },
  pdfTable: {
    width: '100%',
  },
  pdfTableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
  },
  pdfTableLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    width: '50%',
  },
  pdfTableValue: {
    flex: 1,
    fontFamily: FontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  pdfTableValueCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.xs,
  },
  pdfCatalogThumb: {
    width: 28,
    height: 28,
    borderRadius: AtelierRadius.sm,
  },
  pdfColorSwatch: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  pdfTableError: {
    marginBottom: AtelierSpacing.xs,
  },
  inputGroup: {
    marginBottom: AtelierSpacing.md,
  },
  remainingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: AtelierRadius.sm,
    padding: AtelierSpacing.lg,
    marginTop: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.lg,
  },
  remainingLabel: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  remainingAmount: {
    fontFamily: FontFamily.serif,
    fontSize: 20,
    lineHeight: 26,
  },
  optionGroup: {
    marginBottom: AtelierSpacing.md,
  },
  optionLabel: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: AtelierSpacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    gap: AtelierSpacing.sm,
  },
  paymentOption: {
    flex: 1,
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.md,
    borderRadius: AtelierRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionText: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deliveryLabel: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: AtelierSpacing.sm,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: AtelierRadius.sm,
    paddingVertical: AtelierSpacing.md,
    marginBottom: AtelierSpacing.md,
  },
  dateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
  },
  dateText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
  },
  datePickerInline: {
    marginBottom: AtelierSpacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerDoneRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: AtelierSpacing.lg,
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.md,
    paddingVertical: AtelierSpacing.sm,
  },
  datePickerDoneText: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
  },
  fittingsHeader: {
    marginTop: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addFittingText: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
  },
  fittingsEmptyText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    fontStyle: 'italic',
    marginBottom: AtelierSpacing.md,
  },
  fittingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AtelierSpacing.sm,
  },
  fittingDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
  },
  fittingDateText: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  removeFittingText: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
  },
  limitMessage: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginHorizontal: AtelierSpacing.md,
    marginBottom: AtelierSpacing.lg,
  },
});
