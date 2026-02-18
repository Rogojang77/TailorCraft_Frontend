/**
 * Measurement and field type definitions.
 * Prepares structure for calculated fields, custom units, and localization.
 */

/** Input type for a single measurement/option field. */
export type MeasurementInputType =
  | 'text'
  | 'number'
  | 'select'
  | 'multiline'
  | 'calculated';

/**
 * Frontend convention for measurement values.
 * - number: numeric fields; use number | undefined.
 * - string: text/select/multiline.
 * - undefined: missing or invalid numeric.
 * Calculated fields produce number | undefined only; never persisted.
 */
export type MeasurementValue = number | string | undefined;

/** Identifier for a unit in the unit registry (e.g. 'cm', 'inch', 'custom_1'). */
export type UnitKey = string;

/** Identifier for a translation key (e.g. 'garments.jacket.shoulderWidth'). Use string to avoid coupling to i18n. */
export type LabelKey = string;

/**
 * Definition for a calculated field.
 * Value is derived from other fields via formula; not user-editable.
 */
export interface CalculatedFieldDefinition {
  /** Unique key for the calculated value in the snapshot. */
  key: string;
  /** Translation key or fallback label for display. */
  labelKey: LabelKey;
  /** Display order (lower = first). */
  displayOrder: number;
  /** Unit key from registry, or undefined for dimensionless. */
  unitKey?: UnitKey;
  /**
   * Formula expression. Syntax TBD (e.g. "a + b", "round(chest / 2)").
   * Evaluator will be implemented later.
   */
  formula: string;
  /** Keys of fields this calculation depends on. */
  dependsOn: string[];
}

/**
 * Unit definition for display and optional conversion.
 * Registry will be used to resolve unitKey -> symbol/label and conversion.
 */
export interface UnitDefinition {
  /** Unique id used in config (e.g. 'cm', 'inch'). */
  id: UnitKey;
  /** Symbol for display (e.g. 'cm', '"'). */
  symbol: string;
  /** Optional translation key for full label (e.g. 'units.centimetres'). */
  labelKey?: LabelKey;
  /** Optional: factor to convert to base unit for storage/calculations. */
  conversionFactorToBase?: number;
}
