/**
 * Load and hold core order details data: order, company settings, garment types.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api, apiFetch, resolveUploadUrl } from '@/lib/api';
import {
  fetchCompanySettings,
  fetchGarmentTypesList,
  orderStatusToLabel,
  formatDate,
  customerFullName,
  normalizeGarmentTypeRecord,
} from '@/lib/api';
import type { GarmentTypeRecord } from '@/types/templates';
import type { OrderDetailsData, OrderDetailsCompanyData } from '@/types/orderDetails';

function str(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

export interface UseOrderDetailsResult {
  orderData: OrderDetailsData | null;
  setOrderData: React.Dispatch<React.SetStateAction<OrderDetailsData | null>>;
  companyData: OrderDetailsCompanyData | null;
  garmentTypes: GarmentTypeRecord[];
  loading: boolean;
  error: boolean;
  refetch: () => Promise<void>;
}

export function useOrderDetails(orderId: string | undefined): UseOrderDetailsResult {
  const [orderData, setOrderData] = useState<OrderDetailsData | null>(null);
  const [companyData, setCompanyData] = useState<OrderDetailsCompanyData | null>(null);
  const [garmentTypes, setGarmentTypes] = useState<GarmentTypeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!orderId) {
      if (isMountedRef.current) setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(false);
    try {
      const [order, company, rawGarments] = await Promise.all([
        apiFetch<{
          id: string;
          orderNumber: string;
          status: string;
          totalAmount: number;
          paidAmount: number;
          orderDate: string;
          deliveryDate?: string | null;
          measurements: Record<string, Record<string, unknown>> | null;
          catalogSelections: Record<string, Record<string, string | string[]>> | null;
          customer?: { firstName: string; lastName: string; phone: string; email: string | null; gender?: string | null; referenceImage?: string | null };
          updatedAt?: string;
          notes?: string | null;
          orderGarmentSnapshots?: Array<{
            garmentTypeSnapshot?: { name?: string };
            values?: Record<string, unknown>;
          }>;
        }>(api.orders(orderId)),
        fetchCompanySettings(),
        fetchGarmentTypesList().catch(() => []),
      ]);

      const list = Array.isArray(rawGarments)
        ? rawGarments.map((g: unknown) => normalizeGarmentTypeRecord(g as Parameters<typeof normalizeGarmentTypeRecord>[0]))
        : [];
      if (isMountedRef.current) setGarmentTypes(list);

      const m = order.measurements ?? {};
      const measurements: Record<string, Record<string, string>> = {};
      for (const [garmentId, garmentData] of Object.entries(m)) {
        if (garmentData && typeof garmentData === 'object') {
          const out: Record<string, string> = {};
          for (const k of Object.keys(garmentData)) {
            out[k] = str(garmentData[k]);
          }
          if (Object.keys(out).length > 0) {
            measurements[garmentId] = out;
          }
        }
      }

      if (isMountedRef.current) {
        setOrderData({
          id: order.id,
          orderNumber: order.orderNumber,
          clientName: order.customer ? customerFullName(order.customer.firstName, order.customer.lastName) : '—',
          clientPhone: order.customer?.phone ?? '—',
          clientEmail: order.customer?.email ?? undefined,
          orderDate: formatDate(order.orderDate),
          rawOrderDate: order.orderDate,
          deliveryDate: order.deliveryDate ?? null,
          total: order.totalAmount,
          advance: order.paidAmount,
          status: orderStatusToLabel(order.status),
          rawStatus: order.status,
          measurements,
          catalogSelections: order.catalogSelections ?? undefined,
          lastUpdated: order.updatedAt ? formatDate(order.updatedAt) : undefined,
          notes: order.notes ?? undefined,
        });
        setCompanyData(
          company
            ? {
                name: company.name ?? '',
                owner: company.owner ?? '',
                phone: company.phone ?? '',
                email: company.email ?? '',
                address: company.address ?? '',
                logo: resolveUploadUrl(company.logoUrl ?? undefined) ?? (company.logoUrl ?? undefined),
              }
            : null
        );
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError' && isMountedRef.current) {
        setOrderData(null);
        setCompanyData(null);
        setError(true);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [orderId]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (isMountedRef.current) {
      fetchData();
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    orderData,
    setOrderData,
    companyData,
    garmentTypes,
    loading,
    error,
    refetch: fetchData,
  };
}
