import { Tabs } from 'expo-router';
import { Home, ShoppingBag, Image, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '@/constants/design';
import { useI18n } from '@/lib/i18n';

export default function TabLayout() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  // Tab bar respects safe bottom inset (home indicator / nav bar). Hide tab bar when
  // keyboard is open so it doesn’t push content and forms stay visible.
  const tabBarPaddingBottom = Math.max(insets.bottom, Spacing.sm);
  const tabBarHeight = 56 + Spacing.sm + tabBarPaddingBottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingTop: Spacing.sm,
          paddingBottom: tabBarPaddingBottom,
          height: tabBarHeight,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          ...Typography.small,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tabs.orders'),
          tabBarIcon: ({ size, color }) => (
            <ShoppingBag size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: t('tabs.gallery'),
          tabBarIcon: ({ size, color }) => (
            <Image size={size} color={color} />
          ),
          // Unmount gallery screen when not visible to free memory
          // This is critical for image-heavy screens
          unmountOnBlur: true,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}