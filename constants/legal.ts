/**
 * Legal document URLs and consent configuration.
 * Uses API base URL from lib/apiConfig (EXPO_PUBLIC_API_URL).
 */

import { getApiBaseUrlCached } from '../lib/apiConfig';

const env: Record<string, string | undefined> =
  typeof process !== 'undefined' && process.env ? process.env : {};

const apiUrl = getApiBaseUrlCached();

// Extract origin (protocol + host + port) from API URL for legal doc base
const urlMatch = typeof apiUrl === 'string' ? apiUrl.match(/^(https?:\/\/[^/]+)/) : null;
const legalBase = urlMatch?.[1] ?? 'https://tailorcraft.rogojan.at';

/** Privacy Policy URL. */
export const PRIVACY_POLICY_URL =
  env['EXPO_PUBLIC_PRIVACY_POLICY_URL'] || `${legalBase}/privacy-policy`;

/** Terms & Conditions URL. */
export const TERMS_URL =
  env['EXPO_PUBLIC_TERMS_URL'] || `${legalBase}/terms-and-conditions`;

/** Last updated dates for display (ISO date strings). Update when documents change. */
export const LEGAL_LAST_UPDATED = {
  privacyPolicy: env['EXPO_PUBLIC_PRIVACY_LAST_UPDATED'] || '2025-01-01',
  terms: env['EXPO_PUBLIC_TERMS_LAST_UPDATED'] || '2025-01-01',
} as const;
