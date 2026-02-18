# Input Refactor Checklist

This document describes the global Input refactor: all text inputs now use `@/components/ui/Input`, with no direct `TextInput` usage or local input styles in screens.

---

## 1. Safe order of files to change

When doing similar refactors or adding new screens, follow this order to avoid breaking forms:

1. **Core component** – Ensure `components/ui/Input.tsx` exists and supports the props you need (label, error, multiline, ref, variant, leftIcon, rightElement, optional).
2. **Auth flows** – `app/login.tsx`, `app/signup.tsx`, `app/verify-phone.tsx` (no shared form state with others).
3. **Standalone forms** – `app/clients/new.tsx`, `app/garments/new.tsx`, `app/account/delete.tsx`.
4. **New-order flow** – `app/new-order/client-data.tsx`, `app/new-order/summary.tsx` (one flow; test navigation and draft context).
5. **Tabs** – `app/(tabs)/profile.tsx`, `app/(tabs)/gallery.tsx`, `app/(tabs)/orders.tsx`.
6. **Detail/edit screens** – `app/client-details/[id].tsx`.
7. **Shared components** – `components/MeasurementForm.tsx`, `components/MeasurementDefinitionEditorModal.tsx`.

Avoid changing multiple files that share the same form or context in one commit; test after each screen or component.

---

## 2. How to avoid breaking forms

- **Map props correctly:** Use `value`, `onChangeText`, `placeholder`; for validation, use the `error` prop (boolean or string). Preserve `keyboardType`, `autoCapitalize`, `editable`, `multiline`, `numberOfLines`, `secureTextEntry`, and any `onSubmitEditing` / `onKeyPress`.
- **Refs:** Use `forwardRef` on Input and pass `ref` where focus is needed (e.g. verify-phone OTP). The global Input supports `ref` and `variant="code"` for single-char OTP boxes.
- **Password toggle:** Use the `rightElement` prop to render the Eye/EyeOff toggle; do not rely on local wrapper layout.
- **Optional / read-only:** Use `optional` for lighter styling and `editable={false}` for read-only (e.g. email on reauth).
- **Layout only:** Use `containerStyle` only for layout (e.g. `marginBottom: 0`, `flex: 1`). Do not pass visual overrides (colors, borders, font sizes); those come from the design system in `Input`.
- **No local input styles:** Remove any `StyleSheet` entries that were only used for inputs (e.g. `input`, `inputWrapper`, `passwordInput`, `textArea`). Keep layout styles (e.g. `inputGroup`, `field`) if they wrap other content too.

---

## 3. What to test after refactor

- **Auth:** Login, signup (personal + company steps), verify-phone (OTP entry, refs, error state).
- **Clients:** New client form, client details edit (name, phone, email, notes).
- **Orders:** New order – client data (manual entry, search modal, notes), summary (total/avans).
- **Profile:** Edit company (name, owner, phone, email, address).
- **Gallery:** Add item (title, description).
- **Garments:** New garment (name, description); measurement definition modal (label, order, options, formula).
- **Account:** Delete account reauth (email read-only, password with toggle).
- **Orders tab:** Search bar and filter modal (no regression on filters).

Check:

- No visual regression (height, borders, placeholder color, focus/error states).
- Validation and error messages still show where they did before.
- Multiline inputs (notes, description, options) grow and align correctly.
- Password visibility toggle works and does not overlap text.
- OTP screen: refs and keyboard navigation between boxes work; error state clears on new input.

---

## 4. Import rule

All screens and components that need a text input must import from:

```ts
import { Input } from '@/components/ui/Input';
```

No direct `TextInput` usage outside `components/ui/Input.tsx`. This keeps a single source of style and behavior and prevents accidental bypass of the global Input.

---

## 5. Edge cases covered

| Case              | Handling in Input |
|-------------------|-------------------|
| Multiline        | `multiline`, `numberOfLines`, `textAlignVertical="top"` |
| Password          | `secureTextEntry` + `rightElement` for toggle |
| Disabled/read-only| `editable={false}` |
| Keyboard types    | `keyboardType` (e.g. `email-address`, `phone-pad`, `numeric`, `number-pad`) |
| OTP / code boxes  | `variant="code"`, `ref`, `error` for error state |
| Optional styling  | `optional` prop |
| Label + icon      | `label` + `leftIcon` |
| Validation error  | `error={true}` or `error="Message"` |

---

## 6. Files refactored (reference)

- `app/login.tsx`
- `app/signup.tsx`
- `app/verify-phone.tsx`
- `app/account/delete.tsx`
- `app/client-details/[id].tsx`
- `app/clients/new.tsx`
- `app/garments/new.tsx`
- `app/garments/[garmentId].tsx` (unused TextInput import removed)
- `app/new-order/client-data.tsx`
- `app/new-order/summary.tsx`
- `app/(tabs)/profile.tsx`
- `app/(tabs)/gallery.tsx`
- `app/(tabs)/orders.tsx`
- `components/MeasurementForm.tsx`
- `components/MeasurementDefinitionEditorModal.tsx`

Global component: `components/ui/Input.tsx` (uses `InputStyles` and design tokens from `constants/design.ts`).
