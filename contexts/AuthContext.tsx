import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, apiFetch } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

export interface CompanyData {
  name: string;
  owner: string;
  phone: string;
  email: string;
  address?: string;
  logoUrl?: string;
}

interface SignupData {
  email: string;
  password: string;
  companyData: CompanyData;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<{ user: User; accessToken: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored auth state on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);

      if (storedToken && storedUser) {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiFetch<{ user: User; accessToken: string }>(
        api.auth.login,
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
          skipAuth: true, // Login endpoint doesn't need auth
        }
      );

      // Store tokens and user
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
      // Call signup endpoint (public, no auth required)
      const response = await apiFetch<{ user: User; accessToken: string }>(
        api.auth.signup,
        {
          method: 'POST',
          body: JSON.stringify(data),
          skipAuth: true, // Signup endpoint doesn't need auth
        }
      );

      // Store tokens and user
      await Promise.all([
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.accessToken),
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user)),
      ]);

      setAccessToken(response.accessToken);
      setUser(response.user);
      
      return response;
    } catch (error: unknown) {
      console.error('Signup error:', error);
      const message = error instanceof Error ? error.message : '';
      const is404 = message.includes('404');
      const isNetwork = /fetch|network|failed|econnrefused/i.test(message);
      if (is404 || isNetwork) {
        throw new Error(
          'Could not reach signup service. If using Docker, ensure the backend container is up (docker compose up -d in backend/). ' +
          'Otherwise run cd backend && npm run dev. On a physical device, set EXPO_PUBLIC_API_URL in .env to your machine\'s IP (e.g. http://192.168.1.x:3001).'
        );
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint to invalidate refresh token
      await apiFetch(api.auth.logout, {
        method: 'POST',
        token: accessToken,
      });
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local logout even if API call fails
    } finally {
      // Clear local storage
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_KEY),
      ]);

      setAccessToken(null);
      setUser(null);
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const response = await apiFetch<{ user: User; accessToken: string }>(
        api.auth.refresh,
        {
          method: 'POST',
          skipAuth: true, // Refresh uses HTTP-only cookie, not Bearer token
        }
      );

      // Update stored tokens and user
      await Promise.all([
        SecureStore.setItemAsync(ACCESS_TOKEN_KEY, response.accessToken),
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(response.user)),
      ]);

      setAccessToken(response.accessToken);
      setUser(response.user);
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, logout
      await logout();
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!user && !!accessToken,
    login,
    signup,
    logout,
    refreshToken,
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
