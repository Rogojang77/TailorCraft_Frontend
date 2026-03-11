/**
 * Splash overlay shown while the app loads.
 * Uses expo-splash-screen to hide the native splash once mounted.
 * Fades out the overlay when the app is ready to show content.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export interface AnimatedSplashScreenProps {
  children: React.ReactNode;
  isReady: boolean;
}

const FADE_OUT_DURATION = 300;

export function AnimatedSplashScreen({ children, isReady }: AnimatedSplashScreenProps) {
  const [splashHidden, setSplashHidden] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {
      // Ignore "No native splash screen registered" on iOS dev client / simulator
    });
    setSplashHidden(true);
  }, []);

  useEffect(() => {
    if (isReady && splashHidden) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_OUT_DURATION,
        useNativeDriver: true,
      }).start();
    }
  }, [isReady, splashHidden, fadeAnim]);

  const showSplash = !isReady || !splashHidden;

  return (
    <View style={styles.container}>
      {children}
      {showSplash && (
        <Animated.View
          style={[
            styles.splashContainer,
            { opacity: fadeAnim },
          ]}
          pointerEvents={isReady ? 'none' : 'auto'}
        >
          <View style={styles.fallbackContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1000,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});
