/**
 * Helpers for shared garment templates.
 * Template source: local (editable), shared (read-only), api (read-only).
 * Duplicating a shared template produces a local one (editable).
 */

import type { TemplateSource } from '@/types/templates';

export type { TemplateSource };

export interface WithTemplateMeta {
  templateMeta?: { templateId: string; source: TemplateSource; sharedFromUserId?: string };
}

/** Template source for a garment. Defaults to 'local' when no templateMeta. */
export function getTemplateSource(g: WithTemplateMeta): TemplateSource {
  return g.templateMeta?.source ?? 'local';
}

/** True when template is shared or from API (read-only). */
export function isReadOnlyTemplate(g: WithTemplateMeta): boolean {
  const s = getTemplateSource(g);
  return s === 'shared' || s === 'api';
}

/** Display label for template source. */
export function getTemplateSourceLabel(source: TemplateSource): string {
  switch (source) {
    case 'local':
      return 'Local';
    case 'shared':
      return 'Shared';
    case 'api':
      return 'API';
    default:
      return 'Local';
  }
}

/** Effective source: local when duplicated, otherwise template source. */
export function getEffectiveTemplateSource(
  g: WithTemplateMeta,
  isDuplicated: (templateId: string) => boolean
): TemplateSource {
  const meta = g.templateMeta;
  if (!meta) return 'local';
  if (isDuplicated(meta.templateId)) return 'local';
  return meta.source;
}

/**
 * Whether measurement form/rendering should be read-only.
 * True for shared/api templates unless duplicated. Use for isReadOnly at form level only.
 * Read-only is a rendering concern; business rules stay in callers.
 */
export function getMeasurementFormReadOnly(
  g: WithTemplateMeta | null | undefined,
  isDuplicated: (templateId: string) => boolean
): boolean {
  if (!g?.templateMeta) return false;
  if (isDuplicated(g.templateMeta.templateId)) return false;
  return isReadOnlyTemplate(g);
}
