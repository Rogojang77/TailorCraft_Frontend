# ScreenContainer Migration Report

## Objective

Replace `SafeAreaView` + `LayoutStyles.container` (or `styles.container`) + optional `ScrollView` patterns with a single reusable **ScreenContainer** component across the app, without changing business logic or navigation.

---

## Step 1 — ScreenContainer enhancements

**File:** `components/ui/ScreenContainer.tsx`

- **Props added/used:**
  - `scroll` (boolean) — wraps children in `ScrollView` when `true`
  - `keyboardAware` (boolean) — wraps in `KeyboardAvoidingView` (iOS `padding`, Android `height`)
  - `safeBottom` (boolean) — include bottom in safe area edges (default `true`)
  - `centered` (boolean) — flex center for content
  - `noPadding` (boolean) — no content padding (overrides `contentPadding`)
  - `contentPadding` (boolean) — horizontal `Spacing.md`, vertical from layout (default `true`)
  - `refreshControl` — optional when `scroll=true`
  - `contentContainerStyle`, `showsVerticalScrollIndicator` — for scroll mode

- **Internal behavior:**
  - Root: `SafeAreaView` (or `View` when `safe=false`) with configurable `edges`
  - Optional `ScrollView` when `scroll=true`
  - Optional `KeyboardAvoidingView` when `keyboardAware=true`
  - Default padding from design (Spacing.md / LayoutStyles-style) when `contentPadding && !noPadding`

- **TypeScript:** Style arrays and `refreshControl` prop typed so that no TS errors are introduced (conditional styles as arrays of `ViewStyle` only; `refreshControl` typed for `RefreshControl`).

---

## Step 2 — Files changed (usage replacement)

| File | Change |
|------|--------|
| **app/order-details/[id].tsx** | Root: `SafeAreaView` + `styles.container` → `<ScreenContainer noPadding>` (all three returns: loading, !orderData, main). Modals keep `SafeAreaView`. |
| **app/client-details/[id].tsx** | Same: all three returns use `<ScreenContainer noPadding>`; modal keeps `SafeAreaView`. |
| **app/new-order/index.tsx** | Root → `<ScreenContainer noPadding>`; `SafeAreaView` import removed. |
| **app/new-order/measurements.tsx** | Both returns → `<ScreenContainer noPadding>`; `SafeAreaView` import removed. |
| **app/new-order/client-data.tsx** | Root → `<ScreenContainer noPadding>`; `SafeAreaView` import kept (used in customer search Modal). |
| **app/new-order/summary.tsx** | Root → `<ScreenContainer noPadding>`; `SafeAreaView` import removed. |
| **app/account/legal.tsx** | Root → `<ScreenContainer noPadding>`; `SafeAreaView` removed. |
| **app/legal-document.tsx** | Both returns → `<ScreenContainer noPadding>`; `SafeAreaView` and `styles.container` removed. |
| **app/(tabs)/orders.tsx** | Root → `<ScreenContainer noPadding>`; `SafeAreaView` import kept (filter Modal). |
| **app/garments/index.tsx** | Root → `<ScreenContainer noPadding>`; `SafeAreaView` removed. |
| **app/garments/[garmentId].tsx** | All returns → `<ScreenContainer noPadding>`; `SafeAreaView` and `styles.container` removed. |
| **app/garments/new.tsx** | Root → `<ScreenContainer noPadding>`; `SafeAreaView` and `styles.container` removed. |
| **app/(tabs)/index.tsx** | Loading branch → `<ScreenContainer noPadding centered>`; main → `<ScreenContainer noPadding>`; `SafeAreaView` and `styles.container` removed. |
| **app/(tabs)/profile.tsx** | Screen root → `<ScreenContainer noPadding>`; closing tag and `styles.container` removed; `SafeAreaView` import kept (modals). |
| **app/(tabs)/gallery.tsx** | Screen root → `<ScreenContainer noPadding>`; `styles.container` removed; `SafeAreaView` import kept (modals). |
| **app/login.tsx** | Root → `<ScreenContainer noPadding keyboardAware>`; `SafeAreaView` and `styles.container` removed. |
| **app/signup.tsx** | Root → `<ScreenContainer noPadding>`; `SafeAreaView` and `styles.container` removed. |
| **app/clients/new.tsx** | Root → `<ScreenContainer noPadding>`; `SafeAreaView` and `styles.container` removed. |
| **app/subscription.tsx** | Root → `<ScreenContainer noPadding>`; `SafeAreaView` and `styles.container` removed. |
| **app/stats.tsx** | Loading return and main return → `<ScreenContainer noPadding>`; `SafeAreaView` and `styles.container` removed. |
| **app/verify-email.tsx** | Root → `<ScreenContainer noPadding>`; `SafeAreaView` and `styles.container` removed. |
| **app/account/delete.tsx** | All four returns (loading, pending success, deleted success, main) → `<ScreenContainer noPadding>`; `SafeAreaView` and `styles.container` removed. |
| **app/legacy/new-order-garment/[garmentId].tsx** | Root → `<ScreenContainer noPadding>`; `SafeAreaView` and `styles.container` removed. |

---

## Step 3 — Patterns removed

- **Screen root:** `SafeAreaView style={styles.container}` or `SafeAreaView style={LayoutStyles.container}` → replaced by `<ScreenContainer noPadding>` (or with `centered` / `keyboardAware` where used).
- **Local `styles.container`:** Removed from StyleSheet in each modified file (typically `flex: 1`, `backgroundColor: Colors.background`).
- **LayoutStyles.container:** No remaining screen-level usage; screens use ScreenContainer. (LayoutStyles may still be referenced for other layout styles; ScreenContainer comment references “LayoutStyles.container” as the pattern replaced.)

---

## Step 4 — Validation

- **Layout:** Screen roots now use ScreenContainer, which uses SafeAreaView internally with same edges; no intentional layout shift. Existing per-screen padding (e.g. inside ScrollView or content) unchanged via `noPadding`.
- **Android nav / keyboard:** Safe area and KeyboardAvoidingView (login with `keyboardAware`) unchanged in behavior.
- **TypeScript:** `ScreenContainer` typed so it introduces no new errors. Pre-existing project TS errors (e.g. `_layout.tsx`, `profile.tsx`, `Button.tsx`, `authService.ts`) remain and are unrelated to this migration.
- **Re-renders:** No new state or effect logic; no re-render loops introduced.

---

## Conventions

- **Screen root:** Use `<ScreenContainer noPadding>` so existing content padding and scroll behavior stay as-is.
- **Loading-only screens:** Use `<ScreenContainer noPadding centered>` where the only content is a centered loader/skeleton.
- **Auth / forms:** Use `keyboardAware` on ScreenContainer where the whole screen should avoid keyboard (e.g. login).
- **Modals:** Keep `SafeAreaView` inside Modal content; only the top-level screen wrapper was replaced with ScreenContainer.
- **Files that use SafeAreaView only in Modals:** Retain `import { SafeAreaView } from 'react-native-safe-area-context'` (e.g. client-data, orders, profile, gallery).
