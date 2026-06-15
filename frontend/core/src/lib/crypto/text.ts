/**
 * Short-string encryption (send name, filenames) → base64url, IV prepended.
 */
import { ALGORITHM, IV_LENGTH } from './constants';

/** Encrypt a text string. Returns base64url-encoded data with IV prepended. */
export async function encryptText(plaintext: string, key: CryptoKey): Promise<string> {
  // Generate random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encode text to bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Encrypt
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    data
  );

  // Prepend IV to encrypted data
  const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encryptedBuffer), iv.length);

  // Convert to base64url (URL-safe, filesystem-safe)
  let binary = '';
  for (let i = 0; i < result.byteLength; i++) {
    binary += String.fromCharCode(result[i]);
  }
  const base64 = btoa(binary);
  // Convert to base64url: replace + with -, / with _, and remove =
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/** Decrypt a text string produced by encryptText (base64url, IV prepended). */
export async function decryptText(encryptedBase64: string, key: CryptoKey): Promise<string> {
  // Convert base64url back to base64
  let base64 = encryptedBase64.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }

  // Decode from base64
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // Extract IV from the beginning
  const iv = bytes.slice(0, IV_LENGTH);
  const ciphertext = bytes.slice(IV_LENGTH);

  // Decrypt
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    ciphertext
  );

  // Decode bytes to text
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
