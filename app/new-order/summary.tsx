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
import { CreditCard, Calendar } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useAuth } from '@/contexts/AuthContext';
import { useOrderDraft } from '@/contexts/OrderDraftContext';
import { clearDraftStorage } from '@/lib/order';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AppFloatingFooter, FOOTER_CONTENT_HEIGHT } from '@/components/AppFloatingFooter';
import { PaywallModal } from '@/components/subscription';
import { api, apiFetch, getErrorMessage, ApiError, ApiErrorCode, API_BASE_URL } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { fetchGarmentTypesList } from '@/lib/api';
import { sortGarmentIdsByOrder } from '@/lib/order';
import { normalizeGarmentTypeRecord, definitionRecordToFormDefinition } from '@/lib/api';
import type { GarmentTypeRecord, MeasurementDefinitionRecord } from '@/types/templates';
import type { MeasurementDefinition } from '@/constants/garments';
import type { GarmentCatalogItem, GarmentCatalogResponse } from '@/types/catalog';
import {
  filterDefinitionsWithValidKey,
  resolveMeasurementDisplay,
  formatMeasurementValueForDisplay,
} from '@/lib/measurement';
import { useSettings } from '@/contexts/SettingsContext';

const DEFAULT_DELIVERY_WEEKS = 3;
import { getSnapshotEntriesInDefinitionOrder, getSnapshotDisplayLabel } from '@/utils';
import { ErrorText } from '@/components/ui/ErrorText';
import { Spacing, Typography, BorderRadius, Shadows } from '@/constants/design';
import { useTheme } from '@/contexts/ThemeContext';

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
  const { preferredUnit } = useSettings();
  const { user } = useAuth();
  const { draftOrder, orderMode, updatePayment, updateDeliveryDate } = useOrderDraft();
  const { subscription, upgradeToPro, refreshSubscription, checkCanCreateOrder, getLimitMessages } = useSubscription();
  const canCreateOrder = checkCanCreateOrder();
  const limitMsgs = getLimitMessages();

  useCustomBack(() => router.replace('/(tabs)/orders'), t('common.back'));
  
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

  const formatDate = (isoDate?: string): string => {
    if (!isoDate) return '—';
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString('ro-RO');
    } catch {
      return '—';
    }
  };

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
        getErrorMessage(
          error,
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
          <Section style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('newOrder.summary.sectionOrderInfo')}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.clientName, { color: colors.textPrimary }]}>{draftOrder.customer.name || '—'}</Text>
              <Text style={[styles.clientPhone, { color: colors.textSecondary }]}>{draftOrder.customer.phone || '—'}</Text>
              <Text style={[styles.orderDate, { color: colors.textSecondary }]}>
                Data comenzii: {new Date().toLocaleDateString('ro-RO')}
              </Text>
            </View>

            <Text style={[styles.deliveryLabel, { color: colors.textSecondary }]}>{t('newOrder.summary.deliveryDateLabel')}</Text>
            <TouchableOpacity
              style={styles.dateDisplay}
              onPress={openDatePicker}
              activeOpacity={0.7}
            >
              <View style={styles.dateContent}>
                <Calendar size={20} color={colors.textSecondary} />
                <Text style={[styles.dateText, { color: colors.textPrimary }]}>{formatDeliveryDate(deliveryDate)}</Text>
              </View>
            </TouchableOpacity>
            {Platform.OS === 'ios' && showDatePicker && (
              <View style={styles.datePickerInline}>
                <View style={styles.datePickerDoneRow}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)} activeOpacity={0.7}>
                    <Text style={[styles.datePickerDoneText, { color: colors.primary }]}>{t('common.done')}</Text>
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


            {/* Garments & measurements — PDF-style layout */}
            {garmentIdsWithMeasurements.length === 0 && garmentIdsWithCatalog.length === 0 ? (
              <View style={styles.pdfSection}>
                <Text style={[styles.pdfSectionTitle, { color: colors.textPrimary, borderBottomColor: colors.textPrimary }]}>{t('newOrder.summary.noItemsSelected')}</Text>
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
                  <Text style={[styles.pdfSectionTitle, { color: colors.textPrimary, borderBottomColor: colors.textPrimary }]}>{displayName}</Text>
                  <View style={styles.pdfTable}>
                    {rows.map(([key, value]) => {
                      const def = defs.find((d) => d.key === key);
                      const label = def ? getSnapshotDisplayLabel(key, def) : getSnapshotDisplayLabel(key, null);
                      const isSelect = def?.inputType === 'select' && def?.options?.length;
                      const displayValue = isSelect ? resolveSelectDisplayValue(value, def?.options) : formatMeasurementValueForDisplay(value);
                      return (
                        <View key={key} style={[styles.pdfTableRow, { borderBottomColor: colors.border }]}>
                          <Text style={[styles.pdfTableLabel, { color: colors.textPrimary }]} numberOfLines={1}>{label}</Text>
                          <Text style={[styles.pdfTableValue, { color: colors.textSecondary }]} numberOfLines={1}>{displayValue}</Text>
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
                  <Text style={[styles.pdfSectionTitle, { color: colors.textPrimary, borderBottomColor: colors.textPrimary }]}>{displayName} - {stylesLabel}</Text>
                  <View style={styles.pdfTable}>
                    {Object.entries(selections).map(([categoryCode, itemIdOrIds]) => {
                      const itemId = Array.isArray(itemIdOrIds) ? itemIdOrIds[0] : itemIdOrIds;
                      if (!itemId) return null;
                      const catalogItem = resolvedCatalogItems[itemId];
                      const categoryLabel = t(`catalog.categories.${categoryCode}`, { defaultValue: categoryCode });
                      const itemName = catalogItem?.name ?? itemId;
                      return (
                        <View key={categoryCode} style={[styles.pdfTableRow, { borderBottomColor: colors.border }]}>
                          <Text style={[styles.pdfTableLabel, { color: colors.textPrimary }]} numberOfLines={1}>{categoryLabel}</Text>
                          <View style={styles.pdfTableValueCell}>
                            {catalogItem?.imageUrl ? (
                              <Image source={{ uri: catalogItem.imageUrl.startsWith('http') ? catalogItem.imageUrl : `${API_BASE_URL}${catalogItem.imageUrl}` }} style={styles.pdfCatalogThumb} />
                            ) : null}
                            {catalogItem?.color ? (
                              <View style={[styles.pdfColorSwatch, { backgroundColor: catalogItem.color }]} />
                            ) : null}
                            <Text style={[styles.pdfTableValue, { color: colors.textSecondary }]} numberOfLines={1}>{itemName}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </Section>

          <Section style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('newOrder.summary.paymentSection')}</Text>
            </View>
            <Input
              label={t('newOrder.summary.totalLabelRon')}
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
              label={t('newOrder.summary.paidAmount') + ' (RON)'}
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
              <View style={styles.remainingContainer}>
                <Text style={[styles.remainingLabel, { color: colors.primaryDark }]}>{t('newOrder.summary.remainingLabel')}</Text>
                <Text style={[styles.remainingAmount, { color: colors.primaryDark }]}>{remaining.toFixed(2)} RON</Text>
              </View>
            )}
          </Section>

          {isCreating && !canCreateOrder && (
            <Text style={[styles.limitMessage, { color: colors.textSecondary }]}>{limitMsgs.orderLimitReached}</Text>
          )}
        </KeyboardAwareScrollView>

        <AppFloatingFooter
          primaryLabel={orderMode === 'edit' ? t('newOrder.summary.saveChanges') : t('newOrder.summary.finalizeButton')}
          onPrimaryPress={handleFinalize}
          primaryDisabled={!canFinalize || isLoading}
          primaryLoading={isLoading}
          secondaryLabel={t('stepNav.back')}
          onSecondaryPress={() => router.push('/new-order/measurements')}
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  loadErrorBanner: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  section: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  summaryCard: {
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  clientName: {
    marginBottom: Spacing.sm,
    ...Typography.bodyBold,
  },
  clientPhone: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
  },
  orderDate: {
    ...Typography.caption,
  },
  pdfSection: {
    marginTop: 25,
    marginBottom: Spacing.sm,
  },
  pdfSectionTitle: {
    ...Typography.bodyBold,
    fontSize: 13,
    textTransform: 'uppercase',
    borderBottomWidth: 2,
    paddingBottom: 5,
    marginBottom: 10,
  },
  pdfTable: {
    width: '100%',
  },
  pdfTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
  },
  pdfTableLabel: {
    ...Typography.body,
    width: '50%',
    fontWeight: '500',
  },
  pdfTableValue: {
    flex: 1,
    ...Typography.body,
  },
  pdfTableValueCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  pdfCatalogThumb: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
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
    marginBottom: Spacing.xs,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  remainingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  remainingLabel: {
    ...Typography.captionBold,
  },
  remainingAmount: {
    ...Typography.h3,
  },
  optionGroup: {
    marginBottom: Spacing.md,
  },
  optionLabel: {
    ...Typography.captionBold,
    marginBottom: Spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  paymentOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionText: {
    ...Typography.captionBold,
  },
  deliveryLabel: {
    ...Typography.bodyBold,
    marginBottom: Spacing.sm,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  dateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateText: {
    ...Typography.bodyBold,
  },
  datePickerInline: {
    marginBottom: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerDoneRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    width: '100%',
  },
  datePickerDoneText: {
    ...Typography.bodyBold,
  },
  limitMessage: {
    ...Typography.caption,
    textAlign: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
});
