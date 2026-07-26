/**
 * Shared AES-GCM parameters for the E2EE crypto modules.
 */
export const ALGORITHM = 'AES-GCM';
export const KEY_LENGTH = 256; // bits
export const IV_LENGTH = 12; // 96-bit IV for GCM
export const GCM_TAG_LENGTH = 16; // 128-bit auth tag, appended by the WebCrypto API

/** Per-chunk overhead of the chunked format: IV prepended + GCM tag appended. */
export const CHUNK_OVERHEAD = IV_LENGTH + GCM_TAG_LENGTH; // 28 bytes
