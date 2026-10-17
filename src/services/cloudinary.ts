/**
 * Cloudinary API Service for MediVault / Medora
 * Uploads prescription images, medical lab reports, and profile avatars.
 */
import { Platform } from 'react-native';
import { File } from 'expo-file-system';

export const CLOUDINARY_CONFIG = {
  cloudName: 'jpsqqehv',
  apiKey: '452868775779148',
  apiSecret: '7duTIWFq2yLbw54coDFD9Ff5jYc',
};

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  url: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

/**
 * Pure TypeScript SHA-1 implementation for signing Cloudinary upload requests.
 * Runs synchronously across Android, iOS, and Web without native dependencies.
 */
function sha1(message: string): string {
  function rotateLeft(n: number, s: number) {
    return (n << s) | (n >>> (32 - s));
  }
  function cvtHex(val: number) {
    let str = '';
    for (let i = 7; i >= 0; i--) {
      str += ((val >>> (i * 4)) & 0x0f).toString(16);
    }
    return str;
  }
  const utf8 = unescape(encodeURIComponent(message));
  const blockCount = ((utf8.length + 8) >> 6) + 1;
  const words = new Array(blockCount * 16).fill(0);
  for (let i = 0; i < utf8.length; i++) {
    words[i >> 2] |= utf8.charCodeAt(i) << (24 - (i % 4) * 8);
  }
  words[utf8.length >> 2] |= 0x80 << (24 - (utf8.length % 4) * 8);
  words[blockCount * 16 - 1] = utf8.length * 8;

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const w = new Array(80);

  for (let i = 0; i < words.length; i += 16) {
    for (let j = 0; j < 16; j++) w[j] = words[i + j];
    for (let j = 16; j < 80; j++) {
      w[j] = rotateLeft(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let j = 0; j < 80; j++) {
      let f: number, k: number;
      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (rotateLeft(a, 5) + f + e + k + w[j]) | 0;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = temp;
    }
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }
  return cvtHex(h0) + cvtHex(h1) + cvtHex(h2) + cvtHex(h3) + cvtHex(h4);
}

/**
 * Upload an image or PDF to Cloudinary with authentication signature.
 *
 * @param fileUri Local URI of the file (e.g. file://..., content://... or data:...)
 * @param options Upload customization (folder, file type, file name)
 */
export async function uploadToCloudinary(
  fileUri: string,
  options: {
    folder?: string;
    resourceType?: 'image' | 'raw' | 'auto';
    fileName?: string;
    fileType?: 'pdf' | 'image';
  } = {}
): Promise<CloudinaryUploadResult> {
  const {
    folder = 'medora/reports',
    resourceType = 'auto',
    fileName = 'file',
    fileType,
  } = options;

  const timestamp = Math.floor(Date.now() / 1000);

  // Cloudinary signature parameters must be sorted alphabetically
  // string: folder=...&timestamp=... + api_secret
  const stringToSign = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_CONFIG.apiSecret}`;
  const signature = sha1(stringToSign);

  const formData = new FormData();

  // Determine mime type
  const isPdf = fileType === 'pdf' || fileName.toLowerCase().endsWith('.pdf');
  const mimeType = isPdf ? 'application/pdf' : 'image/jpeg';

  if (Platform.OS === 'web') {
    // Web: fetch the blob from a blob/data URL, or append the URI string directly
    if (fileUri.startsWith('blob:') || fileUri.startsWith('data:')) {
      const res = await fetch(fileUri);
      const blob = await res.blob();
      formData.append('file', blob, fileName);
    } else {
      formData.append('file', fileUri);
    }
  } else {
    // Native (Expo Go + dev builds + production):
    // The { uri, type, name } object form is rejected by React Native's fetch polyfill
    // in Expo Go ("Unsupported FormDataPart implementation").
    // Use the new SDK 57 File.arrayBuffer() API to read bytes and construct a proper Blob.
    try {
      const file = new File(fileUri);
      const buffer = await file.arrayBuffer();
      const blob = new Blob([buffer], { type: mimeType });
      formData.append('file', blob as any, fileName);
    } catch {
      // Fallback: legacy RN file-object shape (works in standalone/dev builds)
      formData.append('file', {
        uri: fileUri,
        type: mimeType,
        name: fileName,
      } as any);
    }
  }

  formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', folder);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || `Cloudinary upload failed with status ${response.status}`);
  }

  return {
    publicId: data.public_id,
    secureUrl: data.secure_url,
    url: data.url,
    format: data.format,
    bytes: data.bytes,
    width: data.width,
    height: data.height,
  };
}

/**
 * Delete a file from Cloudinary by its public ID.
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  const timestamp = Math.floor(Date.now() / 1000);
  const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_CONFIG.apiSecret}`;
  const signature = sha1(stringToSign);

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('api_key', CLOUDINARY_CONFIG.apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/destroy`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  return data.result === 'ok';
}
