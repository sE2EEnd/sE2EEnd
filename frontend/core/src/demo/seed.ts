import { generateKey, exportKeyToBase64, encryptText, encryptFile } from '@/lib/crypto';
import { storeSendKey } from '@/lib/sendKeysDB';
import { createSend, storeSendFile, revokeSend } from './store';
import { clearDemoDB } from './db';

const LS_KEY = 'demo_session_start_v1';
const TTL_MS = 4 * 60 * 60 * 1000; // 4 hours — shared across tabs via localStorage

export async function runSeedIfNeeded(): Promise<void> {
  const stored = localStorage.getItem(LS_KEY);
  const now = Date.now();
  const isExpired = !stored || now - parseInt(stored, 10) > TTL_MS;

  if (!isExpired) return; // same "session" across all tabs — DB intact, skip

  await clearDemoDB();
  localStorage.setItem(LS_KEY, String(now));
  await seed();
}

/** Called by the reset button: wipe DB, clear flag, reload. */
export function resetDemo(): void {
  localStorage.removeItem(LS_KEY);
  clearDemoDB().finally(() => window.location.reload());
}

async function seed(): Promise<void> {
  const now = new Date();
  const days = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString().slice(0, 19);

  // 1. Active text send — expires in 7 days, 4/10 downloads used
  await seedText({
    name: 'Secret note',
    text: 'This is a demo secret note — it would be encrypted end-to-end in a real instance.',
    maxDownloads: 10,
    downloadCount: 4,
    expiresAt: days(7),
  });

  // 2. Active file send — expires in 3 days
  await seedFile({
    name: 'Demo report',
    filename: 'demo-report.txt',
    content: 'This is the content of the demo report file. It is stored encrypted in IndexedDB.',
    maxDownloads: 5,
    downloadCount: 1,
    expiresAt: days(3),
  });

  // 3. Password-protected file send
  await seedFile({
    name: 'Confidential file',
    filename: 'confidential.txt',
    content: 'Top secret content, protected by a password.',
    maxDownloads: 3,
    downloadCount: 0,
    expiresAt: days(14),
    password: 'demo1234',
  });

  // 4. Expired send (expiresAt in the past)
  const expiredSend = await seedFile({
    name: 'Expired transfer',
    filename: 'expired.txt',
    content: 'This send has expired.',
    maxDownloads: 5,
    downloadCount: 0,
    expiresAt: days(-2),
  });
  void expiredSend;

  // 5. Revoked send
  const revokedSend = await seedText({
    name: 'Revoked send',
    text: 'This send was revoked by the owner.',
    maxDownloads: 5,
    downloadCount: 2,
    expiresAt: days(30),
  });
  await revokeSend(revokedSend.id);

  // 6. Exhausted send (downloadCount >= maxDownloads)
  await seedFile({
    name: 'Exhausted transfer',
    filename: 'exhausted.txt',
    content: 'This send reached its download limit.',
    maxDownloads: 2,
    downloadCount: 2,
    expiresAt: days(30),
  });
}

async function seedText(opts: {
  name: string;
  text: string;
  maxDownloads: number;
  downloadCount: number;
  expiresAt: string;
  password?: string;
}) {
  const key = await generateKey();
  const keyBase64 = await exportKeyToBase64(key);
  const encName = await encryptText(opts.name, key);

  const textBytes = new TextEncoder().encode(opts.text);
  const textFile = new File([textBytes], 'text.txt', { type: 'text/plain' });
  const encryptedBlob = await encryptFile(textFile, key);
  const encFilename = await encryptText('text.txt', key);

  const send = await createSend({
    name: encName,
    type: 'TEXT',
    expiresAt: opts.expiresAt,
    maxDownloads: opts.maxDownloads,
    passwordProtected: !!opts.password,
    password: opts.password,
  });

  // Patch downloadCount directly (store returns the object from DB, mutation is safe here)
  const { openDemoDB } = await import('./db');
  const db = await openDemoDB();
  await new Promise<void>((res, rej) => {
    const req = db.transaction('sends', 'readwrite').objectStore('sends').get(send.id);
    req.onsuccess = () => {
      const record = req.result;
      record.downloadCount = opts.downloadCount;
      const put = db.transaction('sends', 'readwrite').objectStore('sends').put(record);
      put.onsuccess = () => res();
      put.onerror = () => rej(put.error);
    };
    req.onerror = () => rej(req.error);
  });

  const encBuf = await encryptedBlob.arrayBuffer();
  await storeSendFile(send.id, encFilename, [new Uint8Array(encBuf)], undefined);
  await storeSendKey(send.id, keyBase64);
  return send;
}

async function seedFile(opts: {
  name: string;
  filename: string;
  content: string;
  maxDownloads: number;
  downloadCount: number;
  expiresAt: string;
  password?: string;
}) {
  const key = await generateKey();
  const keyBase64 = await exportKeyToBase64(key);
  const encName = await encryptText(opts.name, key);
  const encFilename = await encryptText(opts.filename, key);

  const fileBytes = new TextEncoder().encode(opts.content);
  const file = new File([fileBytes], opts.filename, { type: 'text/plain' });
  const encryptedBlob = await encryptFile(file, key);

  const send = await createSend({
    name: encName,
    type: 'FILE',
    expiresAt: opts.expiresAt,
    maxDownloads: opts.maxDownloads,
    passwordProtected: !!opts.password,
    password: opts.password,
  });

  const { openDemoDB } = await import('./db');
  const db = await openDemoDB();
  await new Promise<void>((res, rej) => {
    const req = db.transaction('sends', 'readwrite').objectStore('sends').get(send.id);
    req.onsuccess = () => {
      const record = req.result;
      record.downloadCount = opts.downloadCount;
      const put = db.transaction('sends', 'readwrite').objectStore('sends').put(record);
      put.onsuccess = () => res();
      put.onerror = () => rej(put.error);
    };
    req.onerror = () => rej(req.error);
  });

  const encBuf = await encryptedBlob.arrayBuffer();
  await storeSendFile(send.id, encFilename, [new Uint8Array(encBuf)], undefined);
  await storeSendKey(send.id, keyBase64);
  return send;
}
