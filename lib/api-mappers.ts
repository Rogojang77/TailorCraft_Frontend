/**
 * Map backend API types to UI component shapes.
 */

const ORDER_STATUS_MAP: Record<string, string> = {
  PENDING: 'În așteptare',
  IN_PROGRESS: 'În lucru',
  COMPLETED: 'Finalizat',
  DELIVERED: 'Livrat',
  CANCELLED: 'Anulat',
};

import { humanizeGarmentId } from '@/utils';
import type { GarmentTypeRecord, MeasurementDefinitionRecord } from '@/types/templates';
import type { MeasurementDefinition } from '@/constants/garments';

export function orderStatusToLabel(status: string): string {
  return ORDER_STATUS_MAP[status] ?? status;
}

/** Convert status label back to status code. */
export function orderStatusFromLabel(label: string): string {
  const reverseMap: Record<string, string> = {
    'În așteptare': 'PENDING',
    'În lucru': 'IN_PROGRESS',
    'Finalizat': 'COMPLETED',
    'Livrat': 'DELIVERED',
    'Anulat': 'CANCELLED',
  };
  return reverseMap[label] ?? label;
}

/** Get all available order statuses with labels. */
export function getAllOrderStatuses(): Array<{ code: string; label: string }> {
  return [
    { code: 'PENDING', label: 'În așteptare' },
    { code: 'IN_PROGRESS', label: 'În lucru' },
    { code: 'COMPLETED', label: 'Finalizat' },
    { code: 'DELIVERED', label: 'Livrat' },
    { code: 'CANCELLED', label: 'Anulat' },
  ];
}

/** Derive items label from order measurements — snapshot-only, no config. */
export function orderItemsFromMeasurements(measurements: Record<string, unknown> | null): string[] {
  if (!measurements || typeof measurements !== 'object') return ['Comandă'];
  const items: string[] = [];
  for (const garmentId of Object.keys(measurements)) {
    items.push(humanizeGarmentId(garmentId));
  }
  return items.length > 0 ? items : ['Comandă'];
}

/** Format date as YYYY-MM-DD for display. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return '—';
  }
}

export function customerFullName(firstName: string, lastName: string): string {
  return [firstName, lastName].filter(Boolean).join(' ') || '—';
}

/**
 * Resolve garment type id from POST /api/garment-types response.
 * Handles flat { id } or nested { garmentType: { id } } / { garment: { id } }.
 */
export function getGarmentTypeIdFromPostResponse(res: unknown): string | undefined {
  if (!res || typeof res !== 'object' || Array.isArray(res)) return undefined;
  const r = res as Record<string, unknown>;
  const flat = r as { id?: string };
  if (typeof flat.id === 'string') return flat.id;
  const nested = (r.garmentType ?? r.garment) as { id?: string } | undefined;
  return nested && typeof nested.id === 'string' ? nested.id : undefined;
}

/** Garment type shape as returned by API (may use enabled/isShared instead of status/source). */
export interface GarmentTypeApiRaw {
  id: string;
  name: string;
  label?: string | null;
  description?: string | null;
  enabled?: boolean;
  isShared?: boolean;
  status?: 'active' | 'disabled';
  source?: 'local' | 'shared' | 'api';
  tailorId?: string;
  code?: string | null;
  sortOrder?: number;
  orderCount?: number;
  templateId?: string;
  sharedFromUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Unwrap single garment-type API response.
 * Handles flat { id, name, ... } or nested { data: {...} } / { garmentType: {...} } / { garment: {...} }.
 */
function unwrapGarmentTypeResponse(
  raw: unknown
): GarmentTypeApiRaw | GarmentTypeRecord {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    if (typeof r.name === 'string' && typeof r.id === 'string') {
      return r as unknown as GarmentTypeApiRaw;
    }
    const nested = (r.data ?? r.garmentType ?? r.garment) as Record<string, unknown> | undefined;
    if (nested && typeof nested.name === 'string' && typeof nested.id === 'string') {
      return nested as unknown as GarmentTypeApiRaw;
    }
  }
  return raw as GarmentTypeApiRaw;
}

/**
 * Normalize API garment type to GarmentTypeRecord.
 * Backend may return enabled (boolean) and isShared (boolean); we use status and source in the UI.
 * Accepts wrapped single-item responses (e.g. { data: {...} } or { garmentType: {...} }).
 */
export function normalizeGarmentTypeRecord(raw: GarmentTypeApiRaw | GarmentTypeRecord | unknown): GarmentTypeRecord {
  const unwrapped = unwrapGarmentTypeResponse(raw);
  const status =
    unwrapped.status != null
      ? unwrapped.status
      : typeof (unwrapped as GarmentTypeApiRaw).enabled === 'boolean'
        ? (unwrapped as GarmentTypeApiRaw).enabled
          ? 'active'
          : 'disabled'
        : 'active';
  const source =
    unwrapped.source != null
      ? unwrapped.source
      : (unwrapped as GarmentTypeApiRaw).isShared === true
        ? 'shared'
        : 'local';
  return {
    id: unwrapped.id,
    name: unwrapped.name,
    label: unwrapped.label,
    description: unwrapped.description,
    status,
    source,
    templateId: unwrapped.templateId,
    sharedFromUserId: unwrapped.sharedFromUserId,
    orderCount: unwrapped.orderCount,
    createdAt: unwrapped.createdAt,
    updatedAt: unwrapped.updatedAt,
  };
}

/**
 * Map API measurement definition record to form definition used by MeasurementForm.
 */
export function definitionRecordToFormDefinition(
  rec: MeasurementDefinitionRecord & { order?: number }
): MeasurementDefinition {
  return {
    key: rec.key,
    label: rec.label,
    inputType: rec.inputType as MeasurementDefinition['inputType'],
    displayOrder: rec.displayOrder ?? rec.order ?? 0,
    unit: rec.unit ?? undefined,
    unitKey: rec.unitKey ?? undefined,
    placeholder: rec.placeholder ?? undefined,
    options: rec.options ?? undefined,
    defaultValue: rec.defaultValue ?? undefined,
    required: rec.required ?? false,
    formula: rec.formula ?? undefined,
    dependsOn: rec.dependsOn ?? undefined,
  };
}
