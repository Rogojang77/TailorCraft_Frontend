/**
 * React hook for StoreKit 2 subscription state from subscriptionManager.
 * Runs onAppLaunch() on mount to refresh entitlements and flush unfinished transactions.
 *
 * IMPORTANT: The `isPremium` returned by this hook should NOT be used to determine
 * actual subscription status. Backend is the ONLY source of truth for premium access.
 * Use `useSubscription().isPro` or `usePremium().isPremium` instead.
 *
 * This hook is used internally by SubscriptionContext for:
 * - Processing IAP purchases
 * - Restoring purchases
 * - Managing purchase flow state (purchaseInProgress)
 */

import { useEffect, useState, useRef } from 'react';
import {
  getState,
  subscribe,
  onAppLaunch,
  refreshEntitlements,
  requestSubscription as managerRequestSubscription,
  restorePurchases as managerRestorePurchases,
  type SubscriptionState,
  type SubscriptionProductId,
} from '@/lib/services/subscriptionManager';

export type { SubscriptionState, SubscriptionProductId };

export interface UseSubscriptionStateResult extends SubscriptionState {
  refreshEntitlements: () => Promise<void>;
  requestSubscription: (productId: SubscriptionProductId) => Promise<
    | { success: true; purchase: import('@/lib/services/iapService').PurchaseLike }
    | { success: false; code: string; message: string; cancelled?: boolean }
  >;
  restorePurchases: () => Promise<import('@/lib/services/iapService').PurchaseLike[]>;
}

/**
 * Subscribes to subscription manager state and runs app-launch entitlement check on mount.
 * Use inside a provider that mounts once (e.g. SubscriptionProvider / PremiumProvider).
 */
export function useSubscriptionState(): UseSubscriptionStateResult {
  const [state, setState] = useState<SubscriptionState>(getState);
  const launchDone = useRef(false);

  useEffect(() => {
    const unsub = subscribe(setState);
    return unsub;
  }, []);

  useEffect(() => {
    if (launchDone.current) return;
    launchDone.current = true;
    onAppLaunch().catch(() => {
      launchDone.current = false;
    });
  }, []);

  return {
    ...state,
    refreshEntitlements: async () => {
      await refreshEntitlements(false);
    },
    requestSubscription: managerRequestSubscription,
    restorePurchases: managerRestorePurchases,
  };
}
