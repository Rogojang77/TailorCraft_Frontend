import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as authService from '@/lib/services/authService';
import type { SignupData } from '@/lib/services/authService';
import * as diagnostics from '@/lib/diagnostics';
import { deactivatePushDeviceWithBackend } from '@/lib/pushNotifications';
import {
  getBiometricAvailability,
  authenticateWithBiometric,
  type BiometricAvailability,
} from '@/lib/biometric';

export interface User {
  id: string;
  email: string;
  role: string;
  /** User locale from backend profile settings. */
  locale?: 'en' | 'ro';
  emailVerified?: boolean;
  avatar?: string | null;
  /** When set, use for GET /api/garment-types?tailorId=... when user has no Tailor resolved server-side. */
  tailorId?: string;
}

export interface CompanyData {
  name: string;
  owner: string;
  phone: string;
  email: string;
  address?: string;
  logoUrl?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** True when the user previously opted in to biometric login. */
  isBiometricEnabled: boolean;
  /** True when user is authenticated but app access is locked behind biometric prompt. */
  isBiometricLocked: boolean;
  /** True when user signed up with Apple and must complete company details before using the app. Persisted so modal shows on next launch. */
  needsCompanyDetails: boolean;
  /** True when user signed up with Apple and must set a password (social-only account). Persisted so modal shows on next launch. */
  needsPassword: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Complete sign-in after receiving provider token (Google idToken or Apple identityToken). Returns needsCompanyDetails/needsPassword when backend signals Apple signup must complete flows. */
  loginWithSocial: (
    provider: 'google' | 'apple',
    payload: { idToken?: string; identityToken?: string }
  ) => Promise<{ needsCompanyDetails?: boolean; needsPassword?: boolean }>;
  signup: (data: SignupData) => Promise<{ messageKey?: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  /** Clear the needsCompanyDetails flag after user has completed company details. */
  clearNeedsCompanyDetails: () => Promise<void>;
  /** Clear the needsPassword flag after user has set a password (Apple signup flow). */
  clearNeedsPassword: () => Promise<void>;
  /** Enable biometric login after a successful email/password login. Only stores the flag; tokens are already stored. */
  enableBiometricLogin: () => Promise<void>;
  /** Run biometric prompt and unlock app access. */
  loginWithBiometric: (options?: { promptMessage?: string }) => Promise<
    | { success: true }
    | { success: false; reason: 'cancelled' | 'session_expired' | 'unavailable' }
  >;
  /** Check if device has biometric hardware and enrolled data. Call from login screen to decide whether to show biometric button. */
  getBiometricAvailability: () => Promise<BiometricAvailability>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';
const REFRESH_TOKEN_KEY = 'refreshToken';
const BIOMETRIC_ENABLED_KEY = 'biometricEnabled';
const NEEDS_COMPANY_DETAILS_KEY = 'needsCompanyDetails';
const NEEDS_PASSWORD_KEY = 'needsPassword';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);
  const [needsCompanyDetails, setNeedsCompanyDetails] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);

  // Load stored auth state on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser, biometricEnabled, needsCompany, needsPass] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
        SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY),
        SecureStore.getItemAsync(NEEDS_COMPANY_DETAILS_KEY),
        SecureStore.getItemAsync(NEEDS_PASSWORD_KEY),
      ]);

      const biometricOn = biometricEnabled === 'true';
      setNeedsCompanyDetails(needsCompany === 'true');
      setNeedsPassword(needsPass === 'true');

      if (storedToken && storedUser) {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsBiometricEnabled(biometricOn);
        setIsBiometricLocked(biometricOn);
      } else {
        setAccessToken(null);
        setUser(null);
        setIsBiometricEnabled(biometricOn);
        setIsBiometricLocked(false);
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearNeedsCompanyDetails = async () => {
    await SecureStore.deleteItemAsync(NEEDS_COMPANY_DETAILS_KEY);
    setNeedsCompanyDetails(false);
  };

  const clearNeedsPassword = async () => {
    await SecureStore.deleteItemAsync(NEEDS_PASSWORD_KEY);
    setNeedsPassword(false);
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password);

      await Promise.all([
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.accessToken),
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user)),
      ]);

      setAccessToken(response.accessToken);
      setUser(response.user);
      setIsBiometricLocked(false);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithSocial = async (
    provider: 'google' | 'apple',
    payload: { idToken?: string; identityToken?: string }
  ): Promise<{ needsCompanyDetails?: boolean; needsPassword?: boolean }> => {
    const response = await authService.socialLogin(provider, payload);
    const toStore: Promise<void>[] = [
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.accessToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user)),
    ];
    if (response.refreshToken) {
      toStore.push(SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.refreshToken));
    }
    if (response.needsCompanyDetails) {
      toStore.push(SecureStore.setItemAsync(NEEDS_COMPANY_DETAILS_KEY, 'true'));
      setNeedsCompanyDetails(true);
    }
    if (response.needsPassword) {
      toStore.push(SecureStore.setItemAsync(NEEDS_PASSWORD_KEY, 'true'));
      setNeedsPassword(true);
    }
    await Promise.all(toStore);
    setAccessToken(response.accessToken);
    setUser(response.user);
    setIsBiometricLocked(false);
    return { needsCompanyDetails: response.needsCompanyDetails, needsPassword: response.needsPassword };
  };

  const signup = async (data: SignupData): Promise<{ messageKey?: string }> => {
    const response = await authService.signup(data);
    // No tokens on signup — user must verify email before logging in
    return { messageKey: response.messageKey };
  };

  const logout = async () => {
    try {
      await deactivatePushDeviceWithBackend(accessToken);
      await authService.logout(accessToken);
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await Notifications.setBadgeCountAsync(0).catch(() => {
        /* ignore badge clear failures */
      });

      // Clear all persisted storage - auth tokens
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY),
        SecureStore.deleteItemAsync(NEEDS_COMPANY_DETAILS_KEY),
        SecureStore.deleteItemAsync(NEEDS_PASSWORD_KEY),
      ]);

      // Clear auth state - subscription state will be cleared by SubscriptionContext
      // reacting to isAuthenticated becoming false
      setAccessToken(null);
      setUser(null);
      setIsBiometricEnabled(false);
      setIsBiometricLocked(false);
      setNeedsCompanyDetails(false);
      setNeedsPassword(false);
    }
  };

  const enableBiometricLogin = async () => {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
    setIsBiometricEnabled(true);
    setIsBiometricLocked(false);
  };

  const loginWithBiometric = async (options?: {
    promptMessage?: string;
  }): Promise<
    | { success: true }
    | { success: false; reason: 'cancelled' | 'session_expired' | 'unavailable' }
  > => {
    const authResult = await authenticateWithBiometric({
      promptMessage: options?.promptMessage ?? 'Authenticate to sign in',
    });

    if (!authResult.success) {
      const reason =
        authResult.error === 'cancelled' ? 'cancelled' : 'unavailable';
      return { success: false, reason };
    }

    if (accessToken && user) {
      setIsBiometricLocked(false);
      return { success: true };
    }

    try {
      const [storedToken, storedUser] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);

      if (!storedToken || !storedUser) {
        await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
        setIsBiometricEnabled(false);
        setIsBiometricLocked(false);
        return { success: false, reason: 'session_expired' };
      }

      const parsedUser = JSON.parse(storedUser) as User;
      setAccessToken(storedToken);
      setUser(parsedUser);
      setIsBiometricLocked(false);
      return { success: true };
    } catch (error) {
      console.error('Biometric login: failed to restore session', error);
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      setIsBiometricEnabled(false);
      setIsBiometricLocked(false);
      return { success: false, reason: 'session_expired' };
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const storedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      const response = await authService.refresh(storedRefresh);

      const toStore: Promise<void>[] = [
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.accessToken),
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user)),
      ];
      if (response.refreshToken) {
        toStore.push(SecureStore.setItemAsync(REFRESH_TOKEN_KEY, response.refreshToken));
      }
      await Promise.all(toStore);

      setAccessToken(response.accessToken);
      setUser(response.user);
      setIsBiometricLocked(false);
      diagnostics.recordAuthRefresh('success');
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      diagnostics.recordAuthRefresh('error');
      await logout();
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!user && !!accessToken,
    isBiometricEnabled,
    isBiometricLocked,
    needsCompanyDetails,
    needsPassword,
    login,
    loginWithSocial,
    signup,
    logout,
    refreshToken,
    clearNeedsCompanyDetails,
    clearNeedsPassword,
    enableBiometricLogin,
    loginWithBiometric,
    getBiometricAvailability,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
