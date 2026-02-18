/**
 * Global IAP connection manager. Ensures initConnection() runs only once;
 * all callers (fetchProducts, restorePurchases, requestPurchase) share the same promise.
 * endConnection only in SubscriptionProvider unmount. Eliminates OpenIapError$NotPrepared on Android.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
const isIAPAvailable = isNative && !isExpoGo;

function getIap(): {
  initConnection: () => Promise<boolean>;
  endConnection: () => Promise<boolean>;
} | null {
  if (!isIAPAvailable) return null;
  try {
    return require('react-native-iap');
  } catch {
    return null;
  }
}

let connectionPromise: Promise<void> | null = null;

/**
 * Ensures the billing client is ready. Safe to call from any hook or service.
 * Resolves immediately on web/Expo Go (no-op). On native, runs initConnection
 * once; concurrent callers share the same promise.
 */
export async function ensureIapConnection(): Promise<void> {
  if (!isIAPAvailable) return;

  const iap = getIap();
  if (!iap) return;

  if (!connectionPromise) {
    connectionPromise = (async () => {
      await iap.initConnection();
      console.log('[IAP] Connection established');

      if (Platform.OS === 'android') {
        await new Promise((res) => setTimeout(res, 300));
      }
    })();
  }

  return connectionPromise;
}

/**
 * Clears the singleton and disconnects. Call only from the root provider
 * cleanup (SubscriptionProvider). Prevents duplicate teardown.
 */
export function endIapConnection(): void {
  connectionPromise = null;
  const iap = getIap();
  if (iap) {
    iap.endConnection().catch(() => {});
  }
}
