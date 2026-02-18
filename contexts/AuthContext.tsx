import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as authService from '@/lib/services/authService';
import type { SignupData } from '@/lib/services/authService';
import * as diagnostics from '@/lib/diagnostics';
import {
  getBiometricAvailability,
  authenticateWithBiometric,
  type BiometricAvailability,
} from '@/lib/biometric';

export interface User {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
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
  /** True when the user previously opted in to biometric login; token is stored but not loaded until biometric succeeds. */
  isBiometricEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<{ user: User; accessToken: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  /** Enable biometric login after a successful email/password login. Only stores the flag; tokens are already stored. */
  enableBiometricLogin: () => Promise<void>;
  /** Run biometric prompt, then restore session from stored token. */
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
const BIOMETRIC_ENABLED_KEY = 'biometricEnabled';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  // Load stored auth state on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser, biometricEnabled] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
        SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY),
      ]);

      const biometricOn = biometricEnabled === 'true';

      if (biometricOn) {
        // User opted in to biometric: do not auto-load token; show login screen with "Login with Face ID / Fingerprint"
        setIsBiometricEnabled(true);
        setAccessToken(null);
        setUser(null);
      } else if (storedToken && storedUser) {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsBiometricEnabled(false);
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
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
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (data: SignupData): Promise<{ user: User; accessToken: string }> => {
    try {
      const response = await authService.signup(data);

      await Promise.all([
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.accessToken),
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user)),
      ]);

      setAccessToken(response.accessToken);
      setUser(response.user);

      return response;
    } catch (error: unknown) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout(accessToken);
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_KEY),
        SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY),
      ]);

      setAccessToken(null);
      setUser(null);
      setIsBiometricEnabled(false);
    }
  };

  const enableBiometricLogin = async () => {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
    setIsBiometricEnabled(true);
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

    try {
      const [storedToken, storedUser] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);

      if (!storedToken || !storedUser) {
        await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
        setIsBiometricEnabled(false);
        return { success: false, reason: 'session_expired' };
      }

      const parsedUser = JSON.parse(storedUser) as User;
      setAccessToken(storedToken);
      setUser(parsedUser);
      return { success: true };
    } catch (error) {
      console.error('Biometric login: failed to restore session', error);
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      setIsBiometricEnabled(false);
      return { success: false, reason: 'session_expired' };
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await authService.refresh();

      await Promise.all([
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.accessToken),
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user)),
      ]);

      setAccessToken(response.accessToken);
      setUser(response.user);
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
    login,
    signup,
    logout,
    refreshToken,
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
