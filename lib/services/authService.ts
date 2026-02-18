/**
 * Auth API service. Handles all auth-related backend calls.
 * Contexts use this for API access; state and persistence remain in contexts.
 */

import { api, apiFetch, ApiError, HttpStatus } from '@/lib/api';
import type { User } from '@/contexts/AuthContext';

/** Backend deletion status. Used for GET /me/deletion-status and after DELETE /me. */
export type DeletionStatus = 'active' | 'pending' | 'deleted';

export interface DeletionStatusResponse {
  status: DeletionStatus;
  /** ISO date when account will be/was deleted (if pending or deleted). */
  scheduledAt?: string;
  /** Human-readable message from backend (optional). */
  message?: string;
}

export interface SignupData {
  email: string;
  password: string;
  companyData: {
    name: string;
    owner: string;
    phone: string;
    email: string;
    address?: string;
    logoUrl?: string;
  };
  /** Consent: Terms & Conditions accepted. Required for signup. */
  termsAccepted: boolean;
  /** Consent: Privacy Policy accepted. Required for signup. */
  privacyAccepted: boolean;
  /** Optional: Marketing communications opt-in. */
  marketingOptIn?: boolean;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(api.auth.login, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  });
}

export async function signup(data: SignupData): Promise<AuthResponse> {
  try {
    return await apiFetch<AuthResponse>(api.auth.signup, {
      method: 'POST',
      body: JSON.stringify(data),
      skipAuth: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    const is404 = message.includes('404');
    const isNetwork = /fetch|network|failed|econnrefused/i.test(message);
    if (is404 || isNetwork) {
      throw new Error(
        'Could not reach signup service. Ensure the backend is running and EXPO_PUBLIC_API_URL is set to your API base URL.'
      );
    }
    throw error;
  }
}

export async function logout(accessToken: string | null): Promise<void> {
  try {
    await apiFetch(api.auth.logout, {
      method: 'POST',
      token: accessToken,
    });
  } catch (error) {
    console.error('Logout API error:', error);
  }
}

export async function refresh(): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(api.auth.refresh, {
    method: 'POST',
    skipAuth: true,
  });
}

/**
 * Get current account deletion status (active, pending, deleted).
 * Use to show "deletion pending" state or redirect if already deleted.
 */
export async function getDeletionStatus(
  accessToken: string | null
): Promise<DeletionStatusResponse> {
  return apiFetch<DeletionStatusResponse>(api.meDeletionStatus, {
    method: 'GET',
    token: accessToken,
  });
}

/** Error codes the backend may return for account deletion. */
export const AccountDeletionErrorCode = {
  SUBSCRIPTION_ACTIVE: 'SUBSCRIPTION_ACTIVE',
  ALREADY_DELETED: 'ALREADY_DELETED',
  DELETION_PENDING: 'DELETION_PENDING',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
} as const;

export interface RequestAccountDeletionOptions {
  password: string;
  accessToken: string | null;
}

/**
 * Request account deletion. Backend may:
 * - 200: Delete immediately and return { status: 'deleted' } or similar.
 * - 202: Accept and schedule deletion (return { status: 'pending', scheduledAt }).
 * - 400/401: Invalid password.
 * - 409: Conflict (e.g. subscription active, already deleted, deletion pending).
 */
export async function requestAccountDeletion({
  password,
  accessToken,
}: RequestAccountDeletionOptions): Promise<DeletionStatusResponse> {
  const data = await apiFetch<DeletionStatusResponse>(api.me, {
    method: 'DELETE',
    token: accessToken,
    body: JSON.stringify({ password }),
  });
  return data;
}

/**
 * Check if an error is due to account deletion rules (subscription, already deleted, etc.).
 */
export function isAccountDeletionError(err: unknown): err is ApiError {
  if (!(err instanceof ApiError)) return false;
  return (
    err.status === HttpStatus.Conflict ||
    err.status === HttpStatus.UnprocessableEntity ||
    [AccountDeletionErrorCode.SUBSCRIPTION_ACTIVE, AccountDeletionErrorCode.ALREADY_DELETED, AccountDeletionErrorCode.DELETION_PENDING, AccountDeletionErrorCode.INVALID_PASSWORD].includes(err.code as string)
  );
}
