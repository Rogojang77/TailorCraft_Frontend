/**
 * Lightweight in-memory cache for shared API resources.
 * Avoids refetching on every focus when cache is still valid.
 * TTL: 20 seconds. Manual refresh and invalidation bypass cache.
 */

import { api, apiFetch } from '@/lib/api';

const CACHE_TTL_MS = 20_000;

type CacheEntry<T> = { data: T; timestamp: number };

let companyCache: CacheEntry<{ name: string; owner: string; phone: string; email: string; address: string | null; logoUrl?: string | null } | null> | null = null;
let garmentTypesCache: CacheEntry<unknown> | null = null;

function isFresh<T>(entry: CacheEntry<T> | null): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

/** Invalidate company settings cache. Call after saving company in profile. */
export function invalidateCompanyCache(): void {
  companyCache = null;
}

/** Invalidate garment types list cache. Call after create/update/delete garment. */
export function invalidateGarmentTypesCache(): void {
  garmentTypesCache = null;
}

export type CompanySettings = {
  name: string;
  owner: string;
  phone: string;
  email: string;
  address: string | null;
  logoUrl?: string | null;
} | null;

/**
 * Fetch company settings. Uses cache unless forceRefresh or cache expired.
 */
export async function fetchCompanySettings(forceRefresh = false): Promise<CompanySettings> {
  if (!forceRefresh && isFresh(companyCache)) {
    return companyCache!.data;
  }
  try {
    const data = await apiFetch<{ name: string; owner: string; phone: string; email: string; address: string | null; logoUrl?: string | null }>(
      api.settings.company
    );
    const result: CompanySettings = data
      ? {
          name: data.name ?? '',
          owner: data.owner ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          address: data.address ?? null,
          logoUrl: data.logoUrl ?? null,
        }
      : null;
    companyCache = { data: result, timestamp: Date.now() };
    return result;
  } catch {
    return null;
  }
}

/**
 * Fetch garment types list. Uses cache unless forceRefresh or cache expired.
 * Returns normalized array (always array, never wrapped object).
 */
export async function fetchGarmentTypesList(forceRefresh = false): Promise<unknown[]> {
  if (!forceRefresh && isFresh(garmentTypesCache)) {
    return garmentTypesCache!.data as unknown[];
  }
  const data = await apiFetch<unknown[] | { garmentTypes?: unknown[]; garments?: unknown[] }>(api.garmentTypes());
  const result = Array.isArray(data)
    ? data
    : (data?.garmentTypes ?? data?.garments ?? []);
  garmentTypesCache = { data: result, timestamp: Date.now() };
  return result;
}

export async function deleteGarmentType(id: string): Promise<void> {
  await apiFetch(api.garmentTypeDelete(id), { method: 'DELETE' });
  invalidateGarmentTypesCache();
}