/**
 * Entitlement from backend (GET /entitlements/me). Backend is the only source of truth.
 * When authenticated, premium state comes from server. Restore sends each purchase to confirm endpoint.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as iapService from '@/lib/services/iapService';
import { ensureIapConnection } from '@/lib/services/iapConnection';
import * as subscriptionService from '@/lib/services/subscriptionService';
import { useAuth } from '@/contexts/AuthContext';

const isExpoGo = Constants.appOwnership === 'expo';
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
const isIAPAvailable = isNative && !isExpoGo;

const LOG_PREFIX = '[useEntitlements]';

export type UseEntitlementsResult = {
  isPremium: boolean;
  activeProductId: string | null;
  expirationDate: number | null;
  inGracePeriod: boolean;
  billingIssue: boolean;
  loading: boolean;
  error: string | null;
  refreshEntitlements: () => Promise<void>;
  restorePurchases: () => Promise<void>;
};

/**
 * When authenticated, fetches premium only from GET /entitlements/me.
 * expirationDate in state is from backend response (display only); no local expiration check.
 * Restore: sends store receipts to POST /subscriptions/confirm then refreshes from backend.
 */
export function useEntitlements(): UseEntitlementsResult {
  const { isAuthenticated, accessToken } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState<number | null>(null);
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const [billingIssue, setBillingIssue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const refreshEntitlements = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      setLoading(false);
      setIsPremium(false);
      setActiveProductId(null);
      setExpirationDate(null);
      setInGracePeriod(false);
      setBillingIssue(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await subscriptionService.fetchEntitlements(accessToken);
      if (!isMountedRef.current) return;
      setIsPremium(data.premium);
      setExpirationDate(data.expiresAt ? new Date(data.expiresAt).getTime() : null);
      setActiveProductId(data.premium ? 'entitled' : null);
      setInGracePeriod(data.inGracePeriod ?? false);
      setBillingIssue(data.billingIssue ?? false);
    } catch (e) {
      if (!isMountedRef.current) return;
      const message = e instanceof Error ? e.message : 'Failed to load premium status';
      setError(message);
      setIsPremium(false);
      setActiveProductId(null);
      setExpirationDate(null);
      setInGracePeriod(false);
      setBillingIssue(false);
      if (__DEV__) console.warn(`${LOG_PREFIX} fetchEntitlements failed:`, e);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [isAuthenticated, accessToken]);

  const restorePurchases = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      setError('Not authenticated');
      return;
    }
    if (!isIAPAvailable) {
      if (isExpoGo) setError('IAP not available in Expo Go.');
      await refreshEntitlements();
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await ensureIapConnection();
      const purchases = await iapService.restorePurchases();
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
          if (__DEV__) console.warn(`${LOG_PREFIX} Restore confirm failed for ${purchase.productId}:`, e);
        }
      }
      await refreshEntitlements();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Restore failed';
      setError(message);
      if (__DEV__) console.warn(`${LOG_PREFIX} restorePurchases failed:`, e);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [isAuthenticated, accessToken, refreshEntitlements]);

  useEffect(() => {
    isMountedRef.current = true;
    refreshEntitlements();
    return () => {
      isMountedRef.current = false;
    };
  }, [refreshEntitlements]);

  return {
    isPremium,
    activeProductId,
    expirationDate,
    inGracePeriod,
    billingIssue,
    loading,
    error,
    refreshEntitlements,
    restorePurchases,
  };
}
