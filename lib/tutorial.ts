/**
 * First-run tutorial: remembers per user (on this device) whether the walkthrough was shown.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const keyFor = (userId: string) => `@tailorcraft/tutorial-seen/${userId}`;

export async function hasSeenTutorial(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(keyFor(userId))) === '1';
  } catch {
    // Storage unavailable: treat as seen so the tutorial never blocks the app.
    return true;
  }
}

export async function markTutorialSeen(userId: string): Promise<void> {
  await AsyncStorage.setItem(keyFor(userId), '1').catch(() => {});
}
