import { Stack } from 'expo-router';
import { OrderDraftProvider } from '@/contexts/OrderDraftContext';

export default function NewOrderLayout() {
  return (
    <OrderDraftProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="client-data" />
        <Stack.Screen name="jacket" />
        <Stack.Screen name="vest" />
        <Stack.Screen name="pants" />
        <Stack.Screen name="summary" />
      </Stack>
    </OrderDraftProvider>
  );
}