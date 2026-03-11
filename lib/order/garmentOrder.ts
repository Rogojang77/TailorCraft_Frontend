/**
 * Garment display order helpers.
 * Order is defined on the Garments screen (sortOrder) and must be used
 * everywhere: new order form, order summary, order details, PDFs.
 */

export interface GarmentWithOrder {
  id: string;
  sortOrder?: number;
}

/**
 * Sort garment type records by sortOrder (ascending).
 * Use after fetching from API if the consumer needs a stable order.
 */
export function sortGarmentTypesByOrder<T extends GarmentWithOrder>(list: T[]): T[] {
  return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/**
 * Sort a list of garment IDs by the order defined in garment types (e.g. from Garments screen).
 * IDs not present in the list get a high sortOrder so they appear at the end.
 */
export function sortGarmentIdsByOrder(
  ids: string[],
  garmentTypes: GarmentWithOrder[]
): string[] {
  const orderMap = new Map(garmentTypes.map((g) => [g.id, g.sortOrder ?? 9999]));
  return [...ids].sort((a, b) => (orderMap.get(a) ?? 9999) - (orderMap.get(b) ?? 9999));
}
