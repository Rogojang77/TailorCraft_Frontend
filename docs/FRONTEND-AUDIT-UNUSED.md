# Frontend Unused Code Audit

**Date:** 2026-02-18  
**Scope:** TailorCraft-Frontend (React Native / Expo)  
**Method:** Grep and static analysis of imports/exports. No deletions performed.

---

## 1. Files never imported anywhere

| File | Evidence | Confidence |
|------|----------|------------|
| `components/feedback/ConfirmDialog.tsx` | No file imports `ConfirmDialog` or `@/components/feedback`. Only used internally by `ModalWrapper` (which is only used by ConfirmDialog). | **High** |
| `components/feedback/ModalWrapper.tsx` | Only imported by `ConfirmDialog.tsx`. No other references. | **High** |
| `components/feedback/index.ts` | No file imports from `@/components/feedback`. Barrel only. | **High** |
| `components/ui/Card.tsx` | No file imports `Card` or `@/components/ui`. All UI imports use direct paths (e.g. `@/components/ui/Button`). | **High** |
| `components/layout/Divider.tsx` | No file imports `Divider`. Only exported from `components/layout/index.ts`; no file imports from `@/components/layout`. | **High** |

**Note:** `components/layout/index.ts` and `components/ui/index.ts` are barrel files. No file in the project imports from `@/components/layout` or `@/components/ui`; every consumer uses direct paths (e.g. `@/components/layout/Header`, `@/components/ui/Button`). So the barrels themselves are never imported; only their re-exported modules are used via direct paths. Deleting the barrels would not break current imports; removing only the unused exports (Card, Divider) from them is an option.

---

## 2. Hooks that are never used

| Hook | Definition | Evidence | Confidence |
|------|------------|----------|------------|
| `useConsent()` | `contexts/ConsentContext.tsx` | Exported; no call site in the codebase. `ConsentUpdateModal` uses type `ConsentUpdateInfo` from the same file but does not call `useConsent()`. | **High** |
| `useTemplatesOptional()` | `contexts/TemplatesContext.tsx` | Exported; no file imports or calls it. Only `useTemplates()` is used. | **High** |

---

## 3. Components that are never rendered

Same as §1: **ConfirmDialog**, **ModalWrapper**, **Card**, **Divider** — no parent component imports or renders them.  
Confidence: **High**.

---

## 4. Context providers that are not mounted

**None.** All providers are mounted:

- `AuthProvider`, `I18nProvider`, `SubscriptionProvider`, `PremiumProvider`: root `app/_layout.tsx`.
- `ConsentProvider`: inside `RootLayoutNav()` in `app/_layout.tsx`.
- `OrderDraftProvider`, `TemplatesProvider`: in `app/new-order/_layout.tsx` and `app/legacy/_layout.tsx`.
- `TemplatesProvider`: also in `app/garments/_layout.tsx`.

---

## 5. Services not referenced

**None.** All checked services are referenced:

- `lib/services/authService.ts` — AuthContext, account/delete.
- `lib/services/subscriptionService.ts` — SubscriptionContext, useEntitlements.
- `lib/services/iapService.ts` — SubscriptionContext, usePurchase, useSubscriptions, useEntitlements, SubscriptionManagement.
- `lib/services/iapConnection.ts` — iapService, useSubscriptions, useEntitlements.
- `lib/services/pdfService.ts` — order-details.
- `lib/apiCache.ts` — multiple app screens.
- `lib/api-mappers.ts` — multiple app screens and libs.
- `lib/orderDraftStorage.ts` — OrderDraftContext.
- `lib/subscriptionMessages.ts` — SubscriptionContext.
- `lib/diagnostics.ts` — SubscriptionContext, AuthContext, OrderDraftContext, profile.
- `lib/biometric.ts` — AuthContext, login.
- `lib/clientMeasurements.ts` — new-order/measurements, legacy screen.
- `lib/templateUtils.ts` — legacy screen, TemplateSourceBadge.
- `lib/measurementDefensive.ts` — order-details, new-order, MeasurementForm, etc.
- `lib/calculatedFields.ts` — MeasurementForm, persistableMeasurements.
- `lib/measurementResolution.ts` — MeasurementForm.
- `lib/persistableMeasurements.ts` — new-order/measurements, legacy.
- `lib/unitConversion.ts` — measurementResolution.

---

## 6. Screens not registered in navigation

Expo Router is file-based; every file under `app/` is a route. The root `_layout.tsx` uses a `Stack` with explicit `Stack.Screen` names; all main route segments (login, signup, (tabs), client-details, clients, new-order, order-details, garments, account, subscription, legal-document, verify-email, +not-found) are registered. The `legacy` segment is not in the Stack but exists as `app/legacy/_layout.tsx` and `app/legacy/new-order-garment/[garmentId].tsx`; the root layout redirects `/legacy` to `/(tabs)` or `/login`, so legacy screens are intentionally unreachable. No screen is “missing” from routing.

---

## 7. Unused utility files

**None.** Both `utils/snapshotDisplay.ts` and `utils/pdfGenerator.ts` are used (via `@/utils` or by pdfGenerator importing from snapshotDisplay).

**Broken export:** `utils/index.ts` re-exports `generateOrderPDF` from `./pdfGenerator`, but `utils/pdfGenerator.ts` does not export `generateOrderPDF` (it only exports `shareOrderPDF`, `downloadOrderPDF`, and types). This is a **bug** (barrel references a non-existent export). Confidence: **High**.

---

## 8. Unused types/interfaces

All types in `types/subscription.ts` are either used in the codebase or re-exported from `SubscriptionContext` for consumers. No type file was found that is never imported.  
`types/templates.ts`, `types/measurement.ts` are imported in multiple places.  
`types/datetimepicker.d.ts` is a module declaration for `@react-native-community/datetimepicker` (used in app.json); it is used by TypeScript for the package.  
No unused type files or clearly unused type exports identified. Confidence: **Medium** (no exhaustive per-export scan).

---

## 9. Unused constants

All constant modules are imported: `constants/design.ts`, `constants/garments.ts`, `constants/legal.ts`, `constants/units.ts`, `constants/modalAnimation.ts`. No constant file is completely unused. Individual keys were not audited. Confidence: **Medium**.

---

## 10. Commented legacy code blocks

No large, clearly “legacy” commented-out code blocks were identified. Many files contain short comments or JSDoc; no systematic scan for `/* ... */` blocks of removed code was run. Confidence: **Low** (manual review would be more reliable).

---

## Summary: Likely safe to delete

### Files (safe to delete)

| Item | Confidence | Notes |
|------|------------|--------|
| `components/feedback/ConfirmDialog.tsx` | High | Never imported. |
| `components/feedback/ModalWrapper.tsx` | High | Only used by ConfirmDialog. |
| `components/feedback/index.ts` | High | Barrel with no external consumers. |
| `components/ui/Card.tsx` | High | Never imported. |
| `components/layout/Divider.tsx` | High | Never imported. |

### Exports (safe to remove or fix)

| Item | Confidence | Notes |
|------|------------|--------|
| `useConsent` from `contexts/ConsentContext.tsx` | High | Never called. Context and provider are still used. |
| `useTemplatesOptional` from `contexts/TemplatesContext.tsx` | High | Never called. |
| `generateOrderPDF` from `utils/index.ts` | High | **Fix:** Remove from barrel; `pdfGenerator` does not export it (broken re-export). |
| `getSnapshotEntries` from `utils/index.ts` | High | No consumer imports it (only `getSnapshotEntriesInDefinitionOrder` is used). Optional cleanup. |
| `humanizeSnapshotKey` from `utils/index.ts` | High | No consumer imports it (used only inside `snapshotDisplay.ts`). Optional cleanup. |
| `Card`, `CardProps`, `CardVariant` from `components/ui/index.ts` | High | Safe to remove from barrel if Card.tsx is deleted. |
| `Divider`, `DividerProps` from `components/layout/index.ts` | High | Safe to remove from barrel if Divider.tsx is deleted. |

---

## Warnings: Possible dynamic use

- **Dynamic imports:** The only dynamic `require()`/`import()` usages found are: `react-native-iap`, `@/assets/images/logo.png`, `@/constants/garments` (type-only), and `lib/i18n/translations/*.json`. No dynamic load of the “unused” components or hooks was found, so they are not used indirectly. Confidence: **High** that the listed files are not dynamically imported.
- **Legacy route:** `app/legacy/` is disabled by redirect; its screens and layouts are still part of the bundle and still use OrderDraftContext, TemplatesContext, OrderStepNav, TemplateSourceBadge, MeasurementForm, MeasurementDisplay, etc. Do not treat those as unused.

---

## Confidence levels

- **High:** Grep and import graph show no references; no dynamic or string-based references found.
- **Medium:** Used in re-exports or types only; or not all exports of the file were checked.
- **Low:** Only partial scan (e.g. commented blocks); manual review recommended.

---

## Recommended next steps (no deletions done in this audit)

1. Remove or fix the `generateOrderPDF` export in `utils/index.ts` (remove from barrel or add to pdfGenerator if needed).
2. Optionally delete the five files listed above and trim the two barrel files.
3. Optionally remove the two unused hook exports (`useConsent`, `useTemplatesOptional`) if you do not plan to use them.
4. Optionally remove the unused barrel exports `getSnapshotEntries` and `humanizeSnapshotKey` from `utils/index.ts` if you want a minimal public API.
