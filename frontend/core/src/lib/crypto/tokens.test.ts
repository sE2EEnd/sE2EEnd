import { describe, expect, it } from 'vitest';
import { exportKeyToBase64, generateKey, importKeyFromBase64 } from './keys';
import { arrayBufferToBase64Url, base64UrlToArrayBuffer } from './encoding';
import { deriveRecipientDestroyToken, hashToken } from './tokens';

describe('deriveRecipientDestroyToken', () => {
  it('is deterministic for a key and survives the URL-fragment round trip', async () => {
    const key = await generateKey();
    const fromFragment = await importKeyFromBase64(await exportKeyToBase64(key));

    const token = await deriveRecipientDestroyToken(key);
    expect(await deriveRecipientDestroyToken(fromFragment)).toBe(token);
    expect(base64UrlToArrayBuffer(token).byteLength).toBe(32);
  });

  it('never equals the key and differs between keys', async () => {
    const key = await generateKey();
    const token = await deriveRecipientDestroyToken(key);

    expect(token).not.toBe(await exportKeyToBase64(key));
    expect(token).not.toBe(await deriveRecipientDestroyToken(await generateKey()));
  });
});

describe('hashToken', () => {
  it('returns the base64url SHA-256 of the decoded token, as the server computes it', async () => {
    const token = await deriveRecipientDestroyToken(await generateKey());
    const expected = arrayBufferToBase64Url(await crypto.subtle.digest('SHA-256', base64UrlToArrayBuffer(token)));

    const hash = await hashToken(token);
    expect(hash).toBe(expected);
    expect(hash).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).not.toBe(token);
  });
});
