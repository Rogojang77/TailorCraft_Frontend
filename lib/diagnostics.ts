/**
 * Lightweight in-memory diagnostics for production support.
 * No persistence; no third-party SDKs. Used by long-press on Profile header.
 */

export interface SubscriptionFetchRecord {
  result: 'success' | 'error';
  message?: string;
  timestamp: number;
}

export interface AuthRefreshRecord {
  result: 'success' | 'error';
  timestamp: number;
}

export interface DraftRestoreRecord {
  timestamp: number;
}

export interface DiagnosticsSnapshot {
  lastSubscriptionFetch: SubscriptionFetchRecord | null;
  lastAuthRefresh: AuthRefreshRecord | null;
  lastDraftRestore: DraftRestoreRecord | null;
}

const state: {
  lastSubscriptionFetch: SubscriptionFetchRecord | null;
  lastAuthRefresh: AuthRefreshRecord | null;
  lastDraftRestore: DraftRestoreRecord | null;
} = {
  lastSubscriptionFetch: null,
  lastAuthRefresh: null,
  lastDraftRestore: null,
};

export function getDiagnostics(): DiagnosticsSnapshot {
  return {
    lastSubscriptionFetch: state.lastSubscriptionFetch,
    lastAuthRefresh: state.lastAuthRefresh,
    lastDraftRestore: state.lastDraftRestore,
  };
}

export function recordSubscriptionFetch(result: 'success' | 'error', message?: string): void {
  state.lastSubscriptionFetch = { result, message, timestamp: Date.now() };
}

export function recordAuthRefresh(result: 'success' | 'error'): void {
  state.lastAuthRefresh = { result, timestamp: Date.now() };
}

export function recordDraftRestore(): void {
  state.lastDraftRestore = { timestamp: Date.now() };
}
