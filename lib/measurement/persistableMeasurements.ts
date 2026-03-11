/**
 * Persistence boundary for measurement values.
 *
 * This is the only allowed path for persisting measurements.
 * Use buildPersistableMeasurements(definitions, formValues) before saving to draft or API.
 */

import type { MeasurementDefinition } from '@/constants/garments';
import { getCalculatedKeys } from './calculatedFields';
import { filterDefinitionsWithValidKey } from './measurementDefensive';
import { measurementValueToStorage } from './measurementValues';
import type { MeasurementValue } from '@/types/measurement';

/**
 * Build a clean key → value map safe to persist.
 * - Removes calculated keys (never persisted).
 * - Removes unknown keys (not in definitions).
 * Fails silently by omission; no runtime errors.
 */
export function buildPersistableMeasurements(
  definitions: MeasurementDefinition[],
  formValues: Record<string, MeasurementValue>
): Record<string, string> {
  const valid = filterDefinitionsWithValidKey(definitions ?? []);
  const calculated = getCalculatedKeys(valid);
  const known = new Set(valid.map((d) => d.key));
  const out: Record<string, string> = {};
  const vals = formValues ?? {};

  for (const k of Object.keys(vals)) {
    if (calculated.has(k)) continue;
    if (!known.has(k)) continue;
    out[k] = measurementValueToStorage(vals[k]);
  }

  return out;
}
