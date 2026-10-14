import { Tabs } from 'expo-router';
import { Home, ShoppingBag, Image, User, CalendarDays } from 'lucide-react-native';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useI18n } from '@/lib/i18n';
import { FEATURE_FLAGS } from '@/constants/featureFlags';
import { FontFamily, AtelierSpacing } from '@/constants/atelierDesign';

export default function TabLayout() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const tabBarPaddingBottom = Math.max(insets.bottom, AtelierSpacing.sm);
  const tabBarHeight = 52 + AtelierSpacing.sm + tabBarPaddingBottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.brass,
        tabBarInactiveTintColor: colors.ink4,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopWidth: 1,
          borderTopColor: colors.rule,
          paddingTop: AtelierSpacing.sm,
          paddingBottom: tabBarPaddingBottom,
          height: tabBarHeight,
          ...(Platform.OS === 'ios' && {
            shadowColor: colors.ink2,
            shadowOffset: { width: 0, height: -1 },
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 6,
          }),
        },
        tabBarLabelStyle: {
          fontFamily: FontFamily.monoMedium,
          fontSize: 9,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ size, color }) => (
            <Home size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tabs.orders'),
          tabBarIcon: ({ size, color }) => (
            <ShoppingBag size={size - 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: t('tabs.gallery'),
          tabBarIcon: ({ size, color }) => (
            <Image size={size - 2} color={color} />
          ),
          unmountOnBlur: true,
        }}
      />
      {FEATURE_FLAGS.calendarEnabled && (
        <Tabs.Screen
          name="calendar"
          options={{
            title: t('tabs.calendar'),
            tabBarIcon: ({ size, color }) => (
              <CalendarDays size={size - 2} color={color} />
            ),
          }}
        />
      )}
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ size, color }) => (
            <User size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
