import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useRef } from 'react';
import { Platform } from 'react-native';
import { useI18n } from '@/lib/i18n';
import { useAuth } from './AuthContext';
import * as subscriptionService from '@/lib/services/subscriptionService';
import * as iapService from '@/lib/services/iapService';
import { endIapConnection } from '@/lib/services/iapConnection';
import { buildLimitMessages } from '@/lib/subscriptionMessages';
import * as diagnostics from '@/lib/diagnostics';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { usePurchase } from '@/hooks/usePurchase';
import type { PlanPrice } from '@/types/subscription';

import type {
  SubscriptionStatus,
  SubscriptionPlanType,
  PlanPrices,
  TemplateLimitStatus,
  SubscriptionState,
} from '@/types/subscription';

export type {
  SubscriptionPlan,
  SubscriptionLimits,
  SubscriptionUsage,
  SubscriptionStatus,
  SubscriptionPlanType,
  PlanPrice,
  PlanPrices,
  PaymentMethod,
  Invoice,
  UpcomingInvoice,
  PortalDetailsResponse,
  SubscriptionDetails,
  TemplateLimitStatus,
  SubscriptionState,
} from '@/types/subscription';

interface SubscriptionContextType {
  subscription: SubscriptionStatus | null;
  subscriptionState: SubscriptionState;
  prices: PlanPrices;
  isLoading: boolean;
  isLoadingPrices: boolean;
  error: string | null;
  subscriptionStatusLoadFailed: boolean;
  refreshSubscription: (forceRefresh?: boolean) => Promise<void>;
  refreshPrices: () => Promise<void>;
  upgradeToPro: (plan?: SubscriptionPlanType) => Promise<{ success: true } | { success: false; errorMessage: string }>;
  purchasing: boolean;
  restorePurchases: () => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
  checkCanCreateClient: () => boolean;
  checkCanCreateOrder: () => boolean;
  checkCanCreateTemplate: () => boolean;
  checkCanUseSharedTemplate: () => boolean;
  templateCreationStatus: () => TemplateLimitStatus;
  sharedTemplateUsageStatus: () => TemplateLimitStatus;
  getUsageForDisplay: () => { clients: { current: number; max: number }; orders: { current: number; max: number } };
  getLimitMessages: () => {
    templateLimit: string;
    paywallTitle: string;
    paywallSubtitle: string;
    paywallUpgradeCta: string;
    freePlanClients: string;
    freePlanOrders: string;
    freePlanLimitShort: string;
    upgradeHint: string;
    clientLimitReached: string;
    orderLimitReached: string;
  };
  isIAPSupported: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const CACHE_DURATION_MS = 30000;

function subscriptionProductToPlanPrice(
  product: { productId: string; price: string; rawPrice: number; currency: string },
  periodKey: 'month' | 'year'
): PlanPrice {
  const periodEn = periodKey;
  return {
    amount: product.rawPrice,
    currency: product.currency,
    period: periodEn,
    periodEn,
    formatted: product.price,
  };
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, accessToken } = useAuth();
  const { t } = useI18n();
  const { products, loading: isLoadingPrices, error: productsError, refetch: refetchProducts } = useSubscriptions();
  const { purchase: requestPurchase, purchasing, purchaseError: purchaseErrorFromHook } = usePurchase();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);
  const refreshInProgressRef = useRef<boolean>(false);

  const prices = useMemo((): PlanPrices => {
    const monthly = products.find((p) => p.productId.includes('monthly'));
    const yearly = products.find((p) => p.productId.includes('yearly'));
    return {
      monthly: monthly ? subscriptionProductToPlanPrice(monthly, 'month') : null,
      yearly: yearly ? subscriptionProductToPlanPrice(yearly, 'year') : null,
    };
  }, [products]);

  const refreshSubscription = async (forceRefresh = false) => {
    if (!isAuthenticated || !accessToken) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }
    if (refreshInProgressRef.current) return;
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
    if (!forceRefresh && timeSinceLastRefresh < CACHE_DURATION_MS && subscription !== null) {
      return;
    }
    try {
      refreshInProgressRef.current = true;
      setIsLoading(true);
      setError(null);
      const data = await subscriptionService.fetchStatus(accessToken);
      setSubscription(data);
      setSubscriptionState(data.plan === 'PRO' ? 'active' : 'free');
      lastRefreshTimeRef.current = Date.now();
      diagnostics.recordSubscriptionFetch('success');
    } catch (err) {
      console.error('Failed to fetch subscription status:', err);
      const message = err instanceof Error ? err.message : 'Failed to load subscription';
      setError(message);
      setSubscriptionState('unknown');
      setSubscription(null);
      diagnostics.recordSubscriptionFetch('error', message);
    } finally {
      setIsLoading(false);
      refreshInProgressRef.current = false;
    }
  };

  const upgradeToPro = async (plan: SubscriptionPlanType = 'monthly'): Promise<{ success: true } | { success: false; errorMessage: string }> => {
    if (!accessToken) {
      const msg = 'Not authenticated';
      setError(msg);
      return { success: false, errorMessage: msg };
    }
    if (!iapService.isIAPSupported()) {
      const msg = 'In-app purchases are not available on this device. Use the installed app from the App Store or Play Store.';
      setError(msg);
      return { success: false, errorMessage: msg };
    }

    setError(null);
    const productId = iapService.planToProductId(plan);
    const result = await requestPurchase(productId);

    if (!result.success) {
      if (result.cancelled) {
        setError(null);
        return { success: false, errorMessage: '' };
      }
      const msg = result.message || 'Purchase failed';
      setError(msg);
      return { success: false, errorMessage: msg };
    }

    const receipt = iapService.getPurchaseTokenForBackend(result.purchase);
    if (!receipt) {
      const msg = 'Could not get receipt for confirmation';
      setError(msg);
      return { success: false, errorMessage: msg };
    }

    try {
      await subscriptionService.confirmSubscription(
        {
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          receipt,
          productId: result.purchase.productId,
        },
        accessToken
      );
    } catch (confirmErr: unknown) {
      const errMsg = confirmErr instanceof Error ? confirmErr.message : 'Confirmation failed';
      const isAlreadyLinked = errMsg.toLowerCase().includes('already linked');
      const isDuplicate = errMsg.toLowerCase().includes('invalid productid') === false && errMsg.includes('400');
      const msg = isAlreadyLinked
        ? 'This purchase is already linked to another account. Use the account that made the purchase.'
        : isDuplicate
          ? 'This purchase was already applied.'
          : errMsg;
      setError(msg);
      return { success: false, errorMessage: msg };
    }

    await refreshSubscription(true);

    if (Platform.OS === 'android') {
      try {
        await iapService.acknowledgePurchaseAndroid(result.purchase);
      } catch (e) {
        console.warn('acknowledgePurchaseAndroid failed:', e);
      }
    } else {
      try {
        await iapService.finishTransaction(result.purchase);
      } catch (e) {
        console.warn('finishTransaction failed:', e);
      }
    }
    return { success: true };
  };

  const restorePurchases = async (): Promise<boolean> => {
    if (!accessToken) {
      setError('Not authenticated');
      return false;
    }
    if (!iapService.isIAPSupported()) {
      setError('In-app purchases are not available on this device.');
      return false;
    }

    setError(null);
    const purchases = await iapService.restorePurchases();
    if (purchases.length === 0) {
      setError(null);
      await refreshSubscription(true);
      return true;
    }

    const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
    for (const purchase of purchases) {
      const receipt = iapService.getPurchaseTokenForBackend(purchase);
      if (!receipt) continue;
      try {
        await subscriptionService.confirmSubscription(
          { platform, receipt, productId: purchase.productId },
          accessToken
        );
      } catch (e) {
        console.warn('Restore confirm failed for', purchase.productId, e);
      }
    }
    await refreshSubscription(true);
    return true;
  };

  const cancelSubscription = async (): Promise<boolean> => {
    if (!accessToken) {
      setError('Not authenticated');
      return false;
    }
    try {
      setError(null);
      const response = await subscriptionService.cancelSubscription(accessToken);
      if (response.success) {
        setSubscription(response.subscription);
        lastRefreshTimeRef.current = Date.now();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
      return false;
    }
  };

  const checkCanCreateClient = (): boolean => {
    if (subscriptionState === 'unknown') return true;
    return subscription?.canCreateClient ?? true;
  };

  const checkCanCreateOrder = (): boolean => {
    if (subscriptionState === 'unknown') return true;
    return subscription?.canCreateOrder ?? true;
  };

  const checkCanCreateTemplate = (): boolean => {
    if (subscriptionState === 'unknown') return true;
    const limits = subscription?.limits;
    if (limits?.maxTemplates == null) return true;
    const usage = subscription?.usage?.currentTemplates ?? 0;
    return usage < limits.maxTemplates;
  };

  const checkCanUseSharedTemplate = (): boolean => {
    if (subscriptionState === 'unknown') return true;
    const limits = subscription?.limits;
    if (limits?.maxSharedTemplates == null) return true;
    const usage = subscription?.usage?.currentSharedTemplates ?? 0;
    return usage < limits.maxSharedTemplates;
  };

  const templateCreationStatus = (): TemplateLimitStatus => {
    if (subscriptionState === 'unknown' || subscription == null || isLoading) {
      return { allowed: true, message: '' };
    }
    const allowed = checkCanCreateTemplate();
    const message = allowed ? '' : t('subscription.paywallTitle');
    return { allowed, message };
  };

  const sharedTemplateUsageStatus = (): TemplateLimitStatus => {
    if (subscriptionState === 'unknown' || subscription == null || isLoading) {
      return { allowed: true, message: '' };
    }
    const allowed = checkCanUseSharedTemplate();
    const message = allowed ? '' : t('subscription.paywallTitle');
    return { allowed, message };
  };

  const getUsageForDisplay = (): {
    clients: { current: number; max: number };
    orders: { current: number; max: number };
  } => {
    if (subscriptionState === 'unknown' || subscription == null || isLoading) {
      return { clients: { current: 0, max: 0 }, orders: { current: 0, max: 0 } };
    }
    const maxC = subscription.limits?.maxClients ?? 0;
    const maxO = subscription.limits?.maxOrders ?? 0;
    return {
      clients: {
        current: subscription.usage?.currentClients ?? 0,
        max: maxC,
      },
      orders: {
        current: subscription.usage?.currentOrders ?? 0,
        max: maxO,
      },
    };
  };

  const getLimitMessages = () => buildLimitMessages(getUsageForDisplay(), t);

  const refreshPrices = async () => {
    await refetchProducts();
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshSubscription();
    } else {
      setSubscription(null);
      setSubscriptionState('free');
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    return () => {
      endIapConnection();
    };
  }, []);

  const value: SubscriptionContextType = {
    subscription,
    subscriptionState,
    prices,
    isLoading,
    isLoadingPrices,
    error: error ?? productsError ?? purchaseErrorFromHook ?? null,
    purchasing,
    subscriptionStatusLoadFailed: subscriptionState === 'unknown',
    refreshSubscription,
    refreshPrices,
    upgradeToPro,
    restorePurchases,
    cancelSubscription,
    checkCanCreateClient,
    checkCanCreateOrder,
    checkCanCreateTemplate,
    checkCanUseSharedTemplate,
    templateCreationStatus,
    sharedTemplateUsageStatus,
    getUsageForDisplay,
    getLimitMessages,
    isIAPSupported: iapService.isIAPSupported(),
    purchasing,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
