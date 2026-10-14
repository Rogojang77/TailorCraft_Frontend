import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrderDraft } from '@/contexts/OrderDraftContext';
import { useI18n } from '@/lib/i18n';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';

type Stroke = {
  d: string;
  color: string;
  width: number;
};

const DEFAULT_COLOR = '#111111';
const DEFAULT_WIDTH = 3;
const BRIGHT_CANVAS_BACKGROUND = '#FFFFFF';

export default function NewOrderSketchScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useI18n();
  const { draftOrder, updateSketchDraftUri } = useOrderDraft();

  const canvasRef = useRef<View | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const currentStrokeRef = useRef('');
  const currentPointsRef = useRef<{ x: number; y: number }[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);

  const pathStringFromPoints = (points: { x: number; y: number }[]): string => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    return points.reduce((acc, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `${acc} L ${point.x} ${point.y}`;
    }, '');
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          currentPointsRef.current = [{ x: locationX, y: locationY }];
          currentStrokeRef.current = pathStringFromPoints(currentPointsRef.current);
          setRedoStack([]);
        },
        onPanResponderMove: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          currentPointsRef.current.push({ x: locationX, y: locationY });
          currentStrokeRef.current = pathStringFromPoints(currentPointsRef.current);
          setStrokes((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.d === '__TEMP__') {
              next[next.length - 1] = { ...last, d: currentStrokeRef.current };
              return next;
            }
            return [...next, { d: currentStrokeRef.current, color: DEFAULT_COLOR, width: DEFAULT_WIDTH }];
          });
        },
        onPanResponderRelease: () => {
          const finalPath = currentStrokeRef.current;
          if (!finalPath) return;
          setStrokes((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last) next[next.length - 1] = { ...last, d: finalPath };
            else next.push({ d: finalPath, color: DEFAULT_COLOR, width: DEFAULT_WIDTH });
            return next;
          });
          currentStrokeRef.current = '';
          currentPointsRef.current = [];
        },
      }),
    []
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

        <View style={[styles.canvasWrap, { backgroundColor: BRIGHT_CANVAS_BACKGROUND }]} ref={canvasRef} {...panResponder.panHandlers}>
          <Svg width="100%" height="100%">
            {strokes.map((stroke, index) => (
              <Path
                key={`${index}-${stroke.d.length}`}
                d={stroke.d}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </Svg>
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
            <Text style={[styles.toolButtonText, { color: colors.paper ?? '#EFE9DC' }]}>{isSaving ? 'Saving...' : 'Save'}</Text>
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
