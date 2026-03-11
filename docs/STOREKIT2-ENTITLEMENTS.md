# StoreKit 2 Local Entitlement (Subscription Manager)

Premium is determined **locally** from StoreKit 2 (`getAvailablePurchases` + expiration). The backend is **not** required to unlock premium; sync is optional and asynchronous.

---

## 1. Subscription manager

- **`lib/services/subscriptionManager.ts`**
  - **initConnection**: Via `ensureIapConnection()` before any IAP call; shared singleton in `iapConnection.ts`.
  - **Products**: Fetched in `useSubscriptions` with `fetchProducts({ skus, type: 'subs' })`. The manager does not fetch products; it only uses `requestPurchase` with a productId.
  - **requestSubscription**: Uses library `purchaseUpdatedListener` + `purchaseErrorListener`, then `fetchProducts` + `requestPurchase`. On success, the **global** `purchaseUpdatedListener` (attached once) updates state and calls **finishTransaction** (iOS) or **acknowledgePurchaseAndroid** (Android).
  - **finishTransaction**: Called **after** local entitlement is applied (in the global listener). Never block UI on backend before finishing.
  - **getAvailablePurchases**: Used for current entitlements with `onlyIncludeActiveItemsIOS: true`. On app launch, call with **alsoPublishToEventListenerIOS: true** once to flush unfinished transactions into the listener so they can be finished.
  - **State**: `isPremium`, `expiresAt`, `loading`, `purchaseInProgress`. Single source of truth; duplicate unlock is avoided by updating only in the manager.

---

## 2. Startup flow

- **On app launch** (`useSubscriptionState` / `PremiumProvider`):
  1. `onAppLaunch()` → `refreshEntitlements(flushUnfinished: true)`.
  2. `ensureIapConnection()` → attach global `purchaseUpdatedListener` / `purchaseErrorListener` → `getAvailablePurchases({ onlyIncludeActiveItemsIOS: true, alsoPublishToEventListenerIOS: true })`.
  3. Derive `isPremium` and `expiresAt` from returned purchases (iOS: `expirationDateIOS`; Android: active subscription implies active).
  4. **Unlock premium immediately** from this local state.
  5. If authenticated, **sync with backend asynchronously** (e.g. `fetchEntitlements`, `confirmSubscription` for restores); do not block UI.

---

## 3. Handling edge cases

| Scenario | Behavior |
|----------|----------|
| **Unfinished transactions** | On launch, `getAvailablePurchases({ alsoPublishToEventListenerIOS: true })` delivers pending transactions to `purchaseUpdatedListener`. Manager updates state and calls `finishTransaction`. |
| **Sandbox expiration** | `expirationDateIOS` is respected; when `expirationDateIOS < now`, purchase is not considered active. Sandbox subscriptions expire quickly; use short durations for testing. |
| **App restarts** | `onAppLaunch()` runs again; `refreshEntitlements(true)` re-fetches from store and flushes unfinished. |
| **User reinstalls** | StoreKit 2 restores entitlements for the same Apple ID; `getAvailablePurchases()` returns them after init. Use **Restore purchases** to send receipts to backend if needed. |
| **Restore purchases** | `restorePurchases()` = `getAvailablePurchases({ onlyIncludeActiveItemsIOS: true })` → update local state → optionally send receipts to backend for record-keeping. |

---

## 4. Best practices

- **When to call finishTransaction**  
  Call **after** you have applied the entitlement locally (e.g. updated `isPremium` / `expiresAt` in the manager). For subscriptions, call in the **global** `purchaseUpdatedListener`; do not wait for backend.

- **When NOT to block UI on backend**  
  Do not wait for `POST /subscriptions/confirm` or `GET /entitlements/me` to decide premium. Unlock from local store state; sync with backend in the background.

- **Avoiding “user cancelled” from unfinished transactions**  
  On startup, flush unfinished transactions with `alsoPublishToEventListenerIOS: true` so they are delivered and finished. That prevents old pending transactions from surfacing later and being misinterpreted.

- **Preventing duplicate unlock**  
  Only the subscription manager updates `isPremium` / `expiresAt`. Purchase flow and global listener both update the same state; no other code path sets premium.

---

## 5. State model

```ts
interface SubscriptionState {
  isPremium: boolean;
  expiresAt: Date | null;
  loading: boolean;
  purchaseInProgress: boolean;
}
```

Exposed via `useSubscriptionState()` and `PremiumContext` (`usePremium()`).

---

## 6. Optional: logging and debugging

- **Development-only entitlement logging**  
  In `subscriptionManager.ts`, `ENTITLEMENT_DEBUG = __DEV__` gates `logEntitlement()`. Logs include productId, isPremium, expiresAt, and flush flag; no long tokens in logs.

- **TestFlight subscription status**  
  - Build with EAS/development client (not Expo Go).  
  - Use a Sandbox Apple ID in **Settings → App Store → Sandbox Account**.  
  - After purchase or restore, check `[subscriptionManager] refreshEntitlements` and `purchaseUpdatedListener` in the device console (Xcode or `npx react-native log-ios`).  
  - Confirm `getAvailablePurchases` returns the subscription and `expirationDateIOS` is in the future.  
  - For “no subscription after purchase”, ensure the global listener is attached before `requestPurchase` and that `finishTransaction` is called in the listener (not only after backend).

See also **IAP-SUBSCRIPTION-DEBUGGING-TESTFLIGHT.md** for receipt validation and backend checks.
