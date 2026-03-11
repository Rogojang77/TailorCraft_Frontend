/**
 * Hook for PDF document templates and sections (content) state and API.
 */

import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  listDocumentTemplates,
  getDocumentTemplate,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  fetchPdfFields,
} from '@/lib/services/pdfService';
import type {
  PdfDocumentTemplateRecord,
  TemplateJson,
  TemplateSection,
  TemplateSectionFields,
  TemplateSectionContract,
  PdfFieldDefinition,
} from '@/lib/services/pdfService';
import { getStoredAccessToken } from '@/lib/api';
import {
  createDefaultSection,
  applyQuickTemplate,
  DEFAULT_SECTIONS,
  type QuickTemplateId,
} from '@/lib/pdfCustomizeConstants';

export interface UsePdfSectionsArgs {
  isPro: boolean;
  t: (key: string) => string;
  onSaveSuccess?: () => void;
}

export function usePdfSections({ isPro, t, onSaveSuccess }: UsePdfSectionsArgs) {
  const [docTemplates, setDocTemplates] = useState<PdfDocumentTemplateRecord[]>([]);
  const [currentDoc, setCurrentDoc] = useState<PdfDocumentTemplateRecord | null>(null);
  const [docName, setDocName] = useState('');
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [docSaving, setDocSaving] = useState(false);
  const [fields, setFields] = useState<PdfFieldDefinition[]>([]);
  const [variableKeys, setVariableKeys] = useState<string[]>([]);
  const [addSectionModalVisible, setAddSectionModalVisible] = useState(false);
  const [fieldSelectorSectionIndex, setFieldSelectorSectionIndex] = useState<number | null>(null);
  const [contractEditIndex, setContractEditIndex] = useState<number | null>(null);
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);

  const loadFields = useCallback(async () => {
    try {
      const token = await getStoredAccessToken();
      const res = await fetchPdfFields(token ?? undefined);
      setFields(res.fields);
      setVariableKeys(res.variableKeys);
    } catch {
      setFields([]);
      setVariableKeys([]);
    }
  }, []);

  const loadDocTemplate = useCallback(async () => {
    if (!isPro) return;
    try {
      const token = await getStoredAccessToken();
      if (!token) return;
      const list = await listDocumentTemplates(token);
      setDocTemplates(list);
      if (list.length > 0) {
        const first = list[0]!;
        const doc = await getDocumentTemplate(first.id, token);
        setCurrentDoc(doc);
        setDocName(doc.name);
        setSections(doc.templateJson?.sections ?? [...DEFAULT_SECTIONS]);
      } else {
        setCurrentDoc(null);
        setDocName(t('pdf.defaultTemplate'));
        setSections([...DEFAULT_SECTIONS]);
      }
    } catch (e) {
      console.error('Load document template:', e);
      setCurrentDoc(null);
      setDocName(t('pdf.defaultTemplate'));
      setSections([...DEFAULT_SECTIONS]);
    }
  }, [isPro, t]);

  useEffect(() => {
    if (isPro) {
      loadFields();
      loadDocTemplate();
    }
  }, [isPro, loadFields, loadDocTemplate]);

  const handleAddSection = useCallback((type: TemplateSection['type']) => {
    setSections((prev) => [...prev, createDefaultSection(type)]);
    setAddSectionModalVisible(false);
  }, []);

  const openFieldSelector = useCallback((index: number) => {
    setFieldSelectorSectionIndex((prev) => {
      const sec = sections[index];
      return sec?.type === 'fields' ? index : prev;
    });
  }, [sections]);

  const updateFieldsInSection = useCallback((index: number, newFields: TemplateSectionFields['fields']) => {
    setSections((prev) => {
      const next = [...prev];
      const sec = next[index];
      if (sec?.type === 'fields') next[index] = { ...sec, fields: newFields };
      return next;
    });
  }, []);

  const insertVariable = useCallback((index: number, variable: string) => {
    const placeholder = `{{${variable}}}`;
    setSections((prev) => {
      const next = [...prev];
      const sec = next[index];
      if (sec?.type !== 'contract') return prev;
      const s = sec as TemplateSectionContract;
      next[index] = { ...s, content: (s.content || '') + placeholder };
      return next;
    });
  }, []);

  const handleSaveDocument = useCallback(async (): Promise<boolean> => {
    if (!isPro) return false;
    const token = await getStoredAccessToken();
    if (!token) return false;
    setDocSaving(true);
    try {
      const templateJson: TemplateJson = { sections };
      if (currentDoc?.id) {
        await updateDocumentTemplate(
          currentDoc.id,
          { name: docName.trim() || currentDoc.name, templateJson },
          token
        );
      } else {
        const created = await createDocumentTemplate(
          {
            name: docName.trim() || t('pdf.defaultTemplate'),
            templateJson,
            isDefault: docTemplates.length === 0,
          },
          token
        );
        const list = await listDocumentTemplates(token);
        setDocTemplates(list);
        setCurrentDoc(created);
        setDocName(created.name);
      }
      return true;
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('pdf.saveTemplateError'));
      return false;
    } finally {
      setDocSaving(false);
    }
  }, [isPro, t, sections, currentDoc, docName, docTemplates.length]);

  const handleRemoveSection = useCallback((index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveSectionUp = useCallback((index: number) => {
    if (index <= 0) return;
    setSections((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
      return next;
    });
  }, []);

  const moveSectionDown = useCallback((index: number) => {
    setSections((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
      return next;
    });
  }, []);

  const setSectionEnabled = useCallback((index: number, enabled: boolean) => {
    setSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, enabled };
      return next;
    });
  }, []);

  const setSectionContent = useCallback((index: number, content: string) => {
    setSections((prev) => {
      const next = [...prev];
      const sec = next[index];
      if (sec?.type !== 'contract') return prev;
      next[index] = { ...sec, content };
      return next;
    });
  }, []);

  const selectDocumentTemplate = useCallback(
    async (id: string | null) => {
      setTemplatePickerVisible(false);
      if (id === null) {
        setCurrentDoc(null);
        setDocName('');
        setSections([...DEFAULT_SECTIONS]);
        return;
      }
      try {
        const token = await getStoredAccessToken();
        if (!token) return;
        const doc = await getDocumentTemplate(id, token);
        setCurrentDoc(doc);
        setDocName(doc.name);
        setSections(doc.templateJson?.sections ?? [...DEFAULT_SECTIONS]);
      } catch (e) {
        console.error('Load document template:', e);
        Alert.alert(t('common.error'), t('pdf.loadTemplateError'));
      }
    },
    [t]
  );

  const handleDeleteTemplate = useCallback(async () => {
    if (!currentDoc?.id) return;
    Alert.alert(
      t('pdf.deleteTemplate'),
      t('pdf.deleteTemplateConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const token = await getStoredAccessToken();
            if (!token) return;
            try {
              await deleteDocumentTemplate(currentDoc.id, token);
              const list = await listDocumentTemplates(token);
              setDocTemplates(list);
              if (list.length === 0) {
                setCurrentDoc(null);
                setDocName(t('pdf.defaultTemplate'));
                setSections([...DEFAULT_SECTIONS]);
              } else {
                const next = list[0]!;
                const doc = await getDocumentTemplate(next.id, token);
                setCurrentDoc(doc);
                setDocName(doc.name);
                setSections(doc.templateJson?.sections ?? [...DEFAULT_SECTIONS]);
              }
            } catch (e) {
              Alert.alert(t('common.error'), e instanceof Error ? e.message : t('pdf.saveTemplateError'));
            }
          },
        },
      ]
    );
  }, [currentDoc, t]);

  const handleSetAsDefault = useCallback(async () => {
    if (!currentDoc?.id) return;
    const token = await getStoredAccessToken();
    if (!token) return;
    try {
      await updateDocumentTemplate(currentDoc.id, { isDefault: true }, token);
      const list = await listDocumentTemplates(token);
      setDocTemplates(list);
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('pdf.saveTemplateError'));
    }
  }, [currentDoc, t]);

  const handleSaveAsNew = useCallback(async () => {
    const token = await getStoredAccessToken();
    if (!token) return;
    setDocSaving(true);
    try {
      const name = (docName.trim() || t('pdf.defaultTemplate')) + ' (copy)';
      const templateJson: TemplateJson = { sections };
      const created = await createDocumentTemplate(
        { name, templateJson, isDefault: false },
        token
      );
      const list = await listDocumentTemplates(token);
      setDocTemplates(list);
      setCurrentDoc(created);
      setDocName(created.name);
      onSaveSuccess?.();
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : t('pdf.saveTemplateError'));
    } finally {
      setDocSaving(false);
    }
  }, [docName, sections, t, onSaveSuccess]);

  const handleQuickTemplate = useCallback((id: QuickTemplateId) => {
    setSections(applyQuickTemplate(id));
  }, []);

  return {
    docTemplates,
    currentDoc,
    docName,
    setDocName,
    sections,
    setSections,
    docSaving,
    fields,
    variableKeys,
    addSectionModalVisible,
    setAddSectionModalVisible,
    fieldSelectorSectionIndex,
    setFieldSelectorSectionIndex,
    contractEditIndex,
    setContractEditIndex,
    templatePickerVisible,
    setTemplatePickerVisible,
    loadDocTemplate,
    handleAddSection,
    handleRemoveSection,
    moveSectionUp,
    moveSectionDown,
    setSectionEnabled,
    setSectionContent,
    updateFieldsInSection,
    insertVariable,
    openFieldSelector,
    handleSaveDocument,
    selectDocumentTemplate,
    handleDeleteTemplate,
    handleSetAsDefault,
    handleSaveAsNew,
    handleQuickTemplate,
  };
}
