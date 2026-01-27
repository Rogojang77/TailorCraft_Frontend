import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { api, apiFetch } from '@/lib/api';
import { useAuth } from './AuthContext';

export type SubscriptionPlan = 'FREE' | 'PRO';

export interface SubscriptionLimits {
  maxClients: number;
  maxOrders: number;
}

export interface SubscriptionUsage {
  currentClients: number;
  currentOrders: number;
}

export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  limits: SubscriptionLimits;
  usage: SubscriptionUsage;
  canCreateClient: boolean;
  canCreateOrder: boolean;
}

interface SubscriptionContextType {
  subscription: SubscriptionStatus | null;
  isLoading: boolean;
  error: string | null;
  refreshSubscription: (forceRefresh?: boolean) => Promise<void>;
  upgradeToPro: () => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
  checkCanCreateClient: () => boolean;
  checkCanCreateOrder: () => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Cache duration: 30 seconds
const CACHE_DURATION_MS = 30000;

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, accessToken } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);
  const refreshInProgressRef = useRef<boolean>(false);

  const refreshSubscription = async (forceRefresh = false) => {
    if (!isAuthenticated || !accessToken) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    // Prevent concurrent refresh calls
    if (refreshInProgressRef.current) {
      console.log('Subscription refresh already in progress, skipping...');
      return;
    }

    // Check if data is still fresh (unless force refresh is requested)
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
    
    if (!forceRefresh && timeSinceLastRefresh < CACHE_DURATION_MS && subscription !== null) {
      // Data is still fresh, no need to fetch
      console.log(`Subscription data is still fresh (${Math.floor(timeSinceLastRefresh / 1000)}s old), using cache`);
      return;
    }

    try {
      refreshInProgressRef.current = true;
      setIsLoading(true);
      setError(null);
      const data = await apiFetch<SubscriptionStatus>(api.subscription.status, {
        token: accessToken,
      });
      setSubscription(data);
      lastRefreshTimeRef.current = Date.now();
    } catch (err) {
      console.error('Failed to fetch subscription status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
      // Set default FREE plan on error to avoid blocking user
      setSubscription({
        plan: 'FREE',
        limits: { maxClients: 5, maxOrders: 5 },
        usage: { currentClients: 0, currentOrders: 0 },
        canCreateClient: true,
        canCreateOrder: true,
      });
    } finally {
      setIsLoading(false);
      refreshInProgressRef.current = false;
    }
  };

  const upgradeToPro = async (): Promise<boolean> => {
    if (!accessToken) {
      setError('Not authenticated');
      return false;
    }

    try {
      setError(null);
      const response = await apiFetch<{ success: boolean; subscription: SubscriptionStatus }>(
        api.subscription.upgrade,
        {
          method: 'POST',
          token: accessToken,
        }
      );

      if (response.success) {
        setSubscription(response.subscription);
        lastRefreshTimeRef.current = Date.now();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to upgrade subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to upgrade');
      return false;
    }
  };

  const cancelSubscription = async (): Promise<boolean> => {
    if (!accessToken) {
      setError('Not authenticated');
      return false;
    }

    try {
      setError(null);
      const response = await apiFetch<{ success: boolean; subscription: SubscriptionStatus }>(
        api.subscription.cancel,
        {
          method: 'POST',
          token: accessToken,
        }
      );

      if (response.success) {
        setSubscription(response.subscription);
        lastRefreshTimeRef.current = Date.now();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
      return false;
    }
  };

  const checkCanCreateClient = (): boolean => {
    return subscription?.canCreateClient ?? true;
  };

  const checkCanCreateOrder = (): boolean => {
    return subscription?.canCreateOrder ?? true;
  };

  // Load subscription status when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      refreshSubscription();
    } else {
      setSubscription(null);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, accessToken]);

  const value: SubscriptionContextType = {
    subscription,
    isLoading,
    error,
    refreshSubscription,
    upgradeToPro,
    cancelSubscription,
    checkCanCreateClient,
    checkCanCreateOrder,
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
