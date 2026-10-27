/**
 * File storage service for MediVault medical reports.
 * Uses expo-file-system SDK 57 class-based API (File, Directory, Paths) on native.
 * Gracefully handles web environment using Blob/Web URLs.
 */
import { File, Directory, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';

function getReportsDir(): Directory | null {
  if (Platform.OS === 'web') return null;
  try {
    return new Directory(Paths.document, 'medivault/reports/');
  } catch (err) {
    console.warn('Could not initialize reports Directory:', err);
    return null;
  }
}

export async function ensureReportsDir(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const dir = getReportsDir();
    if (dir && !dir.exists) {
      dir.create();
    }
  } catch (err) {
    console.warn('ensureReportsDir error:', err);
  }
}

export interface PickedFile {
  uri: string;
  name: string;
  type: 'pdf' | 'image';
  sizeBytes: number;
}

/** Open native document picker for PDF files. */
export async function pickPdfDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name,
    type: 'pdf',
    sizeBytes: asset.size ?? 0,
  };
}

/** Open native image picker. */
export async function pickImage(): Promise<PickedFile | null> {
  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Media library permission not granted');
    }
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const fileName = asset.fileName ?? `image_${Date.now()}.jpg`;
  return {
    uri: asset.uri,
    name: fileName,
    type: 'image',
    sizeBytes: asset.fileSize ?? 0,
  };
}

/** Copy picked file to persistent private storage; returns new local path. */
export async function saveReportFile(
  sourceUri: string,
  fileName: string
): Promise<string> {
  if (Platform.OS === 'web') {
    return sourceUri;
  }
  try {
    await ensureReportsDir();
    const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const destName = `${Date.now()}_${safe}`;
    const reportsDir = getReportsDir();
    if (!reportsDir) return sourceUri;
    const destFile = new File(reportsDir, destName);
    const sourceFile = new File(sourceUri);
    sourceFile.copy(destFile);
    return destFile.uri;
  } catch (e) {
    console.warn('saveReportFile native copy failed, returning sourceUri:', e);
    return sourceUri;
  }
}

/** Delete a file from local storage (best-effort). */
export async function deleteReportFile(filePath: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const file = new File(filePath);
    if (file.exists) {
      file.delete();
    }
  } catch (e) {
    console.warn('deleteReportFile error:', e);
  }
}

/** Share a file using the native share sheet or web download. */
export async function shareFile(filePath: string, fileType?: 'pdf' | 'image'): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.open(filePath, '_blank');
    }
    return;
  }
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing is not available on this device');
  const isImage = fileType === 'image' || Boolean(filePath.match(/\.(jpg|jpeg|png|webp|gif)$/i));
  const mimeType = isImage ? 'image/jpeg' : 'application/pdf';
  const uti = isImage ? 'public.image' : 'com.adobe.pdf';
  await Sharing.shareAsync(filePath, { UTI: uti, mimeType });
}

/** Check if a file still exists or is accessible. */
export async function fileExists(filePath?: string): Promise<boolean> {
  if (!filePath) return false;
  if (Platform.OS === 'web') return true;
  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('data:') ||
    filePath.startsWith('blob:')
  ) {
    return true;
  }
  try {
    const file = new File(filePath);
    return file.exists;
  } catch {
    return false;
  }
}
