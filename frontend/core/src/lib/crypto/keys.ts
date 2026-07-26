/**
 * Encryption key lifecycle: generate, export to / import from the URL fragment.
 */
import { ALGORITHM, KEY_LENGTH } from './constants';
import { arrayBufferToBase64Url, base64UrlToArrayBuffer } from './encoding';

/** Generate a random AES-GCM encryption key. */
export async function generateKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/** Export key to base64url string (for the URL fragment). */
export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64Url(exported);
}

/** Import key from base64url string. */
export async function importKeyFromBase64(base64Key: string): Promise<CryptoKey> {
  const keyData = base64UrlToArrayBuffer(base64Key);
  return await window.crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt']
  );
}
