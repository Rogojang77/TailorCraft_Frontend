/**
 * Tracks duplicated shared templates. Shared/api templates are read-only;
 * duplicating creates a local (editable) copy for the session.
 * No API calls; assume data is already available.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

type TemplatesContextValue = {
  duplicatedTemplateIds: Set<string>;
  isDuplicated: (templateId: string) => boolean;
  duplicateTemplate: (templateId: string) => void;
};

const TemplatesContext = createContext<TemplatesContextValue | null>(null);

export function TemplatesProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set());

  const isDuplicated = useCallback(
    (templateId: string) => ids.has(templateId),
    [ids]
  );

  const duplicateTemplate = useCallback((templateId: string) => {
    setIds((prev) => new Set(prev).add(templateId));
  }, []);

  const value: TemplatesContextValue = {
    duplicatedTemplateIds: ids,
    isDuplicated,
    duplicateTemplate,
  };

  return (
    <TemplatesContext.Provider value={value}>
      {children}
    </TemplatesContext.Provider>
  );
}

export function useTemplates() {
  const ctx = useContext(TemplatesContext);
  if (!ctx) {
    throw new Error('useTemplates must be used within TemplatesProvider');
  }
  return ctx;
}
