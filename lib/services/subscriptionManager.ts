/**
 * StoreKit 2–based subscription manager for IAP operations.
 *
 * IMPORTANT: This manager is used ONLY for IAP purchase flow and transaction management.
 * The `isPremium` state from this manager should NOT be used to determine actual
 * subscription/premium status. Backend is the ONLY source of truth for premium access.
 *
 * Use cases for this manager:
 * - Processing new IAP purchases
 * - Restoring purchases
 * - Finishing transactions
 * - Managing purchase flow state
 *
 * For premium status checks, use:
 * - useSubscription().isPro
 * - usePremium().isPremium (from SubscriptionContext)
 *
 * Best practices:
 * - finishTransaction() is called after we've processed the purchase locally
 * - Backend sync happens via confirmSubscription() after purchase
 * - Backend verification is the source of truth for access control
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  SUBSCRIPTION_PRODUCT_IDS,
  type SubscriptionProductId,
  type PurchaseLike,
  getPurchaseTokenForBackend,
  finishTransaction,
  acknowledgePurchaseAndroid,
} from '@/lib/services/iapService';
import { ensureIapConnection, isIapConnectionFailed } from '@/lib/services/iapConnection';

const isExpoGo = Constants.appOwnership === 'expo';
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
const isIAPAvailable = isNative && !isExpoGo;

/** Safe to log in development; masks long tokens. */
const ENTITLEMENT_DEBUG = __DEV__;

function logEntitlement(message: string, data?: Record<string, unknown>): void {
  if (ENTITLEMENT_DEBUG) {
    console.log(`[subscriptionManager] ${message}`, data ?? '');
  }
}

export interface SubscriptionState {
  isPremium: boolean;
  expiresAt: Date | null;
  loading: boolean;
  purchaseInProgress: boolean;
}

type Listener = (state: SubscriptionState) => void;

let state: SubscriptionState = {
  isPremium: false,
  expiresAt: null,
  loading: true,
  purchaseInProgress: false,
};

const listeners = new Set<Listener>();

function getIap(): {
  initConnection: () => Promise<boolean>;
  getAvailablePurchases: (options?: {
    alsoPublishToEventListenerIOS?: boolean;
    onlyIncludeActiveItemsIOS?: boolean;
  }) => Promise<PurchaseLike[]>;
  purchaseUpdatedListener: (cb: (purchase: PurchaseLike) => void) => { remove: () => void };
  purchaseErrorListener: (cb: (error: { code?: string; message?: string }) => void) => { remove: () => void };
  requestPurchase: (opts: { request: { apple?: { sku: string }; google?: { skus: string[] } }; type: 'subs' }) => Promise<unknown>;
  fetchProducts: (opts: { skus: string[]; type: 'subs' }) => Promise<unknown[]>;
  finishTransaction: (args: { purchase: PurchaseLike; isConsumable: boolean }) => Promise<void>;
  acknowledgePurchaseAndroid?: (token: string) => Promise<boolean>;
} | null {
  if (!isIAPAvailable) return null;
  try {
    const iap = require('react-native-iap');
    return iap as typeof iap;
  } catch {
    return null;
  }
}

function setState(partial: Partial<SubscriptionState>): void {
  state = { ...state, ...partial };
  listeners.forEach((l) => l(state));
}

function deriveFromPurchases(purchases: PurchaseLike[]): { isPremium: boolean; expiresAt: Date | null } {
  const now = Date.now();
  let bestExpiresAt: number | null = null;

  for (const p of purchases) {
    if (!SUBSCRIPTION_PRODUCT_IDS.includes(p.productId as SubscriptionProductId)) continue;
    const raw = p as PurchaseLike & { expirationDateIOS?: number | null };
    const exp = raw.expirationDateIOS;
    if (exp != null && typeof exp === 'number') {
      if (exp > now) {
        if (bestExpiresAt == null || exp > bestExpiresAt) bestExpiresAt = exp;
      }
    } else {
      // Android or missing expiry: treat as active if we have a purchase (store says active)
      if (bestExpiresAt == null) bestExpiresAt = now + 86400000; // 1 day fallback
    }
  }

  const isPremium = bestExpiresAt != null && bestExpiresAt > now;
  return {
    isPremium,
    expiresAt: bestExpiresAt != null ? new Date(bestExpiresAt) : null,
  };
}

/** Map raw library purchase to PurchaseLike and include expiration for iOS. */
function toPurchaseLike(p: {
  productId: string;
  purchaseToken?: string | null;
  transactionId?: string | null;
  expirationDateIOS?: number | null;
}): PurchaseLike & { expirationDateIOS?: number | null } {
  return {
    productId: p.productId,
    purchaseToken: p.purchaseToken ?? null,
    transactionId: 'transactionId' in p ? (p as { transactionId?: string | null }).transactionId : undefined,
    expirationDateIOS: 'expirationDateIOS' in p ? (p as { expirationDateIOS?: number | null }).expirationDateIOS : undefined,
  };
}

let listenersAttached = false;

function attachPurchaseListeners(): void {
  const iap = getIap();
  if (!iap || listenersAttached) return;
  listenersAttached = true;

  iap.purchaseUpdatedListener((purchase: unknown) => {
    const p = purchase as { productId: string; purchaseToken?: string | null; transactionId?: string | null; expirationDateIOS?: number | null };
    if (!p?.productId || !SUBSCRIPTION_PRODUCT_IDS.includes(p.productId as SubscriptionProductId)) return;
    const like = toPurchaseLike(p);
    const { isPremium: nextPremium, expiresAt: nextExpires } = deriveFromPurchases([like]);
    logEntitlement('purchaseUpdatedListener', { productId: p.productId, isPremium: nextPremium, expiresAt: nextExpires?.toISOString() });
    setState({
      isPremium: nextPremium,
      expiresAt: nextExpires,
      purchaseInProgress: false,
    });
    // Finish transaction after we've updated local entitlement. Do not block on backend.
    if (Platform.OS === 'ios') {
      finishTransaction(like).catch((e) => logEntitlement('finishTransaction after purchase failed', { error: String(e) }));
    } else if (Platform.OS === 'android' && like.purchaseToken) {
      acknowledgePurchaseAndroid(like).catch((e) => logEntitlement('acknowledgePurchaseAndroid failed', { error: String(e) }));
    }
  });

  iap.purchaseErrorListener((error: { code?: string; message?: string }) => {
    logEntitlement('purchaseErrorListener', { code: error?.code, message: error?.message });
    setState({ purchaseInProgress: false });
  });
}

/**
 * Fetches current entitlements from the store (getAvailablePurchases).
 * On first app launch after install, pass flushUnfinished: true so pending transactions
 * are delivered to purchaseUpdatedListener and can be finished.
 */
export async function refreshEntitlements(flushUnfinished = false): Promise<SubscriptionState> {
  setState({ loading: true });
  if (!isIAPAvailable || isIapConnectionFailed()) {
    setState({ isPremium: false, expiresAt: null, loading: false });
    return state;
  }
  const iap = getIap();
  if (!iap) {
    setState({ isPremium: false, expiresAt: null, loading: false });
    return state;
  }
  try {
    const connected = await ensureIapConnection();
    if (!connected) {
      setState({ isPremium: false, expiresAt: null, loading: false });
      return state;
    }
    attachPurchaseListeners();
    const options = {
      onlyIncludeActiveItemsIOS: true,
      alsoPublishToEventListenerIOS: flushUnfinished,
    };
    const purchases = await iap.getAvailablePurchases(options);
    const list = Array.isArray(purchases) ? purchases.map((p: unknown) => toPurchaseLike(p as Parameters<typeof toPurchaseLike>[0])) : [];
    const { isPremium, expiresAt } = deriveFromPurchases(list);
    logEntitlement('refreshEntitlements', {
      count: list.length,
      isPremium,
      expiresAt: expiresAt?.toISOString() ?? null,
      flushUnfinished,
    });
    setState({ isPremium, expiresAt, loading: false });
    return state;
  } catch (e) {
    logEntitlement('refreshEntitlements error', { error: String(e) });
    setState({ isPremium: false, expiresAt: null, loading: false });
    return state;
  }
}

/**
 * Request a subscription purchase. Listener will update state; we also set purchaseInProgress.
 * Does not call finishTransaction here; purchaseUpdatedListener does that after updating state.
 */
export async function requestSubscription(productId: SubscriptionProductId): Promise<
  | { success: true; purchase: PurchaseLike }
  | { success: false; code: string; message: string; cancelled?: boolean }
> {
  if (!isIAPAvailable || isIapConnectionFailed()) {
    return { success: false, code: 'E_UNSUPPORTED', message: 'In-app purchases are not available.' };
  }
  const iap = getIap();
  if (!iap) {
    return { success: false, code: 'E_UNSUPPORTED', message: 'In-app purchases are not available.' };
  }
  setState({ purchaseInProgress: true });
  return new Promise((resolve) => {
    const subUpdated = iap.purchaseUpdatedListener((purchase: unknown) => {
      const p = purchase as { productId: string };
      if (p?.productId !== productId) return;
      subUpdated.remove();
      subError.remove();
      const like = toPurchaseLike(purchase as Parameters<typeof toPurchaseLike>[0]);
      resolve({ success: true, purchase: like });
    });
    const subError = iap.purchaseErrorListener((error: { code?: string; message?: string }) => {
      subUpdated.remove();
      subError.remove();
      setState({ purchaseInProgress: false });
      const code = String(error?.code ?? 'E_UNKNOWN');
      const message = error?.message ?? String(error);
      const cancelled = code.includes('CANCELLED') || message.toLowerCase().includes('cancelled');
      resolve({ success: false, code, message, cancelled });
    });
    Promise.resolve()
      .then(() => ensureIapConnection())
      .then((connected) => {
        if (!connected) throw new Error('Billing service unavailable');
      })
      .then(() => attachPurchaseListeners())
      .then(() => iap.fetchProducts({ skus: [productId], type: 'subs' }))
      .then(() =>
        iap.requestPurchase({
          request: { apple: { sku: productId }, google: { skus: [productId] } },
          type: 'subs',
        })
      )
      .catch((e: unknown) => {
        subUpdated.remove();
        subError.remove();
        setState({ purchaseInProgress: false });
        const code = (e as { code?: string })?.code ?? 'E_REQUEST_FAILED';
        const message = e instanceof Error ? e.message : String(e);
        const cancelled = code.includes('CANCELLED') || message.toLowerCase().includes('cancelled');
        resolve({ success: false, code, message, cancelled });
      });
  });
}

/**
 * Restore purchases: refresh from store. State is updated by refreshEntitlements.
 * Returns current purchases for optional backend sync.
 */
export async function restorePurchases(): Promise<PurchaseLike[]> {
  if (!isIAPAvailable || isIapConnectionFailed()) return [];
  const iap = getIap();
  if (!iap) return [];
  setState({ loading: true });
  try {
    const connected = await ensureIapConnection();
    if (!connected) {
      setState({ loading: false });
      return [];
    }
    attachPurchaseListeners();
    const purchases = await iap.getAvailablePurchases({
      alsoPublishToEventListenerIOS: false,
      onlyIncludeActiveItemsIOS: true,
    });
    const list = Array.isArray(purchases) ? purchases.map((p: unknown) => toPurchaseLike(p as Parameters<typeof toPurchaseLike>[0])) : [];
    const subs = list.filter((pl) => SUBSCRIPTION_PRODUCT_IDS.includes(pl.productId as SubscriptionProductId));
    const { isPremium, expiresAt } = deriveFromPurchases(subs);
    setState({ isPremium, expiresAt, loading: false });
    return subs;
  } catch (e) {
    logEntitlement('restorePurchases error', { error: String(e) });
    setState({ loading: false });
    return [];
  }
}

export function getState(): SubscriptionState {
  return state;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

/** Call once on app launch: refresh entitlements and flush any unfinished transactions. */
export async function onAppLaunch(): Promise<SubscriptionState> {
  return refreshEntitlements(true);
}

/** For optional backend sync: get purchase token for a purchase. */
export { getPurchaseTokenForBackend };

/** Re-export types from iapService for convenience. */
export type { SubscriptionProductId };
