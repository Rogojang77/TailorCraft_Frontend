/**
 * Centralized subscription limit messages.
 * Single source of truth for all limit-related UI strings across PaywallModal,
 * create client flow, create order flow, profile, and subscription screens.
 */

export interface UsageForDisplay {
  clients: { current: number; max: number };
  orders: { current: number; max: number };
}

export interface LimitMessages {
  templateLimit: string;
  paywallTitle: string;
  paywallSubtitle: string;
  paywallUpgradeCta: string;
  freePlanClients: string;
  freePlanOrders: string;
  freePlanLimitShort: string;
  upgradeHint: string;
  clientLimitReached: string;
  orderLimitReached: string;
}

type TranslateFn = (key: string, options?: Record<string, string | number>) => string;

/**
 * Generates all limit-related messages from usage and i18n.
 * Use this via SubscriptionContext.getLimitMessages() for consistent messaging.
 */
export function buildLimitMessages(
  usage: UsageForDisplay,
  t: TranslateFn
): LimitMessages {
  const maxC = usage.clients.max || 5;
  const maxO = usage.orders.max || 5;

  return {
    templateLimit: t('subscription.paywallTitle'),
    paywallTitle: t('subscription.paywallTitle'),
    paywallSubtitle: t('subscription.paywallSubtitle'),
    paywallUpgradeCta: t('subscription.paywallCta'),
    freePlanClients: t('subscription.clients') + ` ${maxC}`,
    freePlanOrders: t('subscription.orders') + ` ${maxO}`,
    freePlanLimitShort: t('subscription.freePlanLimitShort', {
      maxClients: maxC,
      maxOrders: maxO,
    }),
    upgradeHint: t('subscription.paywallCta'),
    clientLimitReached: t('subscription.clientLimitReached'),
    orderLimitReached: t('subscription.orderLimitReached'),
  };
}
