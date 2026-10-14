import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { api, apiFetch } from '@/lib/api/api';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';
import { useInboxUnread } from '@/contexts/InboxUnreadContext';

export type InboxItem = {
  id: string;
  reminderId: string;
  orderId: string | null;
  customerId?: string | null;
  kind: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

type InboxResponse = {
  items: InboxItem[];
  total: number;
  unreadCount: number;
};

export default function NotificationsScreen() {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const { refreshInboxUnread } = useInboxUnread();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<InboxResponse>(`${api.notifications.inbox}?limit=50&page=1`);
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    }
    await refreshInboxUnread();
  }, [refreshInboxUnread]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          await load();
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  const markRead = async (id: string) => {
    try {
      await apiFetch(api.notifications.inboxMarkRead(id), { method: 'PATCH' });
      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, readAt: it.readAt ?? new Date().toISOString() } : it
        )
      );
      await refreshInboxUnread();
    } catch {
      /* ignore */
    }
  };

  const onPressItem = async (item: InboxItem) => {
    await markRead(item.id);
    if (item.orderId) {
      router.push(`/order-details/${item.orderId}`);
    } else if (item.customerId) {
      router.push(`/client-details/${item.customerId}`);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await apiFetch(api.notifications.inboxReadAll, { method: 'POST' });
      setItems((prev) => prev.map((it) => ({ ...it, readAt: new Date().toISOString() })));
      await refreshInboxUnread();
      await Notifications.setBadgeCountAsync(0);
    } catch {
      /* ignore */
    } finally {
      setMarkingAll(false);
    }
  };

  const formatWhen = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(locale === 'ro' ? 'ro-RO' : 'en-US', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };

  const unreadCount = items.filter((i) => !i.readAt).length;

  return (
    <ScreenContainer safeBottom contentPadding={false} noPadding>
      <View style={styles.toolbar}>
        <View style={{ flex: 1 }} />
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={markAllRead}
            disabled={markingAll}
            style={styles.markAllBtn}
            accessibilityRole="button"
            accessibilityLabel={t('notifications.markAllRead')}
          >
            {markingAll ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[{ fontFamily: FontFamily.mono, fontSize: 11, lineHeight: 16 }, { color: colors.primary, fontWeight: '600' }]}>
                {t('notifications.markAllRead')}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            items.length === 0 ? styles.emptyList : { paddingHorizontal: AtelierSpacing.md, paddingBottom: AtelierSpacing.xl }
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={[{ fontFamily: FontFamily.sans, fontSize: 15, lineHeight: 22 }, { color: colors.textSecondary, textAlign: 'center' }]}>
                {t('notifications.empty')}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const unread = !item.readAt;
            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                  unread && { borderLeftWidth: 3, borderLeftColor: colors.primary },
                ]}
                onPress={() => onPressItem(item)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  {unread ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
                  <Text
                    style={[
                      { fontFamily: FontFamily.sans, fontSize: 15, lineHeight: 22 },
                      { color: colors.textPrimary, flex: 1, fontWeight: unread ? '700' : '500' },
                    ]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <Text style={[{ fontFamily: FontFamily.mono, fontSize: 11, lineHeight: 16 }, { color: colors.ink4 ?? colors.textTertiary, marginLeft: AtelierSpacing.sm }]}>
                    {formatWhen(item.createdAt)}
                  </Text>
                </View>
                <Text
                  style={[{ fontFamily: FontFamily.mono, fontSize: 11, lineHeight: 16 }, { color: colors.textSecondary, marginTop: AtelierSpacing.xs }]}
                  numberOfLines={3}
                >
                  {item.body}
                </Text>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: AtelierSpacing.sm }} />}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.md,
    paddingVertical: AtelierSpacing.sm,
  },
  markAllBtn: {
    paddingVertical: AtelierSpacing.xs,
    paddingHorizontal: AtelierSpacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: AtelierSpacing.xl,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyWrap: {
    padding: AtelierSpacing.xl,
  },
  card: {
    borderRadius: AtelierRadius.md,
    padding: AtelierSpacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AtelierSpacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
});
