/**
 * General Settings: measurement unit, language, theme, currency, phone prefix, homepage.
 * Uses dropdowns for all selects except homepage (toggle).
 * Currency and phone prefix options come from API with fallback to constants.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  Switch,
  TextInput,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ruler, Globe, Sun, Phone, LayoutGrid, Wallet, ChevronDown, Check, Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useI18n } from '@/lib/i18n';
import {
  useSettings,
  type PreferredUnit,
  type PreferredCurrency,
  type PhonePrefix,
} from '@/contexts/SettingsContext';
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext';
import { useSettingsOptions } from '@/hooks/settings/useSettingsOptions';
import { FontFamily, AtelierSpacing, AtelierShadow } from '@/constants/atelierDesign';
import { getUnitDisplay } from '@/constants/units';

const OPTION_MIN_HEIGHT = 52;
const OPTION_PADDING_H = 16;
const OPTION_PADDING_V = 14;

const THEME_OPTIONS: { value: ThemePreference; labelKey: string }[] = [
  { value: 'system', labelKey: 'settings.themeSystem' },
  { value: 'light', labelKey: 'settings.themeLight' },
  { value: 'dark', labelKey: 'settings.themeDark' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en' as const, labelKey: 'settings.english' },
  { value: 'ro' as const, labelKey: 'settings.romanian' },
];

type SelectType = 'measurement' | 'currency' | 'language' | 'theme' | 'phonePrefix';
type SelectOption = { value: string; label: string };

export default function GeneralSettingsScreen() {
  const { colors, themePreference, setThemePreference } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const { options } = useSettingsOptions();
  const {
    preferredUnit,
    setPreferredUnit,
    preferredCurrency,
    setPreferredCurrency,
    defaultPhonePrefix,
    setDefaultPhonePrefix,
    showRecentOrders,
    setShowRecentOrders,
  } = useSettings();
  const [activeSelect, setActiveSelect] = useState<SelectType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const unitOptions: SelectOption[] = useMemo(
    () =>
      options.units.map((u) => ({
        value: u.id,
        label: `${u.name} (${u.symbol})`,
      })),
    [options.units]
  );
  const currencyOptions: SelectOption[] = useMemo(
    () =>
      options.currencies.map((c) => ({
        value: c.code,
        label: `${c.code} – ${c.name}`,
      })),
    [options.currencies]
  );
  const languageOptions: SelectOption[] = useMemo(
    () => LANGUAGE_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) })),
    [t]
  );
  const themeOptions: SelectOption[] = useMemo(
    () => THEME_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) })),
    [t]
  );
  const phonePrefixOptions: SelectOption[] = useMemo(
    () =>
      options.phonePrefixes.map((p) => ({
        value: p.value,
        label: p.value === '' ? t('settings.phonePrefix_') : p.label,
      })),
    [options.phonePrefixes, t]
  );

  const getOptions = (type: SelectType): SelectOption[] => {
    if (type === 'measurement') return unitOptions;
    if (type === 'currency') return currencyOptions;
    if (type === 'language') return languageOptions;
    if (type === 'theme') return themeOptions;
    return phonePrefixOptions;
  };

  const getSelectedValue = (type: SelectType): string => {
    if (type === 'measurement') return preferredUnit;
    if (type === 'currency') return preferredCurrency;
    if (type === 'language') return locale;
    if (type === 'theme') return themePreference;
    return defaultPhonePrefix;
  };

  const getSelectedLabel = (type: SelectType): string => {
    const selected = getSelectedValue(type);
    const found = getOptions(type).find((o) => o.value === selected);
    if (found) return found.label;
    if (type === 'currency') return selected;
    if (type === 'phonePrefix') return selected || t('settings.phonePrefix_');
    return selected;
  };

  const handleSelect = (value: string) => {
    if (activeSelect === 'measurement' && value !== preferredUnit) setPreferredUnit(value as PreferredUnit);
    if (activeSelect === 'currency' && value !== preferredCurrency) setPreferredCurrency(value as PreferredCurrency);
    if (activeSelect === 'language' && value !== locale) setLocale(value as 'en' | 'ro');
    if (activeSelect === 'theme' && value !== themePreference) setThemePreference(value as ThemePreference);
    if (activeSelect === 'phonePrefix' && value !== defaultPhonePrefix) setDefaultPhonePrefix(value as PhonePrefix);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveSelect(null);
    setSearchQuery('');
  };

  const openSelect = (type: SelectType) => {
    setSearchQuery('');
    setActiveSelect(type);
  };

  const renderSelectRow = (type: SelectType, title: string, description: string, icon: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>{description}</Text>
      <TouchableOpacity
        style={[styles.selectTrigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => openSelect(type)}
        activeOpacity={0.7}
      >
        <View style={styles.selectLeft}>
          {icon}
          <Text style={[styles.selectValue, { color: colors.textPrimary }]} numberOfLines={1}>
            {getSelectedLabel(type)}
          </Text>
        </View>
        <ChevronDown size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const activeOptions = activeSelect ? getOptions(activeSelect) : [];
  const activeSelectedValue = activeSelect ? getSelectedValue(activeSelect) : '';
  const showSearch = activeSelect === 'measurement' || activeSelect === 'currency' || activeSelect === 'phonePrefix';
  const filteredOptions = useMemo(() => {
    if (!showSearch || !searchQuery.trim()) return activeOptions;
    const q = searchQuery.trim().toLowerCase();
    return activeOptions.filter(
      (o) =>
        o.value.toLowerCase().includes(q) ||
        o.label.toLowerCase().includes(q)
    );
  }, [activeOptions, searchQuery, showSearch]);

  const modalTitle =
    activeSelect === 'measurement'
      ? t('settings.measurement')
      : activeSelect === 'currency'
        ? t('settings.currency')
        : activeSelect === 'language'
          ? t('settings.language')
          : activeSelect === 'theme'
            ? t('settings.theme')
            : t('settings.phonePrefix');

  return (
    <ScreenContainer noPadding>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderSelectRow('measurement', t('settings.measurement'), t('settings.measurementDescription'), <Ruler size={20} color={colors.textSecondary} />)}
        {renderSelectRow('currency', t('settings.currency'), t('settings.currencyDescription'), <Wallet size={20} color={colors.textSecondary} />)}
        {renderSelectRow('language', t('settings.language'), t('settings.languageDescription'), <Globe size={20} color={colors.textSecondary} />)}
        {renderSelectRow('theme', t('settings.theme'), t('settings.themeDescription'), <Sun size={20} color={colors.textSecondary} />)}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('settings.homepage')}</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>{t('settings.homepageDescription')}</Text>
          <View style={[styles.homepageCard, { backgroundColor: colors.surface }]}>
            <View style={styles.toggleRow}>
              <LayoutGrid size={20} color={colors.textSecondary} style={styles.iconSpacing} />
              <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{t('settings.showRecentOrders')}</Text>
              <Switch
                value={showRecentOrders}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowRecentOrders(value);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
          </View>
        </View>

        {renderSelectRow('phonePrefix', t('settings.phonePrefix'), t('settings.phonePrefixDescription'), <Phone size={20} color={colors.textSecondary} />)}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal visible={activeSelect !== null} transparent animationType="fade" onRequestClose={() => { setActiveSelect(null); setSearchQuery(''); }}>
        <KeyboardAvoidingView behavior="padding" style={styles.flex1}>
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: 'rgba(27,22,17,0.5)' }]}
          onPress={() => { setActiveSelect(null); setSearchQuery(''); }}
          activeOpacity={1}
        >
          <TouchableOpacity
            style={[styles.modalCard, { backgroundColor: colors.surface }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{modalTitle}</Text>
            {showSearch && (
              <View style={[styles.searchRow, { backgroundColor: colors.ruleSoft ?? colors.rule ?? colors.border, borderColor: colors.rule ?? colors.border }]}>
                <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  placeholder={t('common.search')}
                  placeholderTextColor={colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                showSearch && searchQuery.trim() ? (
                  <View style={styles.emptyRow}>
                    <Text style={[styles.emptyText, { color: colors.textTertiary }]}>{t('common.noResults')}</Text>
                  </View>
                ) : null
              }
              renderItem={({ item }) => {
                const isSelected = item.value === activeSelectedValue;
                return (
                  <TouchableOpacity
                    style={[styles.modalOptionRow, { borderBottomColor: colors.ruleSoft ?? colors.rule ?? colors.border }]}
                    onPress={() => handleSelect(item.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalOptionText, { color: colors.textPrimary }]} numberOfLines={1}>{item.label}</Text>
                    {isSelected ? <Check size={18} color={colors.primary} /> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    paddingHorizontal: AtelierSpacing.lg,
  },
  section: {
    marginBottom: AtelierSpacing.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 20,
    lineHeight: 26,
  },
  sectionDescription: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: AtelierSpacing.md,
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: OPTION_MIN_HEIGHT,
    paddingHorizontal: OPTION_PADDING_H,
    paddingVertical: OPTION_PADDING_V,
    borderRadius: 12,
    borderWidth: 1,
    ...AtelierShadow.card,
  },
  selectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectValue: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    marginLeft: AtelierSpacing.sm,
    flex: 1,
  },
  homepageCard: {
    borderRadius: 12,
    ...AtelierShadow.card,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: OPTION_MIN_HEIGHT,
    paddingHorizontal: OPTION_PADDING_H,
    paddingVertical: OPTION_PADDING_V,
  },
  optionLabel: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  iconSpacing: {
    marginRight: AtelierSpacing.sm,
  },
  flex1: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: AtelierSpacing.lg,
  },
  modalCard: {
    borderRadius: 12,
    maxHeight: '70%',
    paddingVertical: AtelierSpacing.sm,
    ...AtelierShadow.elevated,
  },
  modalTitle: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
    paddingHorizontal: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: AtelierSpacing.lg,
    marginBottom: AtelierSpacing.sm,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: AtelierSpacing.md,
    minHeight: 44,
  },
  searchIcon: {
    marginRight: AtelierSpacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    paddingVertical: AtelierSpacing.sm,
  },
  modalOptionRow: {
    minHeight: 48,
    paddingHorizontal: AtelierSpacing.lg,
    paddingVertical: AtelierSpacing.sm,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOptionText: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
    marginRight: AtelierSpacing.sm,
  },
  emptyRow: {
    padding: AtelierSpacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  bottomSpacer: {
    height: 40,
  },
});
