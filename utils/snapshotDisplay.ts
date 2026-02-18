/**
 * Snapshot display helpers: humanize garment IDs and measurement keys,
 * and expose measurement records as stable [key, value] entries for UI.
 */

import {
  GARMENT_TYPES,
  getGarmentDisplayName,
  getMeasurementDefinitions,
} from '@/constants/garments';

/** Human-readable display name for a garment by ID (from config or fallback to id). */
export function humanizeGarmentId(garmentId: string): string {
  return getGarmentDisplayName(garmentId);
}

/** Lazy-built map of measurement key → label from all garment definitions (first occurrence wins). */
let snapshotKeyToLabel: Map<string, string> | null = null;

function getSnapshotKeyLabels(): Map<string, string> {
  if (snapshotKeyToLabel) return snapshotKeyToLabel;
  const map = new Map<string, string>();
  for (const garment of GARMENT_TYPES) {
    const defs = getMeasurementDefinitions(garment);
    for (const d of defs) {
      if (d.key && !map.has(d.key)) map.set(d.key, d.label);
    }
  }
  snapshotKeyToLabel = map;
  return map;
}

/** Fallback: camelCase/snake_case key to Title Case. */
function fallbackHumanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

/** Human-readable label for a measurement snapshot key (from config or fallback). */
export function humanizeSnapshotKey(key: string): string {
  const label = getSnapshotKeyLabels().get(key);
  return label ?? fallbackHumanizeKey(key);
}

/** Stable [key, value] entries from a measurements record, sorted by key. */
export function getSnapshotEntries(
  measurements: Record<string, string>
): [string, string][] {
  if (!measurements || typeof measurements !== 'object')
    return [];
  const entries = Object.entries(measurements).filter(
    ([, value]) => value != null && String(value).trim() !== ''
  );
  entries.sort(([a], [b]) => a.localeCompare(b));
  return entries;
}

/** Definition-like shape for ordering and label resolution. */
export type SnapshotDefinitionRef = { key: string; label?: string; displayOrder: number };

/**
 * Entries from measurements in definition order (preserves displayOrder and shows API labels with diacritics).
 * Definitions should already be sorted by displayOrder. Keys not in definitions are appended at the end.
 */
export function getSnapshotEntriesInDefinitionOrder(
  measurements: Record<string, unknown>,
  definitions: SnapshotDefinitionRef[]
): [string, string][] {
  if (!measurements || typeof measurements !== 'object') return [];
  const seen = new Set<string>();
  const result: [string, string][] = [];
  for (const def of definitions) {
    if (!def?.key) continue;
    const raw = measurements[def.key];
    if (raw != null && String(raw).trim() !== '') {
      result.push([def.key, String(raw).trim()]);
      seen.add(def.key);
    }
  }
  for (const [key, value] of Object.entries(measurements)) {
    if (value != null && String(value).trim() !== '' && !seen.has(key)) {
      result.push([key, String(value).trim()]);
    }
  }
  return result;
}

/** Display label for a measurement: use definition label (with diacritics) when available, else humanized key. */
export function getSnapshotDisplayLabel(key: string, def?: SnapshotDefinitionRef | null): string {
  if (def?.label != null && def.label.trim() !== '') return def.label.trim();
  return humanizeSnapshotKey(key);
}
