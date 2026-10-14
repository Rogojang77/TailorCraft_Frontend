import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { PencilLine } from 'lucide-react-native';
import { AtelierSpacing, AtelierRadius, FontFamily } from '@/constants/atelierDesign';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/lib/i18n';
import { resolveUploadUrl } from '@/lib/api';
import { ZoomableImageViewer, type ImageSlide } from '@/components/ZoomableImageViewer';

export interface OrderSketchItem {
  id: string;
  imageUrl: string;
  title?: string | null;
  createdAt: string;
}

export interface OrderSketchesSectionProps {
  sketches: OrderSketchItem[];
}

export function OrderSketchesSection({ sketches }: OrderSketchesSectionProps) {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const slides: ImageSlide[] = useMemo(
    () =>
      sketches.map((s) => ({
        uri: resolveUploadUrl(s.imageUrl) ?? s.imageUrl,
        title: s.title?.trim() || t('orderDetails.sketches.untitled'),
        description: new Date(s.createdAt).toLocaleString(locale === 'ro' ? 'ro-RO' : 'en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      })),
    [sketches, t, locale]
  );

  if (!sketches.length) return null;

  return (
    <View style={[styles.extraSection, { backgroundColor: colors.card }]}>
      <View style={styles.extraSectionTitleRow}>
        <PencilLine size={18} color={colors.ink3} />
        <Text style={[styles.extraSectionTitle, { color: colors.textPrimary }]}>{t('orderDetails.sketches.title')}</Text>
      </View>
      <Text style={[styles.hint, { color: colors.ink3 }]}>{t('orderDetails.sketches.hint')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
        {slides.map((slide, index) => (
          <TouchableOpacity
            key={sketches[index]!.id}
            onPress={() => {
              setViewerIndex(index);
              setViewerOpen(true);
            }}
            activeOpacity={0.85}
            style={[styles.thumbWrap, { borderColor: colors.rule ?? colors.border }]}
          >
            <Image source={{ uri: slide.uri }} style={styles.thumb} resizeMode="cover" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ZoomableImageViewer
        visible={viewerOpen}
        images={slides}
        initialIndex={viewerIndex}
        onClose={() => setViewerOpen(false)}
        onIndexChange={setViewerIndex}
      />
    </View>
  );
}

const THUMB_SIZE = 112;

const styles = StyleSheet.create({
  extraSection: {
    marginHorizontal: AtelierSpacing.md,
    marginBottom: AtelierSpacing.md,
    borderRadius: 12,
    padding: AtelierSpacing.md,
  },
  extraSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.xs,
  },
  extraSectionTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  hint: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: AtelierSpacing.sm,
  },
  thumbRow: {
    gap: AtelierSpacing.sm,
    paddingVertical: AtelierSpacing.xs,
  },
  thumbWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: AtelierRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
});
