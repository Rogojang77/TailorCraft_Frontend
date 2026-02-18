/**
 * Subscription API service. Handles subscription status, verify (IAP), and prices.
 * No Stripe; native IAP verification only.
 */

import { api, apiFetch } from '@/lib/api';
import type { SubscriptionStatus, PlanPrices } from '@/types/subscription';

export async function fetchStatus(
  accessToken: string
): Promise<SubscriptionStatus> {
  return apiFetch<SubscriptionStatus>(api.subscription.status, {
    token: accessToken,
  });
}

/** Backend entitlement: single source of truth for premium. */
export interface EntitlementsResponse {
  premium: boolean;
  expiresAt: string | null;
  inGracePeriod?: boolean;
  billingIssue?: boolean;
}

export async function fetchEntitlements(accessToken: string): Promise<EntitlementsResponse> {
  return apiFetch<EntitlementsResponse>(api.entitlements.me, {
    token: accessToken,
  });
}

export interface ConfirmSubscriptionPayload {
  platform: 'ios' | 'android';
  receipt: string;
  productId: string;
}

export interface ConfirmSubscriptionResponse {
  premium: boolean;
  expiresAt: string;
}

/** Confirm purchase with backend after IAP. Backend validates receipt; never trust frontend expiration. */
export async function confirmSubscription(
  payload: ConfirmSubscriptionPayload,
  accessToken: string
): Promise<ConfirmSubscriptionResponse> {
  return apiFetch<ConfirmSubscriptionResponse>(api.subscriptions.confirm, {
    method: 'POST',
    token: accessToken,
    body: JSON.stringify(payload),
  });
}

export async function cancelSubscription(
  accessToken: string
): Promise<{ success: boolean; subscription: SubscriptionStatus }> {
  return apiFetch<{ success: boolean; subscription: SubscriptionStatus }>(
    api.subscription.cancel,
    {
      method: 'POST',
      token: accessToken,
    }
  );
}

interface PricesApiResponse {
  prices?: Array<{
    id?: string;
    productId?: string;
    amount: number;
    currency: string;
    interval?: 'month' | 'year';
    intervalCount?: number;
    nickname?: string;
    metadata?: Record<string, unknown>;
  }>;
  count?: number;
}

/** Backend may return amount in cents (Stripe-style) or in units. We treat < 1000 as units, >= 1000 as cents. */
function normalizeAmount(amount: number, currency: string): number {
  if (amount >= 1000) return amount / 100;
  return amount;
}

export async function fetchPrices(): Promise<PlanPrices> {
  const response = await apiFetch<PricesApiResponse>(api.subscription.prices, {
    skipAuth: true,
  });

  const prices = response.prices ?? [];
  const formatPrice = (price: (typeof prices)[0]) => {
    const amount = normalizeAmount(price.amount, price.currency);
    const periodLabel = price.interval === 'year' ? 'year' : 'month';
    const periodLabelRo = price.interval === 'year' ? 'an' : 'lună';
    return {
      amount,
      currency: (price.currency || 'RON').toUpperCase(),
      period: periodLabelRo,
      periodEn: periodLabel,
      formatted: `${amount} ${(price.currency || 'RON').toUpperCase()}/${periodLabelRo}`,
    };
  };

  const monthlyPrice = prices.find(
    (p) => p.interval === 'month' || p.productId?.includes('monthly')
  );
  const yearlyPrice = prices.find(
    (p) => p.interval === 'year' || p.productId?.includes('yearly')
  );

  return {
    monthly: monthlyPrice ? formatPrice(monthlyPrice) : null,
    yearly: yearlyPrice ? formatPrice(yearlyPrice) : null,
  };
}
