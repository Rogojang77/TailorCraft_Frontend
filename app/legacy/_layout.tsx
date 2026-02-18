import React from 'react';
import { Stack } from 'expo-router';
import { OrderDraftProvider } from '@/contexts/OrderDraftContext';
import { TemplatesProvider } from '@/contexts/TemplatesContext';

/**
 * Layout for legacy/deprecated screens.
 * Provides OrderDraftProvider and TemplatesProvider so legacy new-order-garment
 * screen can function if reached via direct URL (e.g. deep link).
 * See app/legacy/README.md for deprecation details.
 */
export default function LegacyLayout() {
  return (
    <OrderDraftProvider orderMode="create">
      <TemplatesProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="new-order-garment/[garmentId]" />
        </Stack>
      </TemplatesProvider>
    </OrderDraftProvider>
  );
}
