/**
 * Auth API service. Handles all auth-related backend calls.
 * Contexts use this for API access; state and persistence remain in contexts.
 */

import { api, apiFetch, ApiError, HttpStatus } from '@/lib/api';
import type { User } from '@/contexts/AuthContext';

/** Backend deletion status. Used for GET /me/deletion-status and after DELETE /me. */
export type DeletionStatus = 'active' | 'pending' | 'deleted';
export type UserLocale = 'en' | 'ro';

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
  /** Present when backend returns it (e.g. social login); store for refresh on mobile. */
  refreshToken?: string;
  /** True when user signed up with Apple and must complete company details. */
  needsCompanyDetails?: boolean;
  /** True when user signed up with Apple and must set a password (social-only account). */
  needsPassword?: boolean;
}

function normalizeUserLocale(locale: unknown): UserLocale {
  return locale === 'ro' ? 'ro' : 'en';
}

/** Signup success: no tokens; user must verify email before logging in. */
export interface SignupResponse {
  success: true;
  messageKey?: string;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(api.auth.login, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth: true,
    timeoutMs: 60_000, // longer timeout for login (backend or network can be slow)
  });
}

export async function signup(data: SignupData): Promise<SignupResponse> {
  try {
    return await apiFetch<SignupResponse>(api.auth.signup, {
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

/**
 * Refresh access token. Uses cookie when available (web); otherwise sends refreshToken in body (mobile).
 */
export async function refresh(refreshTokenFromStore?: string | null): Promise<AuthResponse> {
  const body =
    refreshTokenFromStore != null && refreshTokenFromStore.length > 0
      ? JSON.stringify({ refreshToken: refreshTokenFromStore })
      : undefined;
  return apiFetch<AuthResponse>(api.auth.refresh, {
    method: 'POST',
    ...(body != null && { body }),
    skipAuth: true,
  });
}

/**
 * Set password for social-only (e.g. Apple) accounts. Requires auth.
 * Backend returns 400 if user already has a password.
 */
export async function setPassword(
  accessToken: string | null,
  password: string
): Promise<void> {
  await apiFetch(api.mePassword, {
    method: 'PATCH',
    token: accessToken,
    body: JSON.stringify({ password }),
  });
}

/**
 * Change password for authenticated users who already have a password.
 * Requires current password and new password.
 */
export async function changePassword(
  accessToken: string | null,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await apiFetch(api.mePassword, {
    method: 'PATCH',
    token: accessToken,
    body: JSON.stringify({
      currentPassword: currentPassword.trim(),
      newPassword: newPassword.trim(),
    }),
  });
}

/** Social login: send provider token to backend; returns user + accessToken + refreshToken. */
export async function socialLogin(
  provider: 'google' | 'apple',
  tokenPayload: { idToken?: string; identityToken?: string }
): Promise<AuthResponse> {
  const body =
    provider === 'google'
      ? { provider: 'google', idToken: tokenPayload.idToken }
      : { provider: 'apple', identityToken: tokenPayload.identityToken };
  return apiFetch<AuthResponse>(api.auth.social, {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: true,
  });
}

/**
 * Request a password reset email. Backend sends email with reset link; always returns success message.
 */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(api.auth.forgotPassword, {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
    skipAuth: true,
  });
}

/**
 * Reset password using token from email link. Token and new password required.
 */
export async function resetPassword(token: string, password: string): Promise<void> {
  await apiFetch(api.auth.resetPassword, {
    method: 'POST',
    body: JSON.stringify({ token, password }),
    skipAuth: true,
  });
}

/**
 * Get the current authenticated user profile.
 * Backend locale is normalized so frontend only handles supported locales.
 */
export async function getCurrentUser(accessToken: string | null): Promise<User> {
  const user = await apiFetch<User & { locale?: string }>(api.me, {
    method: 'GET',
    token: accessToken,
  });
  return {
    ...user,
    locale: normalizeUserLocale(user.locale),
  };
}

/**
 * Persist authenticated user's locale preference in backend.
 */
export async function updateLocale(
  accessToken: string | null,
  locale: UserLocale
): Promise<UserLocale> {
  const data = await apiFetch<{ success?: boolean; locale?: string }>(api.meLocale, {
    method: 'PUT',
    token: accessToken,
    body: JSON.stringify({ locale }),
  });
  return normalizeUserLocale(data.locale);
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

/** Raw shape returned by backend DELETE /api/me on success (scheduled deletion). */
interface DeleteMeApiResponse {
  success?: boolean;
  messageKey?: string;
  deletionScheduledFor?: string;
  retentionDays?: number;
  status?: DeletionStatus;
  scheduledAt?: string;
}

/**
 * Request account deletion. Backend may:
 * - 200: Delete immediately and return { status: 'deleted' } or similar.
 * - 200: Accept and schedule deletion (return { success, deletionScheduledFor } or { status: 'pending', scheduledAt }).
 * - 400/401: Invalid password.
 * - 409: Conflict (e.g. subscription active, already deleted, deletion pending).
 */
export async function requestAccountDeletion({
  password,
  accessToken,
}: RequestAccountDeletionOptions): Promise<DeletionStatusResponse> {
  const data = await apiFetch<DeleteMeApiResponse>(api.me, {
    method: 'DELETE',
    token: accessToken,
    body: JSON.stringify({ password }),
  });
  // Backend returns success + deletionScheduledFor; normalize to frontend contract.
  if (data.status === 'deleted' || data.status === 'pending') {
    return { status: data.status, scheduledAt: data.scheduledAt };
  }
  if (data.success && data.deletionScheduledFor) {
    return { status: 'pending', scheduledAt: data.deletionScheduledFor };
  }
  return { status: 'pending', scheduledAt: data.scheduledAt };
}

/**
 * Check if an error is due to account deletion rules (subscription, already deleted, etc.).
 */
export function isAccountDeletionError(err: unknown): err is ApiError {
  if (!(err instanceof ApiError)) return false;
  const codes = [AccountDeletionErrorCode.SUBSCRIPTION_ACTIVE, AccountDeletionErrorCode.ALREADY_DELETED, AccountDeletionErrorCode.DELETION_PENDING, AccountDeletionErrorCode.INVALID_PASSWORD] as string[];
  return (
    err.status === HttpStatus.Conflict ||
    err.status === HttpStatus.UnprocessableEntity ||
    (err.code != null && codes.includes(err.code))
  );
}
