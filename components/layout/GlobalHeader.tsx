/**
 * Global header component displaying the company name and page title.
 * Shown at the top of all authenticated screens.
 *
 * Title is determined by:
 * 1. Dynamic title override from context (for entity names like "John's Jacket")
 * 2. Route-to-title mapping (for static titles like "Orders", "Gallery")
 *
 * Back button is shown for all non-tab routes, unless overridden by context.
 *
 * Layout:
 * - Row 1: Company name (centered, primary color)
 * - Row 2: Back button (left) + Page title (center) - only if title is present
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useCompany } from '@/contexts/CompanyContext';
import { usePageTitleContext } from '@/contexts/PageTitleContext';
import { useI18n } from '@/lib/i18n';
import { Spacing, Typography, HeaderBackButtonSize } from '@/constants/design';
import { Button } from '@/components/ui/Button';
import { ProBadge } from '@/components/ProBadge';

/**
 * Maps route paths to i18n translation keys.
 * Routes with null use dynamic titles from context.
 * Routes not in this map also use dynamic titles from context.
 */
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
  '/pdf-customize': 'pdf.customizePdf',
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

  if (ROUTE_TITLES.hasOwnProperty(normalized)) {
    return ROUTE_TITLES[normalized];
  }

  const basePath = normalized.split('/').slice(0, 2).join('/');
  if (basePath && ROUTE_TITLES.hasOwnProperty(basePath)) {
    return ROUTE_TITLES[basePath];
  }

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

  const title = useMemo(() => {
    if (overrides.dynamicTitle != null) {
      return overrides.dynamicTitle;
    }

    const titleKey = getRouteTitleKey(pathname);
    if (titleKey === null) {
      return null;
    }
    if (titleKey === undefined) {
      return null;
    }

    return t(titleKey);
  }, [overrides.dynamicTitle, pathname, t]);

  const backHandler = useMemo(() => {
    if (overrides.onBack != null) {
      return {
        onPress: overrides.onBack,
        accessibilityLabel: overrides.backAccessibilityLabel ?? t('common.back'),
      };
    }

    if (isTabRoute(pathname)) {
      return null;
    }

    return {
      onPress: () => router.back(),
      accessibilityLabel: t('common.back'),
    };
  }, [overrides.onBack, overrides.backAccessibilityLabel, pathname, router, t]);

  const hasTitle = title != null;
  const hasBack = backHandler != null;

  if (isLoading) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          paddingTop: insets.top + Spacing.sm,
        },
      ]}
    >
      {companyName ? (
        <View style={styles.companyRow}>
          <Text style={[styles.companyName, { color: colors.primary }]} numberOfLines={1}>
            {companyName}
          </Text>
          <ProBadge size="sm" style={styles.proBadge} />
        </View>
      ) : null}

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
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  companyName: {
    ...Typography.caption,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  proBadge: {
    flexShrink: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  pageTitle: {
    ...Typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: HeaderBackButtonSize,
    minWidth: HeaderBackButtonSize,
  },
});

export const GlobalHeader = memo(GlobalHeaderComponent);
