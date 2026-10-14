import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  registerPushDeviceWithBackend,
  getOrderIdFromNotificationData,
} from '@/lib/pushNotifications';

const COLD_START_MAX_AGE_MS = 120_000;

function notificationTimestampMs(notification: Notifications.Notification): number {
  const d = notification.date;
  if (typeof d !== 'number') return Date.now();
  // Heuristic: iOS often uses seconds; JS uses ms
  return d < 1e12 ? d * 1000 : d;
}

/**
 * Registers for Expo push when authenticated; handles tap → order details (cold start + foreground/background).
 */
export function usePushNotifications(isAuthenticated: boolean, accessToken: string | null): void {
  const router = useRouter();
  const coldStartHandledRef = useRef(false);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      const orderId = getOrderIdFromNotificationData(data);
      if (orderId) {
        router.push(`/order-details/${orderId}`);
      }
    });
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated || coldStartHandledRef.current) return;

    (async () => {
      const last = await Notifications.getLastNotificationResponseAsync();
      coldStartHandledRef.current = true;
      if (!last) return;

      const age = Date.now() - notificationTimestampMs(last.notification);
      if (age > COLD_START_MAX_AGE_MS) return;

      const data = last.notification.request.content.data as Record<string, unknown> | undefined;
      const orderId = getOrderIdFromNotificationData(data);
      if (orderId) {
        router.push(`/order-details/${orderId}`);
      }
    })();
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    registerPushDeviceWithBackend(accessToken).catch((e) =>
      console.warn('[push] register failed:', e)
    );
  }, [isAuthenticated, accessToken]);
}
