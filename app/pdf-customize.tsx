/**
 * PDF Customization (Pro only). One screen: appearance (logo, colors, font, layout)
 * and PDF content (which sections appear and in what order). Replaces separate pdf-build.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useI18n } from '@/lib/i18n';
import { uploadImage, getStoredAccessToken } from '@/lib/api';
import { fetchCompanySettings, type CompanySettings } from '@/lib/apiCache';
import {
  fetchPdfTemplate,
  savePdfTemplate,
  listDocumentTemplates,
  getDocumentTemplate,
  createDocumentTemplate,
  updateDocumentTemplate,
  fetchPdfFields,
} from '@/lib/services/pdfService';
import type {
  PdfTemplate,
  PdfLayoutType,
  PdfLogoPosition,
  PdfDocumentTemplateRecord,
  TemplateJson,
  TemplateSection,
  TemplateSectionFields,
  TemplateSectionContract,
  TemplateSectionSignature,
  PdfFieldDefinition,
} from '@/lib/services/pdfService';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '@/constants/design';
import { FullScreenLoader } from '@/components/FullScreenLoader';
import { ChevronDown, ChevronUp, GripVertical, RotateCcw, Check, Trash2, ChevronLeft } from 'lucide-react-native';

const LAYOUT_OPTIONS: { value: PdfLayoutType; labelKey: string }[] = [
  { value: 'classic', labelKey: 'pdf.layoutClassic' },
  { value: 'modern', labelKey: 'pdf.layoutModern' },
  { value: 'minimal', labelKey: 'pdf.layoutMinimal' },
];

const LOGO_POSITION_OPTIONS: { value: 'left' | 'right'; labelKey: string }[] = [
  { value: 'left', labelKey: 'pdf.logoLeft' },
  { value: 'right', labelKey: 'pdf.logoRight' },
];

const PRESET_FONTS: { value: string; label: string }[] = [
  { value: 'system-ui', label: 'System UI' },
  { value: 'sans-serif', label: 'Sans Serif' },
  { value: 'serif', label: 'Serif' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Palatino', label: 'Palatino' },
  { value: 'Garamond', label: 'Garamond' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
  { value: 'Lucida Sans', label: 'Lucida Sans' },
  { value: 'Bookman', label: 'Bookman' },
];

const PRESET_COLORS = [
  '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db',
  '#D4AF37', '#b8960c', '#7c6b0a',
  '#1e40af', '#1d4ed8', '#2563eb', '#3b82f6',
  '#14532d', '#166534', '#15803d', '#22c55e',
  '#7c2d12', '#b91c1c', '#dc2626', '#ef4444',
  '#4c1d95', '#6d28d9', '#7c3aed', '#8b5cf6',
  '#0f172a', '#1e293b', '#334155', '#475569',
];

function parseHex(hex: string): string | null {
  const s = hex.replace(/^#/, '').trim();
  if (/^[0-9A-Fa-f]{6}$/.test(s)) return '#' + s;
  if (/^[0-9A-Fa-f]{3}$/.test(s)) {
    const r = s[0]! + s[0];
    const g = s[1]! + s[1];
    const b = s[2]! + s[2];
    return '#' + r + g + b;
  }
  return null;
}

const DOC_SECTION_TYPES: { type: TemplateSection['type']; labelKey: string }[] = [
  { type: 'header', labelKey: 'pdf.sectionClientInfo' },
  { type: 'fields', labelKey: 'pdf.sectionOrderInfo' },
  { type: 'pricing', labelKey: 'pdf.sectionPricing' },
  { type: 'contract', labelKey: 'pdf.sectionContractText' },
  { type: 'signature', labelKey: 'pdf.sectionSignatureBlock' },
  { type: 'measurements', labelKey: 'pdf.sectionMeasurements' },
];

function createDefaultSection(type: TemplateSection['type']): TemplateSection {
  switch (type) {
    case 'header':
      return { type: 'header', enabled: true };
    case 'fields':
      return {
        type: 'fields',
        enabled: true,
        title: 'Client Information',
        fields: [
          { key: 'client_name', label: 'Client Name', enabled: true },
          { key: 'client_phone', label: 'Phone', enabled: true },
          { key: 'client_email', label: 'Email', enabled: false },
        ],
      };
    case 'pricing':
      return { type: 'pricing', enabled: true };
    case 'contract':
      return {
        type: 'contract',
        enabled: true,
        title: 'Agreement',
        content: 'This contract is between {{client_name}} and {{company_name}}. Order total: {{order_price}} RON.',
      };
    case 'signature':
      return {
        type: 'signature',
        enabled: true,
        showClientLine: true,
        showCompanyLine: true,
        showDateLine: true,
      };
    case 'measurements':
      return { type: 'measurements', enabled: true };
    default:
      return { type: 'header', enabled: true };
  }
}

function getSectionLabel(type: TemplateSection['type'], t: (k: string) => string): string {
  const found = DOC_SECTION_TYPES.find((s) => s.type === type);
  return found ? t(found.labelKey) : type;
}

/** Sample data used in preview to match generated PDF. RON format matches backend. */
const SAMPLE_ORDER = {
  clientName: 'Maria Popescu',
  clientPhone: '+40 721 123 456',
  clientEmail: 'maria@example.com',
  orderNumber: 'ORD-2025-042',
  orderDate: '17.02.2025',
  total: 1250.5,
  advance: 500,
};
const SAMPLE_MEASUREMENTS: Record<string, Record<string, string | number>> = {
  garment1: { Chest: 102, Length: 74, Sleeve: 62, Shoulder: 44 },
};

function formatMoneyPreview(value: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getSampleFieldValue(
  key: string,
  company: CompanySettings
): string {
  const companyName = company?.name ?? 'Your Company';
  const owner = company?.owner ?? 'Owner';
  const phone = company?.phone ?? '0751 234 567';
  const email = company?.email ?? 'contact@company.ro';
  const address = company?.address ?? 'Str. Example nr. 1, București';
  const currentDate = new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const map: Record<string, string> = {
    client_name: SAMPLE_ORDER.clientName,
    client_phone: SAMPLE_ORDER.clientPhone,
    client_email: SAMPLE_ORDER.clientEmail,
    order_number: SAMPLE_ORDER.orderNumber,
    order_price: formatMoneyPreview(SAMPLE_ORDER.total),
    order_date: SAMPLE_ORDER.orderDate,
    order_advance: formatMoneyPreview(SAMPLE_ORDER.advance),
    company_name: companyName,
    company_owner: owner,
    company_phone: phone,
    company_email: email,
    company_address: address,
    current_date: currentDate,
  };
  return map[key] ?? '';
}

function resolvePreviewVariables(content: string, company: CompanySettings): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => getSampleFieldValue(key.trim(), company));
}

const DEFAULT_APPEARANCE = {
  primaryColor: '#1f2937',
  secondaryColor: '#6b7280',
  fontFamily: 'system-ui',
  showHeader: true,
  showFooter: true,
  customFooterText: '',
  layoutType: 'classic' as PdfLayoutType,
  logoPosition: 'left' as PdfLogoPosition,
  logoUrl: null as string | null,
};

type AppearanceDraft = Omit<typeof DEFAULT_APPEARANCE, 'logoPosition'> & { logoPosition: PdfLogoPosition };

type QuickTemplateId = 'invoice' | 'contract' | 'minimal';
const QUICK_TEMPLATES: { id: QuickTemplateId; sectionTypes: TemplateSection['type'][] }[] = [
  { id: 'invoice', sectionTypes: ['header', 'fields', 'pricing', 'signature'] },
  { id: 'contract', sectionTypes: ['header', 'fields', 'pricing', 'contract', 'signature'] },
  { id: 'minimal', sectionTypes: ['header', 'pricing', 'signature'] },
];

function applyQuickTemplate(id: QuickTemplateId): TemplateSection[] {
  const config = QUICK_TEMPLATES.find((q) => q.id === id);
  if (!config) return [];
  return config.sectionTypes.map((type) => createDefaultSection(type));
}

interface LivePreviewProps {
  draft: AppearanceDraft;
  sections: TemplateSection[];
  company: CompanySettings;
  getSectionLabel: (type: TemplateSection['type']) => string;
}
function LivePreview({ draft, sections, company, getSectionLabel }: LivePreviewProps) {
  const enabled = sections.filter((s) => s.enabled);
  const logoRight = draft.logoPosition === 'right';
  const primary = draft.primaryColor;
  const secondary = draft.secondaryColor;
  const companyName = company?.name || 'Your Company';
  const companyOwner = company?.owner || 'Owner';
  const companyPhone = company?.phone || '0751 234 567';
  const companyEmail = company?.email || 'contact@company.ro';
  const companyAddress = company?.address;
  const currentDate = new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <View style={livePreviewStyles.card}>
      {/* Logo bar (matches PDF header bar) */}
      <View
        style={[
          livePreviewStyles.bar,
          { backgroundColor: primary, justifyContent: logoRight ? 'flex-end' : 'flex-start' },
        ]}
      >
        {draft.logoUrl ? (
          <Image source={{ uri: draft.logoUrl }} style={livePreviewStyles.logo} resizeMode="contain" />
        ) : (
          <View style={livePreviewStyles.logoPlaceholder} />
        )}
      </View>
      <View style={livePreviewStyles.body}>
        {/* Header block: company name, owner · phone · email, address (only if showHeader) */}
        {draft.showHeader && (
          <>
            <Text style={[livePreviewStyles.headerCompany, { color: primary }]} numberOfLines={1}>
              {companyName}
            </Text>
            <Text style={[livePreviewStyles.previewSub, { color: secondary }]} numberOfLines={1}>
              {companyOwner} · {companyPhone} · {companyEmail}
            </Text>
            {companyAddress ? (
              <Text style={[livePreviewStyles.previewSub, { color: secondary }]} numberOfLines={1}>
                {companyAddress}
              </Text>
            ) : null}
            <View style={livePreviewStyles.sectionGap} />
          </>
        )}

        {/* Sections in order, with exact data that will appear in the PDF */}
        {enabled.map((sec, idx) => {
          if (sec.type === 'header') return null;
          if (sec.type === 'fields') {
            const s = sec as TemplateSectionFields;
            const enabledFields = s.fields?.filter((f) => f.enabled) ?? [];
            return (
              <View key={idx} style={livePreviewStyles.sectionBlock}>
                {s.title ? (
                  <Text style={[livePreviewStyles.sectionTitlePreview, { color: primary }]} numberOfLines={1}>
                    {s.title}
                  </Text>
                ) : null}
                {enabledFields.map((f, i) => (
                  <Text key={i} style={[livePreviewStyles.fieldLine, { color: secondary }]} numberOfLines={1}>
                    {f.label}: {getSampleFieldValue(f.key, company)}
                  </Text>
                ))}
                <View style={livePreviewStyles.sectionGapSmall} />
              </View>
            );
          }
          if (sec.type === 'pricing') {
            return (
              <View key={idx} style={livePreviewStyles.sectionBlock}>
                <Text style={[livePreviewStyles.fieldLineBold, { color: primary }]} numberOfLines={1}>
                  Total: {formatMoneyPreview(SAMPLE_ORDER.total)} RON
                </Text>
                <Text style={[livePreviewStyles.fieldLine, { color: secondary }]} numberOfLines={1}>
                  Advance: {formatMoneyPreview(SAMPLE_ORDER.advance)} RON
                </Text>
                <View style={livePreviewStyles.sectionGapSmall} />
              </View>
            );
          }
          if (sec.type === 'contract') {
            const s = sec as TemplateSectionContract;
            const resolved = resolvePreviewVariables(s.content ?? '', company);
            const firstLine = resolved.split(/\n+/).filter((p) => p.trim())[0]?.trim().slice(0, 80) ?? '';
            return (
              <View key={idx} style={livePreviewStyles.sectionBlock}>
                {s.title ? (
                  <Text style={[livePreviewStyles.sectionTitlePreview, { color: primary }]} numberOfLines={1}>
                    {s.title}
                  </Text>
                ) : null}
                <Text style={[livePreviewStyles.fieldLine, { color: secondary }]} numberOfLines={2}>
                  {firstLine || 'Contract text with {{variables}}'}
                </Text>
                <View style={livePreviewStyles.sectionGapSmall} />
              </View>
            );
          }
          if (sec.type === 'signature') {
            const sig = sec as TemplateSectionSignature;
            return (
              <View key={idx} style={livePreviewStyles.sectionBlock}>
                {sig.showClientLine !== false && (
                  <>
                    <Text style={[livePreviewStyles.signatureLine, { color: secondary }]}>_________________________</Text>
                    <Text style={[livePreviewStyles.signatureLabel, { color: secondary }]}>Client signature</Text>
                  </>
                )}
                {sig.showCompanyLine !== false && (
                  <>
                    <Text style={[livePreviewStyles.signatureLine, { color: secondary }]}>_________________________</Text>
                    <Text style={[livePreviewStyles.signatureLabel, { color: secondary }]}>Company signature</Text>
                  </>
                )}
                {sig.showDateLine !== false && (
                  <Text style={[livePreviewStyles.signatureLabel, { color: secondary }]}>Date: {currentDate}</Text>
                )}
                <View style={livePreviewStyles.sectionGapSmall} />
              </View>
            );
          }
          if (sec.type === 'measurements') {
            const first = Object.entries(SAMPLE_MEASUREMENTS)[0];
            const garmentName = first ? (first[0] === 'garment1' ? 'Shirt' : first[0]) : 'Garment';
            const entries = first?.[1] ?? { Chest: 102, Length: 74 };
            return (
              <View key={idx} style={livePreviewStyles.sectionBlock}>
                <Text style={[livePreviewStyles.sectionTitlePreview, { color: primary }]} numberOfLines={1}>
                  {garmentName}
                </Text>
                {Object.entries(entries).map(([k, v]) => (
                  <Text key={k} style={[livePreviewStyles.fieldLine, { color: secondary }]} numberOfLines={1}>
                    {k}: {String(v)}
                  </Text>
                ))}
                <View style={livePreviewStyles.sectionGapSmall} />
              </View>
            );
          }
          return null;
        })}

        {/* Footer (matches PDF footer) */}
        {draft.showFooter && (
          <View style={livePreviewStyles.footer}>
            <Text style={[livePreviewStyles.footerText, { color: secondary }]} numberOfLines={1}>
              {draft.customFooterText?.trim() || `${companyName} · ${companyPhone}`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
const livePreviewStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  bar: {
    height: 36,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: { width: 64, height: 24 },
  logoPlaceholder: { width: 64, height: 24, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4 },
  body: { padding: Spacing.md },
  headerCompany: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  previewSub: { fontSize: 10, marginBottom: 2 },
  sectionGap: { height: 12, marginBottom: 4 },
  sectionGapSmall: { height: 6 },
  sectionBlock: { marginBottom: 6 },
  sectionTitlePreview: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  fieldLine: { fontSize: 10, marginBottom: 2 },
  fieldLineBold: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
  signatureLine: { fontSize: 9, marginBottom: 2 },
  signatureLabel: { fontSize: 9, marginBottom: 4 },
  footer: { marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: Colors.border },
  footerText: { fontSize: 9 },
});

export default function PdfCustomizeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { refreshSubscription } = useSubscription();
  const { isPremium: isPro } = usePremium();

  const [template, setTemplate] = useState<PdfTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [colorPickerFor, setColorPickerFor] = useState<'primary' | 'secondary' | null>(null);
  const [colorPickerHex, setColorPickerHex] = useState('');
  const [fontPickerVisible, setFontPickerVisible] = useState(false);
  const [draft, setDraft] = useState<AppearanceDraft>({ ...DEFAULT_APPEARANCE });
  // PDF content (sections) – document template
  const [docTemplates, setDocTemplates] = useState<PdfDocumentTemplateRecord[]>([]);
  const [currentDoc, setCurrentDoc] = useState<PdfDocumentTemplateRecord | null>(null);
  const [docName, setDocName] = useState('');
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [docSaving, setDocSaving] = useState(false);
  const [fields, setFields] = useState<PdfFieldDefinition[]>([]);
  const [variableKeys, setVariableKeys] = useState<string[]>([]);
  const [addSectionModalVisible, setAddSectionModalVisible] = useState(false);
  const [fieldSelectorSectionIndex, setFieldSelectorSectionIndex] = useState<number | null>(null);
  const [contractEditIndex, setContractEditIndex] = useState<number | null>(null);
  const [appearanceExpanded, setAppearanceExpanded] = useState(true);
  const [showSaveToast, setShowSaveToast] = useState(false);
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
      const [data, company] = await Promise.all([fetchPdfTemplate(), fetchCompanySettings()]);
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
        logoUrl: data.logoUrl ?? companyLogo,
      });
    } catch (e) {
      console.error('Load PDF template error:', e);
      Alert.alert(t('common.error'), t('pdf.loadTemplateError'));
    } finally {
      setLoading(false);
    }
  }, [isPro, t]);

  useFocusEffect(
    useCallback(() => {
      refreshSubscription();
    }, [refreshSubscription])
  );

  const loadFields = useCallback(async () => {
    try {
      const token = await getStoredAccessToken();
      const res = await fetchPdfFields(token ?? undefined);
      setFields(res.fields);
      setVariableKeys(res.variableKeys);
    } catch {
      setFields([]);
      setVariableKeys([]);
    }
  }, []);

  const loadDocTemplate = useCallback(async () => {
    if (!isPro) return;
    try {
      const token = await getStoredAccessToken();
      if (!token) return;
      const list = await listDocumentTemplates(token);
      setDocTemplates(list);
      if (list.length > 0) {
        const first = list[0]!;
        const doc = await getDocumentTemplate(first.id, token);
        setCurrentDoc(doc);
        setDocName(doc.name);
        setSections(doc.templateJson?.sections ?? []);
      } else {
        setCurrentDoc(null);
        setDocName(t('pdf.defaultTemplate'));
        setSections([
          createDefaultSection('header'),
          createDefaultSection('fields'),
          createDefaultSection('pricing'),
          createDefaultSection('contract'),
          createDefaultSection('signature'),
        ]);
      }
    } catch (e) {
      console.error('Load document template:', e);
      setCurrentDoc(null);
      setDocName(t('pdf.defaultTemplate'));
      setSections([
        createDefaultSection('header'),
        createDefaultSection('fields'),
        createDefaultSection('pricing'),
        createDefaultSection('contract'),
        createDefaultSection('signature'),
      ]);
    }
  }, [isPro, t]);

  useEffect(() => {
    if (isPro) {
      loadTemplate();
      loadFields();
      loadDocTemplate();
    } else setLoading(false);
  }, [isPro, loadTemplate, loadFields, loadDocTemplate]);

  const handlePickLogo = async () => {
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
  };

  const handleAddSection = (type: TemplateSection['type']) => {
    setSections((prev) => [...prev, createDefaultSection(type)]);
    setAddSectionModalVisible(false);
  };

  const openFieldSelector = (index: number) => {
    const sec = sections[index];
    if (sec?.type === 'fields') setFieldSelectorSectionIndex(index);
  };

  const updateFieldsInSection = (index: number, newFields: TemplateSectionFields['fields']) => {
    setSections((prev) => {
      const next = [...prev];
      const sec = next[index];
      if (sec?.type === 'fields') next[index] = { ...sec, fields: newFields };
      return next;
    });
  };

  const insertVariable = (index: number, variable: string) => {
    const sec = sections[index];
    if (sec?.type !== 'contract') return;
    const placeholder = `{{${variable}}}`;
    setSections((prev) => {
      const next = [...prev];
      const s = next[index] as TemplateSectionContract;
      next[index] = { ...s, content: (s.content || '') + placeholder };
      return next;
    });
  };

  const handleSave = async (): Promise<boolean> => {
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
          logoUrl: draft.logoUrl,
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
  };

  const handleSaveDocument = async (): Promise<boolean> => {
    if (!isPro) return false;
    const token = await getStoredAccessToken();
    if (!token) return false;
    setDocSaving(true);
    try {
      const templateJson: TemplateJson = { sections };
      if (currentDoc?.id) {
        await updateDocumentTemplate(
          currentDoc.id,
          { name: docName.trim() || currentDoc.name, templateJson },
          token
        );
      } else {
        await createDocumentTemplate(
          { name: docName.trim() || t('pdf.defaultTemplate'), templateJson, isDefault: docTemplates.length === 0 },
          token
        );
        const list = await listDocumentTemplates(token);
        setDocTemplates(list);
        if (list.length > 0) setCurrentDoc(list[0]!);
      }
      return true;
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('pdf.saveTemplateError'));
      return false;
    } finally {
      setDocSaving(false);
    }
  };

  const handleSaveAll = async () => {
    const ok1 = await handleSave();
    const ok2 = await handleSaveDocument();
    if (ok1 && ok2) setShowSaveToast(true);
  };

  useEffect(() => {
    if (!showSaveToast) return;
    const t = setTimeout(() => setShowSaveToast(false), 2500);
    return () => clearTimeout(t);
  }, [showSaveToast]);

  const handleResetAppearance = () => {
    setDraft({
      ...DEFAULT_APPEARANCE,
      logoUrl: draft.logoUrl,
    });
  };

  const handleQuickTemplate = (id: QuickTemplateId) => {
    setSections(applyQuickTemplate(id));
  };

  const handleRemoveSection = (index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  const moveSectionUp = (index: number) => {
    if (index <= 0) return;
    setSections((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
      return next;
    });
  };

  const moveSectionDown = (index: number) => {
    if (index >= sections.length - 1) return;
    setSections((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
      return next;
    });
  };

  if (!isPro && !loading) {
    return (
      <ScreenContainer>
        <Header title={t('pdf.customizePdf')} onBack={() => router.back()} backAccessibilityLabel={t('common.back')} />
        <View style={styles.upgradeBlock}>
          <Text style={styles.upgradeTitle}>{t('pdf.customPdfProTitle')}</Text>
          <Text style={styles.upgradeMessage}>{t('pdf.customPdfProMessage')}</Text>
          <Button variant="primary" fullWidth onPress={() => router.push('/subscription')} style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>{t('pdf.upgradeToPro')}</Text>
          </Button>
        </View>
      </ScreenContainer>
    );
  }

  if (loading && !template) {
    return (
      <ScreenContainer>
        <Header title={t('pdf.customizePdf')} onBack={() => router.back()} backAccessibilityLabel={t('common.back')} />
        <FullScreenLoader message={t('common.loading')} />
      </ScreenContainer>
    );
  }

  const renderSectionRow = (item: TemplateSection, index: number) => (
    <View key={index} style={styles.docSectionCard}>
      <View style={styles.docSectionRow}>
        <View style={styles.reorderButtons}>
          <TouchableOpacity
            onPress={() => moveSectionUp(index)}
            disabled={index === 0}
            style={styles.reorderBtn}
            accessibilityLabel={t('pdf.moveUp')}
          >
            <ChevronUp size={20} color={index === 0 ? Colors.textTertiary : Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => moveSectionDown(index)}
            disabled={index === sections.length - 1}
            style={styles.reorderBtn}
            accessibilityLabel={t('pdf.moveDown')}
          >
            <ChevronDown size={20} color={index === sections.length - 1 ? Colors.textTertiary : Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.dragHandle}>
          <GripVertical size={20} color={Colors.textTertiary} />
        </View>
        <Switch
          value={item.enabled}
          onValueChange={(v) => {
            setSections((prev) => {
              const next = [...prev];
              next[index] = { ...next[index]!, enabled: v };
              return next;
            });
          }}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={Colors.surface}
        />
        <Text style={[styles.docSectionTitle, !item.enabled && styles.docSectionTitleDisabled]}>
          {getSectionLabel(item.type, t)}
        </Text>
        <TouchableOpacity
          style={styles.removeSectionBtn}
          onPress={() => handleRemoveSection(index)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={t('pdf.removeSection')}
        >
          <Trash2 size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>
      {(item.type === 'fields' || item.type === 'contract') && (
        <TouchableOpacity
          style={styles.docSectionAction}
          onPress={() =>
            item.type === 'fields' ? openFieldSelector(index) : setContractEditIndex(index)
          }
          activeOpacity={0.7}
        >
          <Text style={styles.docSectionActionText}>
            {item.type === 'fields' ? t('pdf.fieldSelector') : t('pdf.sectionContractText')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Button variant="back" onPress={() => router.back()} accessibilityLabel={t('common.back')}>
          <ChevronLeft size={24} color={Colors.textPrimary} />
        </Button>
        <Text style={styles.title}>{t('pdf.customizePdf')}</Text>
      </View>
      {showSaveToast && (
        <View style={styles.toast} pointerEvents="none">
          <Check size={20} color={Colors.textInverse} strokeWidth={2.5} />
          <Text style={styles.toastText}>{t('pdf.templateSaved')}</Text>
        </View>
      )}
      <GestureHandlerRootView style={styles.flex}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Live preview */}
          <Text style={styles.previewLabel}>{t('pdf.previewLabel')}</Text>
          <LivePreview
            draft={draft}
            sections={sections}
            company={companyData}
            getSectionLabel={(type) => getSectionLabel(type, t)}
          />

          {/* Appearance – collapsible */}
          <TouchableOpacity
            style={styles.collapseHeader}
            onPress={() => setAppearanceExpanded((e) => !e)}
            activeOpacity={0.8}
          >
            <Text style={styles.collapseTitle}>{t('pdf.appearanceTitle')}</Text>
            {appearanceExpanded ? (
              <ChevronUp size={22} color={Colors.textSecondary} />
            ) : (
              <ChevronDown size={22} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>
          {appearanceExpanded && (
            <>
          <Text style={styles.blockHint}>{t('pdf.appearanceHint')}</Text>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('pdf.logo')}</Text>
          <TouchableOpacity style={styles.logoBox} onPress={handlePickLogo} activeOpacity={0.8}>
            {draft.logoUrl ? (
              <Image source={{ uri: draft.logoUrl }} style={styles.logoImage} resizeMode="contain" />
            ) : (
              <Text style={styles.logoPlaceholder}>{t('pdf.uploadLogo')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('pdf.logoPosition')}</Text>
          <View style={styles.layoutOptions}>
            {LOGO_POSITION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.layoutCard, draft.logoPosition === opt.value && styles.layoutCardSelected]}
                onPress={() => setDraft((p) => ({ ...p, logoPosition: opt.value }))}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.layoutCardText,
                    draft.logoPosition === opt.value && styles.layoutCardTextSelected,
                  ]}
                >
                  {t(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('pdf.primaryColor')}</Text>
          <TouchableOpacity
            style={styles.colorRow}
            onPress={() => {
              setColorPickerHex(draft.primaryColor);
              setColorPickerFor('primary');
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.colorSwatch, { backgroundColor: draft.primaryColor }]} />
            <Text style={styles.colorHex}>{draft.primaryColor}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('pdf.secondaryColor')}</Text>
          <TouchableOpacity
            style={styles.colorRow}
            onPress={() => {
              setColorPickerHex(draft.secondaryColor);
              setColorPickerFor('secondary');
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.colorSwatch, { backgroundColor: draft.secondaryColor }]} />
            <Text style={styles.colorHex}>{draft.secondaryColor}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('pdf.fontFamily')}</Text>
          <TouchableOpacity
            style={styles.fontRow}
            onPress={() => setFontPickerVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.fontRowLabel, { fontFamily: draft.fontFamily }]} numberOfLines={1}>
              {PRESET_FONTS.find((f) => f.value === draft.fontFamily)?.label ?? draft.fontFamily}
            </Text>
            <Text style={styles.fontRowChevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.sectionTitle}>{t('pdf.showHeader')}</Text>
            <Switch value={draft.showHeader} onValueChange={(v) => setDraft((p) => ({ ...p, showHeader: v }))} />
          </View>
        </View>
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.sectionTitle}>{t('pdf.showFooter')}</Text>
            <Switch value={draft.showFooter} onValueChange={(v) => setDraft((p) => ({ ...p, showFooter: v }))} />
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('pdf.customFooterText')}</Text>
          <Input
            value={draft.customFooterText}
            onChangeText={(v) => setDraft((p) => ({ ...p, customFooterText: v }))}
            placeholder={t('pdf.customFooterPlaceholder')}
            multiline
            containerStyle={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('pdf.layoutType')}</Text>
          <View style={styles.layoutOptions}>
            {LAYOUT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.layoutCard, draft.layoutType === opt.value && styles.layoutCardSelected]}
                onPress={() => setDraft((p) => ({ ...p, layoutType: opt.value }))}
                activeOpacity={0.7}
              >
                <Text style={[styles.layoutCardText, draft.layoutType === opt.value && styles.layoutCardTextSelected]}>
                  {t(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
          <TouchableOpacity style={styles.resetBtn} onPress={handleResetAppearance} activeOpacity={0.7}>
            <RotateCcw size={18} color={Colors.textSecondary} />
            <Text style={styles.resetBtnText}>{t('pdf.resetToDefault')}</Text>
          </TouchableOpacity>
            </>
          )}

          {/* PDF content */}
          <Text style={[styles.blockTitle, styles.blockTitleSpaced]}>{t('pdf.contentTitle')}</Text>
          <Text style={styles.blockHint}>{t('pdf.contentHint')}</Text>
          <View style={styles.quickTemplatesRow}>
            {QUICK_TEMPLATES.map((q) => (
              <TouchableOpacity
                key={q.id}
                style={styles.quickTemplateBtn}
                onPress={() => handleQuickTemplate(q.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.quickTemplateBtnText}>{t(`pdf.quickTemplate.${q.id}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('pdf.templateName')}</Text>
            <Input
              value={docName}
              onChangeText={setDocName}
              placeholder={t('pdf.templateName')}
              containerStyle={styles.input}
            />
          </View>
          <Text style={styles.sectionTitle}>{t('pdf.reorderSections')}</Text>
          <Text style={styles.dragHint}>{t('pdf.tapArrowsToReorder')}</Text>
          <View style={styles.draggableList}>
            {sections.map((item, index) => renderSectionRow(item, index))}
          </View>
          <TouchableOpacity
            style={styles.addSectionBtn}
            onPress={() => setAddSectionModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.addSectionBtnText}>+ {t('pdf.addSection')}</Text>
          </TouchableOpacity>

        <Button
          variant="primary"
          fullWidth
          onPress={handleSaveAll}
          loading={saving || docSaving}
          disabled={saving || docSaving}
          style={styles.saveButton}
        >
          {t('common.save')}
        </Button>
        </ScrollView>
      </GestureHandlerRootView>

      <Modal
        visible={colorPickerFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setColorPickerFor(null)}
      >
        <TouchableOpacity
          style={styles.colorPickerOverlay}
          activeOpacity={1}
          onPress={() => setColorPickerFor(null)}
        >
          <KeyboardAvoidingView behavior="padding" style={styles.colorPickerKeyboardAvoid}>
          <View style={styles.colorPickerCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.colorPickerTitle}>
              {colorPickerFor === 'primary' ? t('pdf.primaryColor') : t('pdf.secondaryColor')}
            </Text>
            <View style={styles.colorPickerPresetGrid}>
              {PRESET_COLORS.map((hex) => (
                <TouchableOpacity
                  key={hex}
                  style={[styles.colorPickerPreset, { backgroundColor: hex }]}
                  onPress={() => {
                    setColorPickerHex(hex);
                    if (colorPickerFor === 'primary') {
                      setDraft((p) => ({ ...p, primaryColor: hex }));
                    } else {
                      setDraft((p) => ({ ...p, secondaryColor: hex }));
                    }
                  }}
                  activeOpacity={0.8}
                />
              ))}
            </View>
            <View style={styles.colorPickerHexRow}>
              <View style={[styles.colorPickerCurrentSwatch, { backgroundColor: colorPickerHex || '#000' }]} />
              <Input
                value={colorPickerHex}
                onChangeText={setColorPickerHex}
                placeholder="#000000"
                containerStyle={styles.colorPickerInput}
              />
            </View>
            <View style={styles.colorPickerActions}>
              <Button
                variant="secondary"
                onPress={() => setColorPickerFor(null)}
                style={styles.colorPickerCancelBtn}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onPress={() => {
                  const parsed = parseHex(colorPickerHex);
                  if (parsed) {
                    if (colorPickerFor === 'primary') {
                      setDraft((p) => ({ ...p, primaryColor: parsed }));
                    } else {
                      setDraft((p) => ({ ...p, secondaryColor: parsed }));
                    }
                  }
                  setColorPickerFor(null);
                }}
                style={styles.colorPickerDoneBtn}
              >
                {t('common.apply')}
              </Button>
            </View>
          </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={fontPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFontPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.fontPickerOverlay}
          activeOpacity={1}
          onPress={() => setFontPickerVisible(false)}
        >
          <View style={styles.fontPickerCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.fontPickerTitle}>{t('pdf.fontFamily')}</Text>
            <ScrollView style={styles.fontPickerList} showsVerticalScrollIndicator={false}>
              {PRESET_FONTS.map((font) => (
                <TouchableOpacity
                  key={font.value}
                  style={[styles.fontPickerItem, draft.fontFamily === font.value && styles.fontPickerItemSelected]}
                  onPress={() => {
                    setDraft((p) => ({ ...p, fontFamily: font.value }));
                    setFontPickerVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.fontPickerItemText, { fontFamily: font.value }]} numberOfLines={1}>
                    {font.label}
                  </Text>
                  {draft.fontFamily === font.value && <Text style={styles.fontPickerItemCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              variant="secondary"
              onPress={() => setFontPickerVisible(false)}
              style={styles.fontPickerCloseBtn}
            >
              {t('common.close')}
            </Button>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add section modal */}
      <Modal visible={addSectionModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddSectionModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{t('pdf.addSection')}</Text>
            {DOC_SECTION_TYPES.map(({ type, labelKey }) => (
              <TouchableOpacity
                key={type}
                style={styles.modalOption}
                onPress={() => handleAddSection(type)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalOptionText}>{t(labelKey)}</Text>
              </TouchableOpacity>
            ))}
            <Button variant="secondary" fullWidth onPress={() => setAddSectionModalVisible(false)}>
              {t('common.cancel')}
            </Button>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Field selector modal */}
      <Modal visible={fieldSelectorSectionIndex !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{t('pdf.fieldSelector')}</Text>
            <ScrollView style={styles.fieldList} showsVerticalScrollIndicator={false}>
              {fieldSelectorSectionIndex !== null &&
                (() => {
                  const sec = sections[fieldSelectorSectionIndex] as TemplateSectionFields | undefined;
                  const currentFields = sec?.fields ?? [];
                  const currentKeys = new Set(currentFields.map((f) => f.key));
                  const ordered = [
                    ...currentFields,
                    ...fields.filter((f) => !currentKeys.has(f.key)).map((f) => ({ key: f.key, label: f.label, enabled: false })),
                  ];
                  return ordered.map((f) => (
                    <View key={f.key} style={styles.fieldRow}>
                      <Switch
                        value={currentFields.find((x) => x.key === f.key)?.enabled ?? f.enabled}
                        onValueChange={(v) => {
                          const next = currentFields.some((x) => x.key === f.key)
                            ? currentFields.map((x) => (x.key === f.key ? { ...x, enabled: v } : x))
                            : [...currentFields, { ...f, enabled: v }];
                          updateFieldsInSection(fieldSelectorSectionIndex, next);
                        }}
                        trackColor={{ false: Colors.border, true: Colors.primary }}
                        thumbColor={Colors.surface}
                      />
                      <Text style={styles.fieldLabel}>{f.label}</Text>
                    </View>
                  ));
                })()}
            </ScrollView>
            <Button fullWidth onPress={() => setFieldSelectorSectionIndex(null)}>
              {t('common.close')}
            </Button>
          </View>
        </View>
      </Modal>

      {/* Contract text editor modal */}
      <Modal visible={contractEditIndex !== null} transparent animationType="fade">
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{t('pdf.sectionContractText')}</Text>
            <Text style={styles.variableHint}>{t('pdf.availableVariables')}</Text>
            <View style={styles.variableChips}>
              {variableKeys.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={styles.chipHighlight}
                  onPress={() => contractEditIndex !== null && insertVariable(contractEditIndex, key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipHighlightText}>{'{{' + key + '}}'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {contractEditIndex !== null &&
              (() => {
                const sec = sections[contractEditIndex] as TemplateSectionContract | undefined;
                const content = sec?.content ?? '';
                const variableRegex = /\{\{[^}]+\}\}/g;
                const parts = content ? content.split(variableRegex) : [];
                const matches = content ? content.match(variableRegex) ?? [] : [];
                return (
                  <>
                    <TextInput
                      style={styles.contractInput}
                      multiline
                      placeholder={t('pdf.contractPlaceholder')}
                      value={content}
                      onChangeText={(text) => {
                        setSections((prev) => {
                          const next = [...prev];
                          const s = next[contractEditIndex] as TemplateSectionContract;
                          next[contractEditIndex] = { ...s, content: text };
                          return next;
                        });
                      }}
                    />
                    {content.length > 0 && (
                      <View style={styles.contractPreview}>
                        <Text style={styles.contractPreviewLabel}>{t('pdf.previewLabel')}</Text>
                        <Text style={styles.contractPreviewText}>
                          {parts.map((p, i) => (
                            <Text key={i}>
                              {p}
                              {matches[i] ? (
                                <Text style={styles.contractPreviewVar}>{matches[i]}</Text>
                              ) : null}
                            </Text>
                          ))}
                        </Text>
                      </View>
                    )}
                  </>
                );
              })()}
            <Button fullWidth onPress={() => setContractEditIndex(null)} style={styles.contractModalClose}>
              {t('common.close')}
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.h2,
    flex: 1,
    textAlign: 'center',
  },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  toast: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.success,
    zIndex: 1000,
  },
  toastText: { ...Typography.bodyBold, color: Colors.textInverse, fontSize: 14 },
  previewLabel: {
    ...Typography.small,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  collapseTitle: {
    ...Typography.bodyBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    alignSelf: 'flex-start',
  },
  resetBtnText: { ...Typography.small, color: Colors.textSecondary },
  quickTemplatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickTemplateBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.borderLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickTemplateBtnText: { ...Typography.small, fontWeight: '600', color: Colors.textPrimary },
  section: { marginBottom: Spacing.lg },
  blockTitle: {
    ...Typography.bodyBold,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  blockTitleSpaced: { marginTop: Spacing.xl },
  blockHint: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  dragHint: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  docSectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  docSectionCardDragging: { opacity: 0.95, ...Shadows.md },
  reorderButtons: { flexDirection: 'column', alignItems: 'center', marginRight: Spacing.xs },
  reorderBtn: { padding: 2 },
  dragHandle: { padding: Spacing.xs, marginRight: Spacing.xs },
  docSectionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  docSectionTitle: { ...Typography.bodyBold, fontSize: 14, color: Colors.textPrimary, flex: 1 },
  docSectionTitleDisabled: { color: Colors.textTertiary },
  removeSectionBtn: { padding: Spacing.xs },
  docSectionAction: { marginTop: Spacing.sm, paddingVertical: Spacing.xs },
  docSectionActionText: { ...Typography.small, color: Colors.primary, fontWeight: '600' },
  draggableList: { marginBottom: Spacing.md },
  addSectionBtn: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  addSectionBtnText: { ...Typography.body, color: Colors.textSecondary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: { ...Typography.bodyBold, fontSize: 18, marginBottom: Spacing.md, color: Colors.textPrimary },
  modalOption: { paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  modalOptionText: { ...Typography.body, color: Colors.textPrimary },
  fieldList: { maxHeight: 280, marginBottom: Spacing.md },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  fieldLabel: { ...Typography.body, color: Colors.textPrimary },
  variableHint: { ...Typography.small, color: Colors.textSecondary, marginBottom: Spacing.sm },
  variableChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  chip: { backgroundColor: Colors.borderLight, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.sm },
  chipText: { ...Typography.small, color: Colors.primary },
  chipHighlight: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  chipHighlightText: { ...Typography.small, color: Colors.primaryDark, fontWeight: '600' },
  contractInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 120,
    textAlignVertical: 'top',
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  contractPreview: {
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  contractPreviewLabel: { ...Typography.small, color: Colors.textTertiary, marginBottom: 4 },
  contractPreviewText: { ...Typography.small, color: Colors.textSecondary },
  contractPreviewVar: { color: Colors.primary, fontWeight: '700' },
  contractModalClose: { marginTop: Spacing.sm },
  sectionTitle: {
    ...Typography.bodyBold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  input: { marginTop: 0 },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  colorHex: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
  },
  fontRowLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  fontRowChevron: {
    fontSize: 20,
    color: Colors.textSecondary,
    fontWeight: '300',
  },
  fontPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  fontPickerCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxHeight: '80%',
    width: '90%',
    maxWidth: '90%',
    alignSelf: 'center',
  },
  fontPickerTitle: {
    ...Typography.bodyBold,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  fontPickerList: {
    maxHeight: 320,
    marginBottom: Spacing.md,
  },
  fontPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  fontPickerItemSelected: {
    backgroundColor: Colors.borderLight,
  },
  fontPickerItemText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  fontPickerItemCheck: {
    ...Typography.bodyBold,
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },
  fontPickerCloseBtn: {},
  colorPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  colorPickerKeyboardAvoid: {
    flex: 1,
    justifyContent: 'center',
  },
  colorPickerCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxWidth: 340,
    alignSelf: 'center',
  },
  colorPickerTitle: {
    ...Typography.bodyBold,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  colorPickerPresetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  colorPickerPreset: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  colorPickerHexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  colorPickerCurrentSwatch: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  colorPickerInput: { flex: 1, marginTop: 0 },
  colorPickerActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'flex-end',
  },
  colorPickerCancelBtn: { minWidth: 90 },
  colorPickerDoneBtn: { minWidth: 90 },
  logoBox: {
    height: 100,
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: { width: '100%', height: '100%', borderRadius: BorderRadius.md },
  logoPlaceholder: { ...Typography.small, color: Colors.textSecondary },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  layoutOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  layoutCard: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.borderLight,
    minWidth: 100,
  },
  layoutCardSelected: { backgroundColor: Colors.primary },
  layoutCardText: { ...Typography.small, fontWeight: '600', color: Colors.textSecondary },
  layoutCardTextSelected: { color: Colors.textInverse },
  saveButton: { marginTop: Spacing.lg },
  buildPdfLink: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  buildPdfLinkText: { ...Typography.body, color: Colors.primary, fontWeight: '600' },
  upgradeBlock: { padding: Spacing.lg },
  upgradeTitle: { ...Typography.bodyBold, fontSize: 18, color: Colors.textPrimary, marginBottom: Spacing.sm },
  upgradeMessage: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.lg },
  upgradeButton: {},
  upgradeButtonText: { color: Colors.textInverse, fontWeight: '600' },
});
