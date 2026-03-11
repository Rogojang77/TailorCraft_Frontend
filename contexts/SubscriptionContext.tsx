/**
 * SubscriptionContext - Single Source of Truth for Subscription Status
 *
 * IMPORTANT: Backend is the ONLY source of truth for subscription status.
 * - Local storage/cache is only used as temporary UI cache
 * - On app launch, subscription status is immediately fetched from backend
 * - If backend call fails, user is treated as FREE (fail-safe)
 * - No optimistic "Pro" access based on local cache
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
  useRef,
  useCallback,
} from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { useI18n } from '@/lib/i18n';
import { useAuth } from './AuthContext';
import * as subscriptionService from '@/lib/services/subscriptionService';
import * as iapService from '@/lib/services/iapService';
import { getPurchaseTokenForBackend } from '@/lib/services/subscriptionManager';
import { endIapConnection } from '@/lib/services/iapConnection';
import { buildLimitMessages } from '@/lib/subscriptionMessages';
import * as diagnostics from '@/lib/diagnostics';
import { useSubscriptions, useSubscriptionState } from '@/hooks';
import type { PlanPrice } from '@/types/subscription';

import type {
  SubscriptionStatus,
  SubscriptionPlanType,
  PlanPrices,
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
  LimitCheckResult,
  SubscriptionState,
} from '@/types/subscription';

interface SubscriptionContextType {
  subscription: SubscriptionStatus | null;
  subscriptionState: SubscriptionState;
  /**
   * True when backend subscription has been verified.
   * Premium features should ONLY be accessible when this is true AND isPro is true.
   */
  isSubscriptionVerified: boolean;
  /**
   * True if user has an active Pro subscription (from BACKEND only).
   * NEVER trust local cache for this value.
   */
  isPro: boolean;
  /**
   * Expiration date from backend (if available).
   */
  expiresAt: Date | null;
  /**
   * True when initial subscription fetch is in progress.
   * Use this to show loading states and block premium feature access.
   */
  isVerifying: boolean;
  /**
   * Legacy alias for backwards compatibility. Same as isVerifying === false && subscription != null
   */
  isSubscriptionReady: boolean;
  prices: PlanPrices;
  isLoading: boolean;
  isLoadingPrices: boolean;
  error: string | null;
  subscriptionStatusLoadFailed: boolean;
  /**
   * In grace period (from backend entitlements).
   */
  inGracePeriod: boolean;
  /**
   * Has billing issue (from backend entitlements).
   */
  billingIssue: boolean;
  /**
   * Refreshes subscription status from backend.
   * This is the main function to call when you need to ensure subscription is up-to-date.
   * @param forceRefresh - If true, ignores cache and always fetches from backend
   */
  refreshSubscriptionStatus: (forceRefresh?: boolean) => Promise<void>;
  /**
   * Legacy alias for refreshSubscriptionStatus
   */
  refreshSubscription: (forceRefresh?: boolean) => Promise<void>;
  refreshPrices: () => Promise<void>;
  upgradeToPro: (
    plan?: SubscriptionPlanType
  ) => Promise<{ success: true } | { success: false; errorMessage: string }>;
  purchasing: boolean;
  restorePurchases: () => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
  checkCanCreateClient: () => boolean;
  checkCanCreateOrder: () => boolean;
  checkCanCreateTemplate: () => boolean;
  getUsageForDisplay: () => {
    clients: { current: number; max: number };
    orders: { current: number; max: number };
    templates: { current: number; max: number };
  };
  getLimitMessages: () => {
    paywallTitle: string;
    paywallTitleUpgrade: string;
    paywallSubtitle: string;
    paywallUpgradeCta: string;
    freePlanClients: string;
    freePlanOrders: string;
    freePlanLimitShort: string;
    upgradeHint: string;
    clientLimitReached: string;
    orderLimitReached: string;
    templateLimitReached: string;
  };
  isIAPSupported: boolean;
  /**
   * Clears all subscription state. Called on logout.
   */
  clearSubscriptionState: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

const CACHE_DURATION_MS = 30000;

function subscriptionProductToPlanPrice(
  product: {
    productId: string;
    price: string;
    rawPrice: number;
    currency: string;
  },
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
  const {
    products,
    loading: isLoadingPrices,
    error: productsError,
    refetch: refetchProducts,
  } = useSubscriptions();
  const {
    requestSubscription: managerRequestSubscription,
    purchaseInProgress: purchasing,
    restorePurchases: managerRestorePurchases,
  } = useSubscriptionState();

  // Core subscription state from backend
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(
    null
  );
  const [subscriptionState, setSubscriptionState] =
    useState<SubscriptionState>('unknown');
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const [billingIssue, setBillingIssue] = useState(false);

  const lastRefreshTimeRef = useRef<number>(0);
  const refreshInProgressRef = useRef<boolean>(false);
  const initialFetchDone = useRef<boolean>(false);

  const prices = useMemo((): PlanPrices => {
    const monthly = products.find((p) => p.productId.includes('monthly'));
    const yearly = products.find((p) => p.productId.includes('yearly'));
    return {
      monthly: monthly ? subscriptionProductToPlanPrice(monthly, 'month') : null,
      yearly: yearly ? subscriptionProductToPlanPrice(yearly, 'year') : null,
    };
  }, [products]);

  /**
   * Derived state: isPro is ONLY true when backend confirms Pro status.
   * NEVER defaults to true. Fail-safe to FREE.
   */
  const isPro = useMemo(() => {
    if (subscriptionState === 'unknown' || subscriptionState === 'free') {
      return false;
    }
    return subscriptionState === 'active';
  }, [subscriptionState]);

  /**
   * Expiration date from backend subscription data.
   */
  const expiresAt = useMemo(() => {
    if (!subscription?.expiresAt) return null;
    const date = new Date(subscription.expiresAt);
    return isNaN(date.getTime()) ? null : date;
  }, [subscription?.expiresAt]);

  /**
   * Subscription is verified when:
   * 1. Initial fetch has completed (success or failure)
   * 2. We are not currently verifying
   */
  const isSubscriptionVerified = !isVerifying && initialFetchDone.current;

  /**
   * Legacy compatibility: isSubscriptionReady
   */
  const isSubscriptionReady = isSubscriptionVerified && subscription != null;

  /**
   * Main function to refresh subscription status from backend.
   * This is the ONLY source of truth for subscription status.
   */
  const refreshSubscriptionStatus = useCallback(
    async (forceRefresh = false) => {
      if (!isAuthenticated || !accessToken) {
        // Not authenticated: clear state and treat as FREE
        setSubscription(null);
        setSubscriptionState('free');
        setInGracePeriod(false);
        setBillingIssue(false);
        setIsVerifying(false);
        initialFetchDone.current = true;
        return;
      }

      if (refreshInProgressRef.current) return;

      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTimeRef.current;

      // Only skip if we have valid cached data AND not forcing refresh
      if (
        !forceRefresh &&
        timeSinceLastRefresh < CACHE_DURATION_MS &&
        subscription !== null &&
        initialFetchDone.current
      ) {
        return;
      }

      try {
        refreshInProgressRef.current = true;
        setIsVerifying(true);
        setError(null);

        // Fetch subscription status from backend - this is the source of truth
        const data = await subscriptionService.fetchStatus(accessToken);

        // Update state from backend response
        setSubscription(data);
        setSubscriptionState(data.plan === 'PRO' ? 'active' : 'free');
        lastRefreshTimeRef.current = Date.now();
        initialFetchDone.current = true;
        diagnostics.recordSubscriptionFetch('success');

        // Also fetch entitlements for grace period / billing issue info
        try {
          const entitlements =
            await subscriptionService.fetchEntitlements(accessToken);
          setInGracePeriod(entitlements.inGracePeriod ?? false);
          setBillingIssue(entitlements.billingIssue ?? false);
        } catch {
          // Entitlements fetch is optional, don't fail the main flow
        }
      } catch (err) {
        console.error('Failed to fetch subscription status:', err);
        const message =
          err instanceof Error ? err.message : 'Failed to load subscription';
        setError(message);

        // FAIL-SAFE: On error, treat user as FREE
        // NEVER default to Pro when backend is unavailable
        setSubscriptionState('free');
        setSubscription(null);
        setInGracePeriod(false);
        setBillingIssue(false);
        initialFetchDone.current = true;
        diagnostics.recordSubscriptionFetch('error', message);
      } finally {
        setIsVerifying(false);
        refreshInProgressRef.current = false;
      }
    },
    [isAuthenticated, accessToken, subscription]
  );

  /**
   * Legacy alias for refreshSubscriptionStatus
   */
  const refreshSubscription = refreshSubscriptionStatus;

  /**
   * Clears all subscription state. Called on logout.
   */
  const clearSubscriptionState = useCallback(() => {
    setSubscription(null);
    setSubscriptionState('free');
    setInGracePeriod(false);
    setBillingIssue(false);
    setError(null);
    setIsVerifying(false);
    lastRefreshTimeRef.current = 0;
    initialFetchDone.current = false;
  }, []);

  const upgradeToPro = async (
    plan: SubscriptionPlanType = 'monthly'
  ): Promise<{ success: true } | { success: false; errorMessage: string }> => {
    if (!accessToken) {
      const msg = 'Not authenticated';
      setError(msg);
      return { success: false, errorMessage: msg };
    }
    if (!iapService.isIAPSupported()) {
      const msg =
        'In-app purchases are not available on this device. Use the installed app from the App Store or Play Store.';
      setError(msg);
      return { success: false, errorMessage: msg };
    }

    setError(null);
    const productId = iapService.planToProductId(plan);
    const result = await managerRequestSubscription(productId);

    if (!result.success) {
      if (result.cancelled) {
        setError(null);
        return { success: false, errorMessage: '' };
      }
      const msg = result.message || 'Purchase failed';
      setError(msg);
      return { success: false, errorMessage: msg };
    }

    // Sync with backend and refresh subscription status
    const receipt = getPurchaseTokenForBackend(result.purchase);
    if (receipt) {
      try {
        await subscriptionService.confirmSubscription(
          {
            platform: Platform.OS === 'ios' ? 'ios' : 'android',
            receipt,
            productId: result.purchase.productId,
          },
          accessToken
        );
        // Force refresh from backend after successful purchase
        await refreshSubscriptionStatus(true);
      } catch (confirmErr: unknown) {
        const errMsg =
          confirmErr instanceof Error
            ? confirmErr.message
            : 'Confirmation failed';
        const isAlreadyLinked = errMsg.toLowerCase().includes('already linked');
        const isDuplicate =
          errMsg.toLowerCase().includes('invalid productid') === false &&
          errMsg.includes('400');
        const msg = isAlreadyLinked
          ? 'This purchase is already linked to another account. Use the account that made the purchase.'
          : isDuplicate
            ? 'This purchase was already applied.'
            : errMsg;
        setError(msg);
        // Still refresh to get the latest status
        await refreshSubscriptionStatus(true);
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
    const purchases = await managerRestorePurchases();
    if (purchases.length === 0) {
      setError(null);
      await refreshSubscriptionStatus(true);
      return true;
    }

    const platform: 'ios' | 'android' =
      Platform.OS === 'ios' ? 'ios' : 'android';
    for (const purchase of purchases) {
      const receipt = getPurchaseTokenForBackend(purchase);
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
    // Always refresh from backend after restore
    await refreshSubscriptionStatus(true);
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
      setError(
        err instanceof Error ? err.message : 'Failed to cancel subscription'
      );
      return false;
    }
  };

  /**
   * IMPORTANT: All limit checks return FALSE (blocked) when subscription is not verified.
   * This prevents premium access before backend verification.
   */
  const checkCanCreateClient = (): boolean => {
    // Block if subscription not verified yet
    if (!isSubscriptionVerified) return false;
    if (subscriptionState === 'unknown') return false;
    return subscription?.canCreateClient ?? false;
  };

  const checkCanCreateOrder = (): boolean => {
    // Block if subscription not verified yet
    if (!isSubscriptionVerified) return false;
    if (subscriptionState === 'unknown') return false;
    return subscription?.canCreateOrder ?? false;
  };

  const checkCanCreateTemplate = (): boolean => {
    if (!isSubscriptionVerified) return false;
    if (subscriptionState === 'unknown') return false;
    return subscription?.canCreateTemplate ?? false;
  };

  const getUsageForDisplay = (): {
    clients: { current: number; max: number };
    orders: { current: number; max: number };
    templates: { current: number; max: number };
  } => {
    if (!isSubscriptionVerified) {
      return {
        clients: { current: 0, max: 0 },
        orders: { current: 0, max: 0 },
        templates: { current: 0, max: 0 },
      };
    }
    const maxC = subscription?.limits?.maxClients ?? 0;
    const maxO = subscription?.limits?.maxOrders ?? 0;
    const maxT = subscription?.limits?.maxTemplates ?? 0;
    return {
      clients: {
        current: subscription?.usage?.currentClients ?? 0,
        max: maxC,
      },
      orders: {
        current: subscription?.usage?.currentOrders ?? 0,
        max: maxO,
      },
      templates: {
        current: subscription?.usage?.currentTemplates ?? 0,
        max: maxT,
      },
    };
  };

  const getLimitMessages = () =>
    buildLimitMessages(getUsageForDisplay(), t, {
      subscriptionReady: isSubscriptionVerified,
    });

  const refreshPrices = async () => {
    await refetchProducts();
  };

  // Fetch subscription status immediately when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      // Always fetch on auth change - this is the critical path
      refreshSubscriptionStatus(true);
    } else {
      clearSubscriptionState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, accessToken]);

  // Refetch subscription when app comes to foreground
  // This ensures subscription state is always up-to-date after:
  // - User purchases subscription outside the app
  // - Subscription expires while app is backgrounded
  // - Backend subscription state changes
  useEffect(() => {
    const appStateRef = { previous: AppState.currentState };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const wasBackground =
        appStateRef.previous === 'background' || appStateRef.previous === 'inactive';
      const isNowActive = nextAppState === 'active';

      if (wasBackground && isNowActive && isAuthenticated && accessToken) {
        // Force refresh subscription status from backend when app comes to foreground
        refreshSubscriptionStatus(true);
      }

      appStateRef.previous = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, accessToken, refreshSubscriptionStatus]);

  useEffect(() => {
    return () => {
      endIapConnection();
    };
  }, []);

  const value: SubscriptionContextType = {
    subscription,
    subscriptionState,
    isSubscriptionVerified,
    isPro,
    expiresAt,
    isVerifying,
    isSubscriptionReady,
    prices,
    isLoading: isVerifying,
    isLoadingPrices,
    error: error ?? productsError ?? null,
    purchasing,
    subscriptionStatusLoadFailed: subscriptionState === 'unknown' && !isVerifying,
    inGracePeriod,
    billingIssue,
    refreshSubscriptionStatus,
    refreshSubscription,
    refreshPrices,
    upgradeToPro,
    restorePurchases,
    cancelSubscription,
    checkCanCreateClient,
    checkCanCreateOrder,
    checkCanCreateTemplate,
    getUsageForDisplay,
    getLimitMessages,
    isIAPSupported: iapService.isIAPSupported(),
    clearSubscriptionState,
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

/**
 * Hook to get premium status from backend.
 * This replaces the old usePremium() hook from PremiumContext.
 * @deprecated Use useSubscription() directly for full subscription info.
 */
export function usePremium() {
  const {
    isPro,
    expiresAt,
    isVerifying,
    error,
    purchasing,
    refreshSubscriptionStatus,
    restorePurchases,
    inGracePeriod,
    billingIssue,
  } = useSubscription();

  return {
    isPremium: isPro,
    activeProductId: isPro ? 'entitled' : null,
    expirationDate: expiresAt?.getTime() ?? null,
    inGracePeriod,
    billingIssue,
    loading: isVerifying,
    error,
    purchaseInProgress: purchasing,
    refreshEntitlements: () => refreshSubscriptionStatus(true),
    restorePurchases: async () => {
      await restorePurchases();
    },
  };
}
