# Frontend Subscription Architecture (Backend-Driven Entitlements)

Premium is **only** determined by the backend. The frontend never decides premium from local store data.

---

## 1. Data flow

- **Premium state:** `GET /api/entitlements/me` → `{ premium, expiresAt }`. Only source of truth.
- **After purchase:** App sends receipt to `POST /api/subscriptions/confirm` → backend validates and upserts → app refreshes entitlement and subscription status from backend.
- **Restore:** App gets store receipts via IAP, sends each to `POST /api/subscriptions/confirm`, then refreshes entitlement and subscription from backend. No local “unlock” from restore.

---

## 2. Hooks and responsibilities

| Hook | Responsibility | Does not |
|------|----------------|----------|
| **useEntitlements** | Calls only `GET /entitlements/me`. Exposes `isPremium`, `expiresAt` (from backend), `refreshEntitlements`, `restorePurchases` (restore = send receipts to confirm, then refresh). | Never uses `getAvailablePurchases` for premium. No local expiration check. |
| **useSubscriptions** | Fetches products only (`ensureIapConnection` + `fetchProducts` with `SUBSCRIPTION_PRODUCT_IDS`). Exposes `products`, `loading`, `error`, `refetch`. | No entitlement or premium logic. |
| **usePurchase** | Handles purchase only: `requestSubscription` → returns purchase result. Backend confirm is done by **SubscriptionContext** after purchase. | Does not call backend; no entitlement. |

---

## 3. Contexts

- **PremiumContext:** Wraps `useEntitlements()`. Exposes `usePremium()` → `isPremium`, `expirationDate`, `refreshEntitlements`, `restorePurchases`. All from backend.
- **SubscriptionContext:** Holds subscription status (plan, limits, usage) from `GET /api/subscription/status`. Handles `upgradeToPro` (purchase → confirm → refreshSubscription) and `restorePurchases` (store receipts → confirm each → refreshSubscription). Callers that trigger restore (e.g. SubscriptionManagement) must also call `refreshEntitlements()` so premium UI updates.

---

## 4. IAP service (iapService.ts)

- **SUBSCRIPTION_PRODUCT_IDS:** Single source of product IDs (monthly, yearly). Used by useSubscriptions and for filtering in restore.
- **requestSubscription(productId):** Starts purchase; calls `ensureIapConnection()` then store. Returns `PurchaseLike` on success.
- **getPurchaseTokenForBackend(purchase):** Returns receipt/token to send to backend.
- **restorePurchases():** Calls store `getAvailablePurchases`, returns `PurchaseLike[]` for sending to backend. **Not used to determine premium**; only to get receipts for `POST /subscriptions/confirm`.
- **finishTransaction(purchase):** Call after backend confirm (subscription flow).
- **showManageSubscriptionsIOS():** Opens system subscription management.

Removed: `getAvailablePurchases()` (public) and `AvailablePurchaseForEntitlement` type. Entitlement is never derived from local purchases.

---

## 5. Connection (iapConnection.ts)

- **ensureIapConnection():** Singleton; runs `initConnection()` once. Used by requestPurchase, restorePurchases, and useSubscriptions refetch. No duplicate init.
- **endIapConnection():** Called only in SubscriptionProvider unmount. Clears singleton and disconnects.

---

## 6. Restore flow (no direct unlock)

1. User taps Restore (e.g. in SubscriptionManagement).
2. `restorePurchases()` from SubscriptionContext and/or useEntitlements:
   - `iapService.restorePurchases()` → store receipts (PurchaseLike[]).
   - For each receipt: `POST /api/subscriptions/confirm`.
   - Then `refreshEntitlements()` (GET /entitlements/me) and `refreshSubscription(true)` (GET /api/subscription/status).
3. UI shows premium only after backend returns it; no local “unlock” from the presence of store receipts.

---

## 7. What was removed / avoided

- No `getAvailablePurchases` used for entitlement.
- No local check of `expirationDate` or `transactionDate` to set premium.
- No premium in AsyncStorage, Zustand, or Redux.
- No duplicate `initConnection` / `endConnection` (single singleton; one teardown in provider).
- Single SKU array: `SUBSCRIPTION_PRODUCT_IDS` in iapService only.
- Restore never sets premium directly; it only sends receipts to backend and refreshes from backend.

---

## 8. Refactor summary (this audit)

**Files modified**

- `lib/services/iapService.ts` — Removed `getAvailablePurchases()` and `AvailablePurchaseForEntitlement`; tightened comment on `restorePurchases()`.
- `contexts/PremiumContext.tsx` — Comment: premium from backend only.
- `components/SubscriptionManagement.tsx` — Comment: premium from backend only.
- `hooks/useEntitlements.ts` — Comment: only GET /entitlements/me; expirationDate from backend (display only); restore sends to confirm then refresh.
- `lib/services/iapConnection.ts` — Comment: single connection for fetchProducts, restorePurchases, requestPurchase; one endConnection in provider.

**Code removed**

- `getAvailablePurchases(): Promise<AvailablePurchaseForEntitlement[]>` (export and implementation).
- `AvailablePurchaseForEntitlement` interface (productId, transactionDate, expirationDate, purchaseState, autoRenewingAndroid, isAcknowledgedAndroid).

**Unchanged (already correct)**

- useEntitlements: already called only `fetchEntitlements` (GET /entitlements/me); restore already sent receipts to confirm then refreshed.
- useSubscriptions: already only fetched products; single SUBSCRIPTION_PRODUCT_IDS.
- usePurchase: already only handled purchase; confirm in SubscriptionContext.
- Single ensureIapConnection singleton; single endIapConnection in SubscriptionProvider.
- No premium in AsyncStorage/Zustand/Redux (verified).
