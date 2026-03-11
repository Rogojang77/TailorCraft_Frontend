/**
 * Centralized subscription limit messages.
 * Single source of truth for all limit-related UI strings across PaywallModal,
 * create client flow, create order flow, profile, and subscription screens.
 */

export interface UsageForDisplay {
  clients: { current: number; max: number };
  orders: { current: number; max: number };
  templates?: { current: number; max: number };
}

export interface LimitMessages {
  templateLimit: string;
  paywallTitle: string;
  paywallTitleUpgrade: string;
  paywallSubtitle: string;
  paywallUpgradeCta: string;
  freePlanClients: string;
  freePlanOrders: string;
  freePlanLimitShort: string;
  upgradeHint: string;
  clientLimitReached: string;
  orderLimitReached: string;
  templateLimitReached: string;
}

type TranslateFn = (key: string, options?: Record<string, string | number>) => string;

export interface BuildLimitMessagesOptions {
  /** When false, paywallTitle is neutral (Upgrade to Pro), not "Limit reached". */
  subscriptionReady?: boolean;
}

/**
 * Generates all limit-related messages from usage and i18n.
 * Use this via SubscriptionContext.getLimitMessages() for consistent messaging.
 * When subscriptionReady is false, paywallTitle returns the upgrade title, not "Limit reached".
 */
export function buildLimitMessages(
  usage: UsageForDisplay,
  t: TranslateFn,
  options?: BuildLimitMessagesOptions
): LimitMessages {
  const maxC = usage.clients.max || 5;
  const maxO = usage.orders.max || 5;
  const subscriptionReady = options?.subscriptionReady !== false;

  return {
    templateLimit: t('subscription.paywallTitle'),
    paywallTitle: subscriptionReady ? t('subscription.paywallTitle') : t('subscription.paywallTitleUpgrade'),
    paywallTitleUpgrade: t('subscription.paywallTitleUpgrade'),
    paywallSubtitle: t('subscription.paywallSubtitle'),
    paywallUpgradeCta: t('subscription.paywallCta'),
    freePlanClients: t('subscription.clients') + ` ${maxC}`,
    freePlanOrders: t('subscription.orders') + ` ${maxO}`,
    freePlanLimitShort: t('subscription.freePlanLimitShort', {
      maxClients: maxC,
      maxOrders: maxO,
      maxTemplates: usage.templates?.max ?? 2,
    }),
    upgradeHint: t('subscription.paywallCta'),
    clientLimitReached: t('subscription.clientLimitReached'),
    orderLimitReached: t('subscription.orderLimitReached'),
    templateLimitReached: t('subscription.templateLimitReached'),
  };
}
