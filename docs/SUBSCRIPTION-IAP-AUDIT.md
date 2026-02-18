# Subscription IAP Architecture Audit — Final Report

## Summary

The app now uses a **strict, centralized subscription architecture**. `useSubscriptions` is the only source of truth for subscription products and the only place that opens/closes the IAP connection. Purchase flow goes through `usePurchase`, which does not call `initConnection`.

---

## Files Modified

| File | What changed |
|------|--------------|
| **lib/services/iapService.ts** | Removed `initConnection` and `getSubscriptions`. Removed all `initConnection()` calls from `requestSubscription` and `restorePurchases`. Added Expo Go `console.warn` in `getIap()`. |
| **hooks/useSubscriptions.ts** | Added Expo Go `console.warn` when IAP unavailable. Added `formattedPrice` to `SubscriptionProduct`. Confirmed single init, cleanup, normalization, empty-products behavior. |
| **hooks/usePurchase.ts** | **Created.** Hook that exposes `purchase(productId)`, `purchasing`, `purchaseError`. Uses `iapService.requestSubscription` only; does not call `initConnection`. |
| **contexts/SubscriptionContext.tsx** | Uses `useSubscriptions()` and `usePurchase()`. Prices derived from `products` via `useMemo` (no backend `fetchPrices`). `upgradeToPro` uses `requestPurchase(productId)`. `refreshPrices` calls `refetchProducts()`. `error` merges subscription error with `productsError`. Removed mount-time `refreshPrices()` effect. |
| **components/SubscriptionManagement.tsx** | Removed `initConnection` import and the `await initConnection()` call before `showManageSubscriptionsIOS()`. |

---

## What Was Wrong (Before)

1. **Multiple init points** — `iapService.initConnection()` was exported and called from `SubscriptionManagement` and inside `iapService.requestSubscription` / `restorePurchases`, so connection could be initialized from several places.
2. **Duplicate product fetching** — `iapService.getSubscriptions()` fetched products with its own `initConnection()` + `fetchProducts()`, competing with `useSubscriptions`.
3. **Backend used for prices** — `SubscriptionContext` called `subscriptionService.fetchPrices()` and stored result in `prices`; prices did not come from the store.
4. **Screen initializing IAP** — `SubscriptionManagement` called `initConnection()` before opening the iOS manage-subscriptions sheet.

---

## Confirmations

- **Only one `initConnection`** — Lives only inside `hooks/useSubscriptions.ts` (in `refetch`, guarded by `initOnceRef`).
- **Only one `endConnection`** — Called only in the cleanup of `useSubscriptions`’s `useEffect`.
- **No screen initializes IAP** — Screens and components only use `useSubscription()` / `useSubscriptions()` / `usePurchase()`; no direct IAP init.
- **No Expo Go execution** — `isIAPAvailable = isNative && !isExpoGo`; when unavailable, `getIap()` returns `null` and both the hook and iapService log a clear warning. No `initConnection`, `fetchProducts`, or purchase attempts run in Expo Go.
- **All purchases through centralized hooks** — `SubscriptionContext` uses `usePurchase().purchase(productId)` for `upgradeToPro`; restore/finish/verify still go through `iapService` but no init is done there.

---

## Final Versions (Key Parts)

### useSubscriptions.ts

- **Single connection:** `initOnceRef` ensures `initConnection()` runs at most once.
- **Cleanup:** `useEffect` return calls `getIap()?.endConnection().catch(() => {})`; no duplicate cleanup.
- **Expo Go:** When `!isIAPAvailable`, sets loading/error/products and, if `isExpoGo`, logs:  
  `[useSubscriptions] IAP is not available in Expo Go. Use a development build or EAS build.`
- **Normalization:** `SubscriptionProduct` has `productId`, `title`, `description`, `price`, `formattedPrice`, `rawPrice`, `currency`. Formatted price uses: `displayPrice ?? localizedPrice ?? formattedPrice`; `rawPrice` from `Number(price)` (with string fallback).
- **Empty products:** If `rawList.length === 0`: `setProducts([])`, `setError(null)`, `setLoading(false)` in `finally`, and `console.warn` with requested SKUs, platform, and TestFlight/Play Console reminder.

### usePurchase.ts

- **No init** — Does not call `initConnection`; assumes `useSubscriptions()` is mounted (e.g. in `SubscriptionProvider`).
- **API** — `purchase(productId: SubscriptionProductId)` returns `Promise<PurchaseResult>`; state: `purchasing`, `purchaseError`.
- **Implementation** — Calls `iapService.requestSubscription(productId, { onPurchaseUpdated, onPurchaseError })` and maps result/errors into state.

---

## Removed / Not Used

- **iapService.initConnection** — Removed; only the hook initializes.
- **iapService.getSubscriptions** — Removed; only the hook fetches products.
- **subscriptionService.fetchPrices** — No longer called for UI prices; `subscriptionService` still used for `fetchStatus`, `confirmSubscription`, `cancelSubscription`. Prices come only from `useSubscriptions` → derived `PlanPrices` in context.

---

## Architecture Diagram

```
SubscriptionProvider
  ├── useSubscriptions()  → initConnection() once, fetchProducts(), endConnection() on cleanup
  │      → products, loading, error, refetch
  ├── usePurchase()       → requestSubscription() only (no init)
  │      → purchase(productId), purchasing, purchaseError
  ├── prices = useMemo(products → PlanPrices)
  └── upgradeToPro(plan) → requestPurchase(planToProductId(plan)) → verify → finishTransaction

Screens / Components
  └── useSubscription()  → get prices, upgradeToPro, restorePurchases, etc.
  └── No direct react-native-iap or initConnection anywhere.
```

This completes the audit and enforced strict, centralized subscription architecture.
