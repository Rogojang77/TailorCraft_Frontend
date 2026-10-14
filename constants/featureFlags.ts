/**
 * Lightweight runtime feature toggles for gradual rollout.
 * Keep defaults true for MVP delivery; can be wired to remote config later.
 */
export const FEATURE_FLAGS = {
  calendarEnabled: true,
  sketchCanvasEnabled: true,
  aiParametricAvatarEnabled: true,
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;
