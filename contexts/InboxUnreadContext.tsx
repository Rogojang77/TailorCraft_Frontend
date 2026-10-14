import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/contexts/AuthContext';
import { api, apiFetch } from '@/lib/api/api';

export type InboxListApiResponse = {
  items: unknown[];
  total: number;
  unreadCount: number;
};

type InboxUnreadContextValue = {
  unreadCount: number;
  refreshInboxUnread: () => Promise<void>;
};

const InboxUnreadContext = createContext<InboxUnreadContextValue | null>(null);

export function InboxUnreadProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, accessToken, isLoading } = useAuth();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const syncBadgeCount = useCallback((nextUnreadCount: number) => {
    Notifications.setBadgeCountAsync(Math.max(0, nextUnreadCount)).catch(() => {
      /* ignore badge sync failures */
    });
  }, []);

  const refreshInboxUnread = useCallback(async () => {
    if (!isAuthenticated || !accessToken || isLoading) {
      setUnreadCount(0);
      syncBadgeCount(0);
      return;
    }
    try {
      const data = await apiFetch<InboxListApiResponse>(
        `${api.notifications.inbox}?limit=1&page=1`,
        { token: accessToken }
      );
      const nextUnread = typeof data.unreadCount === 'number' ? data.unreadCount : 0;
      setUnreadCount(nextUnread);
      syncBadgeCount(nextUnread);
    } catch {
      /* offline or auth */
    }
  }, [isAuthenticated, accessToken, isLoading, syncBadgeCount]);

  useEffect(() => {
    refreshInboxUnread();
  }, [refreshInboxUnread, pathname, isAuthenticated, accessToken]);

  return (
    <InboxUnreadContext.Provider value={{ unreadCount, refreshInboxUnread }}>
      {children}
    </InboxUnreadContext.Provider>
  );
}

export function useInboxUnread(): InboxUnreadContextValue {
  const ctx = useContext(InboxUnreadContext);
  if (!ctx) {
    return { unreadCount: 0, refreshInboxUnread: async () => {} };
  }
  return ctx;
}
