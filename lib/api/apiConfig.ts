/**
 * Single source of truth for API base URL.
 *
 * Resolution order:
 * 1. `process.env.EXPO_PUBLIC_API_URL` — Metro may inline this at bundle time (from .env / EAS).
 * 2. `Constants.expoConfig.extra.apiUrl` — set in app.config.js at build/start time (reliable when
 *    Metro does not inline EXPO_PUBLIC_*).
 *
 * app.config.js sets extra.apiUrl from EXPO_PUBLIC_API_URL, EAS_BUILD_PROFILE, or staging default.
 */
import Constants from 'expo-constants';

const envApiUrl = process.env.EXPO_PUBLIC_API_URL;

function getExtraApiUrl(): string | undefined {
  const raw = Constants.expoConfig?.extra as { apiUrl?: unknown } | undefined;
  const u = raw?.apiUrl;
  return typeof u === 'string' && u.trim() ? u.trim() : undefined;
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Resolved API base URL. Use this for all API requests.
 */
export function getApiBaseUrl(): string {
  const fromInline =
    envApiUrl && typeof envApiUrl === 'string' ? normalizeUrl(envApiUrl) : '';
  const extra = getExtraApiUrl();
  const fromExtra = extra ? normalizeUrl(extra) : '';
  return fromInline || fromExtra || '';
}

/** Cached base URL so all callers share the same value. */
let cachedBaseUrl: string | null = null;

/**
 * Get API base URL (cached). Prefer this in app code so resolution runs once.
 */
export function getApiBaseUrlCached(): string {
  if (cachedBaseUrl === null) {
    cachedBaseUrl = getApiBaseUrl();
  }
  return cachedBaseUrl;
}

/**
 * API base URL for use at module load time (e.g. lib/api.ts).
 * Resolved once when this module is first loaded.
 */
export const API_BASE_URL = getApiBaseUrl();

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log('[apiConfig] API_BASE_URL:', API_BASE_URL);
}
if (typeof __DEV__ !== 'undefined' && !__DEV__ && typeof console !== 'undefined' && console.log) {
  console.log('[apiConfig] API_BASE_URL (resolved):', API_BASE_URL);
}
