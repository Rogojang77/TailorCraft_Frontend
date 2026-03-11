/**
 * Constants, types, and pure helpers for PDF customize screen.
 * Used by hooks and components; no React.
 */

import type {
  PdfLayoutType,
  PdfLogoPosition,
  TemplateSection,
  TemplateSectionFields,
  TemplateSectionContract,
  TemplateSectionSignature,
} from '@/lib/services/pdfService';
import type { CompanySettings } from '@/lib/api';

export type { PdfLayoutType, PdfLogoPosition, TemplateSection };

export const LAYOUT_OPTIONS: { value: PdfLayoutType; labelKey: string }[] = [
  { value: 'classic', labelKey: 'pdf.layoutClassic' },
  { value: 'modern', labelKey: 'pdf.layoutModern' },
  { value: 'minimal', labelKey: 'pdf.layoutMinimal' },
];

export const LOGO_POSITION_OPTIONS: { value: 'left' | 'right'; labelKey: string }[] = [
  { value: 'left', labelKey: 'pdf.logoLeft' },
  { value: 'right', labelKey: 'pdf.logoRight' },
];

export const PRESET_FONTS: { value: string; label: string }[] = [
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

export const DOC_SECTION_TYPES: { type: TemplateSection['type']; labelKey: string }[] = [
  { type: 'header', labelKey: 'pdf.sectionClientInfo' },
  { type: 'fields', labelKey: 'pdf.sectionOrderInfo' },
  { type: 'pricing', labelKey: 'pdf.sectionPricing' },
  { type: 'contract', labelKey: 'pdf.sectionContractText' },
  { type: 'signature', labelKey: 'pdf.sectionSignatureBlock' },
  { type: 'measurements', labelKey: 'pdf.sectionMeasurements' },
];

export function createDefaultSection(type: TemplateSection['type']): TemplateSection {
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
        content:
          'This contract is between {{client_name}} and {{company_name}}. Order total: {{order_price}} RON.',
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

export function getSectionLabel(
  type: TemplateSection['type'],
  t: (k: string) => string
): string {
  const found = DOC_SECTION_TYPES.find((s) => s.type === type);
  return found ? t(found.labelKey) : type;
}

/** Sample data used in preview to match generated PDF. RON format matches backend. */
export const SAMPLE_ORDER = {
  clientName: 'Maria Popescu',
  clientPhone: '+40 721 123 456',
  clientEmail: 'client@example.com',
  orderNumber: 'ORD-2025-042',
  orderDate: '17.02.2025',
  total: 1250.5,
  advance: 500,
};

export const SAMPLE_MEASUREMENTS: Record<string, Record<string, string | number>> = {
  garment1: { Chest: 102, Length: 74, Sleeve: 62, Shoulder: 44 },
};

export function formatMoneyPreview(value: number): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getSampleFieldValue(key: string, company: CompanySettings): string {
  const companyName = company?.name ?? 'Your Company';
  const owner = company?.owner ?? 'Owner';
  const phone = company?.phone ?? '0751 234 567';
  const email = company?.email ?? 'contact@company.com';
  const address = company?.address ?? 'Str. Example nr. 1, București';
  const currentDate = new Date().toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
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

export function resolvePreviewVariables(content: string, company: CompanySettings): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    getSampleFieldValue(key.trim(), company)
  );
}

export const DEFAULT_APPEARANCE = {
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

export type AppearanceDraft = Omit<typeof DEFAULT_APPEARANCE, 'logoPosition'> & {
  logoPosition: PdfLogoPosition;
};

export type QuickTemplateId = 'invoice' | 'contract' | 'minimal';

export const QUICK_TEMPLATES: {
  id: QuickTemplateId;
  sectionTypes: TemplateSection['type'][];
}[] = [
  { id: 'invoice', sectionTypes: ['header', 'fields', 'pricing', 'signature'] },
  { id: 'contract', sectionTypes: ['header', 'fields', 'pricing', 'contract', 'signature'] },
  { id: 'minimal', sectionTypes: ['header', 'pricing', 'signature'] },
];

export function applyQuickTemplate(id: QuickTemplateId): TemplateSection[] {
  const config = QUICK_TEMPLATES.find((q) => q.id === id);
  if (!config) return [];
  return config.sectionTypes.map((type) => createDefaultSection(type));
}

export const DEFAULT_SECTIONS: TemplateSection[] = [
  createDefaultSection('header'),
  createDefaultSection('fields'),
  createDefaultSection('pricing'),
  createDefaultSection('contract'),
  createDefaultSection('signature'),
];
