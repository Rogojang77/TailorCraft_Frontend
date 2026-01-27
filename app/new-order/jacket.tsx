import React, { useState, useEffect } from 'react';
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

export default function JacketScreen() {
  const router = useRouter();
  const { draftOrder, updateMeasurements } = useOrderDraft();
  
  const existingData = draftOrder.measurements.jacket || {};
  const [jacketData, setJacketData] = useState({
    chest: existingData.chest || '',
    waist: existingData.waist || '',
    hips: existingData.hips || '',
    frontLength: existingData.frontLength || '',
    backLength: existingData.backLength || '',
    shoulderToShoulder: existingData.shoulderToShoulder || '',
    sleeveLength: existingData.sleeveLength || '',
    backWidth: existingData.backWidth || '',
    lapelType: existingData.lapelType || 'Classic',
    model: existingData.model || '2 nasturi',
    slit: existingData.slit || '1',
    pockets: existingData.pockets || 'cu clapa',
    lining: existingData.lining || 'captușit',
    buttonholes: existingData.buttonholes || '3',
    buttons: existingData.buttons || '',
    materialCode: existingData.materialCode || '',
    customization: existingData.customization || '',
    observations: existingData.observations || '',
    size: existingData.size || '50',
  });

  const lapelTypes = ['Classic', 'Ascuțit', 'Șal'];
  const models = ['2 rânduri', '2 nasturi', '1 nasture', 'Redingotă'];
  const slits = ['1', '2'];
  const pocketTypes = ['cu clapa', 'fără', 'aplicate', 'interior'];
  const linings = ['captușit', 'semi'];
  const sizes = Array.from({ length: 9 }, (_, i) => (44 + i * 2).toString());

  const handleSave = () => {
    updateMeasurements('jacket', jacketData);
    router.back();
  };

  const handleNext = () => {
    updateMeasurements('jacket', jacketData);
    router.push('/new-order/vest');
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
        <Text style={styles.title}>Măsurători Sacou</Text>
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
                value={jacketData.chest}
                onChangeText={(text) => setJacketData({...jacketData, chest: text})}
                placeholder="cm"
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Talie</Text>
              <TextInput
                style={styles.input}
                value={jacketData.waist}
                onChangeText={(text) => setJacketData({...jacketData, waist: text})}
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
                value={jacketData.hips}
                onChangeText={(text) => setJacketData({...jacketData, hips: text})}
                placeholder="cm"
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Mărime</Text>
              <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {sizes.map((size) => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.pickerItem,
                        jacketData.size === size && styles.selectedPickerItem,
                      ]}
                      onPress={() => setJacketData({...jacketData, size})}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.pickerText,
                        jacketData.size === size && styles.selectedPickerText,
                      ]}>
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Lungime Față</Text>
              <TextInput
                style={styles.input}
                value={jacketData.frontLength}
                onChangeText={(text) => setJacketData({...jacketData, frontLength: text})}
                placeholder="cm"
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Lungime Spate</Text>
              <TextInput
                style={styles.input}
                value={jacketData.backLength}
                onChangeText={(text) => setJacketData({...jacketData, backLength: text})}
                placeholder="cm"
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Din Umăr în Umăr</Text>
              <TextInput
                style={styles.input}
                value={jacketData.shoulderToShoulder}
                onChangeText={(text) => setJacketData({...jacketData, shoulderToShoulder: text})}
                placeholder="cm"
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Lungime Mânecă</Text>
              <TextInput
                style={styles.input}
                value={jacketData.sleeveLength}
                onChangeText={(text) => setJacketData({...jacketData, sleeveLength: text})}
                placeholder="cm"
                keyboardType="numeric"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lățime Spate</Text>
            <TextInput
              style={styles.fullInput}
              value={jacketData.backWidth}
              onChangeText={(text) => setJacketData({...jacketData, backWidth: text})}
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
            <Text style={styles.optionLabel}>Tip Rever</Text>
            <View style={styles.optionRow}>
              {lapelTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.optionButton,
                    jacketData.lapelType === type && styles.selectedOption,
                  ]}
                  onPress={() => setJacketData({...jacketData, lapelType: type})}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.optionText,
                    jacketData.lapelType === type && styles.selectedOptionText,
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.optionGroup}>
            <Text style={styles.optionLabel}>Model</Text>
            <View style={styles.optionRow}>
              {models.map((model) => (
                <TouchableOpacity
                  key={model}
                  style={[
                    styles.optionButton,
                    jacketData.model === model && styles.selectedOption,
                  ]}
                  onPress={() => setJacketData({...jacketData, model})}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.optionText,
                    jacketData.model === model && styles.selectedOptionText,
                  ]}>
                    {model}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cod Material</Text>
            <TextInput
              style={styles.fullInput}
              value={jacketData.materialCode}
              onChangeText={(text) => setJacketData({...jacketData, materialCode: text})}
              placeholder="Ex: WOL-001-BLK"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Observații</Text>
            <TextInput
              style={[styles.fullInput, styles.textArea]}
              value={jacketData.observations}
              onChangeText={(text) => setJacketData({...jacketData, observations: text})}
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
        onPrev={() => router.push('/new-order/client-data')}
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
  optionButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
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
