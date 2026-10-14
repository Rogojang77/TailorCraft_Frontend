import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { api } from '@/lib/api';
import {
  FALLBACK_CURRENCIES,
  FALLBACK_PHONE_PREFIXES,
  FALLBACK_UNITS,
  type CurrencyOption,
  type PhonePrefixOption,
  type UnitOption,
} from '@/constants/settingsOptions';

export interface SettingsOptions {
  currencies: CurrencyOption[];
  phonePrefixes: PhonePrefixOption[];
  units: UnitOption[];
}

export function useSettingsOptions(): {
  options: SettingsOptions;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [options, setOptions] = useState<SettingsOptions>({
    currencies: FALLBACK_CURRENCIES,
    phonePrefixes: FALLBACK_PHONE_PREFIXES,
    units: FALLBACK_UNITS,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{
        currencies: CurrencyOption[];
        phonePrefixes: PhonePrefixOption[];
        units: UnitOption[];
      }>(api.settings.options, { skipAuth: true });
      if (data?.currencies?.length && data?.phonePrefixes?.length && data?.units?.length) {
        setOptions({
          currencies: data.currencies,
          phonePrefixes: data.phonePrefixes,
          units: data.units,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load settings options'));
      setOptions({
        currencies: FALLBACK_CURRENCIES,
        phonePrefixes: FALLBACK_PHONE_PREFIXES,
        units: FALLBACK_UNITS,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  return { options, isLoading, error, refetch: fetchOptions };
}
