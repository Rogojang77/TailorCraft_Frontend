/**
 * Shared modal open/close animation preset.
 * 2026 UX standards: no bounce, smooth transitions.
 * - Opacity fade: 120ms
 * - Slide-up: 160ms
 * - No bounce or overshoot
 */

import { Easing, FadeOut, withTiming } from 'react-native-reanimated';

const DURATION_OPACITY_MS = 120; // Opacity fade: 120ms
const DURATION_SLIDE_MS = 160; // Slide-up: 160ms
const DURATION_CLOSE_MS = 120;

/** Gentle ease-out with no overshoot. */
const MODAL_EASING = Easing.out(Easing.quad);

/**
 * Standard modal entering: slide-up + opacity, no bounce.
 * Opacity fade: 120ms, Slide-up: 160ms
 * Use for all modal content (PaywallModal, DeleteConfirmModal, MeasurementDefinitionEditorModal).
 */
export const modalEntering = () => {
  'worklet';
  const animations = {
    opacity: withTiming(1, {
      duration: DURATION_OPACITY_MS, // 120ms
      easing: MODAL_EASING,
    }),
    transform: [
      {
        translateY: withTiming(0, {
          duration: DURATION_SLIDE_MS, // 160ms
          easing: MODAL_EASING,
        }),
      },
    ],
  };
  const initialValues = {
    opacity: 0,
    transform: [{ translateY: 20 }], // Slide up from 20px below
  };
  return { initialValues, animations };
};

/**
 * Reduced-motion variant: opacity only, no slide.
 * Use when AccessibilityInfo indicates reduced motion is preferred.
 */
export const modalEnteringReducedMotion = () => {
  'worklet';
  const animations = {
    opacity: withTiming(1, {
      duration: DURATION_OPACITY_MS, // 120ms
      easing: MODAL_EASING,
    }),
  };
  const initialValues = {
    opacity: 0,
  };
  return { initialValues, animations };
};

/** Standard modal exiting: fade only, short duration. */
export const modalExiting = FadeOut.duration(DURATION_CLOSE_MS);

/** Duration in ms for opacity fade. */
export const MODAL_ANIMATION_DURATION_OPACITY = DURATION_OPACITY_MS;
/** Duration in ms for slide-up. */
export const MODAL_ANIMATION_DURATION_SLIDE = DURATION_SLIDE_MS;
/** Duration in ms for close. */
export const MODAL_ANIMATION_DURATION_CLOSE = DURATION_CLOSE_MS;

/** Duration in ms for RN Animated open (scale + fade). Use with Animated API. */
export const MODAL_ANIMATION_DURATION_OPEN = 200;

/** Initial scale for scale-up modal (RN Animated). 0.95 = subtle zoom-in. */
export const MODAL_INITIAL_SCALE = 0.95;
