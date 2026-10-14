import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  FlatList,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/lib/i18n';
import { api, apiFetch, customerFullName, getLocalizedApiMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { fittingBlocksCalendarSlot, isSameFittingTimeSlot, type FittingStatus, toFittingPayload } from '@/lib/fittings';

type OrderListItem = {
  id: string;
  orderNumber: string;
  status: string;
  customer?: { firstName: string; lastName: string };
};

type OrderFitting = {
  id?: string;
  scheduledAt: string;
  status?: FittingStatus;
  notes?: string | null;
};

type OrderFittingsResponse = {
  fittings?: OrderFitting[];
};

export type ExistingScheduledFittingRef = {
  date: string;
  fittingStatus?: string;
};

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function hasExplicitTime(date: Date): boolean {
  return date.getHours() !== 0 || date.getMinutes() !== 0;
}

export interface CalendarAddFittingModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDateKey: string;
  dateLocale: string;
  /** Other scheduled fittings on this calendar day (e.g. from calendar API); used to block double-booking. */
  existingScheduledFittingsOnSelectedDay?: ExistingScheduledFittingRef[];
  onSaved?: () => void;
}

export function CalendarAddFittingModal({
  visible,
  onClose,
  selectedDateKey,
  dateLocale,
  existingScheduledFittingsOnSelectedDay = [],
  onSaved,
}: CalendarAddFittingModalProps) {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [fittingDateTime, setFittingDateTime] = useState(() => {
    const d = startOfDay(parseDateKey(selectedDateKey));
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [saving, setSaving] = useState(false);
  const [showIosTimePicker, setShowIosTimePicker] = useState(false);

  const selectedDay = useMemo(() => startOfDay(parseDateKey(selectedDateKey)), [selectedDateKey]);

  const formattedSubtitleDate = useMemo(
    () =>
      selectedDay.toLocaleDateString(dateLocale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [selectedDay, dateLocale]
  );

  useEffect(() => {
    if (!visible) return;
    const d = new Date(selectedDay);
    d.setHours(9, 0, 0, 0);
    setFittingDateTime(d);
    setShowIosTimePicker(false);
  }, [visible, selectedDateKey, selectedDay]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      setOrdersLoading(true);
      try {
        const res = await apiFetch<{ orders: OrderListItem[] }>(`${api.orders()}?limit=200`);
        if (cancelled) return;
        const eligible = (res.orders ?? []).filter((o) => o.status !== 'CANCELLED');
        setOrders(eligible);
      } catch {
        if (!cancelled) {
          setOrders([]);
        }
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setSelectedOrderId((prev) => {
      if (prev && orders.some((o) => o.id === prev)) return prev;
      return orders[0]?.id ?? null;
    });
  }, [visible, orders, selectedDateKey]);

  const formatTimeLabel = useCallback(
    (date: Date) =>
      date.toLocaleTimeString(dateLocale, {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [dateLocale]
  );

  const openAndroidTimePicker = useCallback(() => {
    DateTimePickerAndroid.open({
      value: fittingDateTime,
      mode: 'time',
      is24Hour: true,
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        const next = new Date(selectedDay);
        next.setHours(date.getHours(), date.getMinutes(), 0, 0);
        setFittingDateTime(next);
      },
    });
  }, [fittingDateTime, selectedDay]);

  const onIosTimeChange = useCallback(
    (_event: { type: string }, date?: Date) => {
      if (!date) return;
      const next = new Date(selectedDay);
      next.setHours(date.getHours(), date.getMinutes(), 0, 0);
      setFittingDateTime(next);
    },
    [selectedDay]
  );

  const handleSave = async () => {
    if (!selectedOrderId) return;
    if (!hasExplicitTime(fittingDateTime)) {
      Alert.alert(t('orderDetails.fittings.timeRequiredTitle'), t('orderDetails.fittings.timeRequiredMessage'));
      return;
    }
    for (const ref of existingScheduledFittingsOnSelectedDay) {
      if (!fittingBlocksCalendarSlot(ref.fittingStatus)) continue;
      if (isSameFittingTimeSlot(new Date(ref.date), fittingDateTime)) {
        Alert.alert(t('orderDetails.fittings.slotConflictTitle'), t('orderDetails.fittings.slotConflict'));
        return;
      }
    }
    setSaving(true);
    try {
      const orderResponse = await apiFetch<OrderFittingsResponse>(api.orders(selectedOrderId));
      const orderFittings = orderResponse.fittings ?? [];
      for (const f of orderFittings) {
        if (!fittingBlocksCalendarSlot(f.status)) continue;
        if (isSameFittingTimeSlot(new Date(f.scheduledAt), fittingDateTime)) {
          Alert.alert(t('orderDetails.fittings.slotConflictTitle'), t('orderDetails.fittings.slotConflict'));
          return;
        }
      }
      const next = [
        ...orderFittings,
        { scheduledAt: fittingDateTime.toISOString(), status: 'SCHEDULED' as const, notes: null },
      ].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
      await apiFetch(api.orders(selectedOrderId), {
        method: 'PUT',
        body: JSON.stringify({
          fittings: next.map(toFittingPayload),
        }),
      });
      onSaved?.();
      onClose();
    } catch (error) {
      Alert.alert(
        t('common.error'),
        getLocalizedApiMessage(error, t, t('orderDetails.fittings.saveError'))
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = () => {
    if (saving) return;
    onClose();
  };

  const renderOrderRow = ({ item }: { item: OrderListItem }) => {
    const selected = item.id === selectedOrderId;
    const name = item.customer
      ? customerFullName(item.customer.firstName, item.customer.lastName)
      : '—';
    return (
      <TouchableOpacity
        style={[
          styles.orderRow,
          { borderColor: selected ? colors.brass ?? colors.primary : colors.rule ?? colors.border, backgroundColor: selected ? `${colors.brass ?? colors.primary}18` : colors.card },
        ]}
        onPress={() => setSelectedOrderId(item.id)}
        activeOpacity={0.75}
      >
        <Text style={[styles.orderRowNumber, { color: colors.textPrimary }]} numberOfLines={1}>
          #{item.orderNumber}
        </Text>
        <Text style={[styles.orderRowName, { color: colors.ink3 }]} numberOfLines={2}>
          {name}
        </Text>
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <View style={styles.listHeaderBlock}>
      <Text style={[styles.subtitle, { color: colors.ink3 }]}>
        {t('calendar.addFittingSubtitle', { date: formattedSubtitleDate })}
      </Text>
      <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>{t('calendar.addFittingChooseTime')}</Text>
      {Platform.OS === 'android' ? (
        <TouchableOpacity
          style={[styles.timeButton, { borderColor: colors.rule ?? colors.border }]}
          onPress={openAndroidTimePicker}
          activeOpacity={0.7}
          disabled={saving}
        >
          <Text style={[styles.timeButtonText, { color: colors.brass ?? colors.primary }]}>{formatTimeLabel(fittingDateTime)}</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.timeButton, { borderColor: colors.rule ?? colors.border }]}
            onPress={() => setShowIosTimePicker((prev) => !prev)}
            activeOpacity={0.7}
            disabled={saving}
          >
            <Text style={[styles.timeButtonText, { color: colors.brass ?? colors.primary }]}>{formatTimeLabel(fittingDateTime)}</Text>
          </TouchableOpacity>
          {showIosTimePicker ? (
            <View style={styles.iosPickerWrap}>
              <View style={styles.iosPickerDoneRow}>
                <TouchableOpacity onPress={() => setShowIosTimePicker(false)} activeOpacity={0.7}>
                  <Text style={[styles.iosPickerDone, { color: colors.brass ?? colors.primary }]}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={fittingDateTime}
                mode="time"
                display="spinner"
                onChange={onIosTimeChange}
                textColor={colors.textPrimary}
                themeVariant={isDark ? 'dark' : 'light'}
              />
            </View>
          ) : null}
        </>
      )}
      <Text style={[styles.sectionLabel, { color: colors.textPrimary, marginTop: AtelierSpacing.md }]}>
        {t('calendar.addFittingSelectOrder')}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <Pressable style={styles.backdrop} onPress={handleDismiss}>
        <Pressable style={[styles.card, { backgroundColor: colors.card, borderColor: colors.rule ?? colors.border }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.cardHeader}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{t('calendar.addFittingTitle')}</Text>
            <TouchableOpacity onPress={handleDismiss} disabled={saving} style={[styles.closeBtn, { borderColor: colors.rule ?? colors.border }]} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={colors.ink3} />
            </TouchableOpacity>
          </View>

          {ordersLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={colors.brass ?? colors.primary} />
              <Text style={[styles.loadingText, { color: colors.ink3 }]}>{t('calendar.addFittingLoadingOrders')}</Text>
            </View>
          ) : (
            <FlatList
              data={orders}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={listHeader}
              renderItem={renderOrderRow}
              style={styles.orderList}
              contentContainerStyle={styles.orderListContent}
              ListEmptyComponent={
                <Text style={[styles.emptyOrders, { color: colors.ink3 }]}>{t('calendar.addFittingNoOrders')}</Text>
              }
              keyboardShouldPersistTaps="handled"
            />
          )}

          <View style={[styles.footer, { borderTopColor: colors.rule ?? colors.border }]}>
            <Button variant="secondary" size="sm" style={styles.footerBtn} onPress={handleDismiss} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              style={styles.footerBtn}
              onPress={handleSave}
              disabled={saving || !selectedOrderId || orders.length === 0}
              loading={saving}
            >
              {t('calendar.addFittingSave')}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: AtelierSpacing.lg,
  },
  card: {
    maxHeight: '88%',
    borderWidth: 1,
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: AtelierSpacing.sm,
  },
  title: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: AtelierRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeaderBlock: {
    paddingBottom: AtelierSpacing.sm,
  },
  subtitle: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: AtelierSpacing.md,
    textTransform: 'capitalize',
  },
  sectionLabel: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: AtelierSpacing.xs,
  },
  timeButton: {
    borderWidth: 1,
    borderRadius: AtelierRadius.md,
    paddingVertical: AtelierSpacing.sm,
    paddingHorizontal: AtelierSpacing.md,
    alignSelf: 'flex-start',
  },
  timeButtonText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  iosPickerWrap: {
    marginTop: AtelierSpacing.xs,
  },
  iosPickerDoneRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: AtelierSpacing.xs,
  },
  iosPickerDone: {
    fontSize: 16,
    fontWeight: '700',
  },
  orderList: {
    maxHeight: 280,
  },
  orderListContent: {
    paddingBottom: AtelierSpacing.sm,
  },
  orderRow: {
    borderWidth: 1,
    borderRadius: AtelierRadius.md,
    padding: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.xs,
  },
  orderRowNumber: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  orderRowName: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  emptyOrders: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    paddingVertical: AtelierSpacing.md,
    textAlign: 'center',
  },
  loadingBox: {
    paddingVertical: AtelierSpacing.xl,
    alignItems: 'center',
    gap: AtelierSpacing.sm,
  },
  loadingText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: AtelierSpacing.sm,
    marginTop: AtelierSpacing.md,
    paddingTop: AtelierSpacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: {
    flex: 1,
  },
});
