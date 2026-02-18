/**
 * Single source of truth for API base URL.
 *
 * Set EXPO_PUBLIC_API_URL in .env or in your EAS build profile (e.g. preview/production).
 * Dot notation is required so Expo inlines the value at build time.
 * Fallback used when env is missing (e.g. some EAS local builds don't inject profile env).
 */
const DEFAULT_API_BASE_URL = 'https://tailorcraft.rogojan.at';

/**
 * EXPO_PUBLIC_* must be read with dot notation so Expo/Metro can inline them at build time.
 * Bracket notation (process.env['EXPO_PUBLIC_X']) is NOT replaced and stays undefined in production builds.
 */
const envApiUrl =
  typeof process !== 'undefined' && process.env
    ? (process.env as Record<string, string | undefined>).EXPO_PUBLIC_API_URL
    : undefined;

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Resolved API base URL. Use this for all API requests.
 * Uses EXPO_PUBLIC_API_URL when set; otherwise falls back to DEFAULT_API_BASE_URL so
 * production/preview builds work even if env wasn't inlined (e.g. local EAS build).
 */
export function getApiBaseUrl(): string {
  const url = envApiUrl && typeof envApiUrl === 'string' ? normalizeUrl(envApiUrl) : '';
  return url || DEFAULT_API_BASE_URL;
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
