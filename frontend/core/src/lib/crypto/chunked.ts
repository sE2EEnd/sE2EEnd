/**
 * Chunked format: a concatenation of [IV(12) | ciphertext | GCM tag(16)] blocks, each block
 * encrypting one `chunkSize` plaintext slice. Produced by the chunked upload, consumed on
 * download either fully in memory (decryptChunkedBlob) or streamed (decryptChunkedStream).
 */
import { ALGORITHM, IV_LENGTH, CHUNK_OVERHEAD } from './constants';

/** Encrypt a raw ArrayBuffer as a single chunk: IV prepended, GCM tag appended by WebCrypto. */
export async function encryptChunk(data: ArrayBuffer, key: CryptoKey): Promise<Uint8Array> {
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encryptedBuffer = await window.crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, data);
  const result = new Uint8Array(IV_LENGTH + encryptedBuffer.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encryptedBuffer), IV_LENGTH);
  return result;
}

/**
 * Decrypt a chunked blob fully in memory.
 * `chunkSize` is the plaintext chunk size used during encryption; each encrypted block is
 * `chunkSize + CHUNK_OVERHEAD` bytes, except the last which may be smaller.
 */
export async function decryptChunkedBlob(
  encryptedBlob: Blob,
  key: CryptoKey,
  chunkSize: number,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  const encryptedChunkSize = chunkSize + CHUNK_OVERHEAD;
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
  const encryptedChunkSize = chunkSize + CHUNK_OVERHEAD;
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
