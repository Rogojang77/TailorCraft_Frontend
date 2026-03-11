import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { Plus, X, ImagePlus, ShoppingBag } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, BorderRadius, Shadows, Typography } from '@/constants/design';
import { useI18n } from '@/lib/i18n';

interface FABAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}

interface FloatingActionButtonProps {
  onCreateOrder: () => void;
  onAddGalleryItem: () => void;
}

export function FloatingActionButton({
  onCreateOrder,
  onAddGalleryItem,
}: FloatingActionButtonProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);

  const fabBottomOffset = Spacing.md;
  const fabCloseOffset = insets.bottom + Spacing.md + 56 + Spacing.sm;

  const actions: FABAction[] = [
    {
      id: 'create-order',
      label: t('home.fab.createOrder'),
      icon: <ShoppingBag size={20} color={colors.textInverse} />,
      onPress: () => {
        setIsOpen(false);
        onCreateOrder();
      },
    },
    {
      id: 'add-gallery-item',
      label: t('home.fab.addGalleryItem'),
      icon: <ImagePlus size={20} color={colors.textInverse} />,
      onPress: () => {
        setIsOpen(false);
        onAddGalleryItem();
      },
    },
  ];

  return (
    <>
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.ctaGold,
            bottom: fabBottomOffset,
            ...Shadows.ctaPill,
          },
        ]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.85}
      >
        <Plus size={28} color={colors.textInverse} strokeWidth={2.5} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <View style={[styles.menuContainer, { bottom: fabCloseOffset + 56 + Spacing.sm }]}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.menuItem, { backgroundColor: colors.primary }]}
                onPress={action.onPress}
                activeOpacity={0.85}
              >
                {action.icon}
                <Text style={[styles.menuLabel, { color: colors.textInverse }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.fab,
              styles.fabClose,
              {
                backgroundColor: colors.textSecondary,
                bottom: fabCloseOffset,
              },
            ]}
            onPress={() => setIsOpen(false)}
            activeOpacity={0.85}
          >
            <X size={28} color={colors.textInverse} strokeWidth={2.5} />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: Spacing.md,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  fabClose: Platform.select({
    android: {},
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
  }),
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    right: Spacing.md,
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
    ...Shadows.md,
  },
  menuLabel: {
    ...Typography.bodyBold,
  },
});
