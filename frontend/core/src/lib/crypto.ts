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
 * Encrypt a raw ArrayBuffer as a single chunk.
 * Returns a Uint8Array with IV prepended, matching the format of encryptFile.
 */
export async function encryptChunk(data: ArrayBuffer, key: CryptoKey): Promise<Uint8Array> {
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encryptedBuffer = await window.crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, data);
  const result = new Uint8Array(IV_LENGTH + encryptedBuffer.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encryptedBuffer), IV_LENGTH);
  return result;
}

/**
 * Decrypt a blob produced by chunked upload.
 * The blob is a concatenation of [IV | ciphertext] blocks.
 * chunkSize is the plaintext chunk size used during encryption.
 * Each encrypted block is chunkSize + IV_LENGTH + 16 (GCM tag) bytes,
 * except the last which may be smaller.
 */
export async function decryptChunkedBlob(
  encryptedBlob: Blob,
  key: CryptoKey,
  chunkSize: number,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  const encryptedChunkSize = chunkSize + IV_LENGTH + 16; // 16 = GCM auth tag
  const totalChunks = Math.ceil(encryptedBlob.size / encryptedChunkSize);
  const decryptedParts: Blob[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * encryptedChunkSize;
    const end = Math.min(start + encryptedChunkSize, encryptedBlob.size);
    // blob.slice() reads only ~5 MB at a time — safe for arbitrarily large files
    const chunkBuffer = await encryptedBlob.slice(start, end).arrayBuffer();
    const iv = new Uint8Array(chunkBuffer, 0, IV_LENGTH);
    const ciphertext = new Uint8Array(chunkBuffer, IV_LENGTH);
    const decrypted = await window.crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
    decryptedParts.push(new Blob([decrypted]));
    onProgress?.(Math.round(((i + 1) / totalChunks) * 100));
  }

  return new Blob(decryptedParts);
}

/**
 * Streaming variant of decryptChunkedBlob — decrypts a chunked upload at constant RAM.
 *
 * Pipes a network ReadableStream through two TransformStreams:
 *   1. re-chunk: re-frame the raw byte flow into blocks of EXACTLY encryptedChunkSize
 *      (chunkSize + IV + GCM tag), last block shorter. GCM needs a whole block to verify the tag.
 *   2. decrypt: split IV(12)+ciphertext per block, AES-GCM decrypt, enqueue plaintext.
 *
 * Peak memory ≈ 1–2 chunks regardless of file size. Used to write directly to disk via a
 * Service Worker (see lib/streamDownload.ts).
 *
 * onBytesRead reports the number of ENCRYPTED bytes pulled from the network so far,
 * letting the caller drive a progress bar against the response Content-Length.
 */
export function decryptChunkedStream(
  source: ReadableStream<Uint8Array>,
  key: CryptoKey,
  chunkSize: number,
  onBytesRead?: (bytes: number) => void,
): ReadableStream<Uint8Array> {
  const encryptedChunkSize = chunkSize + IV_LENGTH + 16; // 16 = GCM auth tag
  return source
    .pipeThrough(createReChunkTransform(encryptedChunkSize, onBytesRead))
    .pipeThrough(createDecryptTransform(key));
}

/**
 * Re-frame an arbitrary byte stream into fixed-size blocks (last one may be shorter).
 * Buffers incoming Uint8Arrays without re-copying the whole buffer on each push:
 * every byte is copied exactly once into an emitted block.
 */
function createReChunkTransform(
  blockSize: number,
  onBytesRead?: (bytes: number) => void,
): TransformStream<Uint8Array, Uint8Array> {
  let parts: Uint8Array[] = [];
  let buffered = 0;

  const drainBlock = (controller: TransformStreamDefaultController<Uint8Array>) => {
    const block = new Uint8Array(blockSize);
    let filled = 0;
    while (filled < blockSize) {
      const part = parts[0];
      const need = blockSize - filled;
      if (part.byteLength <= need) {
        block.set(part, filled);
        filled += part.byteLength;
        parts.shift();
      } else {
        block.set(part.subarray(0, need), filled);
        parts[0] = part.subarray(need);
        filled += need;
      }
    }
    buffered -= blockSize;
    controller.enqueue(block);
  };

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      onBytesRead?.(chunk.byteLength);
      parts.push(chunk);
      buffered += chunk.byteLength;
      while (buffered >= blockSize) drainBlock(controller);
    },
    flush(controller) {
      if (buffered > 0) {
        const block = new Uint8Array(buffered);
        let filled = 0;
        for (const part of parts) {
          block.set(part, filled);
          filled += part.byteLength;
        }
        parts = [];
        buffered = 0;
        controller.enqueue(block);
      }
    },
  });
}

/**
 * Decrypt each fixed-size encrypted block (IV(12) + ciphertext + GCM tag) into plaintext.
 */
function createDecryptTransform(key: CryptoKey): TransformStream<Uint8Array, Uint8Array> {
  return new TransformStream<Uint8Array, Uint8Array>({
    async transform(block, controller) {
      const iv = block.subarray(0, IV_LENGTH) as BufferSource;
      const ciphertext = block.subarray(IV_LENGTH) as BufferSource;
      const decrypted = await window.crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
      controller.enqueue(new Uint8Array(decrypted));
    },
  });
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
