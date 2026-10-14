import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const STORAGE_KEY = '@tailorcraft/sketchImportLibrary/v1';
const LIBRARY_DIR = `${FileSystem.documentDirectory}order-sketch-library/`;
const MAX_LIBRARY_ITEMS = 20;

export interface SavedSketchImport {
  id: string;
  localUri: string;
  name: string;
  createdAt: string;
}

function fileExtension(uri: string): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = match?.[1]?.toLowerCase() ?? 'jpg';
  return ext.length > 8 ? 'jpg' : ext;
}

function fileNameFromUri(uri: string): string {
  const cleanUri = uri.split('?')[0];
  const segments = cleanUri.split('/');
  return segments[segments.length - 1] ?? '';
}

async function ensureLibraryDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(LIBRARY_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(LIBRARY_DIR, { intermediates: true });
  }
}

async function persist(items: SavedSketchImport[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function loadSavedSketchImports(): Promise<SavedSketchImport[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return [];
    const parsed = JSON.parse(json) as SavedSketchImport[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => Boolean(item?.id) && Boolean(item?.localUri));
  } catch {
    return [];
  }
}

export async function saveImportedSketch(sourceUri: string): Promise<SavedSketchImport[]> {
  await ensureLibraryDir();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const ext = fileExtension(sourceUri);
  const localUri = `${LIBRARY_DIR}${id}.${ext}`;
  await FileSystem.copyAsync({ from: sourceUri, to: localUri });

  const baseName = fileNameFromUri(sourceUri).replace(/\.[a-zA-Z0-9]+$/, '').trim();
  const name = baseName || `Sketch ${new Date().toLocaleDateString()}`;
  const newItem: SavedSketchImport = {
    id,
    localUri,
    name,
    createdAt: new Date().toISOString(),
  };

  const current = await loadSavedSketchImports();
  const next = [newItem, ...current];
  const overflow = next.slice(MAX_LIBRARY_ITEMS);
  const trimmed = next.slice(0, MAX_LIBRARY_ITEMS);
  await persist(trimmed);

  await Promise.all(
    overflow.map((item) => FileSystem.deleteAsync(item.localUri, { idempotent: true }).catch(() => undefined))
  );

  return trimmed;
}

export async function removeSavedSketchImport(id: string): Promise<SavedSketchImport[]> {
  const current = await loadSavedSketchImports();
  const toRemove = current.find((item) => item.id === id);
  const next = current.filter((item) => item.id !== id);
  await persist(next);
  if (toRemove) {
    await FileSystem.deleteAsync(toRemove.localUri, { idempotent: true }).catch(() => undefined);
  }
  return next;
}
