/**
 * Global header: company nameplate (top center) + bell icon + page title row.
 */
import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCompany } from '@/contexts/CompanyContext';
import { usePageTitleContext } from '@/contexts/PageTitleContext';
import { useI18n } from '@/lib/i18n';
import { FontFamily, AtelierSpacing } from '@/constants/atelierDesign';
import { Button } from '@/components/ui/Button';
import { ProBadge } from '@/components/ProBadge';
import { useInboxUnread } from '@/contexts/InboxUnreadContext';

const BACK_SIZE = 36;

const ROUTE_TITLES: Record<string, string | null> = {
  '/(tabs)': null,
  '/(tabs)/index': null,
  '/(tabs)/orders': 'orders.title',
  '/(tabs)/gallery': 'gallery.title',
  '/(tabs)/profile': 'profile.title',
  '/garments': 'garments.pageTitle',
  '/garments/new': 'garments.new',
  '/clients/new': 'clients.new.pageTitle',
  '/subscription': 'subscription.title',
  '/financial': 'financial.title',
  '/financial/receivables': 'financial.receivablesTitle',
  '/financial/profit': 'financial.profitTitle',
  '/financial/expenses': 'financial.expensesTitle',
  '/financial/expense-new': 'financial.addExpense',
  '/settings/general': 'settings.generalTitle',
  '/account/legal': 'legal.title',
  '/account/feedback': 'feedback.menuItem',
  '/account/newsletter': 'newsletter.title',
  '/account/delete': null,
  '/new-order': null,
  '/new-order/no-clients': 'newOrder.clientRequired',
  '/new-order/client-data': 'newOrder.client.clientData',
  '/new-order/measurements': 'newOrder.measurements.pageTitle',
  '/new-order/summary': 'newOrder.summary.orderSummaryTitle',
  '/order-details': 'orderDetails.title',
  '/client-details': 'clientDetails.title',
  '/notifications': 'notifications.title',
};

function normalizePathname(pathname: string): string {
  const withoutParams = pathname.replace(/\/[a-f0-9-]{36}|\/\d+|\/new$/gi, (match) => {
    if (match === '/new') return '/new';
    return '';
  });
  return withoutParams || '/';
}

function getRouteTitleKey(pathname: string): string | null | undefined {
  const normalized = normalizePathname(pathname);
  if (ROUTE_TITLES.hasOwnProperty(normalized)) return ROUTE_TITLES[normalized];
  const basePath = normalized.split('/').slice(0, 2).join('/');
  if (basePath && ROUTE_TITLES.hasOwnProperty(basePath)) return ROUTE_TITLES[basePath];
  return undefined;
}

function isTabRoute(pathname: string): boolean {
  return pathname.startsWith('/(tabs)');
}

const GlobalHeaderComponent = () => {
  const { colors } = useTheme();
  const { companyName, isLoading } = useCompany();
  const { overrides } = usePageTitleContext();
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { unreadCount } = useInboxUnread();

  const title = useMemo(() => {
    if (overrides.dynamicTitle != null) return overrides.dynamicTitle;
    const titleKey = getRouteTitleKey(pathname);
    if (titleKey === null || titleKey === undefined) return null;
    return t(titleKey);
  }, [overrides.dynamicTitle, pathname, t]);

  const backHandler = useMemo(() => {
    if (overrides.onBack != null) {
      return {
        onPress: overrides.onBack,
        accessibilityLabel: overrides.backAccessibilityLabel ?? t('common.back'),
      };
    }
    if (isTabRoute(pathname)) return null;
    return { onPress: () => router.back(), accessibilityLabel: t('common.back') };
  }, [overrides.onBack, overrides.backAccessibilityLabel, pathname, router, t]);

  if (isLoading) return null;

  const hasTitle = title != null;
  const hasBack = backHandler != null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.paper ?? colors.background,
          borderBottomColor: colors.rule ?? colors.border,
          paddingTop: insets.top + AtelierSpacing.sm,
        },
      ]}
    >
      <View style={styles.companyRowWrap}>
        <View style={styles.companyRow}>
          {companyName ? (
            <>
              <Text style={[styles.companyName, { color: colors.brass ?? colors.primary }]} numberOfLines={1}>
                {companyName}
              </Text>
              <ProBadge size="sm" style={styles.proBadge} />
            </>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.bellWrap}
          onPress={() => router.push('/notifications')}
          accessibilityRole="button"
          accessibilityLabel={t('notifications.title')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Bell size={22} color={colors.textPrimary} strokeWidth={2} />
          {unreadCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.ember ?? colors.error }]}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {hasTitle && (
        <View style={styles.titleRow}>
          {hasBack ? (
            <Button
              variant="back"
              onPress={backHandler.onPress}
              accessibilityLabel={backHandler.accessibilityLabel}
            >
              <ArrowLeft size={24} color={colors.textPrimary} strokeWidth={2} />
            </Button>
          ) : (
            <View style={styles.placeholder} />
          )}
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.placeholder} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: AtelierSpacing.md,
    paddingBottom: AtelierSpacing.sm,
    borderBottomWidth: 1,
  },
  companyRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AtelierSpacing.xs,
    position: 'relative',
    minHeight: 28,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: AtelierSpacing.sm,
    paddingHorizontal: 40,
  },
  bellWrap: {
    position: 'absolute',
    right: 0,
    top: Platform.OS === 'ios' ? 0 : 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#EFE9DC',
    fontFamily: FontFamily.monoBold,
    fontSize: 10,
    lineHeight: 12,
  },
  companyName: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  proBadge: {
    flexShrink: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: AtelierSpacing.xs,
  },
  pageTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: BACK_SIZE,
    minWidth: BACK_SIZE,
  },
});

export const GlobalHeader = memo(GlobalHeaderComponent);
