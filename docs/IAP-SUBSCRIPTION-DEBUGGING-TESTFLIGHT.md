# Auto-Renewable Subscriptions Debugging (TestFlight + StoreKit 2)

Stack: **react-native-iap** v14.7.11 (StoreKit 2 via OpenIAP), iOS 15+, TestFlight, Next.js backend with server-side receipt validation.

Use this checklist when the purchase sheet completes but:
- No subscription appears in **iPhone Settings → Apple ID → Subscriptions**
- Nothing (or delayed) in **App Store Connect**
- Unclear if the backend receives correct transaction data

---

## Critical: JWS vs Legacy Receipt (Your Current Backend)

**Your backend uses Apple’s legacy `verifyReceipt` endpoint**, which expects the **app receipt** (Base64-encoded bundle receipt from the app).  
**react-native-iap on iOS with StoreKit 2** exposes **`purchaseToken` as the signed transaction JWS**, not the app receipt.

- If you send the JWS string as `receipt` to `POST /api/subscriptions/confirm`, the backend forwards it to `verifyReceipt`. Apple will return **status 21002** (malformed receipt) because the body must be receipt data, not a single-transaction JWS.
- So either:
  1. **Switch backend to App Store Server API** and validate using the **transaction JWS** or **transactionId** (recommended for StoreKit 2), or  
  2. If you must keep `verifyReceipt`, you need the **app receipt**; react-native-iap in StoreKit 2 mode may not expose it—check whether your version provides a separate app-receipt API.

Until the backend accepts JWS or you send a valid app receipt, server validation will fail and the subscription will not be stored even when the purchase succeeds on device.

---

## Step-by-Step Debugging Checklist

### 1. Verifying purchase success in react-native-iap (StoreKit 2)

- Confirm the purchase resolves from `requestPurchase` and that you use the **same** `productId` in the listener as in the request (e.g. `com.tailorcraft.premium.monthly`).
- Log the **full purchase object** in `purchaseUpdatedListener` (see [Example logging](#example-logging-for-react-native-iap-purchase-flow)) and confirm:
  - `purchaseState === 'purchased'`
  - `productId` matches the product you requested
  - `transactionId` (string) is present
  - `purchaseToken` is present and non-empty (iOS: JWS string)

### 2. Checking purchaseUpdatedListener behavior

- Add logs at the **start** of `purchaseUpdatedListener` (before `productId` check) to see if the listener fires at all.
- If it never fires: transaction may be delivered later (e.g. after app restart), or there may be a silent failure (see [Detecting silent transaction failures](#14-detecting-silent-transaction-failures)).
- Ensure you **do not** remove the listener before the promise that triggers `requestPurchase` resolves; in your code, you remove the listener only when `purchase.productId === productId` or on error.

### 3. Logging the full purchase object returned

- Log every key of the `purchase` object (with sensitive values masked in production). See [Example logging](#example-logging-for-react-native-iap-purchase-flow).
- Required for backend and debugging:
  - `transactionId`
  - `originalTransactionIdentifierIOS` (or equivalent)
  - `purchaseToken` (JWS on iOS)
  - `expirationDateIOS` (if present)
  - `environmentIOS` (Sandbox vs Production)

### 4. Confirming transactionId and originalTransactionId exist

- **transactionId**: required on `PurchaseIOS`; use it for App Store Server API and for idempotency.
- **originalTransactionId**: in react-native-iap types it’s `originalTransactionIdentifierIOS`. Your backend stores `originalTransactionId`; for StoreKit 2 / JWS validation you can derive it from the decoded JWS payload or from the library if exposed.
- If either is missing in the object you pass to the backend, fix the mapping in `iapService` (e.g. add `originalTransactionIdentifierIOS` to `PurchaseLike` and send it to the API if the backend supports it).

### 5. Confirming the receipt / transaction JWS is generated

- On iOS with StoreKit 2, the “receipt” your backend should use is the **signed transaction** (JWS) in `purchase.purchaseToken`.
- Check: `typeof purchase.purchaseToken === 'string'` and `purchase.purchaseToken.length > 0`. JWS is typically hundreds to a few thousand characters.
- Do **not** send this to the legacy `verifyReceipt` endpoint; use App Store Server API (decode JWS and optionally call `GET /inApps/v1/transactions/{transactionId}`).

### 6. Sending the correct receipt/token to backend

- **Current flow**: `getPurchaseTokenForBackend()` returns `purchase.purchaseToken` or, on iOS, falls back to `purchase.transactionId`. You send this as `receipt` in `POST /api/subscriptions/confirm`.
- For **StoreKit 2**, the correct token for the App Store Server API is:
  - **Preferred**: the full **JWS** (`purchase.purchaseToken`) so the backend can decode it and verify the signature, or
  - **Alternative**: send **transactionId** (and optionally `originalTransactionId`) and let the backend call App Store Server API with that.
- Ensure the backend does **not** treat this token as the legacy app receipt (Base64) if you’re sending JWS.

### 7. Validating with Apple App Store Server API (NOT legacy verifyReceipt)

- Use **App Store Server API** for StoreKit 2 transactions:
  - **Verify signed transaction (JWS)**: decode the JWS, verify Apple’s signature, read `transactionId`, `originalTransactionId`, `expiresDate`, `productId`, `revocationDate`, etc.
  - **Or** use **Get Transaction Info**: `GET https://api.storekit.itunes.apple.com/inApps/v1/transactions/{transactionId}` with JWT auth (App Store Connect API key).
- Do **not** use the legacy `verifyReceipt` endpoint for the JWS string; it expects the app receipt only.
- See [Example backend validation (App Store Server API)](#example-backend-validation-app-store-server-api) below.

### 8. Confirming environment = Sandbox

- In TestFlight, purchases use the **Sandbox** environment.
- Log `purchase.environmentIOS` (or equivalent) and expect `'Sandbox'`.
- Backend: when using App Store Server API, use the **sandbox** base URL for TestFlight/sandbox transactions (e.g. `https://api.storekit-sandbox.itunes.apple.com`).

### 9. Checking expiration using expiresDate

- From the purchase object: use `expirationDateIOS` (milliseconds or seconds; check library types).
- From decoded JWS: use `expiresDate` (ms since epoch).
- From App Store Server API response: use the expiration field from the transaction.
- Ensure your backend stores this and that entitlement logic uses it (you already have `expirationDate` and `syncUserSubscriptionPlanInternal`).

### 10. Handling unfinished transactions

- Unfinished transactions are re-delivered by StoreKit when the app runs or when you call `getAvailablePurchases` / `getPendingTransactionsIOS`.
- On startup, consider calling `getPendingTransactionsIOS()` (if available) or `getAvailablePurchases({ alsoPublishToEventListenerIOS: true })` so that any pending purchase is delivered to `purchaseUpdatedListener` and you can verify and finish it.
- After backend confirms, call **finishTransaction** so the transaction is not delivered again.

### 11. Calling finishTransaction correctly

- Call **only after** backend confirm has succeeded (you already do this in `SubscriptionContext`).
- Pass the **same** purchase object (or at least the same `transactionId` / `purchaseToken`) that you sent to the backend. Your `finishTransaction(purchase)` uses the full purchase; ensure the object still has the fields the native module expects (e.g. `transactionId`, `purchaseToken`).
- If `finishTransaction` throws, log and optionally retry once; do not block the user from seeing “success” if the backend already confirmed.

### 12. Transaction.currentEntitlements equivalent in react-native-iap

- The library exposes **`getAvailablePurchases`** (and optionally **`currentEntitlementIOS`** if present in your version). These are the closest to StoreKit 2’s `Transaction.currentEntitlements`.
- Your **source of truth** for premium is the **backend** (`GET /entitlements/me`), which is correct. Use `getAvailablePurchases` / `currentEntitlementIOS` only for restore flows and debugging (e.g. “do we see any subscription on device?”).

### 13. Debugging why subscription would NOT appear in iOS Settings

- **Sandbox**: Sandbox subscriptions **can** be missing or delayed in **Settings → Apple ID → Subscriptions**. This is a known quirk; it doesn’t necessarily mean the purchase failed.
- **App Store Connect**: Sales may appear with a delay (minutes to hours). Check **App Store Connect → Your App → In-App Purchases** and **Sales and Trends**.
- **Real failure**: If the backend never receives a valid transaction (e.g. listener never fires, or backend rejects JWS), the subscription won’t be in your DB and the app will show non-premium. So: ensure listener fires, token is sent, and backend validates with App Store Server API (or valid app receipt).

### 14. Detecting silent transaction failures

- **Listener never fires**: Log at the very start of `purchaseUpdatedListener`; if you never see it after a “success” UI, the transaction may be pending or failed silently. Check `purchaseErrorListener` and any promise rejection from `requestPurchase`.
- **Backend errors**: Log response and status from `confirmSubscription`; 400 with “status: 21002” or “malformed” suggests you’re sending JWS to `verifyReceipt`. Fix by moving to App Store Server API or sending the correct receipt format.
- **finishTransaction fails**: Log the error; the transaction may be re-delivered on next launch so you can retry confirm + finish.

### 15. Confirming the subscription product is correctly configured in App Store Connect

- **Agreements, Tax, and Banking** are complete.
- **App Store Connect → Your App → Subscriptions**: subscription group exists; products **com.tailorcraft.premium.monthly** and **com.tailorcraft.premium.yearly** exist and are **Approved** (or Ready to Submit).
- **Product IDs** match exactly what you pass to `requestPurchase` and what the backend allows in `isAllowedProductId`.
- For TestFlight, the build must be linked to the app that has these IAPs; use the same bundle ID as in App Store Connect.

---

## Example logging for react-native-iap purchase flow

Use this inside `purchaseUpdatedListener` and around the purchase request (e.g. in `iapService.ts` or a wrapper) for debugging. Redact or truncate tokens in production.

```typescript
// In purchaseUpdatedListener - log full purchase (mask token in production)
function safeLogPurchase(productId: string, purchase: unknown) {
  const p = purchase as Record<string, unknown>;
  const keys = p ? Object.keys(p) : [];
  const mask = (s: unknown) => (typeof s === 'string' && s.length > 20 ? s.slice(0, 12) + '...' : s);
  console.log('[IAP] purchaseUpdated', {
    productId,
    matched: p?.productId === productId,
    purchaseState: p?.purchaseState,
    transactionId: p?.transactionId ?? null,
    originalTransactionId: (p as { originalTransactionIdentifierIOS?: string })?.originalTransactionIdentifierIOS ?? null,
    hasPurchaseToken: !!p?.purchaseToken,
    purchaseTokenLength: typeof p?.purchaseToken === 'string' ? (p.purchaseToken as string).length : 0,
    environmentIOS: (p as { environmentIOS?: string })?.environmentIOS ?? null,
    expirationDateIOS: (p as { expirationDateIOS?: number })?.expirationDateIOS ?? null,
    allKeys: keys,
  });
  if (__DEV__ && p) {
    keys.forEach((k) => console.log(`[IAP] purchase.${k}`, mask(p[k])));
  }
}

// Before requestPurchase
console.log('[IAP] requestPurchase start', { productId });

// In purchaseErrorListener
console.log('[IAP] purchaseError', { code: error?.code, message: error?.message });

// After resolve({ success: true, purchase: like })
console.log('[IAP] sending to backend', {
  productId: like.productId,
  receiptLength: iapService.getPurchaseTokenForBackend(like)?.length ?? 0,
});
```

Add these logs in `lib/services/iapService.ts` in `requestSubscription`: at the top of `purchaseUpdatedListener`, in `purchaseErrorListener`, and after building `like` before `resolve({ success: true, purchase: like })`.

---

## Example backend validation (App Store Server API)

Your backend currently uses **verifyReceipt** (see `appleVerificationService.ts`). For StoreKit 2 you should validate the **signed transaction (JWS)** or use **Get Transaction Info**.

### Option A: Decode and verify JWS locally (no extra Apple call)

- Decode the JWS (e.g. with `jose` or similar): header, payload, signature.
- Verify the signature using Apple’s root certificate / public key (see Apple’s “Verifying signed transaction information”).
- From the payload, read: `transactionId`, `originalTransactionId`, `productId`, `expiresDate`, `revocationDate`, `environment` (Sandbox/Production).
- Use `expiresDate` for expiration; if `revocationDate` is set, treat as revoked.

### Option B: Call App Store Server API (Get Transaction Info)

- Use an **App Store Connect API Key** (JWT) to authenticate.
- For the transactionId from the client (or from the decoded JWS), call:
  - Sandbox: `GET https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/{transactionId}`
  - Production: `GET https://api.storekit.itunes.apple.com/inApps/v1/transactions/{transactionId}`
- Response body is a **signed transaction** (JWS). Decode and verify it, then read expiration, productId, etc.
- Use the same payload fields as in Option A for `originalTransactionId`, `expiresDate`, and status.

### Minimal backend flow (pseudo-code)

```ts
// 1. Receive from client: receipt (JWS string) and productId
// 2. If receipt looks like JWS (e.g. 3 base64url segments separated by '.'):
//    - Decode payload (middle segment), verify signature with Apple's key
//    - Extract: transactionId, originalTransactionId, productId, expiresDate (ms), revocationDate, environment
// 3. If environment !== 'Sandbox' for TestFlight builds, optionally reject or log
// 4. Check productId matches allowed SKUs
// 5. expirationDate = new Date(expiresDate)
// 6. If revocationDate is set, treat as revoked/cancelled
// 7. Upsert subscription (userId, originalTransactionId, expirationDate, productId, ...) and sync user plan
// 8. Return { premium, expiresAt }
```

Implement the actual JWS verification using Apple’s documentation and a library that supports ES256 and Apple’s certificate chain.

**Reference**: See `TailorCraft-Backend/src/services/appleAppStoreServerExample.ts` for JWS decode, `looksLikeAppleTransactionJws`, and `parseAppleTransactionJws`. Integrate by branching in your confirm flow: if `looksLikeAppleTransactionJws(receipt)`, use App Store Server API (or decode JWS and verify signature); otherwise keep using `verifyReceipt` for legacy receipt data.

---

## Common mistakes (TestFlight + StoreKit 2 + react-native-iap)

| Mistake | Fix |
|--------|-----|
| Sending **JWS** to **verifyReceipt** | Use App Store Server API (decode JWS or call Get Transaction Info). |
| Relying on **Settings → Subscriptions** for sandbox | Sandbox subscriptions may not show there; use backend + App Store Connect. |
| Not waiting for **purchaseUpdatedListener** | Don’t assume success when the sheet dismisses; wait for the listener with the matching productId. |
| Calling **finishTransaction** before backend confirm | Finish only after backend returns 200 and you’ve stored the subscription. |
| **productId** mismatch | Ensure App Store Connect product IDs match exactly (e.g. `com.tailorcraft.premium.monthly`). |
| Using **production** App Store Server URL in TestFlight | Use sandbox base URL for TestFlight/sandbox transactions. |
| Ignoring **purchaseErrorListener** | Log and handle; user may have cancelled or a real error may occur. |
| **originalTransactionId** not sent to backend | Backend needs it for idempotency and webhooks; add to client payload if your API supports it. |
| **getAvailablePurchases** with `onlyIncludeActiveItemsIOS: true` | For restore, this is correct; for “pending” debugging you may try `false` once to see all transactions. |

---

## Quick reference: your codebase

- **Purchase flow**: `SubscriptionContext.upgradeToPro` → `requestPurchase(productId)` → `iapService.requestSubscription` → `purchaseUpdatedListener` → `getPurchaseTokenForBackend(purchase)` → `subscriptionService.confirmSubscription` → `finishTransaction(purchase)` (iOS).
- **Token sent**: `receipt` in `POST /api/subscriptions/confirm` = return value of `getPurchaseTokenForBackend(result.purchase)` (iOS: `purchaseToken` or `transactionId`).
- **Backend**: `subscriptionService.verifyAndUpsert` → `verifyAppleReceipt(purchaseToken, productId)` which calls legacy `verifyReceipt`. For StoreKit 2, add a path that validates JWS or calls App Store Server API and then upserts the same subscription fields.

Implementing JWS (or Get Transaction Info) validation in the backend and ensuring the listener receives and logs the full purchase will resolve most “purchase completes but no subscription” cases in TestFlight.
