/**
 * Measurement value guards and utilities.
 * Use at entry points (onChange, load from storage) to enforce MeasurementValue types.
 * Do not coerce on save; storage serialization only.
 */

import type { MeasurementInputType, MeasurementValue } from '@/types/measurement';

/** Allowed while typing: optional leading +/-, digits, optional decimal; or digits + trailing +/-. Enables "+", "-", "5+", "+5", "5.", etc. */
const ALLOWED_NUMBER_INPUT = /^([+\-]?\d*\.?\d*|\d+\.?\d*[+\-])$/;

function isAllowedIntermediateNumberString(s: string): boolean {
  return ALLOWED_NUMBER_INPUT.test(s);
}

/** Numeric input → number or undefined. Invalid / empty → undefined. */
export function toNumericMeasurementValue(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const s = typeof v === 'string' ? v.trim() : String(v);
  if (s === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** Text/select/multiline → string. */
export function toTextMeasurementValue(v: unknown): string {
  if (v == null) return '';
  return typeof v === 'string' ? v : String(v);
}

/**
 * Normalize raw input to MeasurementValue by input type.
 * Use in onChange handlers. Skip 'calculated' (caller must not persist).
 * For 'number': valid number → number; intermediate input like "-", "+", "5." → keep as string so the field is not cleared.
 */
export function normalizeMeasurementValue(
  raw: unknown,
  inputType: MeasurementInputType
): MeasurementValue {
  switch (inputType) {
    case 'number': {
      if (raw == null) return undefined;
      const s = typeof raw === 'string' ? raw : String(raw);
      const trimmed = s.trim();
      const n = Number(trimmed);
      if (Number.isFinite(n)) {
        // Keep leading "+" so "+5" displays as "+5" instead of "5"
        if (trimmed.startsWith('+') && trimmed.length > 1) return trimmed;
        return n;
      }
      if (isAllowedIntermediateNumberString(trimmed)) return trimmed;
      return undefined;
    }
    case 'text':
    case 'select':
    case 'multiline':
      return toTextMeasurementValue(raw);
    case 'calculated':
      return undefined;
    default:
      return toTextMeasurementValue(raw);
  }
}

/**
 * Parse stored string (from backend/draft) into MeasurementValue.
 * Use when loading form state from persistence.
 * For 'number': valid number → number; allowed intermediate strings (e.g. "-", "5.") → keep as string.
 */
export function storageToMeasurementValue(
  raw: unknown,
  inputType: MeasurementInputType
): MeasurementValue {
  switch (inputType) {
    case 'number': {
      if (raw == null || raw === '') return undefined;
      const s = typeof raw === 'string' ? raw.trim() : String(raw).trim();
      if (s === '') return undefined;
      const n = Number(s);
      if (Number.isFinite(n)) {
        if (s.startsWith('+') && s.length > 1) return s;
        return n;
      }
      if (isAllowedIntermediateNumberString(s)) return s;
      return undefined;
    }
    case 'text':
    case 'select':
    case 'multiline':
      return toTextMeasurementValue(raw);
    case 'calculated':
      return undefined;
    default:
      return toTextMeasurementValue(raw);
  }
}

/**
 * Serialize MeasurementValue for storage (draft/API).
 * No coercion; number → String(n), string → as-is, undefined → ''.
 */
export function measurementValueToStorage(v: MeasurementValue): string {
  if (v === undefined) return '';
  if (typeof v === 'number') return String(v);
  return v;
}

/** Format for display (inputs, read-only). undefined / empty → ''. number/string → string. */
export function formatMeasurementValueForDisplay(v: MeasurementValue): string {
  if (v === undefined) return '';
  if (typeof v === 'number') return String(v);
  return String(v);
}
