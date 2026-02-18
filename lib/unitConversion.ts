/**
 * Optional unit conversion for display and derived calculations only.
 *
 * - Converts between compatible units using conversionFactorToBase (see UNIT_REGISTRY).
 * - Used ONLY for display or derived calculations; never mutates stored values.
 * - Stored values remain exactly as entered; no automatic conversion on save.
 * - Mixed units across garments are allowed (each field has its own unit).
 *
 * Use convertValue / toBase / fromBase in derived calculations (e.g. formulas)
 * when converting dependencies to a common unit before computing. Use
 * formatValueForDisplay when rendering; pass displayUnitKey to convert for display.
 */

import { UNIT_REGISTRY } from '@/constants/units';

function getFactor(unitKey: string): number | undefined {
  if (!unitKey) return undefined;
  const def = UNIT_REGISTRY[unitKey];
  const f = def?.conversionFactorToBase;
  return typeof f === 'number' && Number.isFinite(f) && f > 0 ? f : undefined;
}

/**
 * Convert a numeric value from one unit to another.
 * Uses conversionFactorToBase: value_in_unit * factor = value_in_base.
 *
 * @returns Converted value, or undefined if conversion not possible (missing factor, same unit returns value as-is).
 */
export function convertValue(
  value: number,
  fromUnitKey: string,
  toUnitKey: string
): number | undefined {
  if (fromUnitKey === toUnitKey) return value;
  const fromF = getFactor(fromUnitKey);
  const toF = getFactor(toUnitKey);
  if (fromF === undefined || toF === undefined) return undefined;
  const base = value * fromF;
  return base / toF;
}

/**
 * Convert value in given unit to base unit (e.g. cm for length).
 * Returns undefined if unit has no conversionFactorToBase.
 */
export function toBase(value: number, unitKey: string): number | undefined {
  const f = getFactor(unitKey);
  return f === undefined ? undefined : value * f;
}

/**
 * Convert value from base unit to given unit.
 * Returns undefined if unit has no conversionFactorToBase.
 */
export function fromBase(baseValue: number, unitKey: string): number | undefined {
  const f = getFactor(unitKey);
  return f === undefined ? undefined : baseValue / f;
}

/**
 * Whether both units support conversion (have conversionFactorToBase).
 * Compatible units can be converted via convertValue.
 */
export function areUnitsCompatible(unitKeyA: string, unitKeyB: string): boolean {
  return getFactor(unitKeyA) !== undefined && getFactor(unitKeyB) !== undefined;
}

export interface FormatForDisplayOptions {
  /** Target unit for display. If not set, value is shown in source unit (no conversion). */
  displayUnitKey?: string;
  /** Max decimal places when formatting. Default 2. */
  decimals?: number;
}

/**
 * Format a stored value for display, optionally converting to another unit.
 * Use only for display; does not mutate any stored data.
 *
 * @param value - Stored value (as entered) in source unit.
 * @param unitKey - Unit of the stored value (field's unitKey or unit).
 * @param options - Optional display unit and decimal places.
 * @returns Formatted string for display, or original string if not numeric.
 */
export function formatValueForDisplay(
  value: string | number,
  unitKey: string | undefined,
  options?: FormatForDisplayOptions
): string {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value).trim());
  if (!Number.isFinite(parsed)) return typeof value === 'string' ? value : String(value);

  const key = unitKey ?? '';
  const decimals = options?.decimals ?? 2;
  const displayUnit = options?.displayUnitKey;

  let num = parsed;
  if (displayUnit && key && displayUnit !== key) {
    const converted = convertValue(parsed, key, displayUnit);
    if (converted !== undefined) num = converted;
  }

  const fixed = num.toFixed(decimals);
  return String(parseFloat(fixed));
}
