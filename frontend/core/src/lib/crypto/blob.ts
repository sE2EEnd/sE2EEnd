/**
 * Single-shot blob encryption (whole file/text in one AES-GCM op, IV prepended).
 * Used for the TEXT send body and legacy non-chunked downloads.
 */
import { ALGORITHM, IV_LENGTH } from './constants';

/** Encrypt a whole file. Returns an encrypted blob with IV prepended. */
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

/** Decrypt a blob with IV prepended (counterpart of encryptFile). */
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
