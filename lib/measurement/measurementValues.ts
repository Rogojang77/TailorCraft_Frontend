/**
 * Measurement value guards and utilities.
 * Use at entry points (onChange, load from storage) to enforce MeasurementValue types.
 * Do not coerce on save; storage serialization only.
 */

import type { MeasurementInputType, MeasurementValue } from '@/types/measurement';

/** Relaxed pattern: optional leading +/-, digits, at most one decimal (comma or dot). Accepts "", "-", "+", "5", "5.", "12,3", etc. */
const RELAXED_NUMBER_INPUT = /^[+-]?\d*[.,]?\d*$/;

function isRelaxedNumberString(s: string): boolean {
  return RELAXED_NUMBER_INPUT.test(s);
}

/** Normalize decimal separator to dot for Number() parsing. */
function toDotDecimal(s: string): string {
  return s.replace(',', '.');
}

/** Normalize decimal separator to comma for display. */
function toCommaDecimal(s: string): string {
  return s.replace('.', ',');
}

/** Numeric input → number or undefined. Invalid / empty → undefined. Accepts comma as decimal separator. */
export function toNumericMeasurementValue(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const s = typeof v === 'string' ? v.trim() : String(v);
  if (s === '') return undefined;
  const n = Number(toDotDecimal(s));
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
 * For 'number': valid number → number; in-progress input like "-", "+", "5." → normalized string (no forced +/-).
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

      if (!trimmed) return undefined;

      if (!isRelaxedNumberString(trimmed)) return undefined;

      const n = Number(toDotDecimal(trimmed));
      const isIntermediate =
        trimmed === '+' ||
        trimmed === '-' ||
        trimmed.endsWith('.') ||
        trimmed.endsWith(',');
      if (isIntermediate) {
        return toCommaDecimal(trimmed);
      }
      // Preserve explicit leading "+" so the input can display it when user tapped the + button
      if (trimmed.startsWith('+') && Number.isFinite(n)) {
        return toCommaDecimal(trimmed);
      }
      if (Number.isFinite(n)) {
        return n;
      }
      return toCommaDecimal(trimmed);
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
 * For 'number': valid number → number; relaxed intermediate strings (e.g. "-", "5.") → normalized string.
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
      if (!isRelaxedNumberString(s)) return undefined;
      const n = Number(toDotDecimal(s));
      if (Number.isFinite(n)) return n;
      return toCommaDecimal(s);
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
 * undefined → '', number → string (no forced leading +), string → as-is.
 */
export function measurementValueToStorage(v: MeasurementValue): string {
  if (v === undefined) return '';
  if (typeof v === 'number') return String(v);
  return v;
}

/** Format for display (inputs, read-only). undefined / empty → ''. number/string → string. No forced leading +. Uses comma as decimal separator. Preserves spaces in text. */
export function formatMeasurementValueForDisplay(v: MeasurementValue): string {
  if (v === undefined) return '';
  if (typeof v === 'number') return toCommaDecimal(String(v));
  const s = String(v);
  if (s.trim() === '') return '';
  return toCommaDecimal(s);
}
