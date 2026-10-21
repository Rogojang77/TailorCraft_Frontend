import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView, PointerType } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Eraser } from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrderDraft } from '@/contexts/OrderDraftContext';
import { useI18n } from '@/lib/i18n';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';

type Point = { x: number; y: number };
type Stroke = { d: string; color: string; width: number };

const CANVAS_BACKGROUND = '#FFFFFF';
const INKS = ['#1B1611', '#A23E2E', '#3C5772'];
const WIDTHS = [2, 4, 8];
const ERASER_WIDTH = 24;

/** Smooth path through the points: quadratic curves between midpoints. */
function pathFromPoints(points: Point[]): string {
  if (points.length === 0) return '';
  const [first] = points;
  if (points.length < 3) {
    // A tap still leaves a dot.
    const last = points[points.length - 1];
    return `M ${first.x} ${first.y} L ${last.x + 0.01} ${last.y + 0.01}`;
  }
  let d = `M ${first.x} ${first.y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${mx} ${my}`;
  }
  const last = points[points.length - 1];
  return `${d} L ${last.x} ${last.y}`;
}

/** Finished strokes; memoised so the canvas doesn't redraw them on every pen move. */
const FinishedStrokes = memo(function FinishedStrokes({ strokes }: { strokes: Stroke[] }) {
  return (
    <>
      {strokes.map((stroke, index) => (
        <Path
          key={index}
          d={stroke.d}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </>
  );
});

export default function NewOrderSketchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { draftOrder, updateSketchDraftUri } = useOrderDraft();

  const canvasRef = useRef<View | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [livePath, setLivePath] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [ink, setInk] = useState(INKS[0]);
  const [width, setWidth] = useState(WIDTHS[1]);
  const [erasing, setErasing] = useState(false);
  // Once a stylus touches the canvas, fingers/palms are ignored (palm rejection) until the user allows them again.
  const [penOnly, setPenOnly] = useState(false);

  const pointsRef = useRef<Point[]>([]);
  const drawingRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  const strokeColor = erasing ? CANVAS_BACKGROUND : ink;
  const strokeWidth = erasing ? ERASER_WIDTH : width;

  const scheduleLiveRender = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      setLivePath(pathFromPoints(pointsRef.current));
    });
  }, []);

  const finishStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    const d = pathFromPoints(pointsRef.current);
    pointsRef.current = [];
    setLivePath('');
    if (d) setStrokes((prev) => [...prev, { d, color: strokeColor, width: strokeWidth }]);
  }, [strokeColor, strokeWidth]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .maxPointers(1)
        .onBegin((e) => {
          if (e.pointerType === PointerType.STYLUS) setPenOnly(true);
          else if (penOnly) return;
          drawingRef.current = true;
          pointsRef.current = [{ x: e.x, y: e.y }];
          setRedoStack([]);
          scheduleLiveRender();
        })
        .onUpdate((e) => {
          if (!drawingRef.current) return;
          pointsRef.current.push({ x: e.x, y: e.y });
          scheduleLiveRender();
        })
        // Pen-up: record where the pen left the screen (moves alone miss it) and end the stroke.
        // Also covers taps, which never activate the pan and so never reach onFinalize.
        .onTouchesUp((e) => {
          const touch = e.changedTouches[0];
          if (drawingRef.current && touch) pointsRef.current.push({ x: touch.x, y: touch.y });
          finishStroke();
        })
        .onFinalize(() => finishStroke()),
    [penOnly, scheduleLiveRender, finishStroke]
  );

  const handleUndo = () => {
    setStrokes((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      const removed = next.pop();
      if (removed) setRedoStack((r) => [...r, removed]);
      return next;
    });
  };

  const handleRedo = () => {
    setRedoStack((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      const restored = next.pop();
      if (restored) setStrokes((s) => [...s, restored]);
      return next;
    });
  };

  const handleClear = () => {
    setStrokes([]);
    setRedoStack([]);
    updateSketchDraftUri(undefined);
  };

  const handleSave = async () => {
    if (!canvasRef.current || strokes.length === 0) {
      Alert.alert(t('newOrder.sketch.title'), t('newOrder.sketch.drawFirst'));
      return;
    }
    setIsSaving(true);
    try {
      const localUri = await captureRef(canvasRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      updateSketchDraftUri(localUri);
      Alert.alert(t('common.success'), t('newOrder.sketch.savedToDraft'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('newOrder.sketch.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenContainer noPadding>
      <View style={[styles.root, { backgroundColor: colors.paper ?? colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.rule ?? colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={[styles.headerAction, { color: colors.brass ?? colors.primary }]}>{t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('newOrder.sketch.title')}</Text>
          <View style={styles.headerRight}>
            {!!draftOrder.sketchDraftUri && <Text style={[styles.savedHint, { color: colors.pine ?? colors.success }]}>{t('newOrder.sketch.saved')}</Text>}
          </View>
        </View>

        <GestureHandlerRootView style={styles.canvasWrap}>
          <GestureDetector gesture={pan}>
            <View style={[styles.canvas, { backgroundColor: CANVAS_BACKGROUND }]} ref={canvasRef} collapsable={false}>
              <Svg width="100%" height="100%" pointerEvents="none">
                <FinishedStrokes strokes={strokes} />
                {livePath ? (
                  <Path
                    d={livePath}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
              </Svg>
            </View>
          </GestureDetector>
        </GestureHandlerRootView>

        {penOnly ? (
          <TouchableOpacity onPress={() => setPenOnly(false)} activeOpacity={0.7} style={styles.penOnlyRow}>
            <Text style={[styles.penOnlyText, { color: colors.ink3 }]}>{t('newOrder.sketch.penOnly')}</Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.tools}>
          {WIDTHS.map((w) => {
            const active = !erasing && width === w;
            return (
              <TouchableOpacity
                key={w}
                onPress={() => {
                  setWidth(w);
                  setErasing(false);
                }}
                style={[styles.toolChip, { borderColor: active ? colors.brass : colors.rule }]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t('newOrder.sketch.thickness', { size: String(w) })}
              >
                <View style={{ width: w + 4, height: w + 4, borderRadius: (w + 4) / 2, backgroundColor: ink }} />
              </TouchableOpacity>
            );
          })}
          <View style={[styles.toolDivider, { backgroundColor: colors.rule }]} />
          {INKS.map((c) => {
            const active = !erasing && ink === c;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => {
                  setInk(c);
                  setErasing(false);
                }}
                style={[styles.toolChip, { borderColor: active ? colors.brass : colors.rule }]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t('newOrder.sketch.color')}
              >
                <View style={[styles.swatch, { backgroundColor: c }]} />
              </TouchableOpacity>
            );
          })}
          <View style={[styles.toolDivider, { backgroundColor: colors.rule }]} />
          <TouchableOpacity
            onPress={() => setErasing((e) => !e)}
            style={[styles.toolChip, styles.eraserChip, { borderColor: erasing ? colors.brass : colors.rule }]}
            accessibilityRole="button"
            accessibilityState={{ selected: erasing }}
          >
            <Eraser size={18} color={erasing ? colors.brass : colors.ink3} />
            <Text style={[styles.eraserText, { color: erasing ? colors.brass : colors.ink3 }]}>{t('newOrder.sketch.eraser')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.toolbar}>
          <TouchableOpacity style={[styles.toolButton, { borderColor: colors.rule ?? colors.border }]} onPress={handleUndo} activeOpacity={0.7}>
            <Text style={[styles.toolButtonText, { color: colors.textPrimary }]}>{t('newOrder.sketch.undo')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolButton, { borderColor: colors.rule ?? colors.border }]} onPress={handleRedo} activeOpacity={0.7}>
            <Text style={[styles.toolButtonText, { color: colors.textPrimary }]}>{t('newOrder.sketch.redo')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolButton, { borderColor: colors.rule ?? colors.border }]} onPress={handleClear} activeOpacity={0.7}>
            <Text style={[styles.toolButtonText, { color: colors.textPrimary }]}>{t('newOrder.sketch.clear')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolButton, styles.saveButton, { backgroundColor: colors.brass ?? colors.primary }]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={isSaving}
          >
            <Text style={[styles.toolButtonText, { color: colors.paper ?? '#EFE9DC' }]}>{isSaving ? t('common.saving') : t('common.save')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    height: 56,
    paddingHorizontal: AtelierSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerAction: {
    fontFamily: FontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize: 18,
    lineHeight: 24,
  },
  headerRight: {
    minWidth: 48,
    alignItems: 'flex-end',
  },
  savedHint: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  canvasWrap: {
    flex: 1,
    margin: AtelierSpacing.md,
    borderRadius: AtelierRadius.lg,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
  },
  penOnlyRow: {
    alignSelf: 'center',
    marginTop: -AtelierSpacing.sm,
    marginBottom: AtelierSpacing.xs,
    paddingVertical: 4,
    paddingHorizontal: AtelierSpacing.sm,
  },
  penOnlyText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: AtelierSpacing.sm,
    paddingHorizontal: AtelierSpacing.md,
    paddingBottom: AtelierSpacing.sm,
  },
  toolChip: {
    minWidth: 40,
    height: 40,
    borderWidth: 1.5,
    borderRadius: AtelierRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  toolDivider: {
    width: 1,
    height: 24,
  },
  eraserChip: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: AtelierSpacing.md,
  },
  eraserText: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toolbar: {
    flexDirection: 'row',
    gap: AtelierSpacing.sm,
    paddingHorizontal: AtelierSpacing.md,
    paddingBottom: AtelierSpacing.md,
  },
  toolButton: {
    borderWidth: 1,
    borderRadius: AtelierRadius.md,
    paddingVertical: AtelierSpacing.sm,
    paddingHorizontal: AtelierSpacing.md,
  },
  saveButton: {
    borderWidth: 0,
    marginLeft: 'auto',
  },
  toolButtonText: {
    fontFamily: FontFamily.monoSemiBold,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
