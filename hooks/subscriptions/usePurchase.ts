/**
 * Centralized purchase hook. Requires an active IAP connection from useSubscriptions()
 * (do not call initConnection here). Use from SubscriptionProvider or any screen that
 * already has useSubscriptions mounted.
 */

import { useCallback, useState } from 'react';
import * as iapService from '@/lib/services/iapService';

export type UsePurchaseResult = {
  purchase: (productId: iapService.SubscriptionProductId) => Promise<iapService.PurchaseResult>;
  purchasing: boolean;
  purchaseError: string | null;
};

export function usePurchase(): UsePurchaseResult {
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const purchase = useCallback(async (productId: iapService.SubscriptionProductId): Promise<iapService.PurchaseResult> => {
    setPurchasing(true);
    setPurchaseError(null);
    try {
      const result = await iapService.requestSubscription(productId, {
        onPurchaseUpdated: () => {},
        onPurchaseError: () => {},
      });
      // Don't show an error when the user simply cancelled the purchase flow
      if (!result.success && !result.cancelled && result.message) {
        setPurchaseError(result.message);
      }
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setPurchaseError(message);
      return {
        success: false,
        code: 'E_UNKNOWN',
        message,
      };
    } finally {
      setPurchasing(false);
    }
  }, []);

  return { purchase, purchasing, purchaseError };
}
