# Entitlements & Active Subscription Detection — Audit Report

## Problem

The user was subscribed in Sandbox, but the app did **not** recognize the active subscription. Premium state was derived only from the **backend** (`subscription?.plan === 'PRO'`). The backend may not be updated immediately after a sandbox purchase or restore, and the app never used **store-side entitlements** (`getAvailablePurchases` + expiration) to determine access.

---

## What Was Wrong

1. **No local entitlement check** — The app never called `getAvailablePurchases()` to determine if the user had an active subscription on the device. It relied entirely on backend `fetchStatus()`.
2. **No expiration handling** — Even if purchases were read, there was no logic to treat expired sandbox subscriptions (e.g. 5 min monthly / 1 hr yearly) as inactive.
3. **Premium state from backend only** — Every screen used `subscription?.plan === 'PRO'`, so sandbox purchases that hadn’t synced to the backend yet showed as free.
4. **getAvailablePurchases not in flow** — The intended order (initConnection → fetchProducts → getAvailablePurchases) was not enforced; only init + fetchProducts ran in `useSubscriptions`.
5. **No single source for “is premium”** — Premium was inferred in multiple places from `subscription?.plan`, with no store-based fallback.

---

## Solution Overview

- **useEntitlements** — Calls `getAvailablePurchases()` (via iapService), filters by `SUBSCRIPTION_PRODUCT_IDS`, and applies expiration logic. Does **not** call `initConnection()`. Returns `isPremium`, `activeProductId`, `expirationDate`, `loading`, `error`, `refreshEntitlements`, `restorePurchases`.
- **PremiumContext** — Uses `useEntitlements` once and exposes `isPremium` (and the rest) globally. Wrapped inside `SubscriptionProvider` so the IAP connection is already established.
- **Connection flow** — 1) `useSubscriptions` (inside SubscriptionProvider): `initConnection()` then `fetchProducts()`. 2) `useEntitlements` (inside PremiumProvider): `getAvailablePurchases()`. So the order is respected.
- **UI** — All premium gating now uses `usePremium().isPremium` (store-based). Backend `subscription` is still used for limits/usage and loading/error state, not for “is the user entitled to Pro right now?”

---

## Files Modified

| File | Change |
|------|--------|
| **lib/services/iapService.ts** | Added `AvailablePurchaseForEntitlement` and `getAvailablePurchases()` returning subscription purchases with `expirationDate` (iOS) and Android flags. Kept `restorePurchases()` for backend verify. |
| **hooks/useEntitlements.ts** | **New.** Fetches purchases via iapService.getAvailablePurchases(), filters by SUBSCRIPTION_PRODUCT_IDS, applies expiration (expirationDate > now; Android fallback when no expiry). Returns isPremium, activeProductId, expirationDate, loading, error, refreshEntitlements, restorePurchases. Debug logs in __DEV__. |
| **contexts/PremiumContext.tsx** | **New.** PremiumProvider that uses useEntitlements and exposes usePremium(). |
| **app/_layout.tsx** | Wrapped app in `<PremiumProvider>` inside `<SubscriptionProvider>`. |
| **hooks/useSubscriptions.ts** | Documented connection flow (init → fetchProducts; getAvailablePurchases in useEntitlements). |
| **components/SubscriptionManagement.tsx** | Uses `usePremium().isPremium` for isPro; after restore calls `refreshEntitlements()` then refreshSubscription. |
| **components/ProBadge.tsx** | Uses `usePremium().isPremium` and `loading` instead of subscription.plan. |
| **app/subscription.tsx** | Uses `usePremium().isPremium` for isPro; after successful upgrade calls `refreshEntitlements()`. |
| **app/(tabs)/profile.tsx** | Uses `usePremium().isPremium` for plan badge (PRO vs FREE). |
| **app/order-details/[id].tsx** | Uses `usePremium().isPremium` for isPro. |
| **app/pdf-customize.tsx** | Uses `usePremium().isPremium` for isPro. |

---

## Confirmations

- **Entitlements are derived from the store** — `isPremium` comes from `getAvailablePurchases()` + expiration check in useEntitlements.
- **Sandbox expiration is handled** — If `expirationDate` exists and `expirationDate <= Date.now()`, the subscription is treated as inactive. Sandbox short periods (e.g. 5 min / 1 hr) will correctly become inactive after expiry.
- **No frontend hardcoding** — No hardcoded `isPremium = true`; no manual productId checks outside useEntitlements; all premium UI uses `usePremium().isPremium`.
- **Architecture stays centralized** — Single connection (useSubscriptions); getAvailablePurchases only in iapService and useEntitlements; no duplicate initConnection; no screens calling IAP directly.
- **Restore updates premium state** — SubscriptionManagement calls `refreshEntitlements()` after `restorePurchases()`, so restore correctly updates `isPremium`.
- **Purchase success updates premium state** — Subscription screen calls `refreshEntitlements()` after successful `upgradeToPro()`.
- **Expo Go** — useEntitlements and iapService guard with `isIAPAvailable`; no IAP execution in Expo Go.

---

## Debug Checklist (Manual Verification)

- [ ] Subscription recognized immediately after purchase (refreshEntitlements after upgrade).
- [ ] Subscription recognized on app relaunch (useEntitlements runs on mount, getAvailablePurchases).
- [ ] Subscription expires correctly in sandbox (expirationDate &lt; now → isPremium false).
- [ ] Restore works (restorePurchases + refreshEntitlements in SubscriptionManagement).
- [ ] No Expo Go execution (guards in place).
- [ ] No duplicate initConnection (only in useSubscriptions).
