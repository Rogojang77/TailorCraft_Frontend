import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Modal, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Edit3, Plus } from 'lucide-react-native';
import { FittingStatusModal } from '@/components/FittingStatusModal';
import { CalendarAddFittingModal } from '@/components/CalendarAddFittingModal';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/lib/i18n';
import { api, apiFetch } from '@/lib/api';
import {
  FITTING_STATUSES,
  fittingBlocksCalendarSlot,
  getFittingStatusDisplayConfig,
  type FittingStatus,
  toFittingPayload,
} from '@/lib/fittings';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';
import { recordFeatureUsage } from '@/lib/diagnostics';

type CalendarEvent = {
  id: string;
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  customerName: string;
  date: string;
  type: 'DELIVERY' | 'FITTING' | 'MEASUREMENT';
  fittingStatus?: string;
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

type ViewMode = 'week' | 'month';
type EventFilter = 'ALL' | 'FITTING' | 'DELIVERY' | 'MEASUREMENT';

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getMonthGrid(currentMonth: Date): Date[] {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday=0 ... Sunday=6
  const startDate = new Date(year, month, 1 - firstWeekday);
  const days: Date[] = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    days.push(day);
  }
  return days;
}

export default function CalendarTab() {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [eventFilter, setEventFilter] = useState<EventFilter>('ALL');
  const [currentMonth, setCurrentMonth] = useState(() => startOfDay(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [updatingEventIds, setUpdatingEventIds] = useState<Record<string, boolean>>({});
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusTargetEvent, setStatusTargetEvent] = useState<CalendarEvent | null>(null);
  const [addFittingModalVisible, setAddFittingModalVisible] = useState(false);

  const range = useMemo(() => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const from = new Date(monthStart);
    const to = new Date(monthStart);
    if (viewMode === 'week') {
      const selected = startOfDay(parseDateKey(selectedDateKey));
      from.setTime(selected.getTime());
      to.setTime(selected.getTime());
      to.setDate(to.getDate() + 6);
      to.setHours(23, 59, 59, 999);
    } else {
      to.setMonth(to.getMonth() + 1);
      to.setDate(0);
      to.setHours(23, 59, 59, 999);
    }
    return { from, to };
  }, [currentMonth, selectedDateKey, viewMode]);

  const fetchEvents = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const query = `?from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}`;
        const response = await apiFetch<{ events: CalendarEvent[] }>(`${api.calendar.events}${query}`);
        setEvents(response.events ?? []);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [range.from, range.to]
  );

  useEffect(() => {
    recordFeatureUsage('calendar.view');
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        if (eventFilter === 'ALL') return true;
        return event.type === eventFilter;
      }),
    [events, eventFilter]
  );

  const calendarDays = useMemo(() => getMonthGrid(currentMonth), [currentMonth]);
  const monthLabel = useMemo(
    () =>
      currentMonth.toLocaleDateString(locale === 'ro' ? 'ro-RO' : 'en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [currentMonth, locale]
  );
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    for (const event of filteredEvents) {
      const key = toDateKey(new Date(event.date));
      const existing = grouped.get(key);
      if (existing) existing.push(event);
      else grouped.set(key, [event]);
    }
    return grouped;
  }, [filteredEvents]);
  const selectedDayEvents = useMemo(() => eventsByDate.get(selectedDateKey) ?? [], [eventsByDate, selectedDateKey]);
  const scheduledFittingsOnSelectedDay = useMemo(
    () => selectedDayEvents.filter((e) => e.type === 'FITTING' && fittingBlocksCalendarSlot(e.fittingStatus)),
    [selectedDayEvents]
  );
  const dateLocale = locale === 'ro' ? 'ro-RO' : 'en-US';
  const monthNamesShort = useMemo(
    () =>
      Array.from({ length: 12 }, (_, monthIndex) =>
        new Date(2026, monthIndex, 1).toLocaleDateString(dateLocale, { month: 'short' })
      ),
    [dateLocale]
  );
  const weekdayLabels = useMemo(
    () => [
      t('calendar.weekdaysShort.mon'),
      t('calendar.weekdaysShort.tue'),
      t('calendar.weekdaysShort.wed'),
      t('calendar.weekdaysShort.thu'),
      t('calendar.weekdaysShort.fri'),
      t('calendar.weekdaysShort.sat'),
      t('calendar.weekdaysShort.sun'),
    ],
    [t]
  );

  const openMonthPicker = useCallback(() => {
    setPickerYear(currentMonth.getFullYear());
    setIsMonthPickerOpen(true);
  }, [currentMonth]);

  const handleSelectMonth = useCallback(
    (monthIndex: number) => {
      const nextMonth = startOfDay(new Date(pickerYear, monthIndex, 1));
      setCurrentMonth(nextMonth);
      setSelectedDateKey(toDateKey(nextMonth));
      setIsMonthPickerOpen(false);
    },
    [pickerYear]
  );

  const toStatusLabel = useCallback(
    (status?: string) => t(`orderDetails.fittings.status.${(status ?? 'SCHEDULED') as FittingStatus}`),
    [t]
  );
  const getStatusConfig = useCallback(
    (status?: FittingStatus) => getFittingStatusDisplayConfig(status, colors),
    [colors]
  );

  const formatListItemTime = useCallback(
    (date: Date) =>
      date.toLocaleTimeString(dateLocale, {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [dateLocale]
  );

  const updateFittingStatus = useCallback(
    async (eventItem: CalendarEvent, nextStatus: FittingStatus) => {
      if (eventItem.type !== 'FITTING') return;
      setUpdatingEventIds((prev) => ({ ...prev, [eventItem.id]: true }));
      try {
        if (!eventItem.orderId) return;
        const orderResponse = await apiFetch<OrderFittingsResponse>(api.orders(eventItem.orderId));
        const orderFittings = orderResponse.fittings ?? [];
        if (orderFittings.length === 0) return;
        const eventDate = new Date(eventItem.date);
        let targetIndex = orderFittings.findIndex((fitting) => toDateKey(new Date(fitting.scheduledAt)) === toDateKey(eventDate));
        if (targetIndex < 0) {
          targetIndex = orderFittings.reduce(
            (bestIndex, fitting, index, arr) => {
              const bestDiff = Math.abs(new Date(arr[bestIndex].scheduledAt).getTime() - eventDate.getTime());
              const currentDiff = Math.abs(new Date(fitting.scheduledAt).getTime() - eventDate.getTime());
              return currentDiff < bestDiff ? index : bestIndex;
            },
            0
          );
        }
        const nextFittings = orderFittings.map((fitting, index) => {
          if (index !== targetIndex) return fitting;
          return { ...fitting, status: nextStatus };
        });
        await apiFetch(api.orders(eventItem.orderId), {
          method: 'PUT',
          body: JSON.stringify({
            fittings: nextFittings.map(toFittingPayload),
          }),
        });
        await fetchEvents();
      } catch {
        // Keep this lightweight; list will remain unchanged if update fails.
      } finally {
        setUpdatingEventIds((prev) => {
          const next = { ...prev };
          delete next[eventItem.id];
          return next;
        });
      }
    },
    [fetchEvents]
  );

  const openStatusModal = useCallback((eventItem: CalendarEvent) => {
    if (eventItem.type !== 'FITTING') return;
    setStatusTargetEvent(eventItem);
    setStatusModalVisible(true);
  }, []);

  const handleSelectStatusFromModal = useCallback(
    async (statusValue: FittingStatus) => {
      if (!statusTargetEvent) return;
      await updateFittingStatus(statusTargetEvent, statusValue);
      setStatusModalVisible(false);
      setStatusTargetEvent(null);
    },
    [statusTargetEvent, updateFittingStatus]
  );

  return (
    <ScreenContainer style={{ paddingVertical: AtelierSpacing.sm }} noPadding>
      <FlatList
        data={selectedDayEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchEvents(true)} tintColor={colors.primary} />}
        ListHeaderComponent={
          <>
            <View style={styles.controls}>
              <View style={styles.row}>
                {(['ALL', 'FITTING', 'DELIVERY', 'MEASUREMENT'] as const).map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[styles.chip, { borderColor: colors.border, backgroundColor: eventFilter === filter ? colors.primary : colors.surface }]}
                    onPress={() => setEventFilter(filter)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, { color: eventFilter === filter ? colors.textInverse : colors.textPrimary }]}>
                      {filter === 'ALL'
                        ? t('calendar.filters.all')
                        : filter === 'FITTING'
                          ? t('calendar.filters.fitting')
                          : filter === 'DELIVERY'
                            ? t('calendar.filters.deliveryDate')
                            : t('calendar.filters.measurement')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('calendar.legend.fitting')}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('calendar.legend.deliveryDate')}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                  <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t('calendar.legend.measurement')}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.calendarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.monthHeader}>
                <TouchableOpacity
                  style={[styles.monthNavButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => setCurrentMonth((prev) => addMonths(prev, -1))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={openMonthPicker} activeOpacity={0.7} style={styles.monthTitleButton}>
                  <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>{monthLabel}</Text>
                  <Text style={[styles.monthTitleChevron, { color: colors.textSecondary }]}>▼</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.monthNavButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.weekdayRow}>
                {weekdayLabels.map((dayName) => (
                  <Text key={dayName} style={[styles.weekdayLabel, { color: colors.textSecondary }]}>
                    {dayName}
                  </Text>
                ))}
              </View>

              <View style={styles.grid}>
                {calendarDays.map((day) => {
                  const dayKey = toDateKey(day);
                  const isSelected = dayKey === selectedDateKey;
                  const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                  const dayEvents = eventsByDate.get(dayKey) ?? [];
                  const dayEventsPreview = dayEvents.slice(0, 3);
                  const overflowCount = Math.max(0, dayEvents.length - 3);
                  const hasFitting = dayEvents.some((event) => event.type === 'FITTING');
                  const hasDelivery = dayEvents.some((event) => event.type === 'DELIVERY');
                  const hasMeasurement = dayEvents.some((event) => event.type === 'MEASUREMENT');
                  return (
                    <TouchableOpacity
                      key={dayKey}
                      style={[
                        styles.dayCell,
                        { borderColor: colors.border },
                        isSelected && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
                      ]}
                      onPress={() => setSelectedDateKey(dayKey)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.dayHeaderRow}>
                        <Text
                          style={[
                            styles.dayNumber,
                            { color: isCurrentMonth ? colors.textPrimary : colors.textSecondary },
                            isSelected && { color: colors.primary },
                          ]}
                        >
                          {day.getDate()}
                        </Text>
                        <View style={styles.dotRow}>
                          {hasFitting ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}
                          {hasDelivery ? <View style={[styles.dot, { backgroundColor: colors.success }]} /> : null}
                          {hasMeasurement ? <View style={[styles.dot, { backgroundColor: colors.warning }]} /> : null}
                        </View>
                      </View>
                      <View style={styles.dayEventsContainer}>
                        {dayEventsPreview.map((event) => {
                          const isFitting = event.type === 'FITTING';
                          const isDelivery = event.type === 'DELIVERY';
                          const accent = isFitting ? colors.primary : isDelivery ? colors.success : colors.warning;
                          return (
                            <Text
                              key={event.id}
                              style={[
                                styles.dayEventLabel,
                                {
                                  color: accent,
                                  backgroundColor: accent + '14',
                                },
                              ]}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {event.customerName}
                            </Text>
                          );
                        })}
                        {overflowCount > 0 ? (
                          <Text style={[styles.moreIndicator, { color: colors.textSecondary }]}>
                            {t('calendar.moreCount', { count: overflowCount })}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.selectedDateHeaderRow}>
              <Text style={[styles.selectedDateTitle, { color: colors.textPrimary }]}>
                {parseDateKey(selectedDateKey).toLocaleDateString(dateLocale, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
              <TouchableOpacity
                style={styles.addFittingHeaderButton}
                onPress={() => setAddFittingModalVisible(true)}
                activeOpacity={0.7}
              >
                <Plus size={16} color={colors.primary} />
                <Text style={[styles.addFittingHeaderButtonText, { color: colors.primary }]}>{t('calendar.addFitting')}</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {loading ? t('calendar.loadingEvents') : t('calendar.emptySelectedDay')}
          </Text>
        }
        renderItem={({ item }) => {
          if (item.type === 'FITTING') {
            const eventDate = new Date(item.date);
            const status = (item.fittingStatus as FittingStatus | undefined) ?? 'SCHEDULED';
            const statusStyle = getStatusConfig(status);
            return (
              <View style={[styles.fittingEventRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.fittingEventMainTap}
                  onPress={() => item.orderId && router.push(`/order-details/${item.orderId}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.listItemTagRow}>
                    <View style={[styles.listItemTypeTag, { backgroundColor: `${colors.primary}24` }]}>
                      <Text style={[styles.listItemFittingTimeTagText, { color: colors.primary }]}>
                        {t('calendar.fittingTagAtTime', { time: formatListItemTime(eventDate) })}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.listItemOrderTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                    {item.orderNumber} · {item.customerName}
                  </Text>
                </TouchableOpacity>
                <View style={styles.fittingEventActions}>
                  <View style={[styles.fittingListStatusPill, { backgroundColor: statusStyle.backgroundColor }]}>
                    <Text style={[styles.fittingListStatusText, { color: statusStyle.textColor }]} numberOfLines={1}>
                      {toStatusLabel(item.fittingStatus)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.fittingListIconButton}
                    onPress={() => openStatusModal(item)}
                    disabled={!!updatingEventIds[item.id]}
                    activeOpacity={0.7}
                    accessibilityLabel={t('orderDetails.fittings.changeStatusButton')}
                    accessibilityState={{ busy: !!updatingEventIds[item.id] }}
                  >
                    <Edit3 size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          if (item.type === 'MEASUREMENT') {
            const eventDate = new Date(item.date);
            return (
              <TouchableOpacity
                style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => item.customerId && router.push(`/client-details/${item.customerId}`)}
                activeOpacity={0.75}
              >
                <View style={styles.listItemTagRow}>
                  <View style={[styles.listItemTypeTag, { backgroundColor: `${colors.warning}24` }]}>
                    <Text style={[styles.listItemTypeTagText, { color: colors.warning }]}>
                      {t('calendar.measurementTagAtTime', { time: formatListItemTime(eventDate) })}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.listItemOrderTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                  {item.customerName}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => item.orderId && router.push(`/order-details/${item.orderId}`)}
              activeOpacity={0.75}
            >
              <View style={styles.listItemTagRow}>
                <View style={[styles.listItemTypeTag, { backgroundColor: `${colors.success}24` }]}>
                  <Text style={[styles.listItemTypeTagText, { color: colors.success }]}>
                    {t('calendar.eventType.deliveryDate')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.listItemOrderTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                {item.orderNumber} · {item.customerName}
              </Text>
              <Text style={[styles.listItemTimeOnly, { color: colors.textSecondary }]}>{formatListItemTime(new Date(item.date))}</Text>
            </TouchableOpacity>
          );
        }}
      />
      <CalendarAddFittingModal
        visible={addFittingModalVisible}
        onClose={() => setAddFittingModalVisible(false)}
        selectedDateKey={selectedDateKey}
        dateLocale={dateLocale}
        existingScheduledFittingsOnSelectedDay={scheduledFittingsOnSelectedDay.map((e) => ({
          date: e.date,
          fittingStatus: e.fittingStatus,
        }))}
        onSaved={() => fetchEvents(true)}
      />
      <FittingStatusModal
        visible={statusModalVisible}
        onClose={() => {
          setStatusModalVisible(false);
          setStatusTargetEvent(null);
        }}
        statuses={FITTING_STATUSES}
        selectedStatus={(statusTargetEvent?.fittingStatus as FittingStatus | undefined) ?? undefined}
        onSelect={handleSelectStatusFromModal}
        getStatusLabel={toStatusLabel}
        getStatusDisplayConfig={getStatusConfig}
      />
      <Modal
        visible={isMonthPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMonthPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsMonthPickerOpen(false)}>
          <Pressable
            style={[styles.monthPickerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.pickerHeader}>
              <TouchableOpacity
                style={[styles.pickerYearNavButton, { borderColor: colors.border }]}
                onPress={() => setPickerYear((year) => year - 1)}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.pickerYearText, { color: colors.textPrimary }]}>{pickerYear}</Text>
              <TouchableOpacity
                style={[styles.pickerYearNavButton, { borderColor: colors.border }]}
                onPress={() => setPickerYear((year) => year + 1)}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.monthPickerGrid}>
              {monthNamesShort.map((monthName, monthIndex) => {
                const isActive = currentMonth.getFullYear() === pickerYear && currentMonth.getMonth() === monthIndex;
                return (
                  <TouchableOpacity
                    key={`${pickerYear}-${monthName}`}
                    style={[
                      styles.monthOptionButton,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      isActive && { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
                    ]}
                    onPress={() => handleSelectMonth(monthIndex)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.monthOptionText, { color: isActive ? colors.primary : colors.textPrimary }]}>
                      {monthName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: AtelierSpacing.md,
    paddingTop: AtelierSpacing.md,
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 22,
    lineHeight: 28,
  },
  controls: {
    paddingTop: AtelierSpacing.sm,
    paddingBottom: AtelierSpacing.sm,
    gap: AtelierSpacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AtelierSpacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: AtelierSpacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: AtelierRadius.full,
  },
  legendText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  chip: {
    borderWidth: 1,
    borderRadius: AtelierRadius.full,
    paddingHorizontal: AtelierSpacing.md,
    paddingVertical: AtelierSpacing.xs,
  },
  chipText: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
  },
  list: {
    paddingHorizontal: AtelierSpacing.md,
    paddingBottom: AtelierSpacing.lg,
  },
  calendarCard: {
    borderWidth: 1,
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.md,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: AtelierSpacing.sm,
  },
  monthTitle: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
    textTransform: 'capitalize',
  },
  monthTitleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthTitleChevron: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 1,
  },
  monthNavButton: {
    width: 32,
    height: 32,
    borderRadius: AtelierRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: AtelierSpacing.xs,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 0.7,
    borderWidth: 1,
    borderRadius: AtelierRadius.md,
    paddingVertical: 4,
    paddingHorizontal: 3,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    marginBottom: 2,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  dayNumber: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 3,
    minHeight: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: AtelierRadius.full,
  },
  dayEventsContainer: {
    flex: 1,
    gap: 2,
  },
  dayEventLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    lineHeight: 12,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  moreIndicator: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    lineHeight: 12,
  },
  selectedDateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AtelierSpacing.md,
    marginBottom: AtelierSpacing.sm,
  },
  selectedDateTitle: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
    textTransform: 'capitalize',
  },
  addFittingHeaderButton: {
    paddingVertical: AtelierSpacing.xs,
    paddingHorizontal: AtelierSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.xs,
  },
  addFittingHeaderButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  fittingEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: AtelierSpacing.sm,
    paddingVertical: AtelierSpacing.sm,
    marginBottom: AtelierSpacing.xs,
    gap: AtelierSpacing.sm,
  },
  fittingEventMainTap: {
    flex: 1,
    marginRight: AtelierSpacing.xs,
  },
  listItemTagRow: {
    marginBottom: AtelierSpacing.xs,
  },
  listItemTypeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: AtelierSpacing.sm,
    paddingVertical: 4,
    borderRadius: AtelierRadius.full,
  },
  listItemTypeTagText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  listItemFittingTimeTagText: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  listItemOrderTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: AtelierSpacing.xs,
  },
  listItemTimeOnly: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  fittingEventActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AtelierSpacing.xs,
    marginLeft: 'auto',
  },
  fittingListStatusPill: {
    borderRadius: 999,
    paddingHorizontal: AtelierSpacing.sm,
    paddingVertical: 4,
  },
  fittingListStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fittingListIconButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCard: {
    borderWidth: 1,
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.md,
    marginBottom: AtelierSpacing.sm,
  },
  emptyText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: AtelierSpacing.xl,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: AtelierSpacing.lg,
  },
  monthPickerCard: {
    borderWidth: 1,
    borderRadius: AtelierRadius.lg,
    padding: AtelierSpacing.md,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: AtelierSpacing.md,
  },
  pickerYearNavButton: {
    width: 34,
    height: 34,
    borderRadius: AtelierRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerYearText: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
  },
  monthPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: AtelierSpacing.xs,
  },
  monthOptionButton: {
    width: '31%',
    borderWidth: 1,
    borderRadius: AtelierRadius.md,
    paddingVertical: AtelierSpacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthOptionText: {
    fontFamily: FontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    textTransform: 'capitalize',
  },
});
