# Button Refactor Checklist

This document tracks the migration of all button usages to the global `Button` component from `@/components/ui/Button`.

## Safe refactor order

1. **Auth & onboarding** – login, signup, verify-phone, verify-email ✅  
2. **Modals** – DeleteConfirmModal, PaywallModal, MeasurementDefinitionEditorModal, ConsentUpdateModal ✅ (first three done)  
3. **Detail screens** – garments/[garmentId], garments/new, clients/new, client-details/[id] ✅  
4. **Order flow** – order-details/[id], new-order/* (index, client-data, measurements, summary)  
5. **Tabs** – (tabs)/index, (tabs)/orders, (tabs)/gallery, (tabs)/profile  
6. **Account & misc** – account/delete, account/legal, stats, subscription ✅ (stats, subscription back/retry done)  
7. **Shared components** – ClientCard ✅, ClientListItem ✅, MeasurementForm, OrderCard, OrderHistoryItem, OrderStepNav, SubscriptionManagement, DraftRestoredBanner, legal-document  

## Global Button API (reference)

- **Import:** `import { Button } from '@/components/ui/Button';`
- **Variants:** `primary` | `secondary` | `ghost` | `danger` | `back` | `primaryIcon` | `secondaryIcon` | `dangerIcon`
- **Props:** `onPress`, `onLongPress?`, `disabled`, `loading`, `fullWidth`, `accessibilityLabel`, `leftIcon?`, `rightIcon?`, `style?` (layout only), `size?` (`sm` | `md` | `lg`)
- **Children:** string (text) or ReactNode (icon-only or custom content)

## Common mistakes to avoid

1. **Do not** use `Pressable` or `TouchableOpacity` / `TouchableHighlight` / `TouchableWithoutFeedback` for any button action. Use `Button` only.  
   - Exception: `TouchableWithoutFeedback` for modal **backdrop** (dismiss on tap outside) is not a button; leave it as-is.

2. **Do not** keep local button styles (e.g. `button`, `backButton`, `submitText`). Remove `ButtonStyles` from screen imports and delete StyleSheet entries that only styled buttons. Use `style` on `Button` only for layout (margin, flex, width).

3. **Icon-only buttons:** Use `Button` with `variant="back"` | `primaryIcon` | `secondaryIcon` | `dangerIcon` and pass the icon as `children` (e.g. `<ArrowLeft size={24} color={...} />`).

4. **Text + icon:** Use `leftIcon` or `rightIcon` with string `children` (e.g. `<Button leftIcon={<Plus ... />}>Add</Button>`).

5. **List/card taps:** Use `Button variant="ghost"` with `style={styles.card}` and optional `onLongPress` for context actions. Ensure card style includes `alignItems: 'stretch'` if content should fill width.

6. **Selection chips / custom toggles:** Type chips, plan option cards, and similar “select one” UIs can stay as `TouchableOpacity` if they are not standard action buttons; or migrate to `Button variant="secondary"` with dynamic style for selected state if you want full consistency.

## What to regression-test

- [ ] **Auth:** Login, signup (both steps), verify-phone, verify-email – all CTAs and links work; loading/disabled states.  
- [ ] **Navigation:** Every back button and header action (edit, save, cancel, delete) on detail screens.  
- [ ] **Modals:** Delete confirm (cancel + delete), Paywall (close, cancel, upgrade), Measurement editor (close, save).  
- [ ] **Lists:** Client list (tap row, long-press delete), client cards, order list actions.  
- [ ] **Forms:** New client, new garment, new order flow – submit and secondary buttons; disabled when invalid.  
- [ ] **Profile & account:** Edit profile, delete account flow, subscription and paywall.  
- [ ] **Accessibility:** All buttons have sensible `accessibilityLabel` where we set them; no duplicate roles.

## Files already refactored

- `components/ui/Button.tsx` – global component (created)
- `app/login.tsx`
- `app/signup.tsx`
- `app/verify-phone.tsx`
- `app/verify-email.tsx`
- `app/garments/[garmentId].tsx`
- `app/garments/new.tsx`
- `app/clients/new.tsx`
- `app/client-details/[id].tsx`
- `app/stats.tsx`
- `app/subscription.tsx` (header back + retry; plan cards/upgrade buttons may still use TouchableOpacity)
- `components/DeleteConfirmModal.tsx`
- `components/PaywallModal.tsx` (close, cancel, upgrade; plan selection cards still TouchableOpacity)
- `components/MeasurementDefinitionEditorModal.tsx`
- `components/ClientCard.tsx`
- `components/ClientListItem.tsx`

## Files still to refactor

- `app/order-details/[id].tsx`
- `app/new-order/index.tsx`, `client-data.tsx`, `measurements.tsx`, `summary.tsx`
- `app/(tabs)/index.tsx`, `orders.tsx`, `gallery.tsx`, `profile.tsx`
- `app/account/delete.tsx`, `app/account/legal.tsx`
- `app/legal-document.tsx`
- `app/garments/index.tsx`
- `components/MeasurementForm.tsx`
- `components/ConsentUpdateModal.tsx`
- `components/SubscriptionManagement.tsx`
- `components/DraftRestoredBanner.tsx`, `SubscriptionLoadErrorBanner.tsx`
- `components/OrderCard.tsx`, `OrderHistoryItem.tsx`, `OrderStepNav.tsx`
- `app/legacy/new-order-garment/[garmentId].tsx` (if still in use)

## Constraints (reminder)

- **Do not** redesign button styles; use existing variants only.  
- **Do not** change UX or layout except where needed to use `Button`.  
- **Do not** add new variants unless already defined in the design system.  
- Keep TypeScript strict; fix any new type errors after replacing touchables with `Button`.
