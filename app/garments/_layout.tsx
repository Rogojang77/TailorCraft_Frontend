import { Stack } from 'expo-router';
import { TemplatesProvider } from '@/contexts/TemplatesContext';

export default function GarmentsLayout() {
  return (
    <TemplatesProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="new" />
        <Stack.Screen name="[garmentId]" />
      </Stack>
    </TemplatesProvider>
  );
}
