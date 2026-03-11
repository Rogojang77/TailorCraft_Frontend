import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Modal,
  TouchableOpacity,
  Image,
  Text,
  FlatList,
  ViewToken,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, BorderRadius, Typography } from '@/constants/design';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

export interface ImageSlide {
  uri: string;
  title?: string;
  description?: string;
  category?: string;
}

interface ZoomableImageViewerProps {
  visible: boolean;
  images: ImageSlide[];
  initialIndex: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  headerRight?: (currentIndex: number) => React.ReactNode;
}

interface SlideItemProps {
  item: ImageSlide;
  index: number;
  currentIndex: number;
  onClose: () => void;
  opacity: Animated.SharedValue<number>;
}

const SlideItem = React.memo(({ item, index, currentIndex, onClose, opacity }: SlideItemProps) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const isActive = index === currentIndex;

  useEffect(() => {
    if (!isActive) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  }, [isActive]);

  const getMaxTranslate = useCallback(() => {
    'worklet';
    const currentScale = scale.value;
    if (currentScale <= 1) {
      return { maxX: 0, maxY: 0 };
    }

    const scaledWidth = SCREEN_WIDTH * currentScale;
    const scaledHeight = SCREEN_HEIGHT * 0.6 * currentScale;
    
    const maxX = Math.max(0, (scaledWidth - SCREEN_WIDTH) / 2);
    const maxY = Math.max(0, (scaledHeight - SCREEN_HEIGHT * 0.6) / 2);
    
    return { maxX, maxY };
  }, []);

  const clampTranslate = useCallback((x: number, y: number) => {
    'worklet';
    const { maxX, maxY } = getMaxTranslate();
    return {
      x: Math.min(Math.max(x, -maxX), maxX),
      y: Math.min(Math.max(y, -maxY), maxY),
    };
  }, [getMaxTranslate]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      if (!isActive) return;
      const newScale = savedScale.value * event.scale;
      scale.value = Math.min(Math.max(newScale, MIN_SCALE * 0.5), MAX_SCALE);
    })
    .onEnd(() => {
      if (!isActive) return;
      if (scale.value < MIN_SCALE) {
        scale.value = withSpring(MIN_SCALE, { damping: 15 });
        savedScale.value = MIN_SCALE;
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else if (scale.value > MAX_SCALE) {
        scale.value = withSpring(MAX_SCALE, { damping: 15 });
        savedScale.value = MAX_SCALE;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .minDistance(10)
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .onUpdate((event) => {
      if (!isActive) return;
      
      if (scale.value > 1) {
        // When zoomed, allow panning in both directions
        const newX = savedTranslateX.value + event.translationX;
        const newY = savedTranslateY.value + event.translationY;
        const clamped = clampTranslate(newX, newY);
        translateX.value = clamped.x;
        translateY.value = clamped.y;
      } else {
        // Only handle vertical dismiss when not zoomed
        translateY.value = event.translationY;
        opacity.value = interpolate(
          Math.abs(event.translationY),
          [0, 200],
          [1, 0.4],
          Extrapolation.CLAMP
        );
      }
    })
    .onEnd((event) => {
      if (!isActive) return;
      
      if (scale.value > 1) {
        const clamped = clampTranslate(translateX.value, translateY.value);
        translateX.value = withSpring(clamped.x, { damping: 20, stiffness: 200 });
        translateY.value = withSpring(clamped.y, { damping: 20, stiffness: 200 });
        savedTranslateX.value = clamped.x;
        savedTranslateY.value = clamped.y;
      } else {
        // Handle vertical dismiss
        if (Math.abs(translateY.value) > 100 || Math.abs(event.velocityY) > 500) {
          opacity.value = withTiming(0, { duration: 150 });
          translateY.value = withTiming(
            event.velocityY > 0 ? SCREEN_HEIGHT : -SCREEN_HEIGHT,
            { duration: 150 },
            () => {
              runOnJS(handleClose)();
            }
          );
        } else {
          translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
          opacity.value = withTiming(1, { duration: 150 });
        }
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      if (!isActive) return;
      
      if (scale.value > 1) {
        scale.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
        savedScale.value = 1;
        translateX.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
        translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        const targetScale = DOUBLE_TAP_SCALE;
        scale.value = withTiming(targetScale, { duration: 250, easing: Easing.out(Easing.cubic) });
        savedScale.value = targetScale;

        const focusXPos = event.x - SCREEN_WIDTH / 2;
        const focusYPos = event.y - SCREEN_HEIGHT * 0.3;
        const offsetX = -focusXPos * (targetScale - 1);
        const offsetY = -focusYPos * (targetScale - 1);
        
        const maxX = Math.max(0, (SCREEN_WIDTH * targetScale - SCREEN_WIDTH) / 2);
        const maxY = Math.max(0, (SCREEN_HEIGHT * 0.6 * targetScale - SCREEN_HEIGHT * 0.6) / 2);
        
        const clampedX = Math.min(Math.max(offsetX, -maxX), maxX);
        const clampedY = Math.min(Math.max(offsetY, -maxY), maxY);
        
        translateX.value = withTiming(clampedX, { duration: 250, easing: Easing.out(Easing.cubic) });
        translateY.value = withTiming(clampedY, { duration: 250, easing: Easing.out(Easing.cubic) });
        savedTranslateX.value = clampedX;
        savedTranslateY.value = clampedY;
      }
    });

  const composedGesture = Gesture.Race(
    doubleTapGesture,
    Gesture.Simultaneous(pinchGesture, panGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.slideContainer}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.slideItem, animatedStyle]}>
          <Image
            source={{ uri: item.uri }}
            style={styles.slideImage}
            resizeMode="contain"
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

SlideItem.displayName = 'SlideItem';

export function ZoomableImageViewer({
  visible,
  images,
  initialIndex,
  onClose,
  onIndexChange,
  headerRight,
}: ZoomableImageViewerProps) {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);
  const opacity = useSharedValue(0);

  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < images.length - 1;
  const currentImage = images[currentIndex];

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      opacity.value = withTiming(1, { duration: 200 });
      
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
    } else {
      opacity.value = 0;
    }
  }, [visible, initialIndex]);

  const handleCloseCallback = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleNavigatePrev = useCallback(() => {
    if (canNavigatePrev) {
      const newIndex = currentIndex - 1;
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    }
  }, [canNavigatePrev, currentIndex]);

  const handleNavigateNext = useCallback(() => {
    if (canNavigateNext) {
      const newIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    }
  }, [canNavigateNext, currentIndex]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      const newIndex = viewableItems[0].index;
      setCurrentIndex(newIndex);
      onIndexChange?.(newIndex);
    }
  }, [onIndexChange]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged },
  ]).current;

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    backgroundColor: `rgba(0, 0, 0, ${opacity.value * 0.98})`,
  }));

  const renderItem = useCallback(({ item, index }: { item: ImageSlide; index: number }) => (
    <SlideItem
      item={item}
      index={index}
      currentIndex={currentIndex}
      onClose={handleCloseCallback}
      opacity={opacity}
    />
  ), [currentIndex, handleCloseCallback, opacity]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  }), []);

  const keyExtractor = useCallback((item: ImageSlide, index: number) => `${item.uri}-${index}`, []);

  if (!visible || images.length === 0) return null;

  const counter = images.length > 1 ? `${currentIndex + 1} / ${images.length}` : undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCloseCallback}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        <Animated.View style={[styles.container, animatedContainerStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseCallback}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
            
            <View style={styles.headerRight}>
              {headerRight?.(currentIndex)}
            </View>
          </View>

          {/* Navigation Buttons */}
          {images.length > 1 && canNavigatePrev && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonLeft]}
              onPress={handleNavigatePrev}
            >
              <ChevronLeft size={28} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          
          {images.length > 1 && canNavigateNext && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonRight]}
              onPress={handleNavigateNext}
            >
              <ChevronRight size={28} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>
          )}

          {/* FlatList Slider */}
          <View style={styles.sliderWrapper}>
            <FlatList
              ref={flatListRef}
              data={images}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              getItemLayout={getItemLayout}
              initialScrollIndex={initialIndex}
              viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
              decelerationRate="fast"
              bounces={false}
              overScrollMode="never"
              removeClippedSubviews={false}
              initialNumToRender={3}
              maxToRenderPerBatch={3}
              windowSize={5}
            />
          </View>

          {/* Info Panel at Bottom */}
          {(currentImage?.title || currentImage?.description || currentImage?.category || counter) && (
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.95)']}
              style={styles.infoGradient}
              pointerEvents="none"
            >
              <View style={styles.infoPanel}>
                {currentImage?.title && (
                  <Text style={styles.infoTitle}>{currentImage.title}</Text>
                )}
                {currentImage?.description && (
                  <Text style={styles.infoDescription}>{currentImage.description}</Text>
                )}
                {currentImage?.category && (
                  <View style={[styles.categoryBadge, { borderColor: `${colors.primary}66`, backgroundColor: `${colors.primary}33` }]}>
                    <Text style={[styles.categoryText, { color: colors.primary }]}>
                      {currentImage.category}
                    </Text>
                  </View>
                )}
                {counter && (
                  <Text style={styles.counterText}>{counter}</Text>
                )}
              </View>
            </LinearGradient>
          )}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    zIndex: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -25 }],
  },
  navButtonLeft: {
    left: 16,
  },
  navButtonRight: {
    right: 16,
  },
  sliderWrapper: {
    flex: 1,
    paddingTop: 100,
    paddingBottom: 180,
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideItem: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  infoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  infoPanel: {
    paddingBottom: 20,
  },
  infoTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  infoDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
    marginBottom: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  counterText: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    marginTop: Spacing.sm,
  },
});
