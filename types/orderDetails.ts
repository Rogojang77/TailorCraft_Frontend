/**
 * Normalized order data shape used by the order details screen and related hooks/components.
 */
export interface OrderDetailsData {
  id: string;
  orderNumber?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  orderDate: string;
  rawOrderDate: string;
  deliveryDate?: string | null;
  total: number;
  advance: number;
  status: string;
  rawStatus: string;
  measurements?: Record<string, Record<string, string>>;
  catalogSelections?: Record<string, Record<string, string | string[]>>;
  lastUpdated?: string;
  notes?: string | null;
}

/**
 * Company data displayed on order details (e.g. for PDF).
 */
export interface OrderDetailsCompanyData {
  name: string;
  owner: string;
  phone: string;
  email: string;
  address: string;
  logo?: string;
}

/**
 * State for the "edit single measurement" or "edit single catalog selection" modal.
 */
export type EditItemModalState =
  | { type: 'measurement'; garmentId: string; measurementKey: string }
  | { type: 'catalog'; garmentId: string; categoryCode: string }
  | null;
