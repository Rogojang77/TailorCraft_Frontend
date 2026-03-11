/**
 * Production-ready hook to fetch localized subscription prices from Apple and Google
 * using react-native-iap. For use in EAS/Dev Client builds only (not Expo Go).
 *
 * Connection: ensureIapConnection() then fetchProducts(). Cleanup is in SubscriptionProvider only.
 * Normalizes iOS/Android into SubscriptionProduct.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { SUBSCRIPTION_PRODUCT_IDS } from '@/lib/services/iapService';
import { ensureIapConnection, isIapConnectionFailed } from '@/lib/services/iapConnection';

const isExpoGo = Constants.appOwnership === 'expo';
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
const isIAPAvailable = isNative && !isExpoGo;

export interface SubscriptionProduct {
  productId: string;
  title: string;
  description: string;
  /** Formatted localized price (e.g. "$4.99" or "4,99 €"). Alias: formattedPrice. */
  price: string;
  /** Same as price; for audit/compatibility. */
  formattedPrice: string;
  /** Numeric price for calculations */
  rawPrice: number;
  currency: string;
}

export type UseSubscriptionsResult = {
  products: SubscriptionProduct[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

/** Raw subscription item from react-native-iap (iOS and Android shapes normalized by library to ProductSubscription) */
interface RawSubscriptionLike {
  id: string;
  title?: string | null;
  description?: string | null;
  /** react-native-iap normalizes to displayPrice; iOS may expose localizedPrice, Android formattedPrice */
  displayPrice?: string | null;
  localizedPrice?: string | null;
  formattedPrice?: string | null;
  price?: number | string | null;
  currency?: string | null;
}

function normalizeProduct(raw: RawSubscriptionLike): SubscriptionProduct {
  const productId = raw.id ?? '';
  const title = raw.title ?? '';
  const description = raw.description ?? '';
  const currency = raw.currency ?? '';

  const formattedPrice =
    raw.displayPrice ?? raw.localizedPrice ?? raw.formattedPrice ?? '';
  const rawPrice =
    typeof raw.price === 'number'
      ? raw.price
      : typeof raw.price === 'string'
        ? parseFloat(raw.price) || 0
        : 0;

  return {
    productId,
    title,
    description,
    price: formattedPrice,
    formattedPrice,
    rawPrice,
    currency,
  };
}

function getIap(): {
  fetchProducts: (req: { skus: readonly string[]; type: 'subs' }) => Promise<RawSubscriptionLike[] | null>;
} | null {
  if (!isIAPAvailable) return null;
  try {
    return require('react-native-iap');
  } catch {
    return null;
  }
}

const LOG_PREFIX = '[useSubscriptions]';

export function useSubscriptions(): UseSubscriptionsResult {
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);

  const refetch = useCallback(async () => {
    if (!isIAPAvailable || isIapConnectionFailed()) {
      setLoading(false);
      setError('In-app purchases are not available (Expo Go or unsupported platform).');
      setProducts([]);
      if (isExpoGo) {
        console.warn(`${LOG_PREFIX} IAP is not available in Expo Go. Use a development build or EAS build.`);
      }
      return;
    }

    const iap = getIap();
    if (!iap) {
      setLoading(false);
      setError('In-app purchases are not available.');
      setProducts([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const connected = await ensureIapConnection();
      if (!isMountedRef.current) return;
      if (!connected) {
        setLoading(false);
        setError('In-app purchases are not available (billing service unavailable).');
        setProducts([]);
        return;
      }

      if (__DEV__) console.log('[IAP] Fetching products');
      const skus = [...SUBSCRIPTION_PRODUCT_IDS];
      // react-native-iap: must use object form { skus: [...] }, not positional getProducts(skus)
      const result = await iap.fetchProducts({ skus, type: 'subs' });
      const rawList = Array.isArray(result) ? result : [];

      if (!isMountedRef.current) return;

      if (rawList.length === 0) {
        setProducts([]);
        const env =
          Platform.OS === 'ios'
            ? 'TestFlight / iOS Sandbox'
            : 'Google Play internal testing';
        console.warn(
          `${LOG_PREFIX} No products returned. Requested: ${skus.join(', ')}. ` +
            `Platform: ${Platform.OS}. Ensure products are configured and available in ${env}. ` +
            `Check App Store Connect / Play Console product IDs and agreements.`
        );
        setError(null);
        return;
      }

      const normalized = rawList.map(normalizeProduct);
      setProducts(normalized);
      setError(null);
    } catch (e) {
      if (!isMountedRef.current) return;
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setProducts([]);
      console.warn(`${LOG_PREFIX} Failed to fetch subscriptions:`, e);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    refetch();
    return () => {
      isMountedRef.current = false;
    };
  }, [refetch]);

  return { products, loading, error, refetch };
}
