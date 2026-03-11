import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Check, AlertTriangle } from 'lucide-react-native';
import { useOrderDraft } from '@/contexts/OrderDraftContext';
import { api, apiFetch } from '@/lib/api';
import { fetchGarmentTypesList, normalizeGarmentTypeRecord } from '@/lib/api';
import type { GarmentTypeRecord, MeasurementDefinitionRecord } from '@/types/templates';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useI18n } from '@/lib/i18n';
import { ListSkeletonLoader } from '@/components/ListSkeletonLoader';
import { useDynamicTitle, useCustomBack } from '@/contexts/PageTitleContext';
import { AppFloatingFooter, FOOTER_CONTENT_HEIGHT } from '@/components/AppFloatingFooter';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorText } from '@/components/ui/ErrorText';
import { Button } from '@/components/ui/Button';
import { Spacing, Typography, HeaderStyles, Shadows, BorderRadius } from '@/constants/design';
import { useTheme } from '@/contexts/ThemeContext';

/** Client-side filter: only garments that are enabled (active) for new orders. */
function isEnabled(garment: GarmentTypeRecord): boolean {
  return garment.status === 'active';
}

export default function NewOrderScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const { draftOrder, orderMode, orderIdToEdit, setSelectedGarmentIds, loadOrderData } = useOrderDraft();
  const { checkCanCreateOrder, getLimitMessages } = useSubscription();
  const isCreating = orderMode === 'create';
  const canCreateOrder = checkCanCreateOrder();
  const limitMsgs = getLimitMessages();
  const [garments, setGarments] = useState<GarmentTypeRecord[]>([]);
  const [measurementCounts, setMeasurementCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [garmentsLoadError, setGarmentsLoadError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const insets = useSafeAreaInsets();

  const fetchGarmentTypes = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    setLoading(true);
    try {
      const rawList = await fetchGarmentTypesList();
      const list = Array.isArray(rawList)
        ? rawList.map((g: unknown) => normalizeGarmentTypeRecord(g as Parameters<typeof normalizeGarmentTypeRecord>[0]))
        : [];
      if (isMountedRef.current) {
        setGarmentsLoadError(null);
        setGarments(list);
        // Fetch measurement counts for all garments in parallel
        const counts: Record<string, number> = {};
        const countPromises = list.map(async (garment) => {
          try {
            const defsRes = await apiFetch<
              | MeasurementDefinitionRecord[]
              | {
                  measurementDefinitions?: MeasurementDefinitionRecord[];
                  definitions?: MeasurementDefinitionRecord[];
                  measurements?: MeasurementDefinitionRecord[];
                }
            >(api.garmentTypeDefinitions(garment.id));
            const raw = Array.isArray(defsRes)
              ? defsRes
              : (defsRes.measurementDefinitions ?? defsRes.definitions ?? defsRes.measurements ?? []);
            const definitions = Array.isArray(raw) ? raw : [];
            counts[garment.id] = definitions.length;
          } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
              console.warn(`Failed to load measurement count for garment ${garment.id}:`, err);
            }
            counts[garment.id] = 0;
          }
        });
        await Promise.all(countPromises);
        if (isMountedRef.current) {
          setMeasurementCounts(counts);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError' && isMountedRef.current) {
        console.error('Failed to load garment types:', err);
        setGarments([]);
        setGarmentsLoadError(t('garments.loadError'));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    fetchGarmentTypes();
  }, [fetchGarmentTypes]);

  // Load order data when in edit mode (orderId from context)
  const fetchOrderData = useCallback(async () => {
    const orderId = orderIdToEdit ?? draftOrder.orderId;
    if (!orderId || draftOrder.orderId === orderId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const order = await apiFetch<{
        id: string;
        orderNumber: string;
        status: string;
        totalAmount: number;
        paidAmount: number;
        orderDate: string;
        measurements: Record<string, Record<string, unknown>> | null;
        customer?: { id: string; firstName: string; lastName: string; phone: string; email: string | null };
        notes?: string | null;
      }>(api.orders(orderId));

      if (isMountedRef.current) {
        loadOrderData({
          id: order.id,
          customer: order.customer,
          measurements: order.measurements,
          totalAmount: order.totalAmount,
          paidAmount: order.paidAmount,
          notes: order.notes,
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError' && isMountedRef.current) {
        console.error('Failed to load order data:', err);
      }
    }
  }, [draftOrder.orderId, orderIdToEdit, loadOrderData]);

  useEffect(() => {
    if (orderMode === 'edit' && orderIdToEdit) {
      fetchOrderData();
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [orderMode, orderIdToEdit, fetchOrderData]);

  // Create mode must start with client selection: redirect to client-data when no client selected
  useEffect(() => {
    if (orderMode === 'create' && !draftOrder.customer.id) {
      router.replace('/new-order/client-data');
    }
  }, [orderMode, draftOrder.customer.id, router]);

  const enabledGarments = garments.filter(isEnabled).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const disabledGarments = garments.filter((g) => !isEnabled(g)).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const selectedSet = new Set(draftOrder.selectedGarmentIds);
  const selectedAmongEnabled = draftOrder.selectedGarmentIds.filter((id) =>
    enabledGarments.some((g) => g.id === id)
  );
  const hasDisabledSelected = draftOrder.selectedGarmentIds.some(
    (id) => !enabledGarments.some((g) => g.id === id)
  );

  const toggleGarment = (garmentId: string, isGarmentEnabled: boolean) => {
    if (!isGarmentEnabled) return;
    let next: string[];
    if (selectedSet.has(garmentId)) {
      next = draftOrder.selectedGarmentIds.filter((id) => id !== garmentId);
    } else {
      next = [...draftOrder.selectedGarmentIds, garmentId];
    }
    const sortedNext = next.sort((a, b) => {
      const garmentA = enabledGarments.find((g) => g.id === a);
      const garmentB = enabledGarments.find((g) => g.id === b);
      return (garmentA?.sortOrder ?? 0) - (garmentB?.sortOrder ?? 0);
    });
    setSelectedGarmentIds(sortedNext);
  };

  const canContinue =
    selectedAmongEnabled.length >= 1 &&
    !hasDisabledSelected &&
    (!isCreating || canCreateOrder);

  const handleContinue = () => {
    if (!canContinue) return;
    router.push('/new-order/measurements');
  };

  // When no client selected (create mode), redirect to client-data; show nothing meanwhile
  if (orderMode === 'create' && !draftOrder.customer.id) {
    return null;
  }

  const title = orderMode === 'edit' ? t('newOrder.index.editOrderTitle') : t('newOrder.index.newOrderTitle');
  useDynamicTitle(title);
  useCustomBack(() => router.replace('/(tabs)/orders'), t('common.back'));

  if (loading && garments.length === 0) {
    return (
      <ScreenContainer noPadding>
        <ListSkeletonLoader variant="card" count={4} />
      </ScreenContainer>
    );
  }

  if (!loading && garmentsLoadError) {
    return (
      <ScreenContainer noPadding>
        <View style={styles.errorWrapper}>
          <ErrorText style={styles.loadErrorText}>{garmentsLoadError}</ErrorText>
          <Button
            label={t('common.retry')}
            onPress={() => {
              setGarmentsLoadError(null);
              fetchGarmentTypes();
            }}
          />
        </View>
      </ScreenContainer>
    );
  }

  const footerBottomOffset = FOOTER_CONTENT_HEIGHT + insets.bottom;

  return (
    <ScreenContainer noPadding>
      <View style={styles.contentWrapper}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Selectează articolele de inclus în comandă (cel puțin unul)
          </Text>

          {hasDisabledSelected && (
            <View style={[styles.warningBanner, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
              <AlertTriangle size={20} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                Unul sau mai multe articole selectate nu mai sunt disponibile. Deselectează-le pentru a continua.
              </Text>
            </View>
          )}

          {enabledGarments.length === 0 && disabledGarments.length === 0 ? (
            <EmptyState
              title={t('newOrder.index.noItemsAvailable')}
              message="Nu există articole disponibile momentan. Adaugă un articol înainte de a crea o comandă."
              style={[styles.emptyState, { backgroundColor: colors.surface }]}
            />
          ) : (
            <View style={styles.list}>
              {enabledGarments.map((garment) => {
                const selected = selectedSet.has(garment.id);
                const measurementCount = measurementCounts[garment.id] ?? 0;
                return (
                  <TouchableOpacity
                    key={garment.id}
                    style={[styles.garmentItem, selected && { backgroundColor: colors.primaryLight }]}
                    onPress={() => toggleGarment(garment.id, true)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, { borderColor: colors.border }, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                      {selected ? <Check size={20} color={colors.textInverse} strokeWidth={2.5} /> : null}
                    </View>
                    <View style={styles.garmentContent}>
                      <Text style={[styles.garmentTitle, { color: colors.textPrimary }]}>{garment.name}</Text>
                      <View style={styles.garmentMeta}>
                        {measurementCount > 0 && (
                          <Text style={[styles.measurementCount, { color: colors.textSecondary }]}>
                            {measurementCount} {measurementCount === 1 ? 'măsurătoare' : 'măsurători'}
                          </Text>
                        )}
                        {garment.description ? (
                          <Text style={[styles.garmentDescription, { color: colors.textSecondary }]} numberOfLines={1}>
                            {garment.description}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {disabledGarments.length > 0 && (
                <>
                  {enabledGarments.length > 0 && (
                    <View style={styles.sectionDivider}>
                      <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                      <Text style={[styles.dividerText, { color: colors.textTertiary }]}>{t('newOrder.index.disabledItems')}</Text>
                      <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    </View>
                  )}
                  {disabledGarments.map((garment) => {
                    const measurementCount = measurementCounts[garment.id] ?? 0;
                    return (
                      <View key={garment.id} style={[styles.garmentItem, { opacity: 0.6 }]}>
                        <View style={[styles.checkbox, { borderColor: colors.border, backgroundColor: colors.background, opacity: 0.5 }]} />
                        <View style={styles.garmentContent}>
                          <Text style={[styles.garmentTitle, { color: colors.textTertiary }]}>{garment.name}</Text>
                          <View style={styles.garmentMeta}>
                            {measurementCount > 0 && (
                              <Text style={[styles.measurementCount, { color: colors.textTertiary }]}>
                                {measurementCount} {measurementCount === 1 ? 'măsurătoare' : 'măsurători'}
                              </Text>
                            )}
                            {garment.description ? (
                              <Text style={[styles.garmentDescription, { color: colors.textTertiary }]} numberOfLines={1}>
                                {garment.description}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          )}

          {isCreating && !canCreateOrder && (
            <Text style={[styles.limitMessage, { color: colors.textSecondary }]}>{limitMsgs.orderLimitReached}</Text>
          )}
          {selectedAmongEnabled.length === 0 && enabledGarments.length > 0 && (
            <View style={[styles.explanationBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <AlertTriangle size={18} color={colors.textSecondary} />
              <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
                Selectează cel puțin un articol pentru a continua
              </Text>
            </View>
          )}
        <AppFloatingFooter
          primaryLabel={t('newOrder.index.continue')}
          onPrimaryPress={handleContinue}
          primaryDisabled={!canContinue || enabledGarments.length === 0}
          secondaryLabel={t('stepNav.back')}
          onSecondaryPress={() => router.push('/new-order/client-data')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  errorWrapper: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  loadErrorText: {
    textAlign: 'center',
  },
  contentWrapper: {
    flex: 1,
    paddingTop: Spacing.md,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    lineHeight: 24,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  warningText: {
    ...Typography.caption,
    flex: 1,
  },
  emptyState: {
    marginHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  list: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  garmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    marginRight: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  garmentContent: {
    flex: 1,
  },
  garmentTitle: {
    ...Typography.body,
    fontWeight: '500',
  },
  garmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  measurementCount: {
    ...Typography.caption,
    fontSize: 12,
  },
  garmentDescription: {
    ...Typography.caption,
    flex: 1,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
    marginHorizontal: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...Typography.caption,
    marginHorizontal: Spacing.md,
  },
  explanationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  explanationText: {
    ...Typography.caption,
    flex: 1,
  },
  limitMessage: {
    ...Typography.caption,
    textAlign: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  loadingText: {
    ...Typography.body,
    marginTop: Spacing.md,
  },
});
