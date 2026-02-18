/**
 * PDF template and custom PDF generation API (Pro only).
 */

import { api, apiFetch, getStoredAccessToken, ApiError, ApiErrorCode } from '@/lib/api';
import * as FileSystemLegacy from 'expo-file-system/legacy';

export type PdfLayoutType = 'classic' | 'modern' | 'minimal';

export type PdfLogoPosition = 'left' | 'right';

export interface PdfTemplate {
  logoUrl?: string | null;
  logoPosition?: PdfLogoPosition;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  showHeader: boolean;
  showFooter: boolean;
  customFooterText?: string | null;
  layoutType: PdfLayoutType;
}

export async function fetchPdfTemplate(accessToken?: string | null): Promise<PdfTemplate> {
  return apiFetch<PdfTemplate>(api.pdf.template, { token: accessToken ?? undefined });
}

export interface SavePdfTemplateInput {
  logoUrl?: string | null;
  logoPosition?: PdfLogoPosition;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  customFooterText?: string | null;
  layoutType?: PdfLayoutType;
}

export async function savePdfTemplate(
  data: SavePdfTemplateInput,
  accessToken: string
): Promise<PdfTemplate> {
  return apiFetch<PdfTemplate>(api.pdf.template, {
    method: 'PUT',
    token: accessToken,
    body: JSON.stringify(data),
  });
}

// ----- Dynamic document template (Build Your PDF) -----

export type TemplateSectionType = 'header' | 'fields' | 'pricing' | 'contract' | 'signature' | 'measurements';

export interface TemplateFieldItem {
  key: string;
  label: string;
  enabled: boolean;
}

export interface TemplateSectionBase {
  type: TemplateSectionType;
  enabled: boolean;
}

export interface TemplateSectionHeader extends TemplateSectionBase {
  type: 'header';
}

export interface TemplateSectionFields extends TemplateSectionBase {
  type: 'fields';
  title?: string;
  fields: TemplateFieldItem[];
}

export interface TemplateSectionPricing extends TemplateSectionBase {
  type: 'pricing';
}

export interface TemplateSectionContract extends TemplateSectionBase {
  type: 'contract';
  title?: string;
  content: string;
}

export interface TemplateSectionSignature extends TemplateSectionBase {
  type: 'signature';
  showClientLine?: boolean;
  showCompanyLine?: boolean;
  showDateLine?: boolean;
}

export interface TemplateSectionMeasurements extends TemplateSectionBase {
  type: 'measurements';
}

export type TemplateSection =
  | TemplateSectionHeader
  | TemplateSectionFields
  | TemplateSectionPricing
  | TemplateSectionContract
  | TemplateSectionSignature
  | TemplateSectionMeasurements;

export interface TemplateJson {
  sections: TemplateSection[];
}

export interface PdfDocumentTemplateRecord {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean;
  layoutType: string;
  templateJson: TemplateJson;
  createdAt: string;
  updatedAt: string;
}

export interface PdfFieldDefinition {
  key: string;
  label: string;
}

export interface PdfFieldsResponse {
  fields: PdfFieldDefinition[];
  variableKeys: string[];
}

export async function listDocumentTemplates(accessToken: string): Promise<PdfDocumentTemplateRecord[]> {
  return apiFetch<PdfDocumentTemplateRecord[]>(api.pdf.templates, { token: accessToken });
}

export async function getDocumentTemplate(
  id: string,
  accessToken: string
): Promise<PdfDocumentTemplateRecord> {
  return apiFetch<PdfDocumentTemplateRecord>(api.pdf.templateById(id), { token: accessToken });
}

export async function createDocumentTemplate(
  data: { name: string; isDefault?: boolean; layoutType?: string; templateJson: TemplateJson },
  accessToken: string
): Promise<PdfDocumentTemplateRecord> {
  return apiFetch<PdfDocumentTemplateRecord>(api.pdf.templates, {
    method: 'POST',
    token: accessToken,
    body: JSON.stringify(data),
  });
}

export async function updateDocumentTemplate(
  id: string,
  data: { name?: string; isDefault?: boolean; layoutType?: string; templateJson?: TemplateJson },
  accessToken: string
): Promise<PdfDocumentTemplateRecord> {
  return apiFetch<PdfDocumentTemplateRecord>(api.pdf.templateById(id), {
    method: 'PUT',
    token: accessToken,
    body: JSON.stringify(data),
  });
}

export async function fetchPdfFields(accessToken?: string | null): Promise<PdfFieldsResponse> {
  return apiFetch<PdfFieldsResponse>(api.pdf.fields, { token: accessToken ?? undefined });
}

/** Base64 decode that works in React Native (atob may be undefined in Hermes). */
function base64DecodeToBytes(base64: string): Uint8Array {
  if (typeof globalThis.atob === 'function') {
    const binaryString = globalThis.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(123);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  base64 = base64.replace(/\s/g, '').replace(/=+$/, '');
  const len = base64.length;
  const get = (idx: number): number => (idx < len ? lookup[base64.charCodeAt(idx)] ?? 0 : 0);
  const out = new Uint8Array((len * 3) >> 2);
  let j = 0;
  for (let i = 0; i < len; i += 4) {
    const a = get(i);
    const b = get(i + 1);
    const c = get(i + 2);
    const d = get(i + 3);
    out[j++] = (a << 2) | (b >> 4);
    if (i + 2 < len) out[j++] = ((b & 15) << 4) | (c >> 2);
    if (i + 3 < len) out[j++] = ((c & 3) << 6) | d;
  }
  return out.subarray(0, j);
}

/** Turn a data URL (e.g. "data:application/pdf;base64,...") into a PDF ArrayBuffer. Works in React Native (Blob from ArrayBuffer is not supported there). */
function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1]! : dataUrl.replace(/^data:application\/pdf;base64,/, '');
  const bytes = base64DecodeToBytes(base64);
  const ab = new ArrayBuffer(bytes.length);
  new Uint8Array(ab).set(bytes);
  return ab;
}

export interface GeneratePdfResult {
  /** Prefer this for saving; avoids Blob/arrayBuffer() issues in React Native. */
  arrayBuffer: ArrayBuffer;
  /** Set only when Blob creation succeeds (e.g. web). Not supported in RN for binary/typed-array input. */
  blob?: Blob;
}

/** Shared fetch for PDF generate-custom. Throws ApiError on 403 CUSTOM_PDF_PRO_ONLY so UI can show upgrade modal. */
async function fetchGenerateCustomPdf(
  orderId: string,
  options?: { mode?: 'classic' | 'custom'; templateId?: string; accessToken?: string | null }
): Promise<GeneratePdfResult> {
  const token = options?.accessToken ?? (await getStoredAccessToken());
  const url = api.pdf.generateCustom;
  const body: { orderId: string; templateId?: string; mode?: 'classic' | 'custom' } = {
    orderId,
    ...(options?.mode ? { mode: options.mode } : {}),
    ...(options?.templateId ? { templateId: options.templateId } : {}),
  };
  if (__DEV__) {
    console.log('[pdf] Generating PDF:', url, { orderId, hasToken: !!token });
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      messageKey?: string;
      messageParams?: Record<string, string | number>;
    };
    if (res.status === 403 && errBody.code === ApiErrorCode.CUSTOM_PDF_PRO_ONLY) {
      throw new ApiError(
        errBody.messageKey ? '' : (errBody.error ?? 'Custom PDF is available on Pro plan.'),
        errBody.code,
        403,
        errBody.messageKey ? { messageKey: errBody.messageKey, messageParams: errBody.messageParams } : undefined
      );
    }
    const msg = errBody.error ?? res.statusText;
    throw new ApiError(msg, errBody.code, res.status, errBody.messageKey ? { messageKey: errBody.messageKey, messageParams: errBody.messageParams } : undefined);
  }

  // Backend returns raw PDF (application/pdf). Try binary first (arrayBuffer works better in React Native than blob()).
  // Content-Type may be missing or wrong in some RN environments, so we also detect PDF by magic bytes.
  const contentType = res.headers.get('Content-Type') ?? '';
  let buffer: ArrayBuffer;
  try {
    buffer = await res.arrayBuffer();
  } catch (e) {
    if (__DEV__) console.warn('[pdf] arrayBuffer() failed:', e);
    throw new ApiError(
      e instanceof Error ? e.message : 'Failed to read PDF response',
      undefined,
      200
    );
  }

  const bytes = new Uint8Array(buffer);
  const isPdfBinary = bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
  if (contentType.includes('application/pdf') || isPdfBinary) {
    if (__DEV__) console.log('[pdf] Received binary PDF, size:', buffer.byteLength);
    let blob: Blob | undefined;
    try {
      blob = new Blob([buffer], { type: 'application/pdf' });
    } catch {
      // React Native does not support Blob from ArrayBuffer; use arrayBuffer only.
    }
    return { arrayBuffer: buffer, blob };
  }

  // Response is not binary PDF — decode as UTF-8 and try to parse as JSON (data or data.data as data URL or base64)
  try {
    const text = new TextDecoder().decode(buffer);
    const json = JSON.parse(text) as { data?: string | { data?: string } };
    const raw = typeof json?.data === 'string' ? json.data : undefined;
    const nested =
      typeof json?.data === 'object' && json.data !== null && typeof (json.data as { data?: string }).data === 'string'
        ? (json.data as { data: string }).data
        : undefined;
    const dataStr = raw ?? nested;
    if (typeof dataStr === 'string') {
      const dataUrl = dataStr.startsWith('data:') ? dataStr : `data:application/pdf;base64,${dataStr}`;
      if (__DEV__) console.log('[pdf] Using PDF from JSON, length:', dataStr.length);
      const pdfBuffer = dataUrlToArrayBuffer(dataUrl);
      return { arrayBuffer: pdfBuffer };
    }
    if (__DEV__) {
      console.warn('[pdf] Unexpected JSON:', { contentType, hasData: !!json?.data, dataType: typeof json?.data });
    }
  } catch (parseErr) {
    if (__DEV__) console.warn('[pdf] Response not PDF and not valid JSON:', parseErr);
  }
  throw new ApiError('Invalid PDF response: missing data URL or PDF stream', undefined, 200);
}

/** Generate PDF for an order (uses backend generate-custom). On 403 CUSTOM_PDF_PRO_ONLY throws ApiError for upgrade modal. */
export async function generatePdf(
  orderId: string,
  options?: { mode?: 'classic' | 'custom'; templateId?: string; accessToken?: string | null }
): Promise<GeneratePdfResult> {
  return fetchGenerateCustomPdf(orderId, {
    mode: options?.mode,
    templateId: options?.templateId,
    accessToken: options?.accessToken,
  });
}

/** Generate custom PDF for order (Pro only). */
export async function generateCustomPdf(orderId: string, accessToken?: string | null): Promise<GeneratePdfResult> {
  return fetchGenerateCustomPdf(orderId, { accessToken });
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    result += BASE64_CHARS[a! >> 2];
    result += BASE64_CHARS[((a! & 3) << 4) | (b ?? 0) >> 4];
    result += i + 1 < bytes.length ? BASE64_CHARS[((b! & 15) << 2) | (c ?? 0) >> 6] : '=';
    result += i + 2 < bytes.length ? BASE64_CHARS[(c ?? 0) & 63] : '=';
  }
  return result;
}

/**
 * Save custom PDF blob (or ArrayBuffer) to a temp file and return local URI for sharing/download.
 * Prefer passing arrayBuffer when available (e.g. from generatePdf result) to avoid blob.arrayBuffer() issues in React Native.
 * Uses expo-file-system; call Sharing.shareAsync(uri) with the returned URI.
 */
export async function saveCustomPdfBlobToFile(blobOrBuffer: Blob | ArrayBuffer, filename: string): Promise<string> {
  const dir = FileSystemLegacy.documentDirectory;
  if (!dir) throw new Error('Document directory is not available');
  const arrayBuffer =
    blobOrBuffer instanceof ArrayBuffer ? blobOrBuffer : await (blobOrBuffer as Blob).arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  const fileUri = `${dir}${filename}`;
  await FileSystemLegacy.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });
  return fileUri;
}
