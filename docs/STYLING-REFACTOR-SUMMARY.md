# Styling Refactor Summary

## Goal

Audit and refactor styling so that reusable and shared styles live in a single global system (`constants/design.ts`), and local/component-level styles use design tokens instead of hardcoded values.

---

## 1. Global style file updates (`constants/design.ts`)

### New / extended design tokens

- **Colors**
  - **Overlays:** `overlayModal`, `overlayLight`, `overlayGradientEnd` for modals and full-screen overlays.
  - **Status backgrounds and text:** `successBg`, `successBorder`, `successText`, `errorBg`, `errorBorder`, `errorText`, `errorTextDark`, `warningBg`, `warningBorder`, `warningText`, `warningTextDark`, `infoBg`, `infoBorder`, `infoText` for alerts and banners.
  - **Destructive actions:** `danger`, `dangerDark`, `dangerBg` for delete and other destructive UI.
  - **Icon default:** `iconDefault` for generic icon color; `primaryLegacy` kept for compatibility where needed.

- **AccentPalette**  
  Array of 10 accent colors used for avatars/badges (e.g. `ClientListItem`) so accent colors are consistent and sourced from the design system.

- **Spacing**  
  `formFieldGap: 14` for vertical spacing between form fields (used by `InputStyles.container`).

- **Layout primitives**  
  `LayoutStyles`: `screenContainer`, `screenContent`, `section`, `sectionHeader`, `row`, `rowBetween` for shared screen/layout structure.

- **Modal styles**  
  `ModalStyles`: `overlay`, `overlayLight`, `content` for modal chrome.

- **Status surface styles**  
  `StatusStyles`: `success`, `successText`, `error`, `errorText`, `warning`, `warningText`, `info`, `infoText` for tinted alert/banner containers and text.

---

## 2. Components and screens refactored to use global styles

### Screens

- **order-details/[id].tsx**  
  Status colors → `Colors.warning/success/textSecondary/error`. All section/card, client card, payment, measurement, modal, and button styles use `CardStyles`, `BorderRadius`, `Spacing`, `Typography`, `StatusStyles`. Icon colors use `Colors.primary`, `Colors.textSecondary`, `Colors.textInverse`.

- **client-details/[id].tsx**  
  Same approach: sections and stats use `CardStyles`, notes use `StatusStyles.warning`, inputs and avatars use design colors. All icon and placeholder colors use design tokens.

- **login.tsx**  
  Placeholder → `Colors.textTertiary`. Error banner → `StatusStyles.error`. ActivityIndicator → `Colors.textInverse`.

- **signup.tsx**  
  All placeholders → `Colors.textTertiary`. Button/icon colors → `Colors.textInverse` / `Colors.textPrimary`. Error container → `StatusStyles.error`.

- **verify-phone.tsx**  
  ActivityIndicator and success/error containers use `StatusStyles.error` and `StatusStyles.success`; success text uses `Colors.success`.

- **verify-email.tsx**  
  ActivityIndicator and Mail icon → `Colors.textInverse`.

- **(tabs)/index.tsx**  
  Error banner → `StatusStyles.error`. Company banner → `StatusStyles.info`, titles/subtitles → `Colors.infoText` / `Colors.info`.

- **(tabs)/orders.tsx**  
  Error banner style → `StatusStyles.error`. Placeholders → `Colors.textTertiary`.

- **(tabs)/profile.tsx**  
  Placeholders → `Colors.textTertiary`.

- **(tabs)/gallery.tsx**  
  Placeholders → `Colors.textTertiary`.

- **stats.tsx**  
  Stats cards use `Colors.primary`, `Colors.info`, `Colors.success`, `AccentPalette[3]` for icon/color. Info card → `CardStyles.cardElevated`; info row border → `Colors.borderLight`; error banner → `StatusStyles.error`; bottom spacer → `Spacing.xxl`.

- **subscription.tsx**  
  Warning-style banner → `StatusStyles.warning`.

- **account/delete.tsx**  
  Warning/destructive banners → `StatusStyles.warning` and `StatusStyles.error`; text → `Colors.warningText`, `Colors.errorTextDark`. Error box → `StatusStyles.error`.

### Shared components

- **StatsCard**  
  Card uses `CardStyles.cardElevated`, `Shadows.md`; title/value use `Typography.statLabel` and `Typography.bodyBold`; colors from design.

- **ClientListItem**  
  Avatar colors from `AccentPalette` (single source for accent list).

- **ClientCard**  
  Icon colors → `Colors.textSecondary`.

- **ProBadge**  
  Background → `Colors.warningBg` (replacing hardcoded `#FFFBEB`).

- **DeleteConfirmModal**  
  Overlay → `Colors.overlayModal`; card → `Colors.surface`, `Shadows.xl`; icon ring → `Colors.dangerBg`; Trash2 and gradient → `Colors.danger`, `Colors.dangerDark`, `Colors.textInverse`.

- **PaywallModal**  
  Overlay → `Colors.overlayModal`; close icon → `Colors.textTertiary`; card uses `BorderRadius.xxl`, `Shadows.xl`; padding → `Spacing.lg`.

- **MeasurementDefinitionEditorModal**  
  Overlay → `Colors.overlay`; ActivityIndicator → `Colors.textInverse`.

### Utils

- **garmentIcons.tsx**  
  Default icon color → `Colors.iconDefault`.

---

## 3. What was centralized

- **Colors:** All status (success/error/warning/info) and destructive (danger) colors, overlays, status backgrounds/borders/text, and icon default live in `Colors` or `StatusStyles`.
- **Spacing:** Screen padding, section spacing, form field gap, and list gaps use `Spacing` (including `formFieldGap`).
- **Typography:** Headings, body, captions, labels, stat number/label, and button text use `Typography` and, where applicable, `InputStyles.label`.
- **Surfaces:** Cards and elevated cards use `CardStyles.card` / `CardStyles.cardElevated`; status banners use `StatusStyles.*`.
- **Modals:** Overlay and content use `Colors.overlay*` and, where applicable, `ModalStyles` and `Shadows.xl`.
- **Buttons:** Primary/secondary/back/danger icon and full-width buttons use `ButtonStyles`; destructive gradient uses `Colors.danger` / `Colors.dangerDark`.
- **Borders and radius:** Borders use `Colors.border` / `Colors.borderLight`; radius use `BorderRadius.*`.
- **Shadows:** Card and modal shadows use `Shadows.sm/md/xl` and, where needed, `Shadows.primary`.
- **Placeholders:** All `placeholderTextColor` use `Colors.textTertiary` (or design token) instead of `#999` / `#9CA3AF`.
- **Avatar/accent colors:** `ClientListItem` (and any similar list) use `AccentPalette` for consistent accent colors.

---

## 4. What was intentionally left local

- **Screen-specific layout:** Per-screen `StyleSheet` for things like `container`, `content`, `header`, `section` layout (flex, padding, margins) when they are one-off or not yet migrated to `LayoutStyles`. These can be switched to `LayoutStyles` in a follow-up.
- **Profile, gallery, orders:** Large local StyleSheets remain for complex layout (e.g. profile forms, gallery grid, orders filters). Only placeholder colors and selected banners were refactored to tokens; full migration of every style object was not done to avoid scope creep.
- **Modals with custom layout:** PaywallModal and similar keep local padding/sizing (e.g. `padding: 28`, `borderRadius: 24`) where they intentionally differ from the default modal style.
- **LinearGradient colors:** Gradients that need multiple stops (e.g. delete button, paywall) use design colors where applicable; exact gradient stops remain in component when they are not yet in the design file.
- **Animation and platform-specific values:** e.g. `Platform.OS === 'web' ? Colors.overlayModal : 'transparent'` and animation configs stay in components.

---

## 5. Consistency and cleanup

- **No new global CSS file:** The app is React Native/Expo; the single source of truth is `constants/design.ts`. No `global.css` or Tailwind.
- **Spacing and typography:** Shared spacing uses the 8pt grid and `Spacing`; typography uses `Typography` and `InputStyles` so headings, body, and labels are consistent.
- **No leftover dead styles:** Only in-file StyleSheet refactors were done; no separate cleanup of unused CSS (no global CSS in this project). Unused style objects in a few screens could be pruned in a later pass.
- **Visual regressions:** Refactors are token-for-value replacements (e.g. `#6B7280` → `Colors.textSecondary`). Intended behavior and appearance are unchanged; any design token value is already used elsewhere in the app.

---

## 6. Recommended next steps

1. **Use `LayoutStyles`** in new screens and when touching existing screens (e.g. `screenContainer`, `screenContent`, `section`) to reduce duplicated layout code.
2. **Replace remaining hardcoded hex/rgba** in `(tabs)/profile.tsx`, `(tabs)/gallery.tsx`, and `(tabs)/orders.tsx` (e.g. in large StyleSheet blocks) in a follow-up pass.
3. **Add gradient tokens** to `design.ts` if more gradient UIs appear (e.g. `gradientDanger: [Colors.danger, Colors.dangerDark]`).
4. **Optionally add `placeholderTextColor`** to `InputStyles.input` so all inputs get it from the design system by default.
