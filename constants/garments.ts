/**
 * Garment Configuration System
 * Defines all garment types, their fields, options, and display properties.
 * No measurement field names appear in application code; all come from configuration.
 */

import type { GarmentTemplateMeta } from '@/types/templates';

/** Input type for a single measurement/option field. */
export type MeasurementInputType = 'text' | 'number' | 'select' | 'multiline' | 'calculated';

/** Source for select options: explicit list or numeric range (e.g. size). */
export interface SizeRangeOption {
  min: number;
  max: number;
  step: number;
}

/**
 * Single definition for a measurement or style field.
 * Used by MeasurementForm to render inputs; ordering and metadata come from here.
 * Optional labelKey/unitKey prepare for localization and custom units; formula/dependsOn for calculated fields.
 */
export interface MeasurementDefinition {
  key: string;
  /** Fallback when labelKey is not used or translation missing. */
  label: string;
  inputType: MeasurementInputType;
  /** Display order (lower = first). */
  displayOrder: number;
  /** Unit suffix, e.g. 'cm'. Used when unitKey not set. */
  unit?: string;
  /** Optional: resolve via unit registry for custom units. */
  unitKey?: string;
  /** Optional: i18n key for label; when set, UI should use t(labelKey) with fallback to label. */
  labelKey?: string;
  placeholder?: string;
  options?: string[];
  sizeRange?: SizeRangeOption;
  defaultValue?: string;
  required?: boolean;
  multiline?: boolean;
  /** Optional: for inputType 'calculated'. Formula expression; evaluator TBD. */
  formula?: string;
  /** Optional: keys of fields this calculated value depends on. */
  dependsOn?: string[];
}

/** Legacy shape for backward compatibility with existing config. */
export interface MeasurementField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multiselect';
  placeholder?: string;
  unit?: string;
  options?: string[];
  defaultValue?: string;
  required?: boolean;
  displayOrder?: number;
}

export interface StyleOption {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'text';
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
  displayOrder?: number;
}

/** Common field definition (label, inputType, etc.) so no field names live in app code. */
export interface CommonFieldDefinition {
  key: string;
  label: string;
  inputType: MeasurementInputType;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  displayOrderOffset?: number; // Added to base (1000) for ordering
}

export interface GarmentType {
  id: string;
  name: string;
  route: string;
  icon?: string;
  measurementFields: MeasurementField[];
  styleOptions: StyleOption[];
  sizeOptions?: SizeRangeOption;
  commonFieldDefinitions?: CommonFieldDefinition[];
  commonFields?: string[];
  summaryKeys?: string[];
  /** Optional: for template sharing; when set, template is from API or shared. */
  templateMeta?: GarmentTemplateMeta;
}

// Garment Type Configurations
export const GARMENT_TYPES: GarmentType[] = [
  {
    id: 'jacket',
    name: 'Sacou',
    route: 'jacket',
    icon: 'shirt',
    sizeOptions: {
      min: 44,
      max: 60,
      step: 2,
    },
    measurementFields: [
      {
        key: 'chest',
        label: 'Bust',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'waist',
        label: 'Talie',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'hips',
        label: 'Șold',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'frontLength',
        label: 'Lungime Față',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'backLength',
        label: 'Lungime Spate',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'shoulderToShoulder',
        label: 'Din Umăr în Umăr',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'sleeveLength',
        label: 'Lungime Mânecă',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'backWidth',
        label: 'Lățime Spate',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'size',
        label: 'Mărime',
        type: 'select',
        defaultValue: '50',
      },
    ],
    styleOptions: [
      {
        key: 'lapelType',
        label: 'Tip Rever',
        type: 'select',
        options: ['Classic', 'Ascuțit', 'Șal'],
        defaultValue: 'Classic',
      },
      {
        key: 'model',
        label: 'Model',
        type: 'select',
        options: ['2 rânduri', '2 nasturi', '1 nasture', 'Redingotă'],
        defaultValue: '2 nasturi',
      },
      {
        key: 'slit',
        label: 'Fante',
        type: 'select',
        options: ['1', '2'],
        defaultValue: '1',
      },
      {
        key: 'pockets',
        label: 'Buzunare',
        type: 'select',
        options: ['cu clapa', 'fără', 'aplicate', 'interior'],
        defaultValue: 'cu clapa',
      },
      {
        key: 'lining',
        label: 'Căptușeală',
        type: 'select',
        options: ['captușit', 'semi'],
        defaultValue: 'captușit',
      },
      {
        key: 'buttonholes',
        label: 'Butoniere',
        type: 'select',
        options: ['3'],
        defaultValue: '3',
      },
      {
        key: 'buttons',
        label: 'Nasturi',
        type: 'text',
        placeholder: 'Descriere nasturi',
        options: [],
      },
    ],
    commonFields: ['materialCode', 'observations'],
    commonFieldDefinitions: [
      { key: 'materialCode', label: 'Cod Material', inputType: 'text', placeholder: 'Ex: WOL-001-BLK', required: false, displayOrderOffset: 0 },
      { key: 'observations', label: 'Observații', inputType: 'multiline', placeholder: 'Adăugați observații speciale...', required: false, multiline: true, displayOrderOffset: 1 },
    ],
    summaryKeys: ['size', 'model'],
    templateMeta: { templateId: 'tmpl-jacket-1', source: 'shared' },
  },
  {
    id: 'vest',
    name: 'Vestă',
    route: 'vest',
    icon: 'package',
    measurementFields: [
      {
        key: 'chest',
        label: 'Bust',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'waist',
        label: 'Talie',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'hips',
        label: 'Șold',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'frontLength',
        label: 'Lungime Față',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'backLength',
        label: 'Lungime Spate',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
    ],
    styleOptions: [
      {
        key: 'model',
        label: 'Model',
        type: 'select',
        options: ['5 nasturi cu rever', '5 nasturi fără rever', 'Rever șal', 'Rever ascuțit'],
        defaultValue: '5 nasturi cu rever',
      },
      {
        key: 'lining',
        label: 'Căptușeală',
        type: 'select',
        options: ['captușit', 'semi'],
        defaultValue: 'captușit',
      },
      {
        key: 'buttons',
        label: 'Nasturi',
        type: 'text',
        placeholder: 'Descriere nasturi',
        options: [],
      },
    ],
    commonFields: ['materialCode', 'observations'],
    commonFieldDefinitions: [
      { key: 'materialCode', label: 'Cod Material', inputType: 'text', placeholder: 'Ex: WOL-001-BLK', required: false, displayOrderOffset: 0 },
      { key: 'observations', label: 'Observații', inputType: 'multiline', placeholder: 'Adăugați observații speciale...', required: false, multiline: true, displayOrderOffset: 1 },
    ],
    summaryKeys: ['model'],
  },
  {
    id: 'pants',
    name: 'Pantaloni',
    route: 'pants',
    icon: 'contact',
    sizeOptions: {
      min: 42,
      max: 60,
      step: 2,
    },
    measurementFields: [
      {
        key: 'size',
        label: 'Mărime',
        type: 'select',
        defaultValue: '50',
      },
      {
        key: 'waist',
        label: 'Talie',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'hips',
        label: 'Șold',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'upperLeg',
        label: 'Picior Sus',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'knee',
        label: 'Genunchi',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'hem',
        label: 'Tiv',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'frontCircumference',
        label: 'Tur Față',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'backCircumference',
        label: 'Tur Spate',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'interiorLength',
        label: 'Lungime Interioară',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
      {
        key: 'exteriorLength',
        label: 'Lungime Exterioară',
        type: 'number',
        unit: 'cm',
        placeholder: 'cm',
      },
    ],
    styleOptions: [
      {
        key: 'model',
        label: 'Model',
        type: 'select',
        options: ['Clasic', 'fără găici', '2 pense', 'betelie înaltă', 'Gurkha'],
        defaultValue: 'Clasic',
      },
    ],
    commonFields: ['materialCode', 'observations'],
    commonFieldDefinitions: [
      { key: 'materialCode', label: 'Cod Material', inputType: 'text', placeholder: 'Ex: WOL-001-BLK', required: false, displayOrderOffset: 0 },
      { key: 'observations', label: 'Observații', inputType: 'multiline', placeholder: 'Adăugați observații speciale...', required: false, multiline: true, displayOrderOffset: 1 },
    ],
    summaryKeys: ['size', 'model'],
    templateMeta: { templateId: 'tmpl-pants-1', source: 'api' },
  },
];

// Helper functions
export function getGarmentTypeById(id: string): GarmentType | undefined {
  return GARMENT_TYPES.find((g) => g.id === id);
}

export function getGarmentTypeByRoute(route: string): GarmentType | undefined {
  return GARMENT_TYPES.find((g) => g.route === route);
}

export function getAllGarmentIds(): string[] {
  return GARMENT_TYPES.map((g) => g.id);
}

export function getGarmentDisplayName(id: string): string {
  const garment = getGarmentTypeById(id);
  return garment?.name || id;
}

// Generate size options array from range
export function generateSizeOptions(garment: GarmentType): string[] {
  if (!garment.sizeOptions) return [];
  const { min, max, step } = garment.sizeOptions;
  const sizes: string[] = [];
  for (let i = min; i <= max; i += step) {
    sizes.push(i.toString());
  }
  return sizes;
}

/** Build options array from a size range. */
export function optionsFromSizeRange(range: SizeRangeOption): string[] {
  const out: string[] = [];
  for (let i = range.min; i <= range.max; i += range.step) {
    out.push(String(i));
  }
  return out;
}

/**
 * Build a single ordered list of MeasurementDefinitions for a garment.
 * Used by MeasurementForm; ordering is by displayOrder (derived from section + index when not set).
 * No measurement field names appear here; all keys/labels come from configuration.
 */
export function getMeasurementDefinitions(garment: GarmentType): MeasurementDefinition[] {
  const list: MeasurementDefinition[] = [];
  let order = 0;

  garment.measurementFields.forEach((f, i) => {
    const displayOrder = f.displayOrder ?? order++;
    const inputType: MeasurementInputType = f.type === 'multiselect' ? 'select' : f.type as MeasurementInputType;
    list.push({
      key: f.key,
      label: f.label,
      inputType,
      displayOrder,
      unit: f.unit,
      placeholder: f.placeholder,
      options: f.options,
      sizeRange: garment.sizeOptions && f.type === 'select' ? garment.sizeOptions : undefined,
      defaultValue: f.defaultValue,
      required: f.required,
    });
  });

  garment.styleOptions.forEach((o, i) => {
    const displayOrder = o.displayOrder ?? 500 + i;
    const inputType: MeasurementInputType = o.type === 'multiselect' ? 'select' : o.type as MeasurementInputType;
    list.push({
      key: o.key,
      label: o.label,
      inputType,
      displayOrder,
      placeholder: o.placeholder,
      options: o.options,
      defaultValue: o.defaultValue,
    });
  });

  if (garment.commonFieldDefinitions && garment.commonFieldDefinitions.length > 0) {
    garment.commonFieldDefinitions.forEach((def, i) => {
      const { displayOrderOffset, ...rest } = def;
      list.push({
        ...rest,
        displayOrder: 1000 + (displayOrderOffset ?? i),
      });
    });
  } else if (garment.commonFields?.length) {
    garment.commonFields.forEach((key, i) => {
      list.push({
        key,
        label: key,
        inputType: 'text',
        displayOrder: 1000 + i,
        required: false,
      });
    });
  }

  list.sort((a, b) => a.displayOrder - b.displayOrder);
  return list;
}

/**
 * Format a one-line summary for a garment from key-value measurements.
 * Uses only definitions and config (summaryKeys); no field names in application code.
 */
function hasValidKey(d: { key?: unknown }): boolean {
  return typeof d?.key === 'string' && d.key.length > 0;
}

export function formatGarmentSummaryLine(
  garmentId: string,
  measurements: Record<string, string>
): string {
  const garment = getGarmentTypeById(garmentId);
  if (!garment) return garmentId;
  const m = measurements ?? {};
  const allDefs = getMeasurementDefinitions(garment);
  const definitions = allDefs.filter(hasValidKey);
  const labelByKey = new Map(definitions.map((d) => [d.key, d.label]));
  const keysToShow = garment.summaryKeys && garment.summaryKeys.length > 0
    ? garment.summaryKeys.filter((k) => typeof k === 'string' && k.length > 0)
    : definitions.map((d) => d.key);
  const parts: string[] = [garment.name];
  for (const key of keysToShow) {
    const value = m[key];
    if (value != null && String(value).trim() !== '') {
      parts.push(`${labelByKey.get(key) ?? key}: ${value}`);
    }
  }
  return parts.length > 1 ? parts.join(', ') : parts[0];
}
