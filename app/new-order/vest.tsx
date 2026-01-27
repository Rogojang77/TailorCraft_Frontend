import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Save, Ruler } from 'lucide-react-native';
import { useOrderDraft } from '@/contexts/OrderDraftContext';
import { OrderStepNav } from '@/components/OrderStepNav';
import { Colors, Spacing, Typography, ButtonStyles, HeaderStyles, Shadows, BorderRadius } from '@/constants/design';

export default function VestScreen() {
  const router = useRouter();
  const { draftOrder, updateMeasurements } = useOrderDraft();
  
  const existingData = draftOrder.measurements.vest || {};
  const [vestData, setVestData] = useState({
    chest: existingData.chest || '',
    waist: existingData.waist || '',
    hips: existingData.hips || '',
    frontLength: existingData.frontLength || '',
    backLength: existingData.backLength || '',
    model: existingData.model || '5 nasturi cu rever',
    lining: existingData.lining || 'captușit',
    buttons: existingData.buttons || '',
    materialCode: existingData.materialCode || '',
    observations: existingData.observations || '',
  });

  const models = ['5 nasturi cu rever', '5 nasturi fără rever', 'Rever șal', 'Rever ascuțit'];
  const linings = ['captușit', 'semi'];

  const handleSave = () => {
    updateMeasurements('vest', vestData);
    router.back();
  };

  const handleNext = () => {
    updateMeasurements('vest', vestData);
    router.push('/new-order/pants');
  };

  return (
    <>
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={Colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.title}>Măsurători Vestă</Text>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          activeOpacity={0.7}
        >
          <Save size={20} color={Colors.textInverse} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Measurements Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ruler size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Măsurători (cm)</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Bust</Text>
              <TextInput
                style={styles.input}
                value={vestData.chest}
                onChangeText={(text) => setVestData({...vestData, chest: text})}
                placeholder="cm"
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Talie</Text>
              <TextInput
                style={styles.input}
                value={vestData.waist}
                onChangeText={(text) => setVestData({...vestData, waist: text})}
                placeholder="cm"
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Șold</Text>
              <TextInput
                style={styles.input}
                value={vestData.hips}
                onChangeText={(text) => setVestData({...vestData, hips: text})}
                placeholder="cm"
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Lungime Față</Text>
              <TextInput
                style={styles.input}
                value={vestData.frontLength}
                onChangeText={(text) => setVestData({...vestData, frontLength: text})}
                placeholder="cm"
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lungime Spate</Text>
            <TextInput
              style={styles.fullInput}
              value={vestData.backLength}
              onChangeText={(text) => setVestData({...vestData, backLength: text})}
              placeholder="cm"
              keyboardType="numeric"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
        </View>

        {/* Style Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opțiuni Design</Text>

          <View style={styles.optionGroup}>
            <Text style={styles.optionLabel}>Model</Text>
            <View style={styles.optionColumn}>
              {models.map((model) => (
                <TouchableOpacity
                  key={model}
                  style={[
                    styles.optionButton,
                    vestData.model === model && styles.selectedOption,
                  ]}
                  onPress={() => setVestData({...vestData, model})}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.optionText,
                    vestData.model === model && styles.selectedOptionText,
                  ]}>
                    {model}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.optionGroup}>
            <Text style={styles.optionLabel}>Căptușeală</Text>
            <View style={styles.optionRow}>
              {linings.map((lining) => (
                <TouchableOpacity
                  key={lining}
                  style={[
                    styles.optionButton,
                    vestData.lining === lining && styles.selectedOption,
                  ]}
                  onPress={() => setVestData({...vestData, lining})}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.optionText,
                    vestData.lining === lining && styles.selectedOptionText,
                  ]}>
                    {lining}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nasturi</Text>
            <TextInput
              style={styles.fullInput}
              value={vestData.buttons}
              onChangeText={(text) => setVestData({...vestData, buttons: text})}
              placeholder="Descriere nasturi"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cod Material</Text>
            <TextInput
              style={styles.fullInput}
              value={vestData.materialCode}
              onChangeText={(text) => setVestData({...vestData, materialCode: text})}
              placeholder="Ex: WOL-001-BLK"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Observații</Text>
            <TextInput
              style={[styles.fullInput, styles.textArea]}
              value={vestData.observations}
              onChangeText={(text) => setVestData({...vestData, observations: text})}
              placeholder="Adăugați observații speciale..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>

      <OrderStepNav
        showPrev
        showNext
        onPrev={() => router.push('/new-order/jacket')}
        onNext={handleNext}
        prevLabel="Înapoi"
        nextLabel="Înainte"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    ...HeaderStyles.container,
  },
  backButton: {
    ...ButtonStyles.back,
  },
  title: {
    ...Typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    ...ButtonStyles.primaryIcon,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    ...Shadows.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    marginLeft: Spacing.sm,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    ...Typography.captionBold,
    marginBottom: Spacing.sm,
  },
  input: {
    ...Typography.body,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fullInput: {
    ...Typography.body,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  optionGroup: {
    marginBottom: Spacing.xl,
  },
  optionLabel: {
    ...Typography.captionBold,
    marginBottom: Spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionColumn: {
    gap: Spacing.sm,
  },
  optionButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.borderLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedOption: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionText: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
  },
  selectedOptionText: {
    color: Colors.textInverse,
  },
  bottomSpacer: {
    height: Spacing.xxxl,
  },
});
