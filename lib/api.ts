/**
 * TailorCraft API client for the Expo frontend.
 * Backend runs at API_BASE_URL (default http://localhost:3001).
 *
 * Set EXPO_PUBLIC_API_URL in .env for production (e.g. your deployed Next.js API).
 * For Expo dev, use your machine's IP when testing on device (e.g. http://192.168.1.x:3001).
 */

import * as SecureStore from 'expo-secure-store';

const API_BASE_URL =
  (typeof process !== 'undefined' && (process as NodeJS.Process).env?.EXPO_PUBLIC_API_URL) ||
  'http://localhost:3001';

// Custom error class to preserve error codes from API responses
class ApiError extends Error {
  code?: string;
  status: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status || 500;
  }
}

export { API_BASE_URL, ApiError };

export const api = {
  base: API_BASE_URL,
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    logout: `${API_BASE_URL}/api/auth/logout`,
    refresh: `${API_BASE_URL}/api/auth/refresh`,
    register: `${API_BASE_URL}/api/auth/register`,
    signup: `${API_BASE_URL}/api/auth/signup`,
    verifyEmail: (token: string) => `${API_BASE_URL}/api/auth/verify-email?token=${token}`,
    verifyPhone: `${API_BASE_URL}/api/auth/verify-phone`,
    resendEmailVerification: `${API_BASE_URL}/api/auth/resend-email-verification`,
    resendPhoneVerification: `${API_BASE_URL}/api/auth/resend-phone-verification`,
  },
  customers: (id?: string) =>
    id ? `${API_BASE_URL}/api/customers/${id}` : `${API_BASE_URL}/api/customers`,
  customerOrders: (id: string) => `${API_BASE_URL}/api/customers/${id}/orders`,
  orders: (id?: string) =>
    id ? `${API_BASE_URL}/api/orders/${id}` : `${API_BASE_URL}/api/orders`,
  stats: `${API_BASE_URL}/api/stats`,
  gallery: (id?: string) =>
    id ? `${API_BASE_URL}/api/gallery/${id}` : `${API_BASE_URL}/api/gallery`,
  settings: {
    company: `${API_BASE_URL}/api/settings/company`,
  },
  subscription: {
    status: `${API_BASE_URL}/api/subscription/status`,
    upgrade: `${API_BASE_URL}/api/subscription/upgrade`,
    cancel: `${API_BASE_URL}/api/subscription/cancel`,
  },
  upload: `${API_BASE_URL}/api/upload`,
};

export interface ApiOptions extends RequestInit {
  token?: string | null;
  skipAuth?: boolean; // Skip automatic token injection
}

const ACCESS_TOKEN_KEY = 'accessToken';

type ApiErrorPayload = { 
  error?: string; 
  message?: string;
  code?: string;
  details?: { field: string; message: string }[] 
};

function formatApiError(
  data: ApiErrorPayload,
  status: number,
  statusText: string,
  url?: string
): string {
  // Check for error or message field (backend sends either)
  const base =
    typeof data === 'object' && data
      ? (data.error || data.message || statusText)
      : statusText;
  let msg = base || `Request failed (${status})`;
  const details = typeof data === 'object' && data?.details && Array.isArray(data.details) ? data.details : [];
  if (details.length > 0) {
    msg += ': ' + details.map((d) => `${d.field} – ${d.message}`).join('; ');
  }
  if (status === 404) {
    msg =
      'Backend not reachable. Ensure the server is running (docker compose up -d in backend/ or npm run dev). ' +
      'On a device, set EXPO_PUBLIC_API_URL in .env to your machine IP (e.g. http://192.168.1.x:3001).';
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
  const { token, skipAuth = false, headers, ...rest } = options;

  let authToken = token;
  if (!authToken && !skipAuth) {
    try {
      authToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token from SecureStore:', error);
    }
  }

  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_BASE_URL}${pathOrUrl}`;
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
  };

  if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
    Object.assign(reqHeaders, headers as Record<string, string>);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers: reqHeaders });
  } catch (err) {
    const message =
      err instanceof TypeError && /fetch|network|failed/i.test(String(err))
        ? 'Unable to connect. Check your network and that the backend is running.'
        : err instanceof Error
          ? err.message
          : 'Network request failed.';
    throw new Error(message);
  }

  if (res.status === 401 && authToken && !skipAuth && !pathOrUrl.includes('/auth/')) {
    let refreshData: { accessToken?: string } | null = null;
    try {
      const refreshRes = await fetch(api.auth.refresh, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (refreshRes.ok) {
        refreshData = await refreshRes.json();
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, refreshData!.accessToken!);
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
          throw new ApiError(errorMessage, retryData.code, retryRes.status);
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
    const error = new ApiError(errorMessage, data.code, res.status);
    throw error;
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
