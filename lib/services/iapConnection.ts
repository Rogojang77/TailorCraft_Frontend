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

let iapConnectionFailed = false;
let connectionFailureLogged = false;

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

let connectionPromise: Promise<boolean> | null = null;

/**
 * Ensures the billing client is ready. Safe to call from any hook or service.
 * Returns true if connection succeeded, false if unavailable/failed.
 * Resolves immediately on web/Expo Go (returns false). On native, runs initConnection
 * once; concurrent callers share the same promise.
 * Gracefully handles environments where billing is unavailable (emulators, missing Play Store).
 */
export async function ensureIapConnection(): Promise<boolean> {
  if (!isIAPAvailable) return false;
  if (iapConnectionFailed) return false;

  const iap = getIap();
  if (!iap) return false;

  if (!connectionPromise) {
    connectionPromise = (async () => {
      try {
        await iap.initConnection();
        if (__DEV__) {
          console.log('[IAP] Connection established');
        }

        if (Platform.OS === 'android') {
          await new Promise((res) => setTimeout(res, 300));
        }
        return true;
      } catch (error) {
        iapConnectionFailed = true;
        if (__DEV__ && !connectionFailureLogged) {
          connectionFailureLogged = true;
          console.warn('[IAP] Connection failed (expected on emulators/dev builds without Play Store)');
        }
        return false;
      }
    })();
  }

  return connectionPromise;
}

/**
 * Returns true if IAP connection has failed (e.g., on emulators without Play Store).
 * Use this to avoid repeated error logs from IAP operations.
 */
export function isIapConnectionFailed(): boolean {
  return iapConnectionFailed;
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
