import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Plus, X, ImagePlus, ShoppingBag } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontFamily, AtelierSpacing, AtelierRadius, AtelierShadow } from '@/constants/atelierDesign';
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

  const fabBottomOffset = AtelierSpacing.md;
  const fabCloseOffset = insets.bottom + AtelierSpacing.md + 56 + AtelierSpacing.sm;
  const paperColor = colors.paper ?? '#EFE9DC';

  const ctaShadow = Platform.select({
    android: {},
    default: {
      shadowColor: colors.ctaGold,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
  });

  const actions: FABAction[] = [
    {
      id: 'create-order',
      label: t('home.fab.createOrder'),
      icon: <ShoppingBag size={20} color={paperColor} />,
      onPress: () => { setIsOpen(false); onCreateOrder(); },
    },
    {
      id: 'add-gallery-item',
      label: t('home.fab.addGalleryItem'),
      icon: <ImagePlus size={20} color={paperColor} />,
      onPress: () => { setIsOpen(false); onAddGalleryItem(); },
    },
  ];

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.ctaGold, bottom: fabBottomOffset, ...ctaShadow }]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.85}
      >
        <Plus size={28} color={paperColor} strokeWidth={2.5} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <View style={[styles.menuContainer, { bottom: fabCloseOffset + 56 + AtelierSpacing.sm }]}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.menuItem, { backgroundColor: colors.brass ?? colors.primary }, AtelierShadow.card]}
                onPress={action.onPress}
                activeOpacity={0.85}
              >
                {action.icon}
                <Text style={[styles.menuLabel, { color: paperColor }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.fab, styles.fabClose, { backgroundColor: colors.ink3, bottom: fabCloseOffset }]}
            onPress={() => setIsOpen(false)}
            activeOpacity={0.85}
          >
            <X size={28} color={paperColor} strokeWidth={2.5} />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: AtelierSpacing.md,
    width: 56,
    height: 56,
    borderRadius: AtelierRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  fabClose: Platform.select({
    android: {},
    default: {
      shadowColor: '#1B1611',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
  }),
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27,22,17,0.5)',
  },
  menuContainer: {
    position: 'absolute',
    right: AtelierSpacing.md,
    alignItems: 'flex-end',
    gap: AtelierSpacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: AtelierSpacing.sm,
    paddingHorizontal: AtelierSpacing.md,
    borderRadius: AtelierRadius.full,
    gap: AtelierSpacing.sm,
  },
  menuLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 22,
  },
});
