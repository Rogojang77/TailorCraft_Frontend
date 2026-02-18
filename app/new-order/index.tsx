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
import { fetchGarmentTypesList } from '@/lib/apiCache';
import { normalizeGarmentTypeRecord } from '@/lib/api-mappers';
import type { GarmentTypeRecord, MeasurementDefinitionRecord } from '@/types/templates';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useI18n } from '@/lib/i18n';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { Header } from '@/components/layout/Header';
import { AppFloatingFooter, FOOTER_CONTENT_HEIGHT } from '@/components/AppFloatingFooter';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorText } from '@/components/ui/ErrorText';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography, HeaderStyles, Shadows, BorderRadius } from '@/constants/design';

/** Client-side filter: only garments that are enabled (active) for new orders. */
function isEnabled(garment: GarmentTypeRecord): boolean {
  return garment.status === 'active';
}

export default function NewOrderScreen() {
  const router = useRouter();
  const { t } = useI18n();
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

  const enabledGarments = garments.filter(isEnabled);
  const disabledGarments = garments.filter((g) => !isEnabled(g));
  const selectedSet = new Set(draftOrder.selectedGarmentIds);
  const selectedAmongEnabled = draftOrder.selectedGarmentIds.filter((id) =>
    enabledGarments.some((g) => g.id === id)
  );
  const hasDisabledSelected = draftOrder.selectedGarmentIds.some(
    (id) => !enabledGarments.some((g) => g.id === id)
  );

  const toggleGarment = (garmentId: string, isEnabled: boolean) => {
    if (!isEnabled) return; // Don't allow toggling disabled garments
    const next = selectedSet.has(garmentId)
      ? draftOrder.selectedGarmentIds.filter((id) => id !== garmentId)
      : [...draftOrder.selectedGarmentIds, garmentId];
    setSelectedGarmentIds(next);
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

  if (loading && garments.length === 0) {
    return (
      <ScreenContainer noPadding>
        <Header
          title={title}
          onBack={() => router.replace('/(tabs)/orders')}
          backAccessibilityLabel={t('common.back')}
        />
        <FullScreenLoader message={t('common.loading')} />
      </ScreenContainer>
    );
  }

  if (!loading && garmentsLoadError) {
    return (
      <ScreenContainer noPadding>
        <Header
          title={title}
          onBack={() => router.replace('/(tabs)/orders')}
          backAccessibilityLabel={t('common.back')}
        />
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
      <Header
        title={title}
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
          <Text style={styles.subtitle}>
            Selectează articolele de inclus în comandă (cel puțin unul)
          </Text>

          {hasDisabledSelected && (
            <View style={styles.warningBanner}>
              <AlertTriangle size={20} color={Colors.warning} />
              <Text style={styles.warningText}>
                Unul sau mai multe articole selectate nu mai sunt disponibile. Deselectează-le pentru a continua.
              </Text>
            </View>
          )}

          {enabledGarments.length === 0 && disabledGarments.length === 0 ? (
            <EmptyState
              title={t('newOrder.index.noItemsAvailable')}
              message="Nu există articole disponibile momentan. Adaugă un articol înainte de a crea o comandă."
              style={styles.emptyState}
            />
          ) : (
            <View style={styles.list}>
              {enabledGarments.map((garment) => {
                const selected = selectedSet.has(garment.id);
                const measurementCount = measurementCounts[garment.id] ?? 0;
                return (
                  <TouchableOpacity
                    key={garment.id}
                    style={[styles.card, selected && styles.cardSelected]}
                    onPress={() => toggleGarment(garment.id, true)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                      {selected ? <Check size={20} color={Colors.textInverse} strokeWidth={2.5} /> : null}
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{garment.name}</Text>
                      <View style={styles.cardMeta}>
                        {measurementCount > 0 && (
                          <Text style={styles.measurementCount}>
                            {measurementCount} {measurementCount === 1 ? 'măsurătoare' : 'măsurători'}
                          </Text>
                        )}
                        {garment.description ? (
                          <Text style={styles.cardDescription} numberOfLines={1}>
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
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>{t('newOrder.index.disabledItems')}</Text>
                      <View style={styles.dividerLine} />
                    </View>
                  )}
                  {disabledGarments.map((garment) => {
                    const measurementCount = measurementCounts[garment.id] ?? 0;
                    return (
                      <View key={garment.id} style={[styles.card, styles.cardDisabled]}>
                        <View style={[styles.checkbox, styles.checkboxDisabled]} />
                        <View style={styles.cardContent}>
                          <Text style={[styles.cardTitle, styles.cardTitleDisabled]}>{garment.name}</Text>
                          <View style={styles.cardMeta}>
                            {measurementCount > 0 && (
                              <Text style={styles.measurementCountDisabled}>
                                {measurementCount} {measurementCount === 1 ? 'măsurătoare' : 'măsurători'}
                              </Text>
                            )}
                            {garment.description ? (
                              <Text style={styles.cardDescriptionDisabled} numberOfLines={1}>
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
            <Text style={styles.limitMessage}>{limitMsgs.orderLimitReached}</Text>
          )}
          {selectedAmongEnabled.length === 0 && enabledGarments.length > 0 && (
            <View style={styles.explanationBanner}>
              <AlertTriangle size={18} color={Colors.textSecondary} />
              <Text style={styles.explanationText}>
                Selectează cel puțin un articol pentru a continua
              </Text>
            </View>
          )}
        </KeyboardAwareScrollView>

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
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.warning + '20',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  warningText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
  },
  emptyState: {
    marginHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  list: {
    paddingHorizontal: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.md,
  },
  cardSelected: {
    borderColor: Colors.primary,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxDisabled: {
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    opacity: 0.5,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...Typography.h3,
  },
  cardTitleDisabled: {
    color: Colors.textTertiary,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  measurementCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  measurementCountDisabled: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontSize: 12,
  },
  cardDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
  },
  cardDescriptionDisabled: {
    ...Typography.caption,
    color: Colors.textTertiary,
    flex: 1,
  },
  cardDisabled: {
    opacity: 0.6,
    borderColor: Colors.border,
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
    backgroundColor: Colors.border,
  },
  dividerText: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginHorizontal: Spacing.md,
  },
  explanationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  explanationText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
  },
  limitMessage: {
    ...Typography.caption,
    color: Colors.textSecondary,
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
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
});
