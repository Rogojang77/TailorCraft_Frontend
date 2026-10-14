import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { PiggyBank, Wallet, TrendingUp, Settings } from 'lucide-react-native';
import { useI18n } from '@/lib/i18n';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { MetricCard } from '@/components/MetricCard';

export default function FinancialScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { showRecentOrders } = useSettings();
  const router = useRouter();

  const cardSize = showRecentOrders ? 'default' : 'large';
  const gridStyle = showRecentOrders ? styles.metricsGrid : [styles.metricsGrid, styles.metricsGridFullWidth];

  return (
    <ScreenContainer noPadding>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.titleRow}>
              <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>{t('financial.subtitle')}</Text>
            </View>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>{t('financial.hubSubtitle')}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerIconButton, { backgroundColor: colors.surface }]}
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.7}
            >
              <Settings size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dashboardContainer}>
          <View style={gridStyle}>
            <MetricCard
              title={t('financial.receivablesTitle')}
              subtitle={t('financial.receivablesSubtitle')}
              icon={Wallet}
              iconColor={colors.primary}
              onPress={() => router.push('/financial/receivables')}
              size={cardSize}
            />
            <MetricCard
              title={t('financial.profitTitle')}
              subtitle={t('financial.profitSubtitle')}
              icon={TrendingUp}
              iconColor={colors.success}
              onPress={() => router.push('/financial/profit')}
              size={cardSize}
            />
            <MetricCard
              title={t('financial.expensesTitle')}
              subtitle={t('financial.expensesSubtitle')}
              icon={PiggyBank}
              iconColor={colors.warning}
              onPress={() => router.push('/financial/expenses')}
              size={cardSize}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: AtelierRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...AtelierShadow.card,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 28,
    lineHeight: 34,
  },
  pageSubtitle: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 20,
    marginTop: AtelierSpacing.xs,
  },
  dashboardContainer: {
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: AtelierSpacing.md,
    marginBottom: AtelierSpacing.lg,
  },
  metricsGridFullWidth: {
    flexDirection: 'column',
    gap: AtelierSpacing.md,
    marginBottom: AtelierSpacing.xl,
  },
});
