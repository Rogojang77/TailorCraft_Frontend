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
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';
import { useTheme } from '@/contexts/ThemeContext';

/** Client-side filter: only garments that are enabled (active) for new orders. */
function isEnabled(garment: GarmentTypeRecord): boolean {
  return garment.status === 'active';
}

export default function NewOrderScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();
  const { draftOrder, orderMode, orderIdToEdit, setSelectedGarmentIds, updateWantsOrderSketch, loadOrderData } = useOrderDraft();
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
        deliveryDate?: string | null;
        fittings?: Array<{
          id?: string;
          scheduledAt: string;
          status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'MISSED';
          notes?: string | null;
          photos?: string[];
        }>;
        sketches?: Array<{ id: string; imageUrl: string; title?: string | null }>;
        notes?: string | null;
      }>(api.orders(orderId));

      if (isMountedRef.current) {
        loadOrderData({
          id: order.id,
          customer: order.customer,
          measurements: order.measurements,
          totalAmount: order.totalAmount,
          paidAmount: order.paidAmount,
          deliveryDate: order.deliveryDate,
          fittings: order.fittings,
          sketches: order.sketches,
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

  const title = orderMode === 'edit' ? t('newOrder.index.editOrderTitle') : t('newOrder.index.newOrderTitle');
  useDynamicTitle(title);
  useCustomBack(() => router.dismissTo('/new-order/client-data'), t('common.back'));

  // When no client selected (create mode), redirect to client-data; show nothing meanwhile
  if (orderMode === 'create' && !draftOrder.customer.id) {
    return null;
  }


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
      <View style={[styles.contentWrapper, { paddingBottom: footerBottomOffset }]}>
          <Text style={[styles.subtitle, { color: colors.ink3 }]}>
            {t('newOrder.index.selectGarmentsHint')}
          </Text>

          {hasDisabledSelected && (
            <View style={[styles.warningBanner, { backgroundColor: (colors.ember ?? colors.warning) + '20', borderColor: colors.ember ?? colors.warning }]}>
              <AlertTriangle size={20} color={colors.ember ?? colors.warning} />
              <Text style={[styles.warningText, { color: colors.ink3 }]}>
                {t('newOrder.index.disabledSelectedWarning')}
              </Text>
            </View>
          )}

          {enabledGarments.length === 0 && disabledGarments.length === 0 ? (
            <EmptyState
              title={t('newOrder.index.noItemsAvailable')}
              message={t('newOrder.index.noItemsAvailableMessage')}
              style={[styles.emptyState, { backgroundColor: colors.card }]}
            />
          ) : (
            <View style={styles.list}>
              {enabledGarments.map((garment) => {
                const selected = selectedSet.has(garment.id);
                const measurementCount = measurementCounts[garment.id] ?? 0;
                return (
                  <TouchableOpacity
                    key={garment.id}
                    style={[styles.garmentItem, { backgroundColor: colors.card }, selected && { backgroundColor: (colors.brassPale ?? colors.brass) + '18' }]}
                    onPress={() => toggleGarment(garment.id, true)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, { borderColor: colors.rule ?? colors.border }, selected && { backgroundColor: colors.brass ?? colors.primary, borderColor: colors.brass ?? colors.primary }]}>
                      {selected ? <Check size={20} color={colors.paper ?? '#EFE9DC'} strokeWidth={2.5} /> : null}
                    </View>
                    <View style={styles.garmentContent}>
                      <Text style={[styles.garmentTitle, { color: colors.textPrimary }]}>{garment.name}</Text>
                      <View style={styles.garmentMeta}>
                        {measurementCount > 0 && (
                          <Text style={[styles.measurementCount, { color: colors.ink3 }]}>
                            {t(measurementCount === 1 ? 'newOrder.index.measurementOne' : 'newOrder.index.measurementOther', { count: measurementCount })}
                          </Text>
                        )}
                        {garment.description ? (
                          <Text style={[styles.garmentDescription, { color: colors.ink3 }]} numberOfLines={1}>
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
                      <View style={[styles.dividerLine, { backgroundColor: colors.rule ?? colors.border }]} />
                      <Text style={[styles.dividerText, { color: colors.ink4 ?? colors.textTertiary }]}>{t('newOrder.index.disabledItems')}</Text>
                      <View style={[styles.dividerLine, { backgroundColor: colors.rule ?? colors.border }]} />
                    </View>
                  )}
                  {disabledGarments.map((garment) => {
                    const measurementCount = measurementCounts[garment.id] ?? 0;
                    return (
                      <View key={garment.id} style={[styles.garmentItem, { backgroundColor: colors.card, opacity: 0.6 }]}>
                        <View style={[styles.checkbox, { borderColor: colors.rule ?? colors.border, backgroundColor: colors.paper ?? colors.background, opacity: 0.5 }]} />
                        <View style={styles.garmentContent}>
                          <Text style={[styles.garmentTitle, { color: colors.ink4 ?? colors.textTertiary }]}>{garment.name}</Text>
                          <View style={styles.garmentMeta}>
                            {measurementCount > 0 && (
                              <Text style={[styles.measurementCount, { color: colors.ink4 ?? colors.textTertiary }]}>
                                {t(measurementCount === 1 ? 'newOrder.index.measurementOne' : 'newOrder.index.measurementOther', { count: measurementCount })}
                              </Text>
                            )}
                            {garment.description ? (
                              <Text style={[styles.garmentDescription, { color: colors.ink4 ?? colors.textTertiary }]} numberOfLines={1}>
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
            <Text style={[styles.limitMessage, { color: colors.ink3 }]}>{limitMsgs.orderLimitReached}</Text>
          )}
          {selectedAmongEnabled.length === 0 && enabledGarments.length > 0 && (
            <View style={[styles.explanationBanner, { backgroundColor: colors.card, borderColor: colors.rule ?? colors.border }]}>
              <AlertTriangle size={18} color={colors.ink3} />
              <Text style={[styles.explanationText, { color: colors.ink3 }]}>
                {t('newOrder.index.selectAtLeastOne')}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.sketchOptInRow,
              { borderColor: colors.rule ?? colors.border },
              draftOrder.wantsOrderSketch && { backgroundColor: (colors.brassPale ?? colors.brass) + '18' },
            ]}
            onPress={() => updateWantsOrderSketch(!draftOrder.wantsOrderSketch)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, { borderColor: colors.rule ?? colors.border }, draftOrder.wantsOrderSketch && { backgroundColor: colors.brass ?? colors.primary, borderColor: colors.brass ?? colors.primary }]}>
              {draftOrder.wantsOrderSketch ? <Check size={20} color={colors.paper ?? '#EFE9DC'} strokeWidth={2.5} /> : null}
            </View>
            <View style={styles.garmentContent}>
              <Text style={[styles.garmentTitle, { color: colors.textPrimary }]}>
                {t('newOrder.index.includeSketchLabel')}
              </Text>
              <Text style={[styles.garmentDescription, { color: colors.ink3 }]}>
                {t('newOrder.index.includeSketchHint')}
              </Text>
            </View>
          </TouchableOpacity>
        <AppFloatingFooter
          primaryLabel={t('newOrder.index.continue')}
          onPrimaryPress={handleContinue}
          primaryDisabled={!canContinue || enabledGarments.length === 0}
          secondaryLabel={t('stepNav.back')}
          onSecondaryPress={() => router.dismissTo('/new-order/client-data')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  errorWrapper: {
    flex: 1,
    padding: AtelierSpacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: AtelierSpacing.lg,
  },
  loadErrorText: {
    textAlign: 'center',
  },
  contentWrapper: {
    flex: 1,
    paddingTop: AtelierSpacing.md,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  subtitle: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginHorizontal: AtelierSpacing.md,
    marginBottom: AtelierSpacing.md,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
    marginHorizontal: AtelierSpacing.md,
    marginBottom: AtelierSpacing.md,
    padding: AtelierSpacing.md,
    borderRadius: AtelierRadius.md,
    borderWidth: 1,
  },
  warningText: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  emptyState: {
    marginHorizontal: AtelierSpacing.md,
    paddingVertical: AtelierSpacing.sm,
    paddingHorizontal: AtelierSpacing.md,
    borderRadius: AtelierRadius.md,
    ...AtelierShadow.card,
  },
  list: {
    paddingHorizontal: AtelierSpacing.md,
    gap: AtelierSpacing.md,
  },
  sketchOptInRow: {
    marginHorizontal: AtelierSpacing.md,
    marginTop: AtelierSpacing.md,
    marginBottom: AtelierSpacing.sm,
    borderWidth: 1,
    borderRadius: AtelierRadius.sm,
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  garmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: AtelierSpacing.md,
    paddingHorizontal: AtelierSpacing.sm,
    borderRadius: AtelierRadius.md,
    ...AtelierShadow.card,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: AtelierRadius.sm,
    borderWidth: 2,
    marginRight: AtelierSpacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  garmentContent: {
    flex: 1,
  },
  garmentTitle: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  garmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
    flexWrap: 'wrap',
  },
  measurementCount: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  garmentDescription: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
    flex: 0,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: AtelierSpacing.lg,
    marginHorizontal: AtelierSpacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginHorizontal: AtelierSpacing.md,
  },
  explanationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
    marginHorizontal: AtelierSpacing.md,
    marginTop: AtelierSpacing.lg,
    padding: AtelierSpacing.md,
    borderRadius: AtelierRadius.md,
    borderWidth: 1,
  },
  explanationText: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  limitMessage: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginHorizontal: AtelierSpacing.md,
    marginTop: AtelierSpacing.md,
    marginBottom: AtelierSpacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: AtelierSpacing.md,
  },
  loadingText: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    marginTop: AtelierSpacing.md,
  },
});
