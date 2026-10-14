import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api, apiFetch } from '@/lib/api/api';

/** Stored so we can DELETE /api/notifications/devices on logout. */
export const EXPO_PUSH_TOKEN_STORAGE_KEY = 'expoRegisteredPushToken';
let hasWarnedMissingAndroidFcmConfig = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

function resolveEasProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? (Constants.easConfig as { projectId?: string } | undefined)?.projectId;
}

function hasAndroidGoogleServicesConfig(): boolean {
  const androidConfig = Constants.expoConfig?.android as
    | { googleServicesFile?: string | null }
    | undefined;
  return typeof androidConfig?.googleServicesFile === 'string' && androidConfig.googleServicesFile.length > 0;
}

/**
 * Requests permission (if needed) and returns an Expo push token, or null if unavailable / denied.
 */
export async function obtainExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (Platform.OS === 'android' && !hasAndroidGoogleServicesConfig()) {
    if (!hasWarnedMissingAndroidFcmConfig) {
      hasWarnedMissingAndroidFcmConfig = true;
      console.warn(
        '[push] Android push disabled: missing Firebase config. Add `android.googleServicesFile` to app config and provide a valid google-services.json.'
      );
    }
    return null;
  }

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId = resolveEasProjectId();

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResult.data ?? null;
    if (__DEV__) {
      console.log('[push] token fetch result:', token ? `${token.slice(0, 18)}...` : 'null');
    }
    return token;
  } catch (e) {
    console.warn('[push] getExpoPushTokenAsync failed:', e);
    return null;
  }
}

/**
 * Registers the current device token with the backend (authenticated).
 */
export async function registerPushDeviceWithBackend(accessToken: string): Promise<void> {
  if (Platform.OS === 'web') return;

  const expoPushToken = await obtainExpoPushToken();
  if (!expoPushToken) {
    if (__DEV__) {
      console.warn('[push] register skipped: missing Expo token');
    }
    return;
  }

  const platform =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

  await apiFetch<{ success: boolean }>(api.notifications.devices, {
    method: 'POST',
    body: JSON.stringify({ expoPushToken, platform }),
    token: accessToken,
  });

  await SecureStore.setItemAsync(EXPO_PUSH_TOKEN_STORAGE_KEY, expoPushToken);
  if (__DEV__) {
    console.log('[push] device registered:', platform);
  }
}

/**
 * Deactivates the stored push token on the server (best effort) and clears local storage.
 * Call while the access token is still valid (before clearing SecureStore).
 */
export async function deactivatePushDeviceWithBackend(accessToken: string | null): Promise<void> {
  const stored = await SecureStore.getItemAsync(EXPO_PUSH_TOKEN_STORAGE_KEY);
  if (stored && accessToken) {
    try {
      await apiFetch(api.notifications.devices, {
        method: 'DELETE',
        body: JSON.stringify({ expoPushToken: stored }),
        token: accessToken,
      });
    } catch (e) {
      console.warn('[push] deactivate failed:', e);
    }
  }
  try {
    await SecureStore.deleteItemAsync(EXPO_PUSH_TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export type PushNotificationData = {
  kind?: string;
  orderId?: string;
};

export function getOrderIdFromNotificationData(data: Record<string, unknown> | undefined): string | null {
  if (!data || typeof data !== 'object') return null;
  const orderId = data['orderId'];
  return typeof orderId === 'string' && orderId.length > 0 ? orderId : null;
}
