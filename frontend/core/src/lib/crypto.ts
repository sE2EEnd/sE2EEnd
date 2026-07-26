/**
 * E2EE crypto (Web Crypto API) — public surface.
 *
 * Split into focused modules under ./crypto/; this barrel preserves the historical
 * `@/lib/crypto` import path so consumers don't need to change.
 *   - keys     : key generate / export / import (URL fragment)
 *   - text     : short-string encryption (send name, filenames)
 *   - blob     : single-shot whole-blob encryption (TEXT body, legacy files)
 *   - chunked  : chunked format — encryptChunk, decryptChunkedBlob, decryptChunkedStream
 */
export * from './crypto/keys';
export * from './crypto/text';
export * from './crypto/blob';
export * from './crypto/chunked';
