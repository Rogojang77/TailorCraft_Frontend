import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ConsentUpdateModal } from '@/components/ConsentUpdateModal';

/** When backend requires new consent, this describes what changed. */
export interface ConsentUpdateInfo {
  version: string;
  summary: string;
  termsUrl: string;
  privacyUrl: string;
}

interface ConsentContextType {
  /** True when user must re-accept legal documents before using the app. */
  consentRequired: boolean | null;
  /** Info about what changed (from backend). */
  consentUpdateInfo: ConsentUpdateInfo | null;
  /** Call after user has accepted the new consent. Can be async. */
  onConsentAccepted: () => void | Promise<void>;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

/**
 * Provides consent state and blocking modal when backend requires re-acceptance.
 * Backend integration: check GET /me or GET /consent/status for consentRequired.
 * When consentRequired is true, app blocks main UI until user accepts.
 */
export function ConsentProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, accessToken } = useAuth();
  const [consentRequired, setConsentRequired] = useState<boolean | null>(null);
  const [consentUpdateInfo, setConsentUpdateInfo] = useState<ConsentUpdateInfo | null>(null);

  // Check consent status when user is authenticated.
  // TODO: Replace with actual API call when backend provides consent/status endpoint.
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setConsentRequired(null);
      setConsentUpdateInfo(null);
      return;
    }

    // Placeholder: no consent required by default.
    // When backend is ready: apiFetch(api.consent.status) and set consentRequired + consentUpdateInfo.
    setConsentRequired(false);
    setConsentUpdateInfo(null);
  }, [isAuthenticated, accessToken]);

  const onConsentAccepted = async () => {
    // TODO: POST to backend to record acceptance (e.g. POST /me/consent), then:
    setConsentRequired(false);
    setConsentUpdateInfo(null);
  };

  const value: ConsentContextType = {
    consentRequired,
    consentUpdateInfo,
    onConsentAccepted,
  };

  return (
    <ConsentContext.Provider value={value}>
      {children}
      {consentRequired && consentUpdateInfo && (
        <ConsentUpdateModal
          visible
          info={consentUpdateInfo}
          onAccept={onConsentAccepted}
        />
      )}
    </ConsentContext.Provider>
  );
}
