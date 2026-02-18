/**
 * Global premium state from backend only (GET /entitlements/me via useEntitlements).
 * Frontend never determines premium locally; backend is the single source of truth.
 * Must be used inside SubscriptionProvider so IAP connection is available when needed (e.g. restore).
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useEntitlements } from '@/hooks/useEntitlements';

export type PremiumContextType = {
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

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const entitlements = useEntitlements();

  return (
    <PremiumContext.Provider value={entitlements}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextType {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider (and inside SubscriptionProvider)');
  }
  return context;
}
