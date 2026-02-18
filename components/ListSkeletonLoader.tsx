/**
 * Skeleton loader for list and grid content.
 * Uses built-in Animated for subtle pulse; no extra libraries.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/design';

const SKELETON_BASE = Colors.border;
const SKELETON_HIGHLIGHT = Colors.borderLight;

function SkeletonBar({
  width,
  height = 12,
  style,
  animatedOpacity,
}: {
  width: number | string;
  height?: number;
  style?: object;
  animatedOpacity: Animated.Value;
}) {
  return (
    <Animated.View
      style={[
        styles.bar,
        {
          width: typeof width === 'number' ? width : width,
          height,
          opacity: animatedOpacity,
        },
        style,
      ]}
    />
  );
}

function SkeletonRow({ animatedOpacity }: { animatedOpacity: Animated.Value }) {
  return (
    <View style={styles.row}>
      <Animated.View style={[styles.avatar, { opacity: animatedOpacity }]} />
      <View style={styles.rowContent}>
        <SkeletonBar width="70%" height={14} animatedOpacity={animatedOpacity} />
        <SkeletonBar width="90%" height={10} animatedOpacity={animatedOpacity} style={{ marginTop: 8 }} />
        <SkeletonBar width="60%" height={10} animatedOpacity={animatedOpacity} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

function SkeletonCard({ animatedOpacity }: { animatedOpacity: Animated.Value }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <SkeletonBar width="60%" height={14} animatedOpacity={animatedOpacity} />
        <SkeletonBar width={60} height={20} animatedOpacity={animatedOpacity} />
      </View>
      <SkeletonBar width="100%" animatedOpacity={animatedOpacity} style={{ marginTop: 12 }} />
      <View style={styles.cardFooter}>
        <SkeletonBar width={80} animatedOpacity={animatedOpacity} />
        <SkeletonBar width={90} animatedOpacity={animatedOpacity} />
      </View>
    </View>
  );
}

function SkeletonGridItem({ animatedOpacity }: { animatedOpacity: Animated.Value }) {
  return (
    <View style={styles.gridItem}>
      <Animated.View style={[styles.gridImage, { opacity: animatedOpacity }]} />
      <SkeletonBar width="80%" height={12} animatedOpacity={animatedOpacity} style={{ marginTop: 8 }} />
      <SkeletonBar width="50%" height={10} animatedOpacity={animatedOpacity} style={{ marginTop: 4 }} />
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

  const Item = variant === 'grid' ? SkeletonGridItem : variant === 'card' ? SkeletonCard : SkeletonRow;

  if (variant === 'grid') {
    return (
      <View style={styles.gridContainer}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonGridItem key={i} animatedOpacity={opacity} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} animatedOpacity={opacity} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: SKELETON_BASE,
  },
  rowContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  bar: {
    backgroundColor: SKELETON_BASE,
    borderRadius: BorderRadius.sm,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginHorizontal: Spacing.xl,
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
    backgroundColor: SKELETON_BASE,
  },
});
