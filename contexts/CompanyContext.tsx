/**
 * Global company settings context.
 * Provides company name for the global header and other components.
 * Fetches from API and caches in memory; refreshes on focus.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { fetchCompanySettings, invalidateCompanyCache, type CompanySettings } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export interface CompanyContextValue {
  companyName: string;
  isLoading: boolean;
  refreshCompany: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const refreshCompany = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated) {
      setCompanyName('');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const settings = await fetchCompanySettings(forceRefresh);
      setCompanyName(settings?.name ?? '');
    } catch {
      setCompanyName('');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshCompany();
    } else {
      setCompanyName('');
      setIsLoading(false);
    }
  }, [isAuthenticated, refreshCompany]);

  const value: CompanyContextValue = {
    companyName,
    isLoading,
    refreshCompany: () => {
      invalidateCompanyCache();
      return refreshCompany(true);
    },
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany(): CompanyContextValue {
  const ctx = useContext(CompanyContext);
  if (ctx === undefined) {
    throw new Error('useCompany must be used within CompanyProvider');
  }
  return ctx;
}
