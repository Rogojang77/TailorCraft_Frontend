/**
 * Unit registry for measurement fields.
 * conversionFactorToBase: multiply value-in-unit by this to get value in base unit (cm).
 * Used only for optional display conversion; stored values are never auto-converted.
 */

import type { UnitDefinition } from '@/types/measurement';

/** Base unit for conversion (length). All compatible length units convert to this. */
export const BASE_UNIT_ID = 'cm';

/** Registry of unit id -> definition. Extend at runtime for custom units. */
export const UNIT_REGISTRY: Record<string, UnitDefinition> = {
  cm: {
    id: 'cm',
    symbol: 'cm',
    conversionFactorToBase: 1,
  },
  inch: {
    id: 'inch',
    symbol: '"',
    labelKey: 'units.inch',
    conversionFactorToBase: 2.54,
  },
  m: {
    id: 'm',
    symbol: 'm',
    conversionFactorToBase: 100,
  },
  mm: {
    id: 'mm',
    symbol: 'mm',
    conversionFactorToBase: 0.1,
  },
  ft: {
    id: 'ft',
    symbol: 'ft',
    conversionFactorToBase: 30.48,
  },
  yd: {
    id: 'yd',
    symbol: 'yd',
    conversionFactorToBase: 91.44,
  },
};

/**
 * Resolve unit key to display symbol (or pass-through if not in registry).
 * Use this when rendering labels so custom units can be added later.
 */
export function getUnitDisplay(unitKey: string | undefined): string | undefined {
  if (!unitKey) return undefined;
  const def = UNIT_REGISTRY[unitKey];
  return def ? def.symbol : unitKey;
}

/**
 * Register a custom unit. No-op if id already exists unless override.
 * For future: call when loading template or user preferences.
 */
export function registerUnit(definition: UnitDefinition, override = false): void {
  if (override || !UNIT_REGISTRY[definition.id]) {
    UNIT_REGISTRY[definition.id] = definition;
  }
}
