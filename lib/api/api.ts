/**
 * TailorCraft API client for the Expo frontend.
 * Backend URL is set via EXPO_PUBLIC_API_URL (see lib/apiConfig.ts).
 */

import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, getApiBaseUrlCached } from './apiConfig';

/** Request timeout in ms (connectivity errors surface as fetch rejection). */
const REQUEST_TIMEOUT_MS = 30_000;

/** API error codes returned by the backend (e.g. in JSON body). */
export const ApiErrorCode = {
  SUBSCRIPTION_LIMIT_REACHED: 'SUBSCRIPTION_LIMIT_REACHED',
  CUSTOM_PDF_PRO_ONLY: 'CUSTOM_PDF_PRO_ONLY',
} as const;

export type ApiErrorCodeType = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

/** HTTP status codes used for API error handling. */
export const HttpStatus = {
  Unauthorized: 401,
  NotFound: 404,
  Conflict: 409,
  UnprocessableEntity: 422,
  TooManyRequests: 429,
  InternalServerError: 500,
} as const;

/** Backend i18n error payload: frontend translates with t(messageKey, messageParams). */
export type ApiMessagePayload = {
  success: false;
  messageKey: string;
  messageParams?: Record<string, string | number>;
  code?: string;
  errors?: Array<{ field: string; messageKey?: string; messageParams?: Record<string, string | number> }>;
};

/** Custom error class to preserve error codes and i18n keys from API responses. */
class ApiError extends Error {
  code?: string;
  status: number;
  /** When present, use t(messageKey, messageParams) for user-facing message. */
  messageKey?: string;
  messageParams?: Record<string, string | number>;
  /** Per-field errors (e.g. validation) with messageKey per item. */
  errors?: ApiMessagePayload['errors'];

  constructor(
    message: string,
    code?: string,
    status?: number,
    i18n?: { messageKey: string; messageParams?: Record<string, string | number>; errors?: ApiMessagePayload['errors'] }
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status ?? HttpStatus.InternalServerError;
    if (i18n) {
      this.messageKey = i18n.messageKey;
      this.messageParams = i18n.messageParams;
      this.errors = i18n.errors;
    }
  }
}

export { API_BASE_URL, ApiError };

/**
 * Turn a relative upload path (e.g. from backend) into a full URL.
 * If the value is already an absolute URL, return it; otherwise prepend API_BASE_URL.
 */
export function resolveUploadUrl(url: string | undefined | null): string | undefined {
  if (url == null || url === '') return undefined;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const base = API_BASE_URL.replace(/\/+$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

export const api = {
  base: API_BASE_URL,
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    logout: `${API_BASE_URL}/api/auth/logout`,
    refresh: `${API_BASE_URL}/api/auth/refresh`,
    register: `${API_BASE_URL}/api/auth/register`,
    signup: `${API_BASE_URL}/api/auth/signup`,
    social: `${API_BASE_URL}/api/auth/social`,
    verifyEmail: (token: string) => `${API_BASE_URL}/api/auth/verify-email?token=${token}`,
    resendEmailVerification: `${API_BASE_URL}/api/auth/resend-email-verification`,
    forgotPassword: `${API_BASE_URL}/api/auth/forgot-password`,
    resetPassword: `${API_BASE_URL}/api/auth/reset-password`,
  },
  /** Account (authenticated user). DELETE /me, GET /me/deletion-status, PATCH /me/password */
  me: `${API_BASE_URL}/api/me`,
  meDeletionStatus: `${API_BASE_URL}/api/me/deletion-status`,
  mePassword: `${API_BASE_URL}/api/me/password`,
  customers: (id?: string) =>
    id ? `${API_BASE_URL}/api/customers/${id}` : `${API_BASE_URL}/api/customers`,
  customerOrders: (id: string) => `${API_BASE_URL}/api/customers/${id}/orders`,
  orders: (id?: string) =>
    id ? `${API_BASE_URL}/api/orders/${id}` : `${API_BASE_URL}/api/orders`,
  /** POST body: { catalogSelections }. Returns { resolvedCatalogItems } for Styles & Materials display. */
  ordersResolveCatalogItems: `${API_BASE_URL}/api/orders/resolve-catalog-items`,
  gallery: (id?: string) =>
    id ? `${API_BASE_URL}/api/gallery/${id}` : `${API_BASE_URL}/api/gallery`,
  galleryCategories: (id?: string) =>
    id
      ? `${API_BASE_URL}/api/gallery/categories/${id}`
      : `${API_BASE_URL}/api/gallery/categories`,
  settings: {
    company: `${API_BASE_URL}/api/settings/company`,
  },
  subscription: {
    status: `${API_BASE_URL}/api/subscription/status`,
    prices: `${API_BASE_URL}/api/subscription/prices`,
    cancel: `${API_BASE_URL}/api/subscription/cancel`,
  },
  /** Backend as source of truth for premium. GET returns { premium, expiresAt }. */
  entitlements: {
    me: `${API_BASE_URL}/api/entitlements/me`,
  },
  /** Confirm purchase after IAP. POST body: { platform, receipt, productId }. Returns { premium, expiresAt }. */
  subscriptions: {
    confirm: `${API_BASE_URL}/api/subscriptions/confirm`,
  },
  pdf: {
    template: `${API_BASE_URL}/api/pdf/template`,
    generateCustom: `${API_BASE_URL}/api/pdf/generate-custom`,
    templates: `${API_BASE_URL}/api/pdf/templates`,
    templateById: (id: string) => `${API_BASE_URL}/api/pdf/templates/${id}`,
    fields: `${API_BASE_URL}/api/pdf/fields`,
  },
  upload: `${API_BASE_URL}/api/upload`,
  /** POST body: { message }. Sends feedback to tailorcraft@rogojan.com via Resend. */
  feedback: `${API_BASE_URL}/api/feedback`,
  /** POST body: { email }. Public; no auth. Subscribe to newsletter. Returns { success, alreadySubscribed }. */
  newsletterSubscribe: `${API_BASE_URL}/api/newsletter/subscribe`,
  ai: {
    generatePreview: `${API_BASE_URL}/api/ai/generate-preview`,
  },
  /**
   * Garment types list/detail. Auth required.
   * List: GET /api/garment-types (?tailorId, ?enabledOnly).
   * 404 on list means "Tailor not found" (no tailorId and user has no Tailor).
   */
  garmentTypes: (id?: string, query?: { tailorId?: string; enabledOnly?: boolean }) => {
    const base = id
      ? `${API_BASE_URL}/api/garment-types/${id}`
      : `${API_BASE_URL}/api/garment-types`;
    if (!id && query && (query.tailorId != null || query.enabledOnly !== undefined)) {
      const params = new URLSearchParams();
      if (query.tailorId != null) params.set('tailorId', query.tailorId);
      if (query.enabledOnly !== undefined) params.set('enabledOnly', String(query.enabledOnly));
      const qs = params.toString();
      return qs ? `${base}?${qs}` : base;
    }
    return base;
  },
  garmentTypeDelete: (id: string) => `${API_BASE_URL}/api/garment-types/${id}`,
  garmentTypeDefinitions: (garmentTypeId: string, defId?: string) =>
    defId
      ? `${API_BASE_URL}/api/garment-types/${garmentTypeId}/measurement-definitions/${defId}`
      : `${API_BASE_URL}/api/garment-types/${garmentTypeId}/measurement-definitions`,
  /** Garment-specific catalog endpoints. Categories and items are owned by garment types. */
  garmentCatalog: {
    /** GET all categories with items for a garment type (for order flow). */
    forGarment: (garmentTypeId: string, includeDisabled?: boolean) => {
      const base = `${API_BASE_URL}/api/garment-types/${garmentTypeId}/catalog`;
      return includeDisabled ? `${base}?includeDisabled=true` : base;
    },
    /** GET/POST/PUT categories for a garment type. PUT = reorder. */
    categories: (garmentTypeId: string, includeDisabled?: boolean) => {
      const base = `${API_BASE_URL}/api/garment-types/${garmentTypeId}/catalog/categories`;
      return includeDisabled ? `${base}?includeDisabled=true` : base;
    },
    /** GET/PATCH/DELETE a single category. */
    category: (garmentTypeId: string, categoryId: string) =>
      `${API_BASE_URL}/api/garment-types/${garmentTypeId}/catalog/categories/${categoryId}`,
    /** GET/POST/PUT items in a category. PUT = reorder. */
    items: (garmentTypeId: string, categoryId: string, includeDisabled?: boolean) => {
      const base = `${API_BASE_URL}/api/garment-types/${garmentTypeId}/catalog/categories/${categoryId}/items`;
      return includeDisabled ? `${base}?includeDisabled=true` : base;
    },
    /** GET/PATCH/DELETE a single item. */
    item: (garmentTypeId: string, itemId: string) =>
      `${API_BASE_URL}/api/garment-types/${garmentTypeId}/catalog/items/${itemId}`,
  },
};

export interface ApiOptions extends RequestInit {
  token?: string | null;
  skipAuth?: boolean; // Skip automatic token injection
  /** Override default request timeout (ms). Use for auth/login when backend or network is slow. */
  timeoutMs?: number;
}

const ACCESS_TOKEN_KEY = 'accessToken';

/** Get stored access token (e.g. for custom fetch that returns non-JSON like PDF blob). */
export async function getStoredAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** AbortSignal that fires after ms. Call abort() on the controller to clear the timer. */
function timeoutSignal(ms: number): { signal: AbortSignal; abort: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    abort: () => {
      clearTimeout(id);
      controller.abort();
    },
  };
}

/** Combine timeout with optional caller signal: abort when either fires. */
function signalWithTimeout(
  timeoutMs: number,
  callerSignal?: AbortSignal | null
): { signal: AbortSignal; abort: () => void } {
  const { signal: timeoutAbortSignal, abort: clearTimeout } = timeoutSignal(timeoutMs);
  if (!callerSignal) return { signal: timeoutAbortSignal, abort: clearTimeout };
  const combined = new AbortController();
  const onAbort = () => {
    combined.abort();
    clearTimeout();
  };
  timeoutAbortSignal.addEventListener('abort', onAbort);
  callerSignal.addEventListener('abort', onAbort);
  return { signal: combined.signal, abort: clearTimeout };
}

/**
 * Classify fetch failure for dev diagnostics. No response = connectivity/refused/timeout.
 */
function classifyNetworkError(err: unknown, url: string): 'timeout' | 'refused' | 'offline' | 'cors_ats' | 'other' {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if ((err instanceof Error && (err as DOMException).name === 'AbortError') || lower.includes('abort') || lower.includes('timeout'))
    return 'timeout';
  if (lower.includes('network request failed') || (err instanceof TypeError && /fetch|network|failed/i.test(msg)))
    return 'refused'; // often connection refused or unreachable
  if (lower.includes('failed to fetch') || lower.includes('load failed')) return 'refused';
  if (lower.includes('offline') || lower.includes('not connected')) return 'offline';
  if (lower.includes('cors') || lower.includes('cleartext') || lower.includes('app transport security'))
    return 'cors_ats';
  return 'other';
}

/** Dev-only: log resolved API base URL once at startup. */
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  const base = getApiBaseUrlCached();
  console.log('[api] API_BASE_URL (resolved):', base);
}

type ApiErrorPayload = {
  success?: boolean;
  error?: string;
  message?: string;
  messageKey?: string;
  messageParams?: Record<string, string | number>;
  code?: string;
  details?: { field: string; message: string }[];
  errors?: Array<{ field: string; messageKey?: string; messageParams?: Record<string, string | number> }>;
};

function formatApiError(
  data: ApiErrorPayload,
  status: number,
  statusText: string,
  url?: string
): string {
  // Backend i18n: prefer messageKey as fallback display (raw key); caller should use getLocalizedApiMessage when t is available
  const base =
    typeof data === 'object' && data
      ? (data.error || data.message || data.messageKey || statusText)
      : statusText;
  let msg = base || `Request failed (${status})`;
  const details = typeof data === 'object' && data?.details && Array.isArray(data.details) ? data.details : [];
  const errors = typeof data === 'object' && data?.errors && Array.isArray(data.errors) ? data.errors : [];
  if (details.length > 0) {
    msg += ': ' + details.map((d) => `${d.field} – ${d.message}`).join('; ');
  }
  if (errors.length > 0 && !details.length) {
    msg += ': ' + errors.map((e) => e.field).join(', ');
  }
  if (status === HttpStatus.NotFound && !(typeof data === 'object' && data && 'messageKey' in data)) {
    msg =
      'Backend not reachable. Ensure the server is running and EXPO_PUBLIC_API_URL is set to your API base URL.';
    console.warn(`API 404: ${url ?? ''}`);
  }
  return msg;
}

/**
 * Fetch from the backend API. Add token via options.token to send Authorization header.
 * If token is not provided and skipAuth is false, it will try to get token from SecureStore.
 * Throws user-friendly Errors for network failures and API errors (including validation details).
 */
export async function apiFetch<T = unknown>(
  pathOrUrl: string,
  options: ApiOptions = {}
): Promise<T> {
  const { token, skipAuth = false, timeoutMs, headers, ...rest } = options;

  let authToken = token;
  if (!authToken && !skipAuth) {
    try {
      authToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token from SecureStore:', error);
    }
  }

  const base = pathOrUrl.startsWith('http') ? '' : API_BASE_URL;
  if (!pathOrUrl.startsWith('http') && !base) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not set. Set it in .env or in your EAS build profile to your backend base URL.'
    );
  }
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${base}${pathOrUrl}`;
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
  };

  if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
    Object.assign(reqHeaders, headers as Record<string, string>);
  }

  const timeout = timeoutMs ?? REQUEST_TIMEOUT_MS;
  const maxRetries = 2;
  const retryDelaysMs = [1000, 2000];

  let res!: Response;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { signal: requestSignal, abort: clearTimeout } = signalWithTimeout(
      timeout,
      rest.signal
    );
    const fetchOptions = { ...rest, headers: reqHeaders, signal: requestSignal };
    try {
      res = await fetch(url, fetchOptions);
      clearTimeout();
      break;
    } catch (err) {
      clearTimeout();
      const kind = classifyNetworkError(err, url);
      const isRetryable = kind === 'timeout' || kind === 'refused' || kind === 'offline';
      if (isRetryable && attempt < maxRetries) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn(`[api] Connection failed (${kind}), retry ${attempt + 1}/${maxRetries} in ${retryDelaysMs[attempt]}ms`);
        }
        await new Promise((r) => setTimeout(r, retryDelaysMs[attempt]));
        continue;
      }
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.error(
          '[api] Connection failed:',
          kind,
          '| Request URL:',
          url,
          '| API base:',
          API_BASE_URL,
          '| Error:',
          err instanceof Error ? err.message : err
        );
      } else {
        console.error('[api] Connection failed:', kind);
      }
      const baseMessage =
        kind === 'timeout'
          ? 'Request timed out. Check your network and that the backend is running.'
          : kind === 'offline'
            ? 'No internet connection. Check your network.'
            : 'Unable to connect. Check your network and that the backend is running.';
      const message =
        typeof __DEV__ !== 'undefined' && __DEV__
          ? `${baseMessage} (URL: ${url})`
          : baseMessage;
      throw new Error(message);
    }
  }

  if (res.status === HttpStatus.Unauthorized && authToken && !skipAuth && !pathOrUrl.includes('/auth/')) {
    let refreshData: { accessToken?: string; refreshToken?: string } | null = null;
    try {
      const storedRefresh = await SecureStore.getItemAsync('refreshToken');
      const refreshBody =
        storedRefresh != null && storedRefresh.length > 0
          ? JSON.stringify({ refreshToken: storedRefresh })
          : undefined;
      const refreshRes = await fetch(api.auth.refresh, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        ...(refreshBody != null && { body: refreshBody }),
      });
      if (refreshRes.ok) {
        refreshData = await refreshRes.json();
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, refreshData!.accessToken!);
        if (refreshData!.refreshToken) {
          await SecureStore.setItemAsync('refreshToken', refreshData!.refreshToken);
        }
      }
    } catch (refreshErr) {
      console.error('Token refresh failed:', refreshErr);
    }
    if (refreshData?.accessToken) {
      reqHeaders.Authorization = `Bearer ${refreshData.accessToken}`;
      try {
        const retryRes = await fetch(url, { ...rest, headers: reqHeaders });
        const retryData = (await retryRes.json().catch(() => ({}))) as T & ApiErrorPayload;
        if (!retryRes.ok) {
          const errorMessage = formatApiError(retryData, retryRes.status, retryRes.statusText, url);
          const i18n =
            retryData.messageKey != null
              ? {
                  messageKey: retryData.messageKey,
                  messageParams: retryData.messageParams,
                  errors: retryData.errors,
                }
              : undefined;
          throw new ApiError(errorMessage, retryData.code, retryRes.status, i18n);
        }
        return retryData as T;
      } catch (retryErr) {
        if (retryErr instanceof Error && retryErr.message.startsWith('Backend not reachable')) throw retryErr;
        if (retryErr instanceof Error && retryErr.message.startsWith('Validation failed')) throw retryErr;
        if (retryErr instanceof Error) throw retryErr;
        throw new Error('Unable to connect. Check your network and that the backend is running.');
      }
    }
  }

  const data = (await res.json().catch(() => ({}))) as T & ApiErrorPayload;
  if (!res.ok) {
    const errorMessage = formatApiError(data, res.status, res.statusText, url);
    const i18n =
      data.messageKey != null
        ? {
            messageKey: data.messageKey,
            messageParams: data.messageParams,
            errors: data.errors,
          }
        : undefined;
    const error = new ApiError(errorMessage, data.code, res.status, i18n);
    throw error;
  }
  // Backend may return { success: true, data } for some endpoints; unwrap so caller gets data directly
  const body = data as T & { success?: boolean; data?: unknown };
  if (body && typeof body === 'object' && body.success === true && 'data' in body) {
    return body.data as T;
  }
  return data as T;
}

/** Safely get a user-facing message from an unknown thrown value. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}

/**
 * Get a localized message for an API error. Use when the backend returns messageKey + messageParams.
 * In components: const msg = getLocalizedApiMessage(err, t, fallback); then show msg.
 * When the error is an ApiError with messageKey, returns t(messageKey, messageParams). Otherwise returns getErrorMessage(error, fallback).
 */
export function getLocalizedApiMessage(
  error: unknown,
  t: (key: string, options?: Record<string, string | number>) => string,
  fallback = 'Something went wrong. Please try again.'
): string {
  if (error instanceof ApiError && error.messageKey) {
    return t(error.messageKey, error.messageParams ?? {});
  }
  return getErrorMessage(error, fallback);
}

/**
 * Upload an image file to the backend.
 * @param fileUri - Local file URI from expo-image-picker
 * @returns The URL of the uploaded image
 */
export async function uploadImage(fileUri: string): Promise<string> {
  try {
    // Create FormData for React Native
    const formData = new FormData();
    const filename = fileUri.split('/').pop() || 'image.jpg';

    // In React Native, FormData accepts file objects with uri, type, and name
    formData.append('file', {
      uri: fileUri,
      type: 'image/jpeg', // Default type, backend will validate
      name: filename,
    } as any);

    // Get auth token
    let authToken: string | null = null;
    try {
      authToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token from SecureStore:', error);
    }

    // Upload to backend
    // Note: Don't set Content-Type header - let FormData set it with boundary
    const uploadResponse = await fetch(api.upload, {
      method: 'POST',
      headers: {
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      throw new Error(
        formatApiError(errorData, uploadResponse.status, uploadResponse.statusText, api.upload)
      );
    }

    const data = await uploadResponse.json();
    // Return full URL
    return `${API_BASE_URL}${data.url}`;
  } catch (error) {
    console.error('Image upload error:', error);
    throw error instanceof Error ? error : new Error('Failed to upload image');
  }
}
