import { Stack } from 'expo-router';

export default function FinancialLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="receivables" />
      <Stack.Screen name="profit" />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="expense-new" />
    </Stack>
  );
}
