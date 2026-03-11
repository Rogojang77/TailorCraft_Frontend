/**
 * In-App Purchase service for Apple IAP and Google Play Billing.
 * Used only on iOS and Android; no-op on web. Not available in Expo Go (NitroModules unsupported).
 *
 * App Store Connect: create a subscription group and two auto-renewable subscriptions with
 * Product IDs exactly matching SUBSCRIPTION_PRODUCT_IDS below. Backend must verify receipts
 * using the same product IDs.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { ensureIapConnection, isIapConnectionFailed } from '@/lib/services/iapConnection';

/** Set to true to log full purchase objects and token lengths (for IAP debugging). Keep false in production. */
const IAP_DEBUG_LOGGING = __DEV__;

/** Log purchase fields useful for debugging StoreKit 2 / receipt validation. Masks long strings. */
function logPurchaseForDebug(productId: string, purchase: Record<string, unknown>): void {
  if (!IAP_DEBUG_LOGGING) return;
  const mask = (s: unknown) =>
    typeof s === 'string' && s.length > 20 ? `${s.slice(0, 12)}...(${s.length})` : s;
  const ios = purchase as {
    originalTransactionIdentifierIOS?: string | null;
    environmentIOS?: string | null;
    expirationDateIOS?: number | null;
  };
  console.log('[iapService] purchaseUpdated', {
    productId,
    matched: purchase?.productId === productId,
    purchaseState: purchase?.purchaseState,
    transactionId: purchase?.transactionId ?? null,
    originalTransactionId: ios?.originalTransactionIdentifierIOS ?? null,
    hasPurchaseToken: !!purchase?.purchaseToken,
    purchaseTokenPreview: mask(purchase?.purchaseToken),
    environmentIOS: ios?.environmentIOS ?? null,
    expirationDateIOS: ios?.expirationDateIOS ?? null,
  });
}

/** Expo Go does not support NitroModules (react-native-iap); only use IAP in dev/build clients or bare workflow. */
const isExpoGo = Constants.appOwnership === 'expo';
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
const isIAPAvailable = isNative && !isExpoGo;

const EXPO_GO_WARN =
  '[iapService] In-app purchases do not work in Expo Go. Use a development build or EAS build.';

function getIap(): typeof import('react-native-iap') | null {
  if (!isIAPAvailable) {
    if (isExpoGo) console.warn(EXPO_GO_WARN);
    return null;
  }
  try {
    return require('react-native-iap');
  } catch {
    return null;
  }
}

/** Minimal shape used for purchase token; avoids importing Purchase from react-native-iap at load time. */
export interface PurchaseLike {
  purchaseToken?: string | null;
  productId: string;
  transactionId?: string | null;
}

/** Must match subscription Product IDs in App Store Connect (and Google Play if applicable). */
export const SUBSCRIPTION_PRODUCT_IDS = [
  'com.tailorcraft.premium.monthly',
  'com.tailorcraft.premium.yearly',
] as const;

export type SubscriptionProductId = (typeof SUBSCRIPTION_PRODUCT_IDS)[number];

/**
 * Map plan to product ID.
 */
export function planToProductId(plan: 'monthly' | 'yearly'): SubscriptionProductId {
  return plan === 'yearly'
    ? 'com.tailorcraft.premium.yearly'
    : 'com.tailorcraft.premium.monthly';
}

export type PurchaseResult =
  | { success: true; purchase: PurchaseLike }
  | { success: false; code: string; message: string; cancelled?: boolean };

/**
 * Request a subscription purchase. Resolves when the purchase flow completes (success or error).
 * Listen for purchase via purchaseUpdatedListener; this returns a promise that resolves when the listener fires.
 */
export function requestSubscription(
  productId: SubscriptionProductId,
  listeners: {
    onPurchaseUpdated: (purchase: PurchaseLike) => void;
    onPurchaseError: (error: { code: string; message: string }) => void;
  }
): Promise<PurchaseResult> {
  if (!isIAPAvailable) {
    return Promise.resolve({
      success: false,
      code: 'E_UNSUPPORTED',
      message: 'In-app purchases are not available on this platform.',
    });
  }
  const iap = getIap();
  if (!iap) {
    return Promise.resolve({
      success: false,
      code: 'E_UNSUPPORTED',
      message: 'In-app purchases are not available.',
    });
  }

  return new Promise((resolve) => {
    const subUpdated = iap.purchaseUpdatedListener((purchase) => {
      if (IAP_DEBUG_LOGGING) {
        console.log('[iapService] purchaseUpdatedListener fired', { productId, receivedProductId: purchase?.productId });
      }
      if (purchase.productId === productId) {
        subUpdated.remove();
        subError.remove();
        logPurchaseForDebug(productId, purchase as unknown as Record<string, unknown>);
        const like: PurchaseLike = {
          purchaseToken: purchase.purchaseToken ?? null,
          productId: purchase.productId,
          transactionId: 'transactionId' in purchase ? (purchase as { transactionId?: string | null }).transactionId : undefined,
        };
        listeners.onPurchaseUpdated(like);
        const token = like.purchaseToken ?? (Platform.OS === 'ios' && like.transactionId ? like.transactionId : null);
        if (IAP_DEBUG_LOGGING) {
          console.log('[iapService] resolved success, token length for backend:', token?.length ?? 0);
        }
        resolve({ success: true, purchase: like });
      }
    });

    const subError = iap.purchaseErrorListener((error: { code?: string; message?: string }) => {
      if (IAP_DEBUG_LOGGING) {
        console.log('[iapService] purchaseErrorListener', { code: error?.code, message: error?.message });
      }
      subUpdated.remove();
      subError.remove();
      const code = String(error.code ?? 'E_UNKNOWN');
      const message = error.message ?? String(error);
      const cancelled =
        code.includes('CANCELLED') ||
        message.toLowerCase().includes('cancelled');
      listeners.onPurchaseError({ code, message });
      resolve({ success: false, code, message, cancelled });
    });

    Promise.resolve()
      .then(() => ensureIapConnection())
      .then((connected) => {
        if (!connected) throw new Error('Billing service unavailable');
      })
      .then(async () => {
        const products = await iap.fetchProducts({ skus: [productId], type: 'subs' });
        if (__DEV__) console.log('SUBSCRIPTIONS:', products);
        return iap.requestPurchase({
          request: {
            apple: { sku: productId },
            google: { skus: [productId] },
          },
          type: 'subs',
        });
      })
      .catch((e: unknown) => {
        subUpdated.remove();
        subError.remove();
        const code = (e as { code?: string })?.code ?? 'E_REQUEST_FAILED';
        const message = e instanceof Error ? e.message : String(e);
        const cancelled =
          code.includes('CANCELLED') || message.toLowerCase().includes('cancelled');
        listeners.onPurchaseError({ code, message });
        resolve({ success: false, code, message, cancelled });
      });
  });
}

/**
 * Extract purchase token for backend verify.
 * iOS: purchaseToken is the JWS transaction (unified field).
 * Android: purchaseToken from store.
 */
export function getPurchaseTokenForBackend(purchase: PurchaseLike): string | null {
  const token = purchase.purchaseToken ?? null;
  if (token) return token;
  if (Platform.OS === 'ios' && purchase.transactionId) {
    return purchase.transactionId;
  }
  return null;
}

/**
 * Finish transaction on iOS after backend confirmation. Call only after backend confirm succeeded.
 */
export async function finishTransaction(purchase: PurchaseLike): Promise<void> {
  if (!isIAPAvailable || Platform.OS !== 'ios') return;
  const iap = getIap();
  if (!iap) return;
  try {
    await iap.finishTransaction({
      purchase: purchase as Parameters<typeof iap.finishTransaction>[0]['purchase'],
      isConsumable: false,
    });
  } catch (e) {
    console.warn('[iapService] finishTransaction failed:', e);
  }
}

/**
 * Acknowledge purchase on Android after backend confirmation. Required by Play Billing; call only after backend confirm succeeded.
 */
export async function acknowledgePurchaseAndroid(purchase: PurchaseLike): Promise<void> {
  if (!isIAPAvailable || Platform.OS !== 'android') return;
  const token = purchase.purchaseToken ?? null;
  if (!token) return;
  const iap = getIap();
  if (!iap?.acknowledgePurchaseAndroid) return;
  try {
    await iap.acknowledgePurchaseAndroid(token);
  } catch (e) {
    console.warn('[iapService] acknowledgePurchaseAndroid failed:', e);
  }
}

/**
 * Restore purchases: fetches store receipts and returns them as PurchaseLike[].
 * Used only to send receipts to backend (POST /subscriptions/confirm). Premium is never
 * determined from this; backend GET /entitlements/me is the only source of truth.
 */
export async function restorePurchases(): Promise<PurchaseLike[]> {
  if (!isIAPAvailable || isIapConnectionFailed()) return [];
  const iap = getIap();
  if (!iap) return [];
  try {
    const connected = await ensureIapConnection();
    if (!connected) return [];
    const purchases = await iap.getAvailablePurchases({
      alsoPublishToEventListenerIOS: false,
      onlyIncludeActiveItemsIOS: true,
    });
    const subs = purchases.filter((p) =>
      SUBSCRIPTION_PRODUCT_IDS.includes(p.productId as SubscriptionProductId)
    );
    return subs.map((p) => ({
      purchaseToken: p.purchaseToken ?? null,
      productId: p.productId,
      transactionId: 'transactionId' in p ? (p as { transactionId?: string | null }).transactionId : undefined,
    }));
  } catch (e) {
    console.warn('[iapService] restorePurchases failed:', e);
    return [];
  }
}

/**
 * Open iOS Subscription Management sheet. No-op on Android / web / Expo Go.
 */
export async function showManageSubscriptionsIOS(): Promise<void> {
  if (Platform.OS !== 'ios' || !isIAPAvailable) return;
  const iap = getIap();
  if (!iap?.showManageSubscriptionsIOS) return;
  await iap.showManageSubscriptionsIOS();
}

export function isIAPSupported(): boolean {
  return isIAPAvailable;
}
