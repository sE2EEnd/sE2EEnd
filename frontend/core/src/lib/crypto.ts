/**
 * E2EE Crypto utilities using Web Crypto API
 * Files are encrypted client-side before upload
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Generate a random encryption key
 */
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

/**
 * Export key to base64url string (for URL fragment)
 */
export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64Url(exported);
}

/**
 * Import key from base64url string
 */
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

/**
 * Encrypt a file
 * Returns encrypted blob with IV prepended
 */
export async function encryptFile(file: File, key: CryptoKey): Promise<Blob> {
  // Generate random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Read file as ArrayBuffer
  const fileBuffer = await file.arrayBuffer();

  // Encrypt
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    fileBuffer
  );

  // Prepend IV to encrypted data
  const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encryptedBuffer), iv.length);

  return new Blob([result], { type: 'application/octet-stream' });
}

/**
 * Decrypt a blob
 * Expects IV to be prepended to the encrypted data
 */
export async function decryptBlob(encryptedBlob: Blob, key: CryptoKey): Promise<Blob> {
  const encryptedBuffer = await encryptedBlob.arrayBuffer();
  const encryptedArray = new Uint8Array(encryptedBuffer);

  // Extract IV from the beginning
  const iv = encryptedArray.slice(0, IV_LENGTH);
  const ciphertext = encryptedArray.slice(IV_LENGTH);

  // Decrypt
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    ciphertext
  );

  return new Blob([decryptedBuffer]);
}

/**
 * Convert ArrayBuffer to base64url string
 */
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  // Convert to base64url (URL-safe)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Convert base64url string to ArrayBuffer
 */
function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  // Convert base64url to base64
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypt a text string
 * Returns base64-encoded encrypted data with IV prepended
 */
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

/**
 * Decrypt an encrypted text string
 * Expects base64-encoded data with IV prepended
 */
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
