/**
 * First-run tutorial — paged walkthrough of the TailorCraft workflow
 * (garments → measurements → styles & materials → clients → orders → tracking).
 * Opens automatically once per user after login; reopen from Profile.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpen,
  Shirt,
  LayoutTemplate,
  Ruler,
  Palette,
  UserPlus,
  ClipboardList,
  CalendarCheck,
  LayoutGrid,
  CircleCheck,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/lib/i18n';
import { markTutorialSeen } from '@/lib/tutorial';
import { Button } from '@/components/ui/Button';
import { AtelierType, AtelierSpacing, AtelierRadius, FontFamily } from '@/constants/atelierDesign';

interface Slide {
  id: string;
  icon: LucideIcon;
  points: number;
  tip?: boolean;
  /** Screen the "show me" button opens (closes the tutorial). */
  route?: Href;
}

const SLIDES: Slide[] = [
  { id: 'welcome', icon: BookOpen, points: 4, tip: true },
  { id: 'garments', icon: Shirt, points: 4, tip: true },
  { id: 'addGarment', icon: LayoutTemplate, points: 4, route: '/garments' },
  { id: 'measurements', icon: Ruler, points: 5, tip: true },
  { id: 'styles', icon: Palette, points: 5, tip: true },
  { id: 'clients', icon: UserPlus, points: 4, route: '/clients/new' },
  { id: 'orders', icon: ClipboardList, points: 5, tip: true },
  { id: 'tracking', icon: CalendarCheck, points: 5 },
  { id: 'more', icon: LayoutGrid, points: 4 },
  { id: 'done', icon: CircleCheck, points: 3 },
];

export default function TutorialScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  // Opening it once counts as seen, so it never nags again (reopen from Profile).
  useEffect(() => {
    if (user?.id) void markTutorialSeen(user.id);
  }, [user?.id]);

  const isLast = index === SLIDES.length - 1;
  const total = String(SLIDES.length).padStart(2, '0');

  // Ref, not state: quick repeated taps must step from the latest page, not a stale render.
  const indexRef = useRef(0);
  const show = (next: number) => {
    indexRef.current = Math.max(0, Math.min(SLIDES.length - 1, next));
    setIndex(indexRef.current);
  };

  const step = (delta: number) => {
    show(indexRef.current + delta);
    scrollRef.current?.scrollTo({ x: indexRef.current * width, animated: true });
  };

  // Only swipes set the page from the scroll offset; Next/Back animations interrupted by another tap
  // would otherwise report an intermediate page.
  const swipingRef = useRef(false);
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!swipingRef.current) return;
    swipingRef.current = false;
    show(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const open = (route: Href) => router.replace(route);

  return (
    <View style={[styles.root, { backgroundColor: colors.paper, paddingTop: insets.top + AtelierSpacing.sm }]}>
      <View style={styles.topBar}>
        <Text style={[styles.counter, { color: colors.brass }]}>
          {t('tutorial.label')} · {String(index + 1).padStart(2, '0')} / {total}
        </Text>
        {!isLast && (
          <TouchableOpacity onPress={close} hitSlop={12} accessibilityRole="button">
            <Text style={[styles.skip, { color: colors.ink3 }]}>{t('tutorial.skip')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.progress}>
        {SLIDES.map((s, i) => (
          <View
            key={s.id}
            style={[styles.progressSeg, { backgroundColor: i <= index ? colors.brass : colors.rule }]}
          />
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => {
          swipingRef.current = true;
        }}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
      >
        {SLIDES.map((slide) => {
          const Icon = slide.icon;
          const k = `tutorial.slides.${slide.id}`;
          return (
            <ScrollView
              key={slide.id}
              style={{ width }}
              contentContainerStyle={styles.slide}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.card, borderColor: colors.rule }]}>
                <Icon size={30} color={colors.brass} strokeWidth={1.6} />
              </View>
              <Text style={[styles.eyebrow, { color: colors.brass }]}>{t(`${k}.eyebrow`)}</Text>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{t(`${k}.title`)}</Text>
              <Text style={[styles.body, { color: colors.ink2 }]}>{t(`${k}.body`)}</Text>

              <View style={[styles.rule, { backgroundColor: colors.rule }]} />

              {Array.from({ length: slide.points }, (_, i) => (
                <View key={i} style={styles.point}>
                  <Text style={[styles.pointNum, { color: colors.brass }]}>{String(i + 1).padStart(2, '0')}</Text>
                  <Text style={[styles.pointText, { color: colors.textPrimary }]}>{t(`${k}.p${i + 1}`)}</Text>
                </View>
              ))}

              {slide.tip && (
                <View style={[styles.tip, { backgroundColor: colors.card, borderLeftColor: colors.brass }]}>
                  <Text style={[styles.tipLabel, { color: colors.brass }]}>{t('tutorial.tip')}</Text>
                  <Text style={[styles.tipText, { color: colors.ink2 }]}>{t(`${k}.tip`)}</Text>
                </View>
              )}

              {slide.route && (
                <Button variant="secondary" size="sm" onPress={() => open(slide.route!)} style={styles.showMe}>
                  {t(`${k}.action`)}
                </Button>
              )}
            </ScrollView>
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { borderTopColor: colors.rule, paddingBottom: Math.max(insets.bottom, AtelierSpacing.md) },
        ]}
      >
        {isLast ? (
          <View style={styles.footerCol}>
            <Button variant="primary" size="lg" fullWidth onPress={() => open('/garments/new')}>
              {t('tutorial.createFirstGarment')}
            </Button>
            <Button variant="ghost" fullWidth onPress={close}>
              {t('tutorial.finish')}
            </Button>
          </View>
        ) : (
          <View style={styles.footerRow}>
            <Button variant="secondary" onPress={() => step(-1)} disabled={index === 0} style={styles.footerBtn}>
              {t('tutorial.back')}
            </Button>
            <Button variant="primary" onPress={() => step(1)} style={styles.footerBtn}>
              {t('tutorial.next')}
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: AtelierSpacing.pagePad,
    minHeight: 32,
  },
  counter: { ...AtelierType.monoLabel },
  skip: { ...AtelierType.uiSm, fontFamily: FontFamily.monoMedium },
  progress: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: AtelierSpacing.pagePad,
    marginTop: AtelierSpacing.sm,
  },
  progressSeg: { flex: 1, height: 3, borderRadius: AtelierRadius.full },
  pager: { flex: 1 },
  slide: {
    paddingHorizontal: AtelierSpacing.pagePad,
    paddingTop: AtelierSpacing.lg,
    paddingBottom: AtelierSpacing.xl,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: AtelierRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AtelierSpacing.md,
  },
  eyebrow: { ...AtelierType.monoLabel, textTransform: 'uppercase', marginBottom: AtelierSpacing.xs },
  title: { ...AtelierType.display, marginBottom: AtelierSpacing.sm },
  body: { ...AtelierType.uiMd, lineHeight: 21 },
  rule: { height: 1, marginVertical: AtelierSpacing.md },
  point: { flexDirection: 'row', gap: AtelierSpacing.sm, marginBottom: AtelierSpacing.sm + 2 },
  pointNum: { ...AtelierType.monoSm, fontFamily: FontFamily.monoSemiBold, marginTop: 2, width: 20 },
  pointText: { ...AtelierType.uiSm, lineHeight: 19, flex: 1 },
  tip: {
    borderLeftWidth: 3,
    borderRadius: AtelierRadius.sm,
    padding: AtelierSpacing.md - 4,
    marginTop: AtelierSpacing.sm,
  },
  tipLabel: { ...AtelierType.monoLabel, textTransform: 'uppercase', marginBottom: AtelierSpacing.xs },
  tipText: { ...AtelierType.uiSm, lineHeight: 19 },
  showMe: { marginTop: AtelierSpacing.md, alignSelf: 'flex-start' },
  footer: {
    borderTopWidth: 1,
    paddingTop: AtelierSpacing.md - 4,
    paddingHorizontal: AtelierSpacing.pagePad,
  },
  footerRow: { flexDirection: 'row', gap: AtelierSpacing.sm },
  footerBtn: { flex: 1 },
  footerCol: { gap: AtelierSpacing.xs },
});
