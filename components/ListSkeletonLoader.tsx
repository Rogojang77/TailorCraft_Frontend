/**
 * Skeleton loader for list and grid content.
 * Uses built-in Animated for subtle pulse; no extra libraries.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing, BorderRadius, Shadows } from '@/constants/design';

function SkeletonBar({
  width,
  height = 12,
  style,
  animatedOpacity,
  skeletonBase,
}: {
  width: number | string;
  height?: number;
  style?: object;
  animatedOpacity: Animated.Value;
  skeletonBase: string;
}) {
  return (
    <Animated.View
      style={[
        styles.bar,
        {
          width: typeof width === 'number' ? width : width,
          height,
          opacity: animatedOpacity,
          backgroundColor: skeletonBase,
        },
        style,
      ]}
    />
  );
}

function SkeletonRow({ animatedOpacity, colors }: { animatedOpacity: Animated.Value; colors: { border: string; borderLight: string } }) {
  const skeletonBase = colors.border;
  return (
    <View style={[styles.row, { borderBottomColor: colors.borderLight }]}>
      <Animated.View style={[styles.avatar, { opacity: animatedOpacity, backgroundColor: skeletonBase }]} />
      <View style={styles.rowContent}>
        <SkeletonBar width="70%" height={14} animatedOpacity={animatedOpacity} skeletonBase={skeletonBase} />
        <SkeletonBar width="90%" height={10} animatedOpacity={animatedOpacity} style={{ marginTop: 8 }} skeletonBase={skeletonBase} />
        <SkeletonBar width="60%" height={10} animatedOpacity={animatedOpacity} style={{ marginTop: 6 }} skeletonBase={skeletonBase} />
      </View>
    </View>
  );
}

function SkeletonCard({ animatedOpacity, colors }: { animatedOpacity: Animated.Value; colors: { surface: string; border: string } }) {
  const skeletonBase = colors.border;
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <SkeletonBar width="60%" height={14} animatedOpacity={animatedOpacity} skeletonBase={skeletonBase} />
        <SkeletonBar width={60} height={20} animatedOpacity={animatedOpacity} skeletonBase={skeletonBase} />
      </View>
      <SkeletonBar width="100%" animatedOpacity={animatedOpacity} style={{ marginTop: 12 }} skeletonBase={skeletonBase} />
      <View style={styles.cardFooter}>
        <SkeletonBar width={80} animatedOpacity={animatedOpacity} skeletonBase={skeletonBase} />
        <SkeletonBar width={90} animatedOpacity={animatedOpacity} skeletonBase={skeletonBase} />
      </View>
    </View>
  );
}

function SkeletonGridItem({ animatedOpacity, skeletonBase }: { animatedOpacity: Animated.Value; skeletonBase: string }) {
  return (
    <View style={styles.gridItem}>
      <Animated.View style={[styles.gridImage, { opacity: animatedOpacity, backgroundColor: skeletonBase }]} />
      <SkeletonBar width="80%" height={12} animatedOpacity={animatedOpacity} style={{ marginTop: 8 }} skeletonBase={skeletonBase} />
      <SkeletonBar width="50%" height={10} animatedOpacity={animatedOpacity} style={{ marginTop: 4 }} skeletonBase={skeletonBase} />
    </View>
  );
}

export type ListSkeletonVariant = 'row' | 'card' | 'grid';

export interface ListSkeletonLoaderProps {
  variant?: ListSkeletonVariant;
  count?: number;
}

export function ListSkeletonLoader({
  variant = 'row',
  count = 6,
}: ListSkeletonLoaderProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  if (variant === 'grid') {
    return (
      <View style={styles.gridContainer}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonGridItem key={i} animatedOpacity={opacity} skeletonBase={colors.border} />
        ))}
      </View>
    );
  }

  if (variant === 'card') {
    return (
      <View style={styles.container}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} animatedOpacity={opacity} colors={colors} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} animatedOpacity={opacity} colors={colors} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  rowContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  bar: {
    borderRadius: BorderRadius.sm,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  gridItem: {
    width: '47%',
  },
  gridImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
  },
});
