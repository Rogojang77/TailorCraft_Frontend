/**
 * Catalog route redirect (kept for old links).
 *
 * Catalog is now managed per garment. This route is retained only as a redirect
 * for legacy URLs/bookmarks that pointed to /catalog. Real catalog UI lives at
 * /garments and /garments/[garmentId]/catalog/[categoryId].
 */

import React, { useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';

export default function CatalogRedirect() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      router.replace('/garments');
    }, [router])
  );

  return null;
}
