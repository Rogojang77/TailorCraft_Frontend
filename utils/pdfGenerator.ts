/**
 * Tailor Specification PDF Service
 * Stable for iOS + Android (Expo)
 */

import { getUnitDisplay } from '@/constants/units';
import { File, Paths } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, InteractionManager } from 'react-native';
import { savePdfToFolderAsync } from '@/utils/androidPdfSave';
import {
  getSnapshotEntriesInDefinitionOrder,
  getSnapshotDisplayLabel,
  type SnapshotDefinitionRef,
} from '@/utils/snapshotDisplay';
import { formatMeasurementValueForDisplay } from '@/lib/measurement/measurementValues';

/* ============================= */
/*            TYPES              */
/* ============================= */

/** Per-garment measurement definitions for correct labels, order, and select option resolution in PDF. */
export type PDFMeasurementDefinition = SnapshotDefinitionRef & {
  inputType?: string;
  options?: string[];
};

/** Resolved catalog item for PDF display */
export interface PDFCatalogItem {
  name: string;
  color?: string | null;
  categoryCode: string;
  categoryName?: string;
}

export interface PDFOrderData {
  id: string;
  orderNumber?: string;

  clientName: string;
  clientPhone: string;
  clientEmail?: string;

  orderDate: string;
  deliveryDate?: string;

  notes?: string;

  measurements?: Record<string, Record<string, string>> | null;

  /** When set, PDF uses definition order, API labels (diacritics), and resolves select options. */
  measurementDefinitionsByGarment?: Record<string, PDFMeasurementDefinition[]> | null;

  /** Display order of garment IDs (from Garments screen). When set, sections follow this order. */
  garmentOrder?: string[];

  /** Catalog selections per garment: garmentId -> categoryCode -> itemId(s) */
  catalogSelections?: Record<string, Record<string, string | string[]>> | null;

  /** Resolved catalog items by ID for display */
  resolvedCatalogItems?: Record<string, PDFCatalogItem> | null;

  total?: number;
  advance?: number;
}

export interface PDFCompanyData {
  name: string;
  owner?: string;
  phone?: string;
  email?: string;
  address?: string;
  logo?: string; // base64 string
}

export type GarmentDisplayNames = Record<string, string>;

/** Translated labels for the PDF (from i18n). When provided, PDF uses them instead of hardcoded English. */
export interface PDFLabels {
  orderNumber: string;
  orderDate: string;
  deliveryDate: string;
  client: string;
  phone: string;
  email: string;
  specialInstructions: string;
  generatedOn: string;
  /** Label for catalog selections section, e.g. "Styles & Materials" */
  stylesAndMaterials?: string;
  /** e.g. "Order {{number}}" — used for share dialog title. */
  shareDialogTitle?: string;
}

/* ============================= */
/*        HELPER FUNCTIONS       */
/* ============================= */

function escapeHtml(s?: string): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(value?: number): string {
  if (typeof value !== 'number') return '';
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Resolve stored value for select fields: index → option label, or value as-is if already a label. */
function resolveSelectDisplayValue(value: string, options?: string[] | null): string {
  if (!options?.length) return value;
  const trimmed = String(value).trim();
  const asIndex = parseInt(trimmed, 10);
  if (!Number.isNaN(asIndex) && asIndex >= 0 && asIndex < options.length) {
    return options[asIndex] ?? trimmed;
  }
  if (options.includes(trimmed)) return trimmed;
  return value;
}

/* ============================= */
/*        HTML GENERATOR         */
/* ============================= */

const DEFAULT_LABELS: PDFLabels = {
  orderNumber: 'Order #:',
  orderDate: 'Order Date:',
  deliveryDate: 'Delivery Date:',
  client: 'Client:',
  phone: 'Phone:',
  email: 'Email:',
  specialInstructions: 'Special Instructions',
  generatedOn: 'Generated on',
  stylesAndMaterials: 'Styles & Materials',
};

function generateHTML(
  order: PDFOrderData,
  company: PDFCompanyData,
  garmentDisplayNames: GarmentDisplayNames,
  labels: PDFLabels = DEFAULT_LABELS,
  /**
   * When true, remove almost all outer spacing so the PDF content fills
   * the printable area as much as possible (used on Android).
   */
  noMargins = false
): string {
  const safe = (v?: string) => escapeHtml(v);

  const pageMargin = noMargins ? '0' : '24px 12px 24px 12px';
  const headerPadding = noMargins ? '4px 8px 4px' : '8px 16px 6px';
  const mainPadding = noMargins ? '8px' : '16px';
  const mainPaddingTop = noMargins ? '32px' : '40px';
  const mainPaddingBottom = noMargins ? '16px' : '32px';
  const footerHeight = noMargins ? '20px' : '28px';
  const footerPadding = noMargins ? '0 8px' : '0 16px';

  const measurementSections: string[] = [];
  const measurements = order.measurements ?? {};
  const definitionsByGarment = order.measurementDefinitionsByGarment ?? {};
  const measurementGarmentIds = order.garmentOrder?.length
    ? order.garmentOrder.filter((id) => measurements[id])
    : Object.keys(measurements);

  for (const garmentId of measurementGarmentIds) {
    const entries = measurements[garmentId];
    if (!entries || typeof entries !== 'object') continue;

    const garmentTitle = garmentDisplayNames[garmentId] ?? garmentId;
    const defs = definitionsByGarment[garmentId] ?? [];

    const rows =
      defs.length > 0
        ? getSnapshotEntriesInDefinitionOrder(entries, defs)
            .map(([key, value]) => {
              const def = defs.find((d) => d.key === key);
              const label = getSnapshotDisplayLabel(key, def);
              const isSelect = def?.inputType === 'select' && def?.options?.length;
              const displayValue = isSelect
                ? resolveSelectDisplayValue(value, def?.options)
                : formatMeasurementValueForDisplay(value);
              return `
        <tr>
          <td class="label">${safe(label)}</td>
          <td class="value">${safe(displayValue)}</td>
        </tr>
      `;
            })
            .join('')
        : Object.entries(entries)
            .filter(([, value]) => value != null && String(value).trim() !== '')
            .map(
              ([key, value]) => `
        <tr>
          <td class="label">${safe(key)}</td>
          <td class="value">${safe(formatMeasurementValueForDisplay(value))}</td>
        </tr>
      `
            )
            .join('');

    measurementSections.push(`
      <div class="section-wrapper">
        <div class="section">
          <h3>${safe(garmentTitle)}</h3>
          <table class="measurements">
            ${rows}
          </table>
        </div>
      </div>
    `);
  }

  // Generate catalog selections sections
  const catalogSections: string[] = [];
  const catalogSelections = order.catalogSelections ?? {};
  const resolvedCatalogItems = order.resolvedCatalogItems ?? {};
  const catalogGarmentIds = order.garmentOrder?.length
    ? order.garmentOrder.filter((id) => catalogSelections[id] && Object.keys(catalogSelections[id]).length > 0)
    : Object.keys(catalogSelections);

  for (const garmentId of catalogGarmentIds) {
    const selections = catalogSelections[garmentId];
    if (!selections || typeof selections !== 'object' || Object.keys(selections).length === 0) continue;

    const garmentTitle = garmentDisplayNames[garmentId] ?? garmentId;
    const stylesLabel = labels.stylesAndMaterials ?? DEFAULT_LABELS.stylesAndMaterials;

    const rows = Object.entries(selections)
      .map(([categoryCode, itemIdOrIds]) => {
        const itemId = Array.isArray(itemIdOrIds) ? itemIdOrIds[0] : itemIdOrIds;
        if (!itemId) return '';
        const item = resolvedCatalogItems[itemId];
        const categoryLabel = item?.categoryName ?? categoryCode;
        const itemName = item?.name ?? itemId;
        const colorSwatch = item?.color
          ? `<span style="display:inline-block;width:12px;height:12px;background-color:${safe(item.color)};border:1px solid #ccc;border-radius:2px;margin-right:6px;vertical-align:middle;"></span>`
          : '';
        return `
        <tr>
          <td class="label">${safe(categoryLabel)}</td>
          <td class="value">${colorSwatch}${safe(itemName)}</td>
        </tr>
      `;
      })
      .filter(Boolean)
      .join('');

    if (rows) {
      catalogSections.push(`
      <div class="section-wrapper">
        <div class="section">
          <h3>${safe(garmentTitle)} - ${safe(stylesLabel)}</h3>
          <table class="measurements">
            ${rows}
          </table>
        </div>
      </div>
    `);
    }
  }

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page {
    size: 595px 842px;
    margin: ${pageMargin};
  }

  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    color: #111;
    font-size: 12px;
    line-height: 1.6;
  }

  .header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    background: #fff;
    padding: ${headerPadding};
    box-sizing: border-box;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .main-content {
    padding: ${mainPadding};
    padding-top: ${mainPaddingTop};   /* leave room for header */
    padding-bottom: ${mainPaddingBottom};
    box-sizing: border-box;
  }

  .container {
    width: 100%;
  }

  .logo {
    max-height: 60px;
    margin-bottom: 10px;
  }

  .company-name {
    font-size: 20px;
    font-weight: 700;
  }

  .company-info {
    font-size: 11px;
    color: #555;
    margin-top: 6px;
  }

  .meta {
    margin-top: 25px;
    margin-bottom: 10px;
  }

  .meta-row {
    margin-bottom: 2px;
  }

  .meta-label {
    font-weight: 600;
    display: inline-block;
  }

   /* ============================= */
  /*          SECTIONS             */
  /* ============================= */

  .sections-grid {
    font-size: 0;
  }

  .section-wrapper {
    width: 48%;
    display: inline-block;
    vertical-align: top;
    margin-right: 2%;
    margin-bottom: 20px;
    font-size: 12px;
    box-sizing: border-box;

    page-break-inside: avoid;
    break-inside: avoid;
  }

  .section {
    margin-top: 10px;
  }

  .section h3 {
    font-size: 13px;
    text-transform: uppercase;
    border-bottom: 2px solid #000;
    padding-bottom: 5px;
    margin-bottom: 10px;
    page-break-after: avoid;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    page-break-inside: avoid;
  }

  tr {
    page-break-inside: avoid;
  }

  table td {
    padding: 5px 6px;
    border-bottom: 1px solid #ddd;
  }

  td.label {
    width: 50%;
    font-weight: 500;
  }

  .notes-box {
    border: 1px solid #000;
    padding: 10px;
    margin-top: 10px;
    min-height: 60px;
    white-space: pre-line;
  }

  .signature-section {
    margin-top: 50px;
    display: flex;
    justify-content: space-between;
  }

  .signature-line {
    width: 45%;
    border-top: 1px solid #000;
    text-align: center;
    padding-top: 6px;
    font-size: 11px;
  }

  .footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 10;
    height: ${footerHeight};
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    padding: ${footerPadding};
    box-sizing: border-box;
    font-size: 10px;
    color: #777;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="company-info-container">
      <div class="company-name">${safe(company.name)}</div>
    </div>
    ${company.logo ? `<img src="${company.logo}" class="logo" />` : ''}
  </div>

  <div class="footer">
    ${labels.generatedOn} ${new Date().toLocaleDateString('ro-RO')} · ${safe(company.name ?? '')} · ${safe(company.owner ?? '')} · ${safe(company.phone ?? '')}
  </div>

  <div class="main-content">
    <div class="container">
    <div class="meta">
      <div class="meta-row">
        <span class="meta-label">${safe(labels.orderNumber)}</span> ${safe(order.orderNumber ?? order.id)}
      </div>
      <div class="meta-row">
        <span class="meta-label">${safe(labels.orderDate)}</span> ${safe(order.orderDate)}
      </div>
      ${
        order.deliveryDate
          ? `<div class="meta-row">
               <span class="meta-label">${safe(labels.deliveryDate)}</span> ${safe(order.deliveryDate)}
             </div>`
          : ''
      }
      <div class="meta-row">
        <span class="meta-label">${safe(labels.client)}</span> ${safe(order.clientName)}
      </div>
      <div class="meta-row">
        <span class="meta-label">${safe(labels.phone)}</span> ${safe(order.clientPhone)}
      </div>
      ${
        order.clientEmail
          ? `<div class="meta-row">
               <span class="meta-label">${safe(labels.email)}</span> ${safe(order.clientEmail)}
             </div>`
          : ''
      }
    </div>

    <div class="sections-grid">
    ${measurementSections.join('')}
    ${catalogSections.join('')}
    </div>

    ${
      order.notes
        ? `
      <div class="section-wrapper" style="width:100%;">
        <div class="section">
          <h3>${safe(labels.specialInstructions)}</h3>
          <div class="notes-box">${safe(order.notes)}</div>
        </div>
      </div>
      `
        : ''
    }

    </div>
  </div>
</body>
</html>
`;
}

/* ============================= */
/*        PDF GENERATOR          */
/* ============================= */

async function createPDF(
  order: PDFOrderData,
  company: PDFCompanyData,
  garmentDisplayNames: GarmentDisplayNames,
  labels: PDFLabels = DEFAULT_LABELS
) {
  const html = generateHTML(
    order,
    company,
    garmentDisplayNames,
    labels,
    Platform.OS === 'android'
  );

  return Print.printToFileAsync({
    html,
    width: 595,   // A4 width in points
    height: 842,  // A4 height in points
    margins: {
      // On Android, ask expo-print for zero margins; on iOS keep a small safety margin.
      left: Platform.OS === 'android' ? 0 : 16,
      right: Platform.OS === 'android' ? 0 : 16,
      top: Platform.OS === 'android' ? 0 : 16,
      bottom: Platform.OS === 'android' ? 0 : 16,
    },
  });
}

/* ============================= */
/*        PUBLIC FUNCTIONS       */
/* ============================= */

/** Build order title for dialog and filename (e.g. "Order 123"). */
function getOrderTitle(
  order: PDFOrderData,
  resolvedLabels: PDFLabels
): string {
  return resolvedLabels.shareDialogTitle != null
    ? resolvedLabels.shareDialogTitle.replace(/\{\{number\}\}/g, String(order.orderNumber ?? order.id))
    : `Order ${order.orderNumber ?? order.id}`;
}

/** Sanitize string for use as a file name (no path or invalid chars). */
function sanitizeFileName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '_').trim() || 'Order';
}

export async function shareOrderPDF(
  order: PDFOrderData,
  company: PDFCompanyData,
  garmentDisplayNames: GarmentDisplayNames,
  labels?: PDFLabels
) {
  const resolvedLabels = labels ?? DEFAULT_LABELS;
  const { uri } = await createPDF(order, company, garmentDisplayNames, resolvedLabels);

  await new Promise<void>((resolve) =>
    InteractionManager.runAfterInteractions(() => resolve())
  );

  const orderTitle = getOrderTitle(order, resolvedLabels);
  const dialogTitle = orderTitle;
  const timestamp = Date.now();
  const uniqueSuffix = Math.random().toString(36).slice(2, 10);
  const fileName = `${sanitizeFileName(orderTitle)}-${timestamp}-${uniqueSuffix}.pdf`;

  const sourceFile = new File(uri);
  const destFile = new File(Paths.dirname(uri), fileName);
  sourceFile.copy(destFile);
  sourceFile.delete();

  await Sharing.shareAsync(destFile.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle,
    anchor: { x: 0, y: 0, width: 1, height: 1 }, // iPad safe
  });

  return destFile.uri;
}

export async function downloadOrderPDF(
  order: PDFOrderData,
  company: PDFCompanyData,
  garmentDisplayNames: GarmentDisplayNames,
  labels?: PDFLabels
) {
  return shareOrderPDF(order, company, garmentDisplayNames, labels);
}

/**
 * Android only: open the native folder picker and save the order PDF to the selected folder.
 * No-op on iOS. Use for "Save to folder" / "Save to Files" on Android.
 */
export async function saveOrderPdfToFolderAsync(
  order: PDFOrderData,
  company: PDFCompanyData,
  garmentDisplayNames: GarmentDisplayNames,
  labels?: PDFLabels
): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  const resolvedLabels = labels ?? DEFAULT_LABELS;
  const { uri } = await createPDF(order, company, garmentDisplayNames, resolvedLabels);
  const orderTitle = getOrderTitle(order, resolvedLabels);
  const timestamp = Date.now();
  const uniqueSuffix = Math.random().toString(36).slice(2, 10);
  const fileName = `${sanitizeFileName(orderTitle)}-${timestamp}-${uniqueSuffix}.pdf`;
  const base64 = await FileSystemLegacy.readAsStringAsync(uri, {
    encoding: FileSystemLegacy.EncodingType.Base64,
  });
  await savePdfToFolderAsync(base64, fileName);
}
