# Frontend package.json Analysis

**Date:** 2026-02-18  
**Scope:** TailorCraft-Frontend dependencies and devDependencies  
**Method:** Grep for imports/requires; no uninstall performed.

---

## 1. Dependencies never imported anywhere

| Package | Evidence |
|--------|----------|
| **zustand** | No `from 'zustand'` or `require('zustand')` in any .ts/.tsx. No create/store usage. |
| **@lucide/lab** | No imports; all icon imports use `lucide-react-native` only. |
| **react-native-url-polyfill** | No direct import in app/hooks/lib/components. (Sometimes used as polyfill in entry; not found.) |

---

## 2. Dev dependencies not required

| Package | Evidence |
|--------|----------|
| **babel-plugin-module-resolver** | Not referenced in `babel.config.js` (only `react-native-reanimated/plugin`). Path alias `@/` may be from Expo/Metro/tsconfig. |
| **sharp** | Not referenced in babel, metro, or app code. Expo may use it for image optimization during build/export; verify before removing. |

**Required devDependencies:** `@babel/core` (Expo), `@types/react` (TypeScript), `patch-package` (postinstall script), `postinstall-postinstall` (runs patch-package), `typescript`.

---

## 3. Duplicate libraries serving same purpose

- **Icons:** Only **lucide-react-native** is imported. **@lucide/lab** is present but never used (different package; not a duplicate in use, just unused).
- **State:** No Redux/MobX; **zustand** is the only state lib and is unused. No duplicate.
- **Navigation:** **expo-router** (uses **@react-navigation** under the hood). No duplicate.
- **IAP:** Only **react-native-iap**. No old or duplicate IAP library.

---

## 4. Old subscription / IAP libraries replaced

- **react-native-iap** is the only IAP dependency and is actively used (iapService, useSubscriptions, usePurchase, restore flow). No “replaced” or legacy IAP package found.

---

## 5. Old state management libraries unused

| Package | Status |
|--------|--------|
| **zustand** | Never imported. No store created; no useStore in codebase. **Unused.** |
| Redux / MobX | Not in package.json. N/A. |

---

## 6. Packages imported only in deleted files

From FRONTEND-AUDIT-UNUSED.md, files “safe to delete” (not yet deleted):  
`ConfirmDialog.tsx`, `ModalWrapper.tsx`, `Card.tsx`, `Divider.tsx`, `feedback/index.ts`.

- **ModalWrapper** / **ConfirmDialog** use: `expo-blur` (BlurView), `@/components/ui/Button`, `constants/design`. All of these are used in other files (AppFloatingFooter, PaywallModal, DeleteConfirmModal, etc.).
- **Card**, **Divider**: Only use design constants and React Native; no unique package.
- **No package is used exclusively in those deleted files.** Removing those files would not leave a package without any import.

---

## Safe to remove

| Package | Reason |
|--------|--------|
| **zustand** | Never imported; no store/useStore. Unused state management. |
| **@lucide/lab** | Never imported; all icons use `lucide-react-native`. |

---

## Possibly safe (verify before removing)

| Package | Reason |
|--------|--------|
| **react-native-url-polyfill** | No direct import found. May be required by a dependency or as a global polyfill; check Expo/React Native web docs before removing. |
| **@react-native-community/datetimepicker** | Only referenced in `types/datetimepicker.d.ts`; no component usage in app code. In app.json plugins. Remove only if you do not plan to use a date/time picker. |
| **expo-camera** | In app.json plugins; no direct import. Likely for permissions or future feature. Remove if camera not needed. |
| **expo-splash-screen** | No direct import (Expo may control it automatically). Confirm splash behavior before removing. |
| **expo-symbols** | No direct import. Optional for SF Symbols on iOS. |
| **expo-video** | In app.json plugins; no direct import. Remove if no in-app video. |
| **babel-plugin-module-resolver** (dev) | Not in babel.config.js. Path alias may come from Expo preset; confirm build still resolves `@/` before removing. |
| **sharp** (dev) | Not referenced in config or code. Expo may use for image processing; confirm `expo export` / asset handling before removing. |

---

## Must keep

| Package | Reason |
|--------|--------|
| **react**, **react-dom**, **react-native** | Core. |
| **expo**, **expo-router**, **expo-constants**, **expo-secure-store**, **expo-dev-client** | Core / entry / config / auth storage. |
| **expo-font**, **@expo/vector-icons** | app.json plugins; font loading. |
| **expo-file-system**, **expo-print**, **expo-sharing** | pdfGenerator, order-details share. |
| **expo-image-picker**, **expo-image-manipulator** | profile, signup, pdf-customize, gallery. |
| **expo-blur** | AppFloatingFooter, PaywallModal, DeleteConfirmModal (and ModalWrapper if kept). |
| **expo-linear-gradient** | profile, gallery, PaywallModal. |
| **expo-local-authentication** | lib/biometric.ts, login. |
| **expo-web-browser** | signup, account/legal, ConsentUpdateModal. |
| **expo-status-bar** | _layout. |
| **expo-linking** | expo-router dependency; deep linking. |
| **expo-haptics** | profile, account/delete, PaywallModal, DeleteConfirmModal. |
| **@react-native-async-storage/async-storage** | gallery, i18n, orderDraftStorage. |
| **@react-navigation/native**, **@react-navigation/bottom-tabs** | expo-router peer deps. |
| **lucide-react-native** | Icons across app and tabs. |
| **react-native-iap** | Subscription purchase and restore. |
| **react-native-keyboard-controller** | _layout, multiple screens. |
| **react-native-gesture-handler** | pdf-customize, gallery, garments/[garmentId]. |
| **react-native-reanimated** | MeasurementDefinitionEditorModal, AppFloatingFooter, PaywallModal, DeleteConfirmModal, modalAnimation, ListSkeletonLoader (Animated), gallery. |
| **react-native-safe-area-context** | _layout, many screens. |
| **react-native-screens** | expo-router / navigation. |
| **react-native-draggable-flatlist** | garments/[garmentId]. |
| **react-native-webview** | legal-document. |
| **react-native-web** | Web platform build. |
| **react-native-svg** | Likely peer of lucide-react-native. |
| **react-native-nitro-modules** | Used by react-native-iap. |
| **react-native-worklets** | Likely peer of react-native-reanimated. |
| **patch-package**, **postinstall-postinstall** (dev) | postinstall script. |
| **@babel/core**, **@types/react**, **typescript** (dev) | Build and types. |

---

## Summary

- **Safe to remove:** zustand, @lucide/lab.
- **Possibly safe:** react-native-url-polyfill; @react-native-community/datetimepicker (if no date picker); expo-camera, expo-splash-screen, expo-symbols, expo-video (if unused); babel-plugin-module-resolver, sharp (dev) after confirming build/Expo behavior.
- **Must keep:** All other listed dependencies and the dev deps used by scripts/Expo/TypeScript.

**Do not uninstall until you have run the app and (if applicable) web export after any change.**
