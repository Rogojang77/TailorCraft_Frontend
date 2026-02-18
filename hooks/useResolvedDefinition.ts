/**
 * Resolve measurement definition label and unit for display.
 * Uses i18n and unit registry when available; fallback to config values.
 */

import type { MeasurementDefinition } from '@/constants/garments';
import { getUnitDisplay } from '@/constants/units';

/** Resolve display label: t(labelKey) when labelKey set, else label. */
export function getDisplayLabel(
  def: MeasurementDefinition,
  t: (key: string) => string
): string {
  if (def.labelKey) return t(def.labelKey);
  return def.label;
}

/** Resolve display unit: registry when unitKey set, else unit. */
export function getDisplayUnit(def: MeasurementDefinition): string | undefined {
  if (def.unitKey) return getUnitDisplay(def.unitKey) ?? undefined;
  return def.unit;
}
