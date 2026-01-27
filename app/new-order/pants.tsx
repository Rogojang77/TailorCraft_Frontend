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

export default function PantsScreen() {
  const router = useRouter();
  const { draftOrder, updateMeasurements } = useOrderDraft();
  
  const existingData = draftOrder.measurements.pants || {};
  const [pantsData, setPantsData] = useState({
    size: existingData.size || '50',
    model: existingData.model || 'Clasic',
    waist: existingData.waist || '',
    hips: existingData.hips || '',
    upperLeg: existingData.upperLeg || '',
    knee: existingData.knee || '',
    hem: existingData.hem || '',
    frontCircumference: existingData.frontCircumference || '',
    backCircumference: existingData.backCircumference || '',
    interiorLength: existingData.interiorLength || '',
    exteriorLength: existingData.exteriorLength || '',
    materialCode: existingData.materialCode || '',
    observations: existingData.observations || '',
  });

  const sizes = Array.from({ length: 10 }, (_, i) => (42 + i * 2).toString());
  const models = ['Clasic', 'fără găici', '2 pense', 'betelie înaltă', 'Gurkha'];

  const handleSave = () => {
    updateMeasurements('pants', pantsData);
    router.back();
  };

  const handleNext = () => {
    updateMeasurements('pants', pantsData);
    router.push('/new-order/summary');
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
        <Text style={styles.title}>Măsurători Pantaloni</Text>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          activeOpacity={0.7}
        >
          <Save size={20} color={Colors.textInverse} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Size and Model */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mărime și Model</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mărime</Text>
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {sizes.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.pickerItem,
                      pantsData.size === size && styles.selectedPickerItem,
                    ]}
                    onPress={() => setPantsData({...pantsData, size})}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.pickerText,
                      pantsData.size === size && styles.selectedPickerText,
                    ]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.optionGroup}>
            <Text style={styles.optionLabel}>Model</Text>
            <View style={styles.optionColumn}>
              {models.map((model) => (
                <TouchableOpacity
                  key={model}
                  style={[
                    styles.optionButton,
                    pantsData.model === model && styles.selectedOption,
                  ]}
                  onPress={() => setPantsData({...pantsData, model})}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.optionText,
                    pantsData.model === model && styles.selectedOptionText,
                  ]}>
                    {model}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Measurements Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ruler size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Măsurători (cm)</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Talie</Text>
              <TextInput
                style={styles.input}
                value={pantsData.waist}
                onChangeText={(text) => setPantsData({...pantsData, waist: text})}
                placeholder="cm"
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Șold</Text>
              <TextInput
                style={styles.input}
                value={pantsData.hips}
                onChangeText={(text) => setPantsData({...pantsData, hips: text})}
                placeholder="cm"
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Picior Sus</Text>
              <TextInput
                style={styles.input}
                value={pantsData.upperLeg}
                onChangeText={(text) => setPantsData({...pantsData, upperLeg: text})}
                placeholder="cm"
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Genunchi</Text>
              <TextInput
                style={styles.input}
                value={pantsData.knee}
                onChangeText={(text) => setPantsData({...pantsData, knee: text})}
                placeholder="cm"
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Tiv</Text>
              <TextInput
                style={styles.input}
                value={pantsData.hem}
                onChangeText={(text) => setPantsData({...pantsData, hem: text})}
                placeholder="cm"
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Tur Față</Text>
              <TextInput
                style={styles.input}
                value={pantsData.frontCircumference}
                onChangeText={(text) => setPantsData({...pantsData, frontCircumference: text})}
                placeholder="cm"
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Tur Spate</Text>
              <TextInput
                style={styles.input}
                value={pantsData.backCircumference}
                onChangeText={(text) => setPantsData({...pantsData, backCircumference: text})}
                placeholder="cm"
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Lungime Interioară</Text>
              <TextInput
                style={styles.input}
                value={pantsData.interiorLength}
                onChangeText={(text) => setPantsData({...pantsData, interiorLength: text})}
                placeholder="cm"
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lungime Exterioară</Text>
            <TextInput
              style={styles.fullInput}
              value={pantsData.exteriorLength}
              onChangeText={(text) => setPantsData({...pantsData, exteriorLength: text})}
              placeholder="cm"
              keyboardType="numeric"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cod Material</Text>
            <TextInput
              style={styles.fullInput}
              value={pantsData.materialCode}
              onChangeText={(text) => setPantsData({...pantsData, materialCode: text})}
              placeholder="Ex: WOL-001-BLK"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Observații</Text>
            <TextInput
              style={[styles.fullInput, styles.textArea]}
              value={pantsData.observations}
              onChangeText={(text) => setPantsData({...pantsData, observations: text})}
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
        onPrev={() => router.push('/new-order/vest')}
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
  pickerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pickerItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginHorizontal: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  selectedPickerItem: {
    backgroundColor: Colors.primary,
  },
  pickerText: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
  },
  selectedPickerText: {
    color: Colors.textInverse,
  },
  bottomSpacer: {
    height: Spacing.xxxl,
  },
});
