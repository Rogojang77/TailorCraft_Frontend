/**
 * Subscription-related types. Shared by SubscriptionContext and subscriptionService.
 */

export type SubscriptionPlan = 'FREE' | 'BASIC' | 'PRO';

/** Resolved subscription state: active (valid), free (real free plan), unknown (backend/network unavailable). */
export type SubscriptionState = 'active' | 'free' | 'unknown';

export interface SubscriptionLimits {
  maxClients: number;
  maxOrders: number;
  maxTemplates?: number;
  maxSharedTemplates?: number;
}

export interface SubscriptionUsage {
  currentClients: number;
  currentOrders: number;
  currentTemplates?: number;
  currentSharedTemplates?: number;
}

export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  limits: SubscriptionLimits;
  usage: SubscriptionUsage;
  canCreateClient: boolean;
  canCreateOrder: boolean;
}

export type SubscriptionPlanType = 'monthly' | 'yearly';

export interface PlanPrice {
  amount: number;
  currency: string;
  period: string;
  periodEn: string;
  formatted: string;
}

export interface PlanPrices {
  monthly: PlanPrice | null;
  yearly: PlanPrice | null;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'sepa_debit' | 'us_bank_account' | 'link';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  billingDetails?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  isDefault?: boolean;
}

export interface Invoice {
  id: string;
  number?: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  created: number | string | null;
  dueDate?: number | string | null;
  paidAt?: number | string | null;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
  description?: string;
  periodStart?: number | string | null;
  periodEnd?: number | string | null;
}

export interface UpcomingInvoice {
  amount: number;
  currency: string;
  date: number | string;
  description?: string;
}

export interface PortalDetailsResponse {
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: number | string | null;
    currentPeriodEnd: number | string | null;
    cancelAtPeriodEnd: boolean;
    cancelAt: number | string | null;
    canceledAt: number | string | null;
    trialStart?: number | string | null;
    trialEnd?: number | string | null;
    priceId: string;
    priceAmount: number;
    priceCurrency: string;
    priceInterval: 'month' | 'year';
    priceIntervalCount: number;
    defaultPaymentMethod?: PaymentMethod;
  };
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
  upcomingInvoice: UpcomingInvoice | null;
}

export interface SubscriptionDetails {
  subscriptionId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired';
  currentPeriodStart: number | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: number | null;
  cancelAt: number | null;
  plan: {
    id: string;
    name: string;
    amount: number;
    currency: string;
    interval: 'month' | 'year';
    intervalCount: number;
  };
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
  upcomingCharges: Array<{
    amount: number;
    currency: string;
    date: number;
    description?: string;
  }>;
}

export interface TemplateLimitStatus {
  allowed: boolean;
  message: string;
}
