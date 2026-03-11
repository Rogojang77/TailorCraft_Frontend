import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';

/**
 * Legacy / alternate entry: single-screen order (client + payment + delivery + garments).
 * Not linked from the UI. Redirects to the primary flow (index) so there is one clear path.
 * Primary flow: index → client-data (when no client) → index (garment selection) → measurements → summary.
 */
export default function CreateOrderRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/new-order');
  }, [router]);

  return null;
}
