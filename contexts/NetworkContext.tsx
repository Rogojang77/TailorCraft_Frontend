/**
 * NetworkContext - Exposes device network connectivity state.
 * Used by OfflineBanner to show "No connection" and offer retry when offline.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

interface NetworkContextType {
  /** true = connected, false = offline, null = unknown/initial load */
  isConnected: boolean | null;
  /** Re-fetch network state (e.g. after user taps Retry on offline banner). */
  retry: () => void;
}

const NetworkContext = createContext<NetworkContextType | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const applyState = useCallback((state: NetInfoState | null) => {
    if (state == null) {
      setIsConnected(null);
      return;
    }
    setIsConnected(state.isConnected ?? false);
  }, []);

  const retry = useCallback(() => {
    NetInfo.fetch().then(applyState);
  }, [applyState]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      applyState(state);
    });
    unsubscribeRef.current = unsubscribe;
    NetInfo.fetch().then(applyState);
    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [applyState]);

  const value: NetworkContextType = {
    isConnected,
    retry,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextType {
  const ctx = useContext(NetworkContext);
  if (ctx == null) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return ctx;
}
