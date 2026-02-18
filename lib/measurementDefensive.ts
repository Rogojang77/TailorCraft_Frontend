/**
 * Defensive helpers for definition drift.
 * Ignore values without matching definitions; avoid crashes from mismatched or missing keys.
 * Silent resilience only; no user-facing errors.
 */

/** True if k is a non-empty string (valid measurement key). */
export function isValidMeasurementKey(k: unknown): k is string {
  return typeof k === 'string' && k.length > 0;
}

/** Filter definitions to those with a valid key. Use before iterating defs. */
export function filterDefinitionsWithValidKey<T extends { key?: unknown }>(
  defs: T[]
): T[] {
  if (!Array.isArray(defs)) return [];
  return defs.filter((d) => isValidMeasurementKey(d?.key));
}

/** Safe displayOrder for sorting; missing treated as 0. */
export function safeDisplayOrder(d: { displayOrder?: unknown }): number {
  const n = d?.displayOrder;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}
