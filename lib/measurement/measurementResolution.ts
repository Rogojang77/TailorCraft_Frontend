/**
 * Single measurement resolution layer.
 * Produces displayLabel, displayValue, displayUnit, isCalculated from def + raw + calculated + optional displayUnitKey.
 */

import type { MeasurementDefinition } from '@/constants/garments';
import { getDisplayLabel, getDisplayUnit } from '@/lib/measurementDisplay';
import { formatValueForDisplay, areUnitsCompatible } from './unitConversion';
import { getUnitDisplay } from '@/constants/units';
import { formatMeasurementValueForDisplay } from './measurementValues';
import { isValidMeasurementKey } from './measurementDefensive';

export interface ResolveMeasurementInput {
  def: MeasurementDefinition;
  raw: string | number | undefined;
  calculated: Record<string, number | undefined>;
  displayUnitKey?: string;
  t: (key: string) => string;
}

export interface ResolveMeasurementResult {
  displayLabel: string;
  displayValue: string;
  displayUnit: string | undefined;
  isCalculated: boolean;
}

function isNumericRaw(v: string | number | undefined): boolean {
  if (v == null) return false;
  const s = typeof v === 'string' ? v.trim() : String(v);
  return /^-?\d*\.?\d+$/.test(s);
}

/**
 * Resolve definition + raw + calculated into display strings and flags.
 * Calculated and normal fields share the same pipeline; isCalculated is used only to disable input.
 * Uses getDisplayLabel, getDisplayUnit, formatValueForDisplay, and calculated map.
 */
export function resolveMeasurementDisplay(
  input: ResolveMeasurementInput
): ResolveMeasurementResult {
  const { def, raw, calculated, displayUnitKey, t } = input;
  if (!def || !isValidMeasurementKey(def.key)) {
    return {
      displayLabel: '',
      displayValue: '—',
      displayUnit: undefined,
      isCalculated: false,
    };
  }
  const displayLabel = getDisplayLabel(def, t);
  const displayUnit = getDisplayUnit(def);
  const unitKey = def.unitKey ?? def.unit ?? '';
  const isCalculated = def.inputType === 'calculated';

  const effectiveValue: string | number | undefined = isCalculated
    ? calculated[def.key]
    : raw;

  const canConvert =
    !!displayUnitKey &&
    !!unitKey &&
    areUnitsCompatible(unitKey, displayUnitKey) &&
    isNumericRaw(effectiveValue);

  const displayValue = canConvert
    ? formatValueForDisplay(effectiveValue as string | number, unitKey, {
        displayUnitKey,
        decimals: 2,
      })
    : formatMeasurementValueForDisplay(effectiveValue);

  const resolvedUnit = canConvert
    ? getUnitDisplay(displayUnitKey)
    : displayUnit;

  return {
    displayLabel,
    displayValue,
    displayUnit: resolvedUnit ?? undefined,
    isCalculated,
  };
}
