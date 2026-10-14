import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Calendar, Camera, Edit3, Trash2 } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AtelierSpacing, AtelierRadius, FontFamily } from '@/constants/atelierDesign';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/lib/i18n';
import { resolveUploadUrl } from '@/lib/api';
import { MAX_FITTING_PHOTOS } from '@/lib/fittings';
import { ZoomableImageViewer } from '@/components/ZoomableImageViewer';

type FittingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'MISSED';

type FittingItem = {
  id: string;
  scheduledAt: string;
  status: FittingStatus;
  notes?: string | null;
  photos?: string[];
};

export interface OrderFittingsSectionProps {
  fittings: FittingItem[];
  fittingsUpdating: boolean;
  onAddFitting: () => void;
  onOpenFittingDatePicker: (index: number) => void;
  onOpenFittingStatusPicker: (index: number) => void;
  onRemoveFitting: (index: number) => void;
  onAddFittingPhoto: (index: number) => void;
  onRemoveFittingPhoto: (index: number, photoIndex: number) => void;
  /** Fitting whose photo is uploading, or null. */
  uploadingPhotoFittingIndex: number | null;
  formatFittingDateTimeDisplay: (date: Date) => string;
  formatFittingStatus: (value?: FittingStatus) => string;
  getFittingStatusDisplayConfig: (value?: FittingStatus) => { backgroundColor: string; textColor: string };
  showFittingDatePicker: boolean;
  selectedFittingIndex: number | null;
  pendingNewFittingDate: Date | null;
  onConfirmFittingPicker: () => void;
  onFittingDateChangeIos: (event: { type: string }, selectedDate?: Date) => void;
}

export function OrderFittingsSection({
  fittings,
  fittingsUpdating,
  onAddFitting,
  onOpenFittingDatePicker,
  onOpenFittingStatusPicker,
  onRemoveFitting,
  onAddFittingPhoto,
  onRemoveFittingPhoto,
  uploadingPhotoFittingIndex,
  formatFittingDateTimeDisplay,
  formatFittingStatus,
  getFittingStatusDisplayConfig,
  showFittingDatePicker,
  selectedFittingIndex,
  pendingNewFittingDate,
  onConfirmFittingPicker,
  onFittingDateChangeIos,
}: OrderFittingsSectionProps) {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const [viewer, setViewer] = useState<{ fittingIndex: number; photoIndex: number } | null>(null);
  const viewerPhotos = viewer ? (fittings[viewer.fittingIndex]?.photos ?? []) : [];
  const formatFittingDateLine = (date: Date) => {
    const weekday = date.toLocaleDateString('ro-RO', { weekday: 'long' });
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const dayDate = date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const time = date.toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return {
      firstLine: `${capitalizedWeekday} - ${dayDate}`,
      secondLine: `La ora ${time}`,
    };
  };

  return (
    <View style={[styles.extraSection, { backgroundColor: colors.card }]}>
      <View style={styles.extraSectionHeader}>
        <View style={styles.extraSectionTitleRow}>
          <Calendar size={18} color={colors.ink3} />
          <Text style={[styles.extraSectionTitle, { color: colors.textPrimary }]}>{t('orderDetails.fittings.title')}</Text>
        </View>
        <TouchableOpacity
          style={styles.addFittingButton}
          onPress={onAddFitting}
          activeOpacity={0.7}
          disabled={fittingsUpdating}
        >
          <Text style={[styles.addFittingButtonText, { color: colors.brass }]}>
            {fittingsUpdating ? t('orderDetails.fittings.saving') : `+ ${t('orderDetails.fittings.add')}`}
          </Text>
        </TouchableOpacity>
      </View>

      {fittings.length === 0 ? (
        <Text style={[styles.extraSectionEmpty, { color: colors.ink3 }]}>{t('orderDetails.fittings.empty')}</Text>
      ) : (
        fittings.map((fitting, index) => (
          <View key={fitting.id} style={[styles.fittingCard, { borderColor: colors.rule }]}>
          <View style={styles.fittingRow}>
            <TouchableOpacity
              onPress={() => onOpenFittingDatePicker(index)}
              activeOpacity={0.7}
              disabled={fittingsUpdating}
              style={styles.fittingDateButton}
            >
              {(() => {
                const dateLines = formatFittingDateLine(new Date(fitting.scheduledAt));
                return (
                  <>
                    <Text style={[styles.fittingDate, { color: colors.textPrimary }]}>{dateLines.firstLine}</Text>
                    <Text style={[styles.fittingTime, { color: colors.ink3 }]}>{dateLines.secondLine}</Text>
                  </>
                );
              })()}
            </TouchableOpacity>
            <View style={styles.fittingActionsRow}>
              <View
                style={[
                  styles.fittingStatusPill,
                  { backgroundColor: getFittingStatusDisplayConfig(fitting.status).backgroundColor },
                ]}
              >
                <Text style={[styles.fittingStatus, { color: getFittingStatusDisplayConfig(fitting.status).textColor }]} numberOfLines={1}>
                  {formatFittingStatus(fitting.status)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onOpenFittingStatusPicker(index)}
                activeOpacity={0.7}
                disabled={fittingsUpdating}
                style={styles.fittingActionButton}
                accessibilityLabel={t('orderDetails.fittings.changeStatusButton')}
              >
                <Edit3 size={18} color={colors.brass} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onRemoveFitting(index)}
                activeOpacity={0.7}
                disabled={fittingsUpdating}
                style={styles.fittingActionButton}
                accessibilityLabel={t('orderDetails.fittings.delete')}
              >
                <Trash2 size={18} color={colors.ember} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.photoStrip}>
            {(fitting.photos ?? []).map((photo, photoIndex) => (
              <TouchableOpacity
                key={`${photo}-${photoIndex}`}
                onPress={() => setViewer({ fittingIndex: index, photoIndex })}
                onLongPress={() => onRemoveFittingPhoto(index, photoIndex)}
                disabled={fittingsUpdating}
                activeOpacity={0.8}
                accessibilityLabel={t('orderDetails.fittings.photos.open')}
              >
                <Image source={{ uri: resolveUploadUrl(photo) }} style={[styles.photoThumb, { backgroundColor: colors.paperDeep }]} />
              </TouchableOpacity>
            ))}
            {uploadingPhotoFittingIndex === index ? (
              <View style={[styles.photoThumb, styles.photoAdd, { borderColor: colors.rule }]}>
                <ActivityIndicator color={colors.brass} />
              </View>
            ) : (fitting.photos ?? []).length < MAX_FITTING_PHOTOS ? (
              <TouchableOpacity
                onPress={() => onAddFittingPhoto(index)}
                disabled={fittingsUpdating || uploadingPhotoFittingIndex !== null}
                activeOpacity={0.7}
                style={[styles.photoThumb, styles.photoAdd, { borderColor: colors.rule }]}
                accessibilityLabel={t('orderDetails.fittings.photos.add')}
              >
                <Camera size={18} color={colors.brass} />
                <Text style={[styles.photoAddText, { color: colors.brass }]}>{t('orderDetails.fittings.photos.addShort')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {(fitting.photos ?? []).length > 0 && (
            <Text style={[styles.photoHint, { color: colors.ink4 }]}>{t('orderDetails.fittings.photos.hint')}</Text>
          )}
          </View>
        ))
      )}

      <ZoomableImageViewer
        visible={viewer !== null && viewerPhotos.length > 0}
        images={viewerPhotos.map((photo) => ({ uri: resolveUploadUrl(photo) ?? photo }))}
        initialIndex={viewer?.photoIndex ?? 0}
        onClose={() => setViewer(null)}
      />

      {showFittingDatePicker &&
        ((selectedFittingIndex === null && pendingNewFittingDate) ||
          (selectedFittingIndex !== null && fittings[selectedFittingIndex])) && (
          <View style={styles.fittingPickerInline}>
            <View style={styles.fittingPickerDoneRow}>
              <TouchableOpacity onPress={onConfirmFittingPicker} activeOpacity={0.7}>
                <Text style={[styles.fittingPickerDoneText, { color: colors.brass }]}>
                  {selectedFittingIndex === null ? t('common.save') : t('common.done')}
                </Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={
                selectedFittingIndex === null
                  ? (pendingNewFittingDate ?? new Date())
                  : new Date(fittings[selectedFittingIndex].scheduledAt)
              }
              mode="datetime"
              display="spinner"
              onChange={onFittingDateChangeIos}
              textColor={colors.textPrimary}
              themeVariant={isDark ? 'dark' : 'light'}
            />
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  extraSection: {
    marginHorizontal: AtelierSpacing.md,
    marginBottom: AtelierSpacing.md,
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.md,
  },
  extraSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AtelierSpacing.md,
    marginBottom: AtelierSpacing.sm,
  },
  extraSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
    flex: 1,
  },
  extraSectionTitle: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  extraSectionEmpty: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  addFittingButton: {
    borderRadius: AtelierRadius.sm,
    paddingVertical: AtelierSpacing.xs,
    paddingHorizontal: AtelierSpacing.sm,
  },
  addFittingButtonText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
  },
  fittingCard: {
    borderWidth: 1,
    borderRadius: AtelierRadius.md,
    paddingHorizontal: AtelierSpacing.sm,
    paddingVertical: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.xs,
  },
  fittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.sm,
  },
  photoStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AtelierSpacing.xs,
    marginTop: AtelierSpacing.sm,
  },
  photoThumb: {
    width: 56,
    height: 56,
    borderRadius: AtelierRadius.sm,
  },
  photoAdd: {
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  photoAddText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 10,
  },
  photoHint: {
    marginTop: AtelierSpacing.xs,
    fontFamily: FontFamily.sans,
    fontSize: 11,
    lineHeight: 14,
  },
  fittingDateButton: {
    flex: 1,
    marginRight: AtelierSpacing.xs,
  },
  fittingActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.xs,
    marginLeft: 'auto',
  },
  fittingStatusPill: {
    borderRadius: AtelierRadius.full,
    paddingHorizontal: AtelierSpacing.sm,
    paddingVertical: 4,
  },
  fittingDate: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  fittingTime: {
    marginTop: 2,
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    lineHeight: 16,
  },
  fittingStatus: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 12,
    lineHeight: 16,
  },
  fittingActionButton: {
    borderRadius: AtelierRadius.full,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fittingPickerInline: {
    marginTop: AtelierSpacing.sm,
  },
  fittingPickerDoneRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: AtelierSpacing.lg,
    paddingVertical: AtelierSpacing.xs,
  },
  fittingPickerDoneText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
  },
});
