import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/lib/i18n';
import { api, apiFetch } from '@/lib/api';
import { FontFamily, AtelierSpacing, AtelierRadius } from '@/constants/atelierDesign';

type ExpenseCategory = 'SUPPLIER' | 'SHIPPING' | 'OTHER';

type Supplier = {
  id: string;
  name: string;
};

const CATEGORY_OPTIONS: Array<{ key: ExpenseCategory; labelKey: string }> = [
  { key: 'SUPPLIER', labelKey: 'financial.categorySupplier' },
  { key: 'SHIPPING', labelKey: 'financial.categoryShipping' },
  { key: 'OTHER', labelKey: 'financial.categoryOther' },
];

function todayDateInput(): string {
  const date = new Date();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

export default function FinancialExpenseNewScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [dateInput, setDateInput] = useState(todayDateInput());
  const [category, setCategory] = useState<ExpenseCategory>('OTHER');
  const [description, setDescription] = useState('');
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');

  const canSubmit = useMemo(() => Number(amount) > 0 && dateInput.trim().length > 0, [amount, dateInput]);

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await apiFetch<{ suppliers: Supplier[] }>(api.financial.suppliers());
      setSuppliers(res.suppliers ?? []);
    } catch (e) {
      console.error('Failed to load suppliers:', e);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const onCreateSupplier = useCallback(async () => {
    if (!newSupplierName.trim()) return;
    try {
      const created = await apiFetch<Supplier>(api.financial.suppliers(), {
        method: 'POST',
        body: JSON.stringify({ name: newSupplierName.trim() }),
      });
      setNewSupplierName('');
      setSupplierId(created.id);
      await loadSuppliers();
    } catch (e) {
      console.error('Failed to create supplier:', e);
      setError(t('financial.saveError'));
    }
  }, [loadSuppliers, newSupplierName, t]);

  const onSave = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const occurredAt = new Date(`${dateInput.trim()}T12:00:00.000Z`);
      await apiFetch(api.financial.expenses(), {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(amount),
          occurredAt: occurredAt.toISOString(),
          category,
          supplierId: category === 'SUPPLIER' ? supplierId : null,
          orderId: category === 'SHIPPING' && orderId.trim() ? orderId.trim() : null,
          description: description.trim() || null,
        }),
      });
      router.replace('/financial/expenses');
    } catch (e) {
      console.error('Failed to save expense:', e);
      setError(t('financial.saveError'));
    } finally {
      setLoading(false);
    }
  }, [amount, canSubmit, category, dateInput, description, orderId, router, supplierId, t]);

  return (
    <ScreenContainer noPadding>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={AtelierSpacing.xl}
      >
        <Input
          label={t('financial.amount')}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <Input
          label={t('financial.date')}
          value={dateInput}
          onChangeText={setDateInput}
          placeholder="YYYY-MM-DD"
        />

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{t('financial.category')}</Text>
          <View style={styles.chips}>
            {CATEGORY_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.chip,
                  {
                    backgroundColor: category === item.key ? colors.brass ?? colors.primary : colors.card,
                    borderColor: colors.rule ?? colors.border,
                  },
                ]}
                onPress={() => setCategory(item.key)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: category === item.key ? colors.paper ?? '#EFE9DC' : colors.textPrimary },
                  ]}
                >
                  {t(item.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {category === 'SUPPLIER' ? (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('financial.supplier')}</Text>
            <View style={styles.chips}>
              {suppliers.map((supplier) => (
                <TouchableOpacity
                  key={supplier.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: supplierId === supplier.id ? colors.brass ?? colors.primary : colors.card,
                      borderColor: colors.rule ?? colors.border,
                    },
                  ]}
                  onPress={() => setSupplierId(supplier.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: supplierId === supplier.id ? colors.paper ?? '#EFE9DC' : colors.textPrimary },
                    ]}
                  >
                    {supplier.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.newSupplierRow}>
              <View style={styles.newSupplierInput}>
                <Input
                  label={t('financial.newSupplier')}
                  value={newSupplierName}
                  onChangeText={setNewSupplierName}
                  placeholder={t('financial.newSupplier')}
                />
              </View>
              <Button variant="secondary" onPress={onCreateSupplier}>
                {t('common.add')}
              </Button>
            </View>
          </View>
        ) : null}

        {category === 'SHIPPING' ? (
          <Input
            label={t('financial.orderIdOptional')}
            value={orderId}
            onChangeText={setOrderId}
            placeholder={t('financial.orderIdOptional')}
          />
        ) : null}

        <Input
          label={t('financial.description')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('financial.description')}
          multiline
        />

        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

        <Button onPress={onSave} loading={loading} disabled={!canSubmit}>
          {t('financial.saveExpense')}
        </Button>
      </KeyboardAwareScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: AtelierSpacing.md,
    paddingBottom: AtelierSpacing.xxl,
    gap: AtelierSpacing.md,
  },
  section: {
    gap: AtelierSpacing.sm,
  },
  label: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AtelierSpacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderRadius: AtelierRadius.full,
    paddingVertical: 6,
    paddingHorizontal: AtelierSpacing.sm,
  },
  chipText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
  newSupplierRow: {
    flexDirection: 'row',
    gap: AtelierSpacing.sm,
    alignItems: 'flex-end',
  },
  newSupplierInput: {
    flex: 1,
  },
  error: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 16,
  },
});

