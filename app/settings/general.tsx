/**
 * General Settings: measurement unit, language, theme, phone default, and other global preferences.
 * Changes apply immediately across the app.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ruler, Globe, Check, Minus, Plus, Sun, Moon, Smartphone, Phone, LayoutGrid } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useI18n } from '@/lib/i18n';
import { 
  useSettings, 
  PREFERRED_UNIT_OPTIONS, 
  PHONE_PREFIX_OPTIONS,
  type PreferredUnit,
  type PhonePrefix,
} from '@/contexts/SettingsContext';
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext';
import { Spacing, Typography, BorderRadius, Shadows } from '@/constants/design';
import { getUnitDisplay } from '@/constants/units';

const SECTION_TITLE_MARGIN_TOP = 28;
const SECTION_TITLE_MARGIN_BOTTOM = 12;
const OPTION_MIN_HEIGHT = 52;
const OPTION_PADDING_H = 16;
const OPTION_PADDING_V = 14;
const CARD_PADDING = 20;
const BREAKPOINT_TABLET = 600;

const THEME_OPTIONS: { value: ThemePreference; labelKey: string; icon: typeof Sun }[] = [
  { value: 'system', labelKey: 'settings.themeSystem', icon: Smartphone },
  { value: 'light', labelKey: 'settings.themeLight', icon: Sun },
  { value: 'dark', labelKey: 'settings.themeDark', icon: Moon },
];

export default function GeneralSettingsScreen() {
  const { colors, themePreference, setThemePreference } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();

  const { 
    preferredUnit, 
    setPreferredUnit, 
    defaultPhonePrefix, 
    setDefaultPhonePrefix,
    showRecentOrders,
    setShowRecentOrders,
  } = useSettings();
  const { width } = useWindowDimensions();
  const isTablet = width >= BREAKPOINT_TABLET;

  const handleUnitChange = (unit: PreferredUnit) => {
    if (unit !== preferredUnit) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPreferredUnit(unit);
    }
  };

  const handleLocaleChange = (loc: 'en' | 'ro') => {
    if (loc !== locale) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLocale(loc);
    }
  };

  const handleThemeChange = (theme: ThemePreference) => {
    if (theme !== themePreference) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setThemePreference(theme);
    }
  };

  const handlePhonePrefixChange = (prefix: PhonePrefix) => {
    if (prefix !== defaultPhonePrefix) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setDefaultPhonePrefix(prefix);
    }
  };

  const handleShowRecentOrdersChange = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowRecentOrders(value);
  };

  return (
    <ScreenContainer noPadding>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Measurement */}
        <View style={[styles.section]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('settings.measurement')}</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>{t('settings.measurementDescription')}</Text>
          <View style={[styles.optionsCard, { backgroundColor: colors.surface }]}>
            {PREFERRED_UNIT_OPTIONS.map((unit) => {
              const symbol = getUnitDisplay(unit) ?? unit;
              const label = unit === 'inch' ? t('settings.inches') : t('settings.centimetres');
              const isActive = preferredUnit === unit;
              return (
                <TouchableOpacity
                  key={unit}
                  style={[styles.optionRow, isActive && { backgroundColor: colors.primaryLight + '20' }]}
                  onPress={() => handleUnitChange(unit)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioOuter, { borderColor: colors.border }, isActive && { borderColor: colors.primary }]}>
                    {isActive && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Ruler size={20} color={colors.textSecondary} style={styles.optionIcon} />
                  <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{label}</Text>
                  <Text style={[styles.optionSymbol, { color: colors.textSecondary }]}>{symbol}</Text>
                  {isActive && <Check size={20} color={colors.primary} strokeWidth={3} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Language */}
        <View style={[styles.section]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('settings.language')}</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>{t('settings.languageDescription')}</Text>
          <View style={[styles.optionsCard, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.optionRow, locale === 'en' && { backgroundColor: colors.primaryLight + '20' }]}
              onPress={() => handleLocaleChange('en')}
              activeOpacity={0.7}
            >
              <View style={[styles.radioOuter, { borderColor: colors.border }, locale === 'en' && { borderColor: colors.primary }]}>
                {locale === 'en' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
              </View>
              <Globe size={20} color={colors.textSecondary} style={styles.optionIcon} />
              <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{t('settings.english')}</Text>
              {locale === 'en' && <Check size={20} color={colors.primary} strokeWidth={3} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionRow, locale === 'ro' && { backgroundColor: colors.primaryLight + '20' }]}
              onPress={() => handleLocaleChange('ro')}
              activeOpacity={0.7}
            >
              <View style={[styles.radioOuter, { borderColor: colors.border }, locale === 'ro' && { borderColor: colors.primary }]}>
                {locale === 'ro' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
              </View>
              <Globe size={20} color={colors.textSecondary} style={styles.optionIcon} />
              <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{t('settings.romanian')}</Text>
              {locale === 'ro' && <Check size={20} color={colors.primary} strokeWidth={3} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme */}
        <View style={[styles.section]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('settings.theme')}</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>{t('settings.themeDescription')}</Text>
          <View style={[styles.optionsCard, { backgroundColor: colors.surface }]}>
            {THEME_OPTIONS.map((option) => {
              const IconComponent = option.icon;
              const isActive = themePreference === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionRow, isActive && { backgroundColor: colors.primaryLight + '20' }]}
                  onPress={() => handleThemeChange(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioOuter, { borderColor: colors.border }, isActive && { borderColor: colors.primary }]}>
                    {isActive && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <IconComponent size={20} color={colors.textSecondary} style={styles.optionIcon} />
                  <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{t(option.labelKey)}</Text>
                  {isActive && <Check size={20} color={colors.primary} strokeWidth={3} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Homepage */}
        <View style={[styles.section]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('settings.homepage')}</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>{t('settings.homepageDescription')}</Text>
          <View style={[styles.optionsCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.toggleRow]}>
              <LayoutGrid size={20} color={colors.textSecondary} style={styles.optionIcon} />
              <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{t('settings.showRecentOrders')}</Text>
              <Switch
                value={showRecentOrders}
                onValueChange={handleShowRecentOrdersChange}
                trackColor={{ false: colors.border, true: colors.primaryLight + '80' }}
                thumbColor={showRecentOrders ? colors.primary : colors.textTertiary}
              />
            </View>
          </View>
        </View>

        {/* Default Phone Prefix */}
        <View style={[styles.section]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('settings.phonePrefix')}</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>{t('settings.phonePrefixDescription')}</Text>
          <View style={[styles.optionsCard, { backgroundColor: colors.surface }]}>
            {PHONE_PREFIX_OPTIONS.map((option) => {
              const isActive = defaultPhonePrefix === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionRow, isActive && { backgroundColor: colors.primaryLight + '20' }]}
                  onPress={() => handlePhonePrefixChange(option.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioOuter, { borderColor: colors.border }, isActive && { borderColor: colors.primary }]}>
                    {isActive && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Phone size={20} color={colors.textSecondary} style={styles.optionIcon} />
                  <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{t(`settings.phonePrefix_${option.value.replace('+', '')}`) || option.label}</Text>
                  {isActive && <Check size={20} color={colors.primary} strokeWidth={3} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    fontSize: 16,
  },
  sectionDescription: {
    ...Typography.body,
    marginBottom: Spacing.md,
  },
  optionsCard: {
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
    overflow: 'hidden',
    padding: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: OPTION_MIN_HEIGHT,
    paddingHorizontal: OPTION_PADDING_H,
    paddingVertical: OPTION_PADDING_V,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionIcon: {
    marginRight: Spacing.sm,
  },
  optionLabel: {
    ...Typography.body,
    flex: 1,
  },
  optionSymbol: {
    ...Typography.body,
    marginRight: Spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: OPTION_MIN_HEIGHT,
    paddingHorizontal: OPTION_PADDING_H,
    paddingVertical: OPTION_PADDING_V,
  },
  bottomSpacer: {
    height: 40,
  },
});
