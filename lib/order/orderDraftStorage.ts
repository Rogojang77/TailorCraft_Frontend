/**
 * Persistence for order draft state. User-scoped; drafts are not shared across users.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DraftOrder } from '@/contexts/OrderDraftContext';

const DRAFT_KEY_PREFIX = '@tailorcraft/orderDraft/';

function draftKey(userId: string): string {
  return `${DRAFT_KEY_PREFIX}${userId}`;
}

export async function saveDraft(userId: string, draft: DraftOrder): Promise<void> {
  try {
    const key = draftKey(userId);
    const json = JSON.stringify(draft);
    await AsyncStorage.setItem(key, json);
  } catch (error) {
    console.error('Failed to persist order draft:', error);
  }
}

export async function loadDraft(userId: string): Promise<DraftOrder | null> {
  try {
    const key = draftKey(userId);
    const json = await AsyncStorage.getItem(key);
    if (!json) return null;
    const parsed = JSON.parse(json) as DraftOrder;
    return parsed;
  } catch (error) {
    console.error('Failed to load order draft:', error);
    return null;
  }
}

export async function clearDraftStorage(userId: string): Promise<void> {
  try {
    const key = draftKey(userId);
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear order draft from storage:', error);
  }
}

/**
 * True if the draft has meaningful content (not an empty/default draft).
 */
export function isDraftNonEmpty(draft: DraftOrder): boolean {
  const customer = draft?.customer;
  return (
    (draft.selectedGarmentIds?.length ?? 0) > 0 ||
    (customer?.name?.trim() ?? '') !== '' ||
    (customer?.phone?.trim() ?? '') !== '' ||
    Object.keys(draft.measurements ?? {}).length > 0
  );
}
