# Reusable Component Migration — Step 2 Report

## Files modified

| File | Changes |
|------|--------|
| **app/order-details/[id].tsx** | Header (x3: loading, !orderData, main with rightActions); ErrorText for order not found; Button for header delete/edit icons; removed header/backButton/title/headerSpacer/headerActions/deleteHeaderBtn/editButton/errorText styles. |
| **app/client-details/[id].tsx** | Header (x3); ErrorText for client not found; Section for order history block with headerRight (new order Button); Button for delete/edit in header and new order; removed header/backButton/title/headerSpacer/headerActions/deleteHeaderBtn/editButton/historyHeader/sectionTitle/errorText/newOrderText styles. |
| **app/new-order/index.tsx** | Header (x2); EmptyState for no garments; Button for continue; removed header/backButton/title/placeholder/emptyTitle/emptyDescription/continueButtonText; ArrowLeft import removed. |
| **app/new-order/measurements.tsx** | Header (x2); Loader for loading state; removed header/backButton/title/placeholder/loadingText; ArrowLeft, ActivityIndicator removed. |
| **app/new-order/client-data.tsx** | Header with rightActions (save Button); Section (x2) for existing customer and new client form; Button for search and save; removed header/backButton/title/saveButton/saveButtonDisabled/sectionTitle styles. |
| **app/new-order/summary.tsx** | Header; Section (x2) for order info and payment; Button for finish; removed header/backButton/title/headerRightSpacer/sectionHeader/sectionTitle; ArrowLeft, InlineSpinner removed; finishButtonText removed. |
| **app/account/legal.tsx** | Header; removed header/title styles; ArrowLeft import removed. |
| **app/legal-document.tsx** | Header (x2); Loader in loading overlay; ErrorText for no URL and error; Button for retry; removed header/title/loadingText/errorText/retryText styles; ArrowLeft, ActivityIndicator removed. |
| **app/(tabs)/orders.tsx** | ErrorText for error banner; removed errorText style. |

---

## Patterns replaced

- **Inline header rows** → **Header**: Back + title + optional right actions (order-details, client-details, new-order/index, new-order/measurements, new-order/client-data, new-order/summary, account/legal, legal-document).
- **Inline section + sectionTitle** → **Section**: Title + optional headerRight (client-details order history, new-order/client-data existing customer + form, new-order/summary order info + payment).
- **Inline ActivityIndicator + loading text** → **Loader**: new-order/measurements loading state; legal-document loading overlay content.
- **Inline error Text (Colors.error)** → **ErrorText**: order-details (!orderData), client-details (!clientData), legal-document (no URL + error), orders error banner.
- **TouchableOpacity as primary/secondary/back actions** → **Button**: Back and header actions (Header handles back); finish/continue/save/retry as Button (new-order/summary, new-order/index, new-order/client-data, legal-document); client-details new order and header icons as Button.
- **Inline empty state (title + message)** → **EmptyState**: new-order/index no garments block.

---

## Stability check

- **TypeScript**: No new TS errors introduced in modified files (linter run clean). Pre-existing project TS errors (e.g. unmountOnBlur, documentDirectory, Button style callback) remain unchanged.
- **Style arrays**: Conditional styles use `null` instead of `false` (e.g. `!canFinalize ? styles.finishButtonDisabled : null`) to satisfy ViewStyle.
- **No render loops**: No new useEffect/useState that would cause loops; same handlers and dependencies as before.
- **Prop types**: All new components used with existing prop types; no widening (e.g. ErrorText receives string children as before).
- **Safe area**: Header and screen layout unchanged; SafeAreaView still wraps screens; no removal of safe area usage.

---

## Potential risks

1. **Visual tweaks**: Section titles now use shared Typography.h3 (e.g. new-order/client-data “Existing customer” / “New client data” were smaller uppercase; now standard section title). Acceptable for consistency; can override with `titleStyle` if needed.
2. **order-details / client-details**: Header right actions are now Button (dangerIcon / primaryIcon). Behavior and layout intended to match previous TouchableOpacity + ButtonStyles; if any layout differed (e.g. gap), it should be minimal.
3. **legal-document**: Loading overlay still uses a positioned View with Loader inside (Loader is not absolutely positioned). Same behavior; only the inner content is Loader.
4. **Remaining TouchableOpacity**: Many list rows, cards, and modal buttons still use TouchableOpacity (orders, profile, gallery, OrderCard, OrderHistoryItem, etc.). Left as-is to limit scope; can be migrated later to Button/ghost where appropriate.

---

## Not changed

- Business logic: no changes to API calls, state, or navigation.
- Navigation: all `router.back()`, `router.replace()`, `router.push()` unchanged.
- Modals: DeleteConfirmModal, PaywallModal, and raw Modal usage unchanged; no swap to ModalWrapper in this pass.
- List item press: OrderCard, OrderHistoryItem, and similar still use TouchableOpacity for the row/card press.
- ScreenContainer: Not used in this pass; screens still use SafeAreaView + View/ScrollView. Can be adopted later for a shared screen wrapper.
