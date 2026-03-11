/**
 * Hook for PDF template (appearance) loading, draft state, and save.
 */

import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { fetchPdfTemplate, savePdfTemplate } from '@/lib/services/pdfService';
import type { PdfTemplate } from '@/lib/services/pdfService';
import { fetchCompanySettings, uploadImage, getStoredAccessToken } from '@/lib/api';
import type { CompanySettings } from '@/lib/api';
import {
  DEFAULT_APPEARANCE,
  type AppearanceDraft,
} from '@/lib/pdfCustomizeConstants';

export interface UsePdfTemplateArgs {
  isPro: boolean;
  t: (key: string) => string;
  /** Router (e.g. from useRouter()) with push method for navigation. */
  router: { push: (href: string) => void };
}

export function usePdfTemplate({ isPro, t, router }: UsePdfTemplateArgs) {
  const [template, setTemplate] = useState<PdfTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [colorPickerFor, setColorPickerFor] = useState<'primary' | 'secondary' | null>(null);
  const [fontPickerVisible, setFontPickerVisible] = useState(false);
  const [draft, setDraft] = useState<AppearanceDraft>({ ...DEFAULT_APPEARANCE });
  const [companyData, setCompanyData] = useState<CompanySettings>(null);

  const loadTemplate = useCallback(async () => {
    if (!isPro) {
      const company = await fetchCompanySettings();
      setCompanyData(company ?? null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [data, company] = await Promise.all([
        fetchPdfTemplate(),
        fetchCompanySettings(),
      ]);
      const companyLogo = company?.logoUrl ?? null;
      setCompanyData(company ?? null);
      setTemplate(data);
      setDraft({
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        fontFamily: data.fontFamily,
        showHeader: data.showHeader,
        showFooter: data.showFooter,
        customFooterText: data.customFooterText ?? '',
        layoutType: data.layoutType,
        logoPosition: data.logoPosition ?? 'left',
        logoUrl: companyLogo ?? data.logoUrl ?? null,
      });
    } catch (e) {
      console.error('Load PDF template error:', e);
      Alert.alert(t('common.error'), t('pdf.loadTemplateError'));
    } finally {
      setLoading(false);
    }
  }, [isPro, t]);

  useEffect(() => {
    if (isPro) {
      loadTemplate();
    } else {
      setLoading(false);
    }
  }, [isPro, loadTemplate]);

  const handlePickLogo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('pdf.photoPermissionDenied'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    try {
      const url = await uploadImage(result.assets[0].uri);
      setDraft((prev) => ({ ...prev, logoUrl: url }));
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('common.error'));
    }
  }, [t]);

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!isPro) {
      Alert.alert(t('pdf.customPdfProTitle'), t('pdf.customPdfProMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('pdf.upgradeToPro'), onPress: () => router.push('/subscription') },
      ]);
      return false;
    }
    const token = await getStoredAccessToken();
    if (!token) {
      Alert.alert(t('common.error'), t('pdf.saveTemplateError'));
      return false;
    }
    setSaving(true);
    try {
      await savePdfTemplate(
        {
          logoUrl: companyData?.logoUrl ?? draft.logoUrl,
          logoPosition: draft.logoPosition,
          primaryColor: draft.primaryColor,
          secondaryColor: draft.secondaryColor,
          fontFamily: draft.fontFamily,
          showHeader: draft.showHeader,
          showFooter: draft.showFooter,
          customFooterText: draft.customFooterText || null,
          layoutType: draft.layoutType,
        },
        token
      );
      setTemplate({ ...draft, customFooterText: draft.customFooterText || null });
      return true;
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('pdf.saveTemplateError'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [isPro, t, router, companyData, draft]);

  const handleResetAppearance = useCallback(() => {
    setDraft((prev) => ({
      ...DEFAULT_APPEARANCE,
      logoUrl: prev.logoUrl,
    }));
  }, []);

  return {
    template,
    loading,
    saving,
    draft,
    setDraft,
    companyData,
    colorPickerFor,
    setColorPickerFor,
    fontPickerVisible,
    setFontPickerVisible,
    loadTemplate,
    handlePickLogo,
    handleSave,
    handleResetAppearance,
  };
}
