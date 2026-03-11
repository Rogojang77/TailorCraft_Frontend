/**
 * Live PDF preview card for the customize screen.
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import type { TemplateSection, TemplateSectionFields, TemplateSectionContract, TemplateSectionSignature } from '@/lib/services/pdfService';
import type { CompanySettings } from '@/lib/api';
import type { ThemeColors } from '@/contexts/ThemeContext';
import {
  getSampleFieldValue,
  resolvePreviewVariables,
  formatMoneyPreview,
  SAMPLE_ORDER,
  SAMPLE_MEASUREMENTS,
  type AppearanceDraft,
} from '@/lib/pdfCustomizeConstants';
import { BorderRadius, Spacing, Shadows } from '@/constants/design';

export interface LivePreviewProps {
  draft: AppearanceDraft;
  sections: TemplateSection[];
  company: CompanySettings;
  getSectionLabel: (type: TemplateSection['type']) => string;
  colors: ThemeColors;
}

export function LivePreview({ draft, sections, company, getSectionLabel, colors }: LivePreviewProps) {
  const enabled = sections.filter((s) => s.enabled);
  const logoRight = draft.logoPosition === 'right';
  const primary = draft.primaryColor;
  const secondary = draft.secondaryColor;
  const companyName = company?.name || 'Your Company';
  const companyOwner = company?.owner || 'Owner';
  const companyPhone = company?.phone || '0751 234 567';
  const companyEmail = company?.email || 'contact@company.com';
  const companyAddress = company?.address;
  const currentDate = new Date().toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <View style={[livePreviewStyles.card, { backgroundColor: colors.surface }]}>
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

        {draft.showFooter && (
          <View style={[livePreviewStyles.footer, { borderTopColor: colors.border }]}>
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
  footer: { marginTop: 8, paddingTop: 6, borderTopWidth: 1 },
  footerText: { fontSize: 9 },
});
