/**
 * Map backend API types to UI component shapes.
 */

const ORDER_STATUS_MAP: Record<string, string> = {
  PENDING: 'În așteptare',
  IN_PROGRESS: 'În lucru',
  COMPLETED: 'Finalizat',
  DELIVERED: 'Finalizat',
  CANCELLED: 'Anulat',
};

const MEASUREMENT_LABELS: Record<string, string> = {
  jacket: 'Sacou',
  vest: 'Vestă',
  pants: 'Pantaloni',
};

export function orderStatusToLabel(status: string): string {
  return ORDER_STATUS_MAP[status] ?? status;
}

/** Convert status label back to status code. */
export function orderStatusFromLabel(label: string): string {
  const reverseMap: Record<string, string> = {
    'În așteptare': 'PENDING',
    'În lucru': 'IN_PROGRESS',
    'Finalizat': 'COMPLETED',
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
    { code: 'DELIVERED', label: 'Finalizat' },
    { code: 'CANCELLED', label: 'Anulat' },
  ];
}

/** Derive items label from order measurements. */
export function orderItemsFromMeasurements(measurements: Record<string, unknown> | null): string[] {
  if (!measurements || typeof measurements !== 'object') return ['Comandă'];
  const keys = Object.keys(measurements).filter((k) => k === 'jacket' || k === 'vest' || k === 'pants');
  if (keys.length === 0) return ['Comandă'];
  return keys.map((k) => MEASUREMENT_LABELS[k] ?? k);
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
