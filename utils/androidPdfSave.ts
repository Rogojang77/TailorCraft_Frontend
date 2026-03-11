/**
 * Android-only: save PDF to a user-chosen folder via Storage Access Framework (SAF).
 * Opens the native folder picker so the user can select e.g. Downloads or Documents.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Opens the native Android folder picker and saves the PDF (base64) to the selected folder.
 * No-op on non-Android; call only when Platform.OS === 'android'.
 */
export async function savePdfToFolderAsync(
  pdfBase64: string,
  suggestedFileName: string
): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  const { StorageAccessFramework } = FileSystem;
  const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted) {
    return;
  }

  const dirUri = permissions.directoryUri;
  const safFileUri = await StorageAccessFramework.createFileAsync(
    dirUri,
    suggestedFileName,
    'application/pdf'
  );

  await FileSystem.writeAsStringAsync(safFileUri, pdfBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
}
