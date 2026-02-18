/**
 * Client measurements helpers.
 * Latest measurements are derived from the customer's past orders (most recent order
 * that contains measurements for the given garment). Used to prefill and show
 * "client's latest" vs "order snapshot" in the garment form.
 */

import { apiFetch } from './api';
import { api } from './api';

export type GarmentMeasurementsSnapshot = Record<string, string>;

function stringifyValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  return String(v);
}

/**
 * Fetches the customer's orders and returns the latest measurements for the given
 * garment from the most recent order that has measurements for that garment.
 * Returns empty object if no orders or no measurements for this garment.
 */
export async function getLatestClientMeasurements(
  customerId: string,
  garmentId: string
): Promise<GarmentMeasurementsSnapshot> {
  const res = await apiFetch<{
    orders: Array<{
      orderDate: string;
      measurements: Record<string, Record<string, unknown>> | null;
    }>;
  }>(api.customerOrders(customerId));

  const orders = res?.orders ?? [];
  const sorted = [...orders].sort(
    (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
  );

  for (const order of sorted) {
    const measurements = order.measurements ?? {};
    const garment = measurements[garmentId];
    if (garment && typeof garment === 'object' && Object.keys(garment).length > 0) {
      return Object.fromEntries(
        Object.entries(garment).map(([k, v]) => [k, stringifyValue(v)])
      );
    }
  }

  return {};
}
