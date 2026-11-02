/**
 * Capability tokens derived from the send key (HKDF-SHA-256), so the server can check that a
 * request comes from someone holding the link without ever learning the key.
 *
 * Each purpose has its own HKDF `info` label: a token for one purpose can't be replayed for
 * another, and none can be turned back into the key. A new purpose (e.g. a reply token) MUST get
 * a new label. Never reuse a label, and never use these labels to derive encryption keys.
 */
import { arrayBufferToBase64Url, base64UrlToArrayBuffer } from './encoding';

/** HKDF label of the token that lets a recipient destroy a send (issue #94). */
export const RECIPIENT_DESTROY_TOKEN_LABEL = 'se2eend/v1/recipient-destroy-token';

const TOKEN_LENGTH_BITS = 256;

/** Derive a 256-bit token from the raw send key under a purpose-specific label. Returns base64url. */
async function deriveKeyToken(key: CryptoKey, label: string): Promise<string> {
  const rawKey = await window.crypto.subtle.exportKey('raw', key);
  const hkdfKey = await window.crypto.subtle.importKey('raw', rawKey, 'HKDF', false, ['deriveBits']);
  const bits = await window.crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      // The send key is already uniformly random, so an empty salt is fine.
      salt: new Uint8Array(0),
      info: new TextEncoder().encode(label),
    },
    hkdfKey,
    TOKEN_LENGTH_BITS
  );
  return arrayBufferToBase64Url(bits);
}

/** Token the recipient presents to destroy a send. Only ever sent on the destroy request. */
export async function deriveRecipientDestroyToken(key: CryptoKey): Promise<string> {
  return deriveKeyToken(key, RECIPIENT_DESTROY_TOKEN_LABEL);
}

/** SHA-256 of a base64url token, base64url-encoded: the only form the server stores. */
export async function hashToken(token: string): Promise<string> {
  const digest = await window.crypto.subtle.digest('SHA-256', base64UrlToArrayBuffer(token));
  return arrayBufferToBase64Url(digest);
}
