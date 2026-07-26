import { describe, expect, it } from 'vitest';
import { decryptChunkedStream, encryptChunk, generateKey } from './crypto';

const IV_LENGTH = 12;
const GCM_TAG = 16;

/** Encrypt `data` the same way the chunked upload does: split into chunkSize plaintext slices,
 *  each becoming an [IV | ciphertext | tag] block, then concatenate. */
async function encryptAsChunkedUpload(data: Uint8Array, key: CryptoKey, chunkSize: number): Promise<Uint8Array> {
  const blocks: Uint8Array[] = [];
  for (let offset = 0; offset < data.byteLength; offset += chunkSize) {
    const slice = data.subarray(offset, Math.min(offset + chunkSize, data.byteLength));
    blocks.push(await encryptChunk(slice.slice().buffer, key));
  }
  const total = blocks.reduce((n, b) => n + b.byteLength, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const b of blocks) { out.set(b, pos); pos += b.byteLength; }
  return out;
}

/** Emit `data` through a ReadableStream in pieces of `pieceSize` bytes (simulating network reads
 *  that don't align to chunk boundaries). */
function streamInPieces(data: Uint8Array, pieceSize: number): ReadableStream<Uint8Array> {
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= data.byteLength) { controller.close(); return; }
      controller.enqueue(data.subarray(offset, Math.min(offset + pieceSize, data.byteLength)));
      offset += pieceSize;
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
  }
  const total = parts.reduce((n, p) => n + p.byteLength, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) { out.set(p, pos); pos += p.byteLength; }
  return out;
}

describe('decryptChunkedStream', () => {
  it('round-trips data across multiple chunks with a short final chunk', async () => {
    const key = await generateKey();
    const chunkSize = 64;
    // 3.5 chunks → exercises the short last block.
    const plaintext = crypto.getRandomValues(new Uint8Array(chunkSize * 3 + 23));
    const encrypted = await encryptAsChunkedUpload(plaintext, key, chunkSize);

    // Network pieces deliberately misaligned with the encrypted block size.
    const decrypted = await collect(decryptChunkedStream(streamInPieces(encrypted, 17), key, chunkSize));

    expect(decrypted).toEqual(plaintext);
  });

  it('reports the encrypted bytes read for progress', async () => {
    const key = await generateKey();
    const chunkSize = 32;
    const plaintext = crypto.getRandomValues(new Uint8Array(chunkSize * 2));
    const encrypted = await encryptAsChunkedUpload(plaintext, key, chunkSize);

    let reported = 0;
    await collect(decryptChunkedStream(streamInPieces(encrypted, 5), key, chunkSize, (n) => { reported += n; }));

    expect(reported).toBe(encrypted.byteLength);
    // Sanity: each block carries IV + tag of overhead.
    expect(encrypted.byteLength).toBe(2 * (chunkSize + IV_LENGTH + GCM_TAG));
  });

  it('rejects when a block has been tampered with', async () => {
    const key = await generateKey();
    const chunkSize = 48;
    const plaintext = crypto.getRandomValues(new Uint8Array(chunkSize));
    const encrypted = await encryptAsChunkedUpload(plaintext, key, chunkSize);
    encrypted[encrypted.byteLength - 1] ^= 0xff; // corrupt the GCM tag

    await expect(collect(decryptChunkedStream(streamInPieces(encrypted, 13), key, chunkSize))).rejects.toThrow();
  });
});
