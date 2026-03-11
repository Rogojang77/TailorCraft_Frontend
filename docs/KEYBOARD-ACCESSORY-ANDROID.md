# Android Keyboard Accessory – Production Design

This document describes the production-grade keyboard accessory system for React Native on Android, used by `NumericMeasurementInput` and reusable for any input that needs a bar above the keyboard (Done, +, −, ▲, ▼, etc.).

## 1. Architectural pattern

**Single root-level host + React Context.**

- **Root-level host**: One host view is rendered at the app root (inside `KeyboardAccessoryProvider`), with `position: 'absolute'`, `bottom: 0`, `left: 0`, `right: 0`. It does not participate in layout and does not push content.
- **Context**: Any screen can mount inputs that need an accessory. On focus, the input registers `(id, content)` with the context. On blur (or unmount), it clears. Only one input is “focused” at a time, so only one accessory is shown.
- **Stick to keyboard**: The host uses `react-native-keyboard-controller`’s `KeyboardStickyView` and `useKeyboardAnimation()` so the bar moves with the keyboard (same as on iOS with `InputAccessoryView`).
- **Visibility**: The bar is only visible when the keyboard is open. We drive opacity from keyboard `progress` and gate pointer events so the bar does not sit visible at the bottom when the keyboard is closed.

This gives:

- One place that renders the accessory (root host).
- No layout shift (absolute positioning).
- Correct behavior with `adjustResize`, ScrollView, multiple inputs, Fabric, and Expo.

## 2. What to use (and what not)

| Approach | Use? | Why |
|----------|------|-----|
| **Root-level accessory host** | ✅ Yes | Single host at root; content comes from context. No layout push, works with adjustResize and ScrollView. |
| **Context** | ✅ Yes | Inputs register/unregister and set content by id. Supports multiple inputs; only the focused one’s content is shown. |
| **Portal** | ⚠️ Optional | Conceptually we “portal” content into the root host. We implement this via context (register content by id) rather than a separate portal library. |
| **Keyboard listeners** | ✅ Via library | We use `react-native-keyboard-controller` (already in the app). Its `useKeyboardAnimation()` / `KeyboardStickyView` abstract keyboard height and movement. We do not add raw `Keyboard` listeners. |

So: **root-level host + context** is the core; keyboard behavior comes from **react-native-keyboard-controller**.

## 3. Implementation overview

- **`contexts/KeyboardAccessoryContext.tsx`**
  - `KeyboardAccessoryProvider`: holds `focusedId` and `contentById`, exposes `setFocusedAccessory(id, content)`.
  - On Android it renders a wrapper and `AndroidAccessoryHost`, which uses `KeyboardStickyView` + `useKeyboardAnimation()` and shows `contentById[focusedId]`. Opacity and pointer events are tied to keyboard progress.
  - Optional Reanimated 3 host: `useReanimatedHost={true}` uses `useReanimatedKeyboardAnimation()` and `useAnimatedStyle` so opacity runs on the UI thread.

- **`components/NumericMeasurementInput.tsx`**
  - Uses `useKeyboardAccessoryOptional()`. On Android, when the input gains focus it calls `setFocusedAccessory(accessoryId, accessoryBarContent)`; on blur or unmount it calls `setFocusedAccessory(null, null)`.
  - A `useEffect` syncs the registered content when the bar’s dependencies change (e.g. `pressedButton`, theme, handlers) so the host always shows the current bar.

- **`app/_layout.tsx`**
  - Wraps the app with `KeyboardAccessoryProvider` inside `KeyboardProvider` so the host is at root and all screens can use the accessory.

## 4. AndroidManifest / Expo config

- **Android**: `android:windowSoftInputMode="adjustResize"` (already set in `android/app/src/main/AndroidManifest.xml`).
- **Expo**: `app.json` → `expo.android.softwareKeyboardLayoutMode: "resize"` (already set).

No extra manifest or Expo config is required for this accessory system. The library’s `useKeyboardAnimation` / `useResizeMode` work with this setup.

## 5. Why other approaches are avoided

- **Absolute positioning alone (no host)**  
  If each input rendered its own bar in place with `position: 'absolute'` and a bottom offset, you’d have to derive that offset from keyboard height and layout. That is fragile (different screens, safe area, ScrollView, etc.) and easy to get wrong. Here, the **single** root host is always at the window bottom and `KeyboardStickyView` moves it with the keyboard; no manual bottom math.

- **Modal**  
  A modal would sit above the keyboard but:
  - Blocks the rest of the UI and has its own focus/back behavior.
  - Doesn’t “stick” to the keyboard; you’d have to animate it yourself and keep it in sync with keyboard height.
  - Overkill and not the right abstraction for an input accessory.

- **react-native-keyboard-accessory**  
  That library often relies on:
  - Manual bottom offsets or `KeyboardAvoidingView`-style hacks.
  - Or native modules that may not align with Fabric / Expo / adjustResize.
  We avoid it and use **react-native-keyboard-controller** (already in the project) for keyboard height and movement, and our own small context + host for content.

So: one root host + context + react-native-keyboard-controller is the chosen, production-safe approach.

## 6. Reanimated 3 variant (optional)

If you want the bar’s show/hide opacity to run on the UI thread:

- Use `KeyboardAccessoryProvider` with `useReanimatedHost={true}`.
- The provider will render `AndroidAccessoryHostReanimated`, which uses `useReanimatedKeyboardAnimation()` and `useAnimatedStyle` so opacity is driven by a shared value in a worklet.

Example:

```tsx
<KeyboardAccessoryProvider useReanimatedHost>
  {children}
</KeyboardAccessoryProvider>
```

The default host uses RN’s `Animated` and a progress listener for pointer events; the Reanimated host is optional and for smoother opacity animation when you already use Reanimated.

## 7. Requirements checklist

- Works on Android: yes (host + `KeyboardStickyView`).
- Moves with keyboard: yes (`react-native-keyboard-controller`).
- Works with `adjustResize`: yes (no hacks; host is absolute).
- Works inside ScrollView: yes (host is at root, not inside scroll).
- Does not push layout: yes (absolute, no flex).
- Only when input focused: yes (register on focus, clear on blur).
- Multiple inputs: yes (one focused id; content swapped on focus change).
- Fabric-compatible: yes (no legacy native keyboard-accessory dependency).
- Works in Expo: yes (config already uses `softwareKeyboardLayoutMode: "resize"`).
- Reusable input: yes (`NumericMeasurementInput` stays reusable; any input can use `useKeyboardAccessory()` and register content).
- No fragile bottom offsets: yes (keyboard position comes from the library).
- Production-safe: single host, clear lifecycle (register → update → clear), no Modal or manual offset hacks.
