/**
 * Cloudinary API Service — Medora
 * Uploads medical reports (PDF & images) and avatars.
 *
 * Native uploads use expo-file-system File.upload() with MULTIPART which
 * correctly handles file://, content:// and ph:// URIs on iOS & Android
 * including Expo Go. Web uploads use fetch + Blob + FormData.
 */
import { Platform } from 'react-native';
import { File, UploadType } from 'expo-file-system';

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

// ─── Pure-TS SHA-1 (no native deps) ─────────────────────────────────────────
function sha1(message: string): string {
  function rotateLeft(n: number, s: number) {
    return (n << s) | (n >>> (32 - s));
  }
  function cvtHex(val: number) {
    let str = '';
    for (let i = 7; i >= 0; i--) str += ((val >>> (i * 4)) & 0x0f).toString(16);
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

  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Array(80);

  for (let i = 0; i < words.length; i += 16) {
    for (let j = 0; j < 16; j++) w[j] = words[i + j];
    for (let j = 16; j < 80; j++) w[j] = rotateLeft(w[j-3]^w[j-8]^w[j-14]^w[j-16], 1);
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let j = 0; j < 80; j++) {
      let f: number, k: number;
      if      (j < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (j < 40) { f = b ^ c ^ d;           k = 0x6ed9eba1; }
      else if (j < 60) { f = (b & c)|(b & d)|(c & d); k = 0x8f1bbcdc; }
      else             { f = b ^ c ^ d;           k = 0xca62c1d6; }
      const temp = (rotateLeft(a, 5) + f + e + k + w[j]) | 0;
      e = d; d = c; c = rotateLeft(b, 30); b = a; a = temp;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
  }
  return cvtHex(h0) + cvtHex(h1) + cvtHex(h2) + cvtHex(h3) + cvtHex(h4);
}

// ─── Upload ──────────────────────────────────────────────────────────────────
/**
 * Upload a file (PDF or image) to Cloudinary.
 *
 * On native: uses `File.upload()` with `UploadType.MULTIPART` from
 * expo-file-system, which handles all URI schemes natively (Expo Go ✓).
 * On web: uses fetch + Blob + FormData.
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
  const stringToSign = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_CONFIG.apiSecret}`;
  const signature = sha1(stringToSign);
  const isPdf = fileType === 'pdf' || fileName.toLowerCase().endsWith('.pdf');
  const mimeType = isPdf ? 'application/pdf' : 'image/jpeg';
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`;

  // ── Native (iOS / Android — Expo Go, dev build, production) ──────────────
  if (Platform.OS !== 'web') {
    const file = new File(fileUri);
    const result = await file.upload(endpoint, {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName: 'file',
      mimeType,
      parameters: {
        api_key:   CLOUDINARY_CONFIG.apiKey,
        timestamp: timestamp.toString(),
        signature,
        folder,
      },
    });

    if (result.status < 200 || result.status >= 300) {
      let msg = `Cloudinary upload failed (${result.status})`;
      try {
        const err = JSON.parse(result.body);
        if (err?.error?.message) msg = err.error.message;
      } catch {}
      throw new Error(msg);
    }

    const d = JSON.parse(result.body);
    return {
      publicId:  d.public_id,
      secureUrl: d.secure_url,
      url:       d.url,
      format:    d.format,
      bytes:     d.bytes,
      width:     d.width,
      height:    d.height,
    };
  }

  // ── Web ──────────────────────────────────────────────────────────────────
  const formData = new FormData();
  if (fileUri.startsWith('blob:') || fileUri.startsWith('data:')) {
    const res = await fetch(fileUri);
    formData.append('file', await res.blob(), fileName);
  } else {
    formData.append('file', fileUri);
  }
  formData.append('api_key',   CLOUDINARY_CONFIG.apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder',    folder);

  const response = await fetch(endpoint, { method: 'POST', body: formData });
  const d = await response.json();
  if (!response.ok) {
    throw new Error(d.error?.message ?? `Cloudinary upload failed (${response.status})`);
  }
  return {
    publicId:  d.public_id,
    secureUrl: d.secure_url,
    url:       d.url,
    format:    d.format,
    bytes:     d.bytes,
    width:     d.width,
    height:    d.height,
  };
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  const timestamp = Math.floor(Date.now() / 1000);
  const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_CONFIG.apiSecret}`;
  const signature = sha1(stringToSign);

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('api_key',   CLOUDINARY_CONFIG.apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/destroy`;
  const response = await fetch(endpoint, { method: 'POST', body: formData });
  const data = await response.json();
  return data.result === 'ok';
}
