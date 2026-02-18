import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { Header } from '@/components/layout/Header';
import { Section } from '@/components/ui/Section';
import { useRouter } from 'expo-router';
import { CreditCard } from 'lucide-react-native';
import { useOrderDraft } from '@/contexts/OrderDraftContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AppFloatingFooter, FOOTER_CONTENT_HEIGHT } from '@/components/AppFloatingFooter';
import { PaywallModal } from '@/components/PaywallModal';
import { api, apiFetch, getErrorMessage, ApiError, ApiErrorCode } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { fetchGarmentTypesList } from '@/lib/apiCache';
import { normalizeGarmentTypeRecord, definitionRecordToFormDefinition } from '@/lib/api-mappers';
import type { GarmentTypeRecord, MeasurementDefinitionRecord } from '@/types/templates';
import type { MeasurementDefinition } from '@/constants/garments';
import { getDisplayUnit } from '@/hooks/useResolvedDefinition';
import { filterDefinitionsWithValidKey } from '@/lib/measurementDefensive';
import { getSnapshotEntriesInDefinitionOrder, getSnapshotDisplayLabel } from '@/utils';
import { ErrorText } from '@/components/ui/ErrorText';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/design';

function getGarmentDisplayName(garment: GarmentTypeRecord, garmentUnavailableLabel: string): string {
  const name = (garment.label ?? garment.name ?? '').trim();
  return name || garmentUnavailableLabel;
}

export default function SummaryScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { draftOrder, orderMode, updatePayment, clearDraft } = useOrderDraft();
  const { subscription, upgradeToPro, refreshSubscription, checkCanCreateOrder, getLimitMessages } = useSubscription();
  const canCreateOrder = checkCanCreateOrder();
  const limitMsgs = getLimitMessages();
  
  const [totalAmount, setTotalAmount] = useState(() => {
    const v = draftOrder.payment.totalAmount;
    return v === undefined || v === 0 ? '' : String(v);
  });
  const [paidAmount, setPaidAmount] = useState(() => {
    const v = draftOrder.payment.paidAmount;
    return v === undefined || v === 0 ? '' : String(v);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [garments, setGarments] = useState<GarmentTypeRecord[]>([]);
  const [garmentsLoadError, setGarmentsLoadError] = useState<string | null>(null);
  const garmentsLoadingRef = useRef(false);
  const [summaryDefinitionsByGarment, setSummaryDefinitionsByGarment] = useState<Record<string, MeasurementDefinition[]>>({});
  const [summaryDefinitionErrors, setSummaryDefinitionErrors] = useState<Record<string, boolean>>({});

  const remaining = parseFloat(totalAmount) - parseFloat(paidAmount || '');

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

  const garmentNameById = new Map<string, string>();
  const garmentById = new Map<string, GarmentTypeRecord>();
  const garmentUnavailableLabel = t('orderDetails.garmentDeleted');
  for (const g of garments) {
    garmentNameById.set(g.id, getGarmentDisplayName(g, garmentUnavailableLabel));
    garmentById.set(g.id, g);
  }

  type SummaryItem = { garmentId: string; displayName: string; detailText: string; canNavigate: boolean };
  const items: SummaryItem[] = [];
  for (const garmentId of draftOrder.selectedGarmentIds) {
    const displayName = garmentNameById.get(garmentId) ?? garmentUnavailableLabel;
    const canNavigate = garmentById.has(garmentId);
    const measurements = draftOrder.measurements[garmentId];
    const defs = summaryDefinitionsByGarment[garmentId] ?? [];
    if (measurements && Object.keys(measurements).length > 0) {
      const entries = getSnapshotEntriesInDefinitionOrder(measurements, defs);
      if (entries.length > 0) {
        const parts = entries.slice(0, 3).map(([key, value]) => {
          const def = defs.find((d) => d.key === key);
          const unit = def ? getDisplayUnit(def) : undefined;
          const valueWithUnit = unit ? `${value} ${unit}` : value;
          return `${getSnapshotDisplayLabel(key, def)}: ${valueWithUnit}`;
        });
        items.push({ garmentId, displayName, detailText: parts.join(', '), canNavigate });
      } else {
        items.push({ garmentId, displayName, detailText: '', canNavigate });
      }
    } else {
      items.push({ garmentId, displayName, detailText: '', canNavigate });
    }
  }

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

      // One snapshot per selected garment only (empty object allowed for zero-definition garments)
      const measurements: Record<string, Record<string, string>> = {};
      for (const garmentId of draftOrder.selectedGarmentIds) {
        const garmentMeasurements = draftOrder.measurements[garmentId];
        measurements[garmentId] = garmentMeasurements && typeof garmentMeasurements === 'object'
          ? garmentMeasurements
          : {};
      }

      const orderPayload = {
        customerId: draftOrder.customer.id,
        totalAmount: parseFloat(totalAmount),
        paidAmount: paid,
        notes: draftOrder.notes || undefined,
        measurements,
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

      // Clear draft
      clearDraft();

      Alert.alert(
        t('common.success'),
        isEditing
          ? t('newOrder.summary.updateSuccess', { number: order.orderNumber })
          : t('newOrder.summary.createSuccess', { number: order.orderNumber }),
        [
          {
            text: t('common.ok'),
            onPress: () => router.replace(`/order-details/${order.id}`),
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
  const totalNum = parseFloat(String(totalAmount ?? '').trim());
  const hasValidTotal = !Number.isNaN(totalNum) && totalNum > 0;
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
      <Header
        title={t('newOrder.summary.orderSummaryTitle')}
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
          {garmentsLoadError ? (
            <ErrorText style={styles.loadErrorBanner}>{garmentsLoadError}</ErrorText>
          ) : null}
          <Section title={t('newOrder.summary.sectionOrderInfo')} style={styles.section}>
            <View style={styles.summaryCard}>
              <Text style={styles.clientName}>{draftOrder.customer.name || '—'}</Text>
              <Text style={styles.clientPhone}>{draftOrder.customer.phone || '—'}</Text>
              <Text style={styles.orderDate}>
                Data comenzii: {new Date().toLocaleDateString('ro-RO')}
              </Text>
            </View>

            {items.length > 0 ? (
              <View style={styles.itemsList}>
                <Text style={styles.itemsTitle}>{t('newOrder.summary.itemsOrdered')}</Text>
                {items.map((item) => (
                  <View key={item.garmentId} style={styles.itemRow}>
                    <Text style={styles.itemBullet}>• </Text>
                    <View style={styles.itemContent}>
                      {item.canNavigate ? (
                        <TouchableOpacity
                          onPress={() => router.push(`/garments/${item.garmentId}`)}
                          activeOpacity={0.7}
                          style={styles.itemNameTouchable}
                        >
                          <Text style={styles.itemNameLink}>{item.displayName}</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.itemName}>{item.displayName}</Text>
                      )}
                      {item.detailText ? (
                        <Text style={styles.itemDetail}>{t('newOrder.summary.detailSeparator')}{item.detailText}</Text>
                      ) : null}
                      {summaryDefinitionErrors[item.garmentId] ? (
                        <ErrorText style={styles.itemDefsError}>{t('orderDetails.definitionsLoadError')}</ErrorText>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.itemsList}>
                <Text style={styles.itemsTitle}>{t('newOrder.summary.noItemsSelected')}</Text>
              </View>
            )}
          </Section>

          <Section title={t('newOrder.summary.paymentSection')} style={styles.section}>
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
                <Text style={styles.remainingLabel}>{t('newOrder.summary.remainingLabel')}</Text>
                <Text style={styles.remainingAmount}>{remaining.toFixed(2)} RON</Text>
              </View>
            )}
          </Section>

          {isCreating && !canCreateOrder && (
            <Text style={styles.limitMessage}>{limitMsgs.orderLimitReached}</Text>
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
    paddingBottom: 20,
  },
  loadErrorBanner: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.md,
  },
  summaryCard: {
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  clientName: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },
  clientPhone: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
  },
  orderDate: {
    ...Typography.caption,
  },
  itemsList: {
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  itemsTitle: {
    ...Typography.bodyBold,
    marginBottom: Spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
    alignItems: 'flex-start',
  },
  itemBullet: {
    ...Typography.caption,
    lineHeight: 20,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  itemNameTouchable: {
    alignSelf: 'flex-start',
  },
  itemNameLink: {
    ...Typography.caption,
    lineHeight: 20,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  itemName: {
    ...Typography.caption,
    lineHeight: 20,
  },
  itemDetail: {
    ...Typography.caption,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  itemDefsError: {
    marginTop: Spacing.xs,
  },
  itemText: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  remainingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  remainingLabel: {
    ...Typography.captionBold,
    color: Colors.primaryDark,
  },
  remainingAmount: {
    ...Typography.h3,
    color: Colors.primaryDark,
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
    backgroundColor: Colors.borderLight,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionText: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
  },
  selectedOptionText: {
    color: Colors.textInverse,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  dateText: {
    ...Typography.bodyBold,
  },
  limitMessage: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
});
