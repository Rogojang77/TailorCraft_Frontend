# Step 1 — UI Components Audit

## Repeated UI Patterns

### 1. Buttons
- **Existing:** `components/ui/Button.tsx` (primary, secondary, ghost, danger, back, icon variants).
- **Duplication:** Many screens use raw `TouchableOpacity` + local styles instead of `Button`:
  - **app:** orders.tsx, profile.tsx, gallery.tsx, index.tsx, order-details/[id].tsx, new-order/*.tsx, client-details/[id].tsx, garments/index.tsx, garments/[garmentId].tsx, account/legal.tsx, account/delete.tsx, legal-document.tsx, subscription.tsx, legacy/new-order-garment/[garmentId].tsx
  - **components:** OrderStepNav.tsx, OrderHistoryItem.tsx, OrderCard.tsx, ConsentCheckbox.tsx, MeasurementDefinitionEditorModal.tsx, PaywallModal.tsx, SubscriptionLoadErrorBanner.tsx, SubscriptionManagement.tsx, ConsentUpdateModal.tsx, DraftRestoredBanner.tsx, MeasurementForm.tsx
- **Pattern:** Back button (44x44, rounded), primary/secondary full-width, list item press, icon-only actions.

### 2. Input fields
- **Existing:** `components/ui/Input.tsx` (label, error, optional, code variant).
- **Duplication:** One raw `TextInput` in orders.tsx (search). All other forms use Input.

### 3. Section containers
- **Pattern:** `View` with `marginBottom: Spacing.lg` + `Text` with `Typography.h3` (section title). Sometimes `sectionHeader` row with title + actions.
- **Files:** profile.tsx, index.tsx, order-details/[id].tsx, new-order/summary.tsx, new-order/client-data.tsx, client-details/[id].tsx, legacy/new-order-garment/[garmentId].tsx, subscription.tsx, account/legal.tsx, stats.tsx, account/delete.tsx, SubscriptionManagement.tsx, garments/[garmentId].tsx
- **Design:** `LayoutStyles.section`, `LayoutStyles.sectionHeader` in constants/design.ts.

### 4. Card layouts
- **Existing:** `CardStyles.card` / `CardStyles.cardElevated` in design.ts; OrderCard, ClientCard, StatsCard use them.
- **Duplication:** Inline `backgroundColor: Colors.surface`, `borderRadius: BorderRadius.lg/md`, `...CardStyles.card` in many screens and modals.
- **Pattern:** Surface + radius + padding + optional shadow. Reusable `Card` wrapper.

### 5. Headers
- **Pattern:** Row with back button (left), centered or left-aligned title, optional right actions. Uses `HeaderStyles.container`, `HeaderStyles.title`, `HeaderStyles.actions`.
- **Duplication:** Some screens use `HeaderStyles.container` + `Button variant="back"` + `Text style={HeaderStyles.title}`; others use inline `styles.backButton` (TouchableOpacity) + local title style. Files: garments/[garmentId].tsx, garments/index.tsx, garments/new.tsx, subscription.tsx, stats.tsx, clients/new.tsx, order-details/[id].tsx, client-details/[id].tsx, new-order/*.tsx, account/legal.tsx, legal-document.tsx, legacy.

### 6. List items
- Domain components: ClientListItem, OrderHistoryItem, OrderCard. Shared pattern: touchable row/card with border/divider. Optional reusable list-item wrapper.

### 7. Empty states
- **Patterns:**
  - Block: `View` (emptyState) + `Text` (emptyText).
  - Block with CTA: emptyState + emptyText + TouchableOpacity (emptyStateAddButton).
  - Scroll content: emptyContainer + emptyTitle + emptyMessage.
  - List: ListEmptyComponent with emptyText or emptyContainer + emptyText.
- **Files:** orders.tsx, garments/[garmentId].tsx, gallery.tsx, index.tsx, new-order/index.tsx, new-order/client-data.tsx, client-details/[id].tsx, garments/index.tsx, legacy, SubscriptionManagement.tsx.

### 8. Loading states
- **Existing:** FullScreenLoader (full-screen block), ListSkeletonLoader (list/grid skeletons).
- **Duplication:** Inline `View` + `ActivityIndicator` + `Text` (loadingText) in: garments/[garmentId].tsx, profile.tsx, order-details/[id].tsx, new-order/index.tsx, new-order/measurements.tsx, new-order/client-data.tsx, client-details/[id].tsx, garments/index.tsx, legacy, subscription.tsx, account/delete.tsx, legal-document.tsx, stats.tsx, verify-email.tsx, SubscriptionManagement.tsx.
- **Pattern:** Centered container, spinner, optional message. Reusable `Loader` for in-content loading.

### 9. Form field wrappers
- Handled by `Input` (label, error). Section grouping via `Section` component.

### 10. Error messages
- **Pattern:** `Text` with caption style + `color: Colors.error` (or errorTextDark). Repeated in: orders, login, garments/[garmentId], profile, index, signup, order-details, client-details, subscription, garments/index, legal-document, stats, account/delete, DeleteConfirmModal, SubscriptionManagement.
- Reusable `ErrorText` component.

### 11. Modals
- **Existing:** DeleteConfirmModal, PaywallModal, ConsentUpdateModal, MeasurementDefinitionEditorModal (custom content).
- **Duplication:** Raw `Modal` + overlay View + content View in orders (filter), profile (edit, diagnostics), gallery (add, categories), order-details (edit). Pattern: transparent Modal, overlay (TouchableWithoutFeedback), centered card. Optional `ModalWrapper` for overlay + card + close.

### 12. Confirm dialogs
- DeleteConfirmModal covers delete flow. Simple confirms use `Alert.alert` — no component change.

### 13. Screen container
- **Design:** LayoutStyles.screenContainer (flex:1, background), LayoutStyles.screenContent (flex:1, padding). Not a single component; screens use SafeAreaView + View/ScrollView + manual padding.
- Reusable `ScreenContainer` (flex:1, background, optional safe area, optional content padding).

### 14. Divider
- **Pattern:** `height: 1` or `borderBottomWidth: 1`, `borderColor: Colors.border`. sectionDivider in new-order/index, client-data; list separators in many files.
- Reusable `Divider` component.

---

## Design system
- **constants/design.ts:** Colors, Spacing, BorderRadius, Typography, ButtonStyles, HeaderStyles, InputStyles, CardStyles, LayoutStyles, ModalStyles, StatusStyles. Use these in all new components.

## Paths
- Project uses `@/*` → `./*` (root). New components live under `components/ui/`, `components/layout/`, `components/feedback/` (no `src/` to avoid changing path alias).
