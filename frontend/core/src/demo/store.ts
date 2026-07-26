import { openDemoDB, tx } from './db';
import type { DemoSendRecord, DemoSetting, DemoMeta } from './db';
import type { SendResponse, FileMetadata, SendCreateRequest } from '@/services/sendApi';
import type { PagedResponse, AdminStats, StorageMetrics, CleanupResult, DeletedSend } from '@/services/adminApi';

const DEMO_OWNER_ID = 'demo-user-id';
const DEMO_OWNER_EMAIL = 'demo@se2eend.local';
const DEMO_OWNER_NAME = 'Demo User';

const chunkedSessions = new Map<string, { sendId: string; filename: string; chunks: Uint8Array[] }>();

function uuid(): string {
  return crypto.randomUUID();
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ── Sends ────────────────────────────────────────────────────────────────────

export async function createSend(req: SendCreateRequest): Promise<SendResponse> {
  const send: DemoSendRecord = {
    id: uuid(),
    accessId: shortId(),
    ownerId: DEMO_OWNER_ID,
    ownerEmail: DEMO_OWNER_EMAIL,
    ownerName: DEMO_OWNER_NAME,
    name: req.name,
    type: req.type,
    expiresAt: req.expiresAt,
    maxDownloads: req.maxDownloads ?? 5,
    downloadCount: 0,
    passwordProtected: req.passwordProtected ?? false,
    ownerPassword: req.password,
    revoked: false,
    createdAt: new Date().toISOString(),
  };
  await tx<IDBValidKey>('sends', 'readwrite', (s) => s.put(send));
  return toResponse(send);
}

export async function getSendById(id: string): Promise<DemoSendRecord | null> {
  const db = await openDemoDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction('sends', 'readonly').objectStore('sends').get(id);
    req.onsuccess = () => resolve((req.result as DemoSendRecord) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function getSendByAccessId(accessId: string): Promise<DemoSendRecord | null> {
  const db = await openDemoDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction('sends', 'readonly').objectStore('sends').index('accessId').get(accessId);
    req.onsuccess = () => resolve((req.result as DemoSendRecord) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function listOwnerSends(): Promise<DemoSendRecord[]> {
  const db = await openDemoDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction('sends', 'readonly').objectStore('sends').getAll();
    req.onsuccess = () =>
      resolve(
        ((req.result as DemoSendRecord[]) ?? []).filter((s) => s.ownerId === DEMO_OWNER_ID),
      );
    req.onerror = () => reject(req.error);
  });
}

export async function listAllSends(): Promise<DemoSendRecord[]> {
  const db = await openDemoDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction('sends', 'readonly').objectStore('sends').getAll();
    req.onsuccess = () => resolve((req.result as DemoSendRecord[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSend(id: string): Promise<void> {
  await tx<undefined>('sends', 'readwrite', (s) => s.delete(id));
}

export async function revokeSend(id: string): Promise<void> {
  const send = await getSendById(id);
  if (!send) return;
  send.revoked = true;
  await tx<IDBValidKey>('sends', 'readwrite', (s) => s.put(send));
}

export async function storeSendFile(
  sendId: string,
  filename: string,
  encryptedChunks: Uint8Array[],
  chunkSize?: number,
): Promise<FileMetadata> {
  const send = await getSendById(sendId);
  if (!send) throw new Error('Send not found');
  const totalBytes = encryptedChunks.reduce((sum, c) => sum + c.byteLength, 0);
  const fileId = uuid();
  send.file = { id: fileId, filename, sizeBytes: totalBytes, chunkSize };
  send.encryptedChunks = encryptedChunks;
  send.chunkSize = chunkSize;
  await tx<IDBValidKey>('sends', 'readwrite', (s) => s.put(send));
  return { id: fileId, filename, sizeBytes: totalBytes, chunkSize };
}

export async function readEncryptedBytes(
  accessId: string,
  password?: string,
): Promise<{ data: Uint8Array; send: DemoSendRecord }> {
  const send = await getSendByAccessId(accessId);
  if (!send) throw Object.assign(new Error('Not found'), { status: 404 });
  if (send.revoked) throw Object.assign(new Error('Gone'), { status: 410 });
  if (send.expiresAt && new Date(send.expiresAt) < new Date())
    throw Object.assign(new Error('Gone'), { status: 410 });
  if (send.downloadCount >= send.maxDownloads)
    throw Object.assign(new Error('Gone'), { status: 410 });
  if (send.passwordProtected && send.ownerPassword && password !== send.ownerPassword)
    throw Object.assign(new Error('Forbidden'), { status: 403 });

  send.downloadCount += 1;
  await tx<IDBValidKey>('sends', 'readwrite', (s) => s.put(send));

  const chunks = send.encryptedChunks ?? [];
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const merged = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) {
    merged.set(c, pos);
    pos += c.byteLength;
  }
  return { data: merged, send };
}

// ── Chunked upload sessions (in-memory) ─────────────────────────────────────

export function initChunkedSession(sendId: string, filename: string): string {
  const sessionId = uuid();
  chunkedSessions.set(sessionId, { sendId, filename, chunks: [] });
  return sessionId;
}

export function appendChunk(sessionId: string, chunkIndex: number, data: Uint8Array): void {
  const session = chunkedSessions.get(sessionId);
  if (!session) throw new Error(`Unknown session ${sessionId}`);
  session.chunks[chunkIndex] = data;
}

export async function finalizeChunkedUpload(
  sessionId: string,
  totalChunks: number,
  chunkSize: number,
): Promise<FileMetadata> {
  const session = chunkedSessions.get(sessionId);
  if (!session) throw new Error(`Unknown session ${sessionId}`);
  chunkedSessions.delete(sessionId);
  const chunks = session.chunks.slice(0, totalChunks);
  return storeSendFile(session.sendId, session.filename, chunks, chunkSize);
}

// ── Admin ────────────────────────────────────────────────────────────────────

export async function getAdminSends(
  page: number,
  size: number,
  ownerSearch?: string,
  status?: string,
): Promise<PagedResponse<SendResponse>> {
  let sends = await listAllSends();
  const now = new Date();

  if (ownerSearch) {
    const q = ownerSearch.toLowerCase();
    sends = sends.filter(
      (s) =>
        s.ownerEmail?.toLowerCase().includes(q) || s.ownerName?.toLowerCase().includes(q),
    );
  }
  if (status && status !== 'all') {
    sends = sends.filter((s) => {
      const expired = !!(s.expiresAt && new Date(s.expiresAt) < now);
      const exhausted = s.downloadCount >= s.maxDownloads;
      if (status === 'active') return !s.revoked && !expired && !exhausted;
      if (status === 'revoked') return s.revoked;
      if (status === 'expired') return expired && !s.revoked;
      return true;
    });
  }

  const totalElements = sends.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const content = sends.slice(page * size, (page + 1) * size).map(toResponse);
  return { content, totalElements, totalPages, currentPage: page, pageSize: size };
}

export async function getStats(): Promise<AdminStats> {
  const sends = await listAllSends();
  const now = new Date();
  const active = sends.filter(
    (s) =>
      !s.revoked &&
      !(s.expiresAt && new Date(s.expiresAt) < now) &&
      s.downloadCount < s.maxDownloads,
  ).length;
  return {
    totalSends: sends.length,
    activeSends: active,
    revokedSends: sends.filter((s) => s.revoked).length,
    totalFiles: sends.filter((s) => !!s.file).length,
  };
}

export function getStorageMetrics(): StorageMetrics {
  return {
    totalSpace: 107_374_182_400,
    freeSpace: 89_128_042_496,
    usableSpace: 89_128_042_496,
    usedSpace: 18_246_139_904,
    percentageUsed: 17,
    fileCount: 42,
    storageSize: 18_246_139_904,
    storagePath: '/data/demo',
  };
}

export function runCleanup(): CleanupResult {
  return {
    deletedSends: 3,
    deletedFiles: 3,
    freedSpace: 15_728_640,
    timestamp: new Date().toISOString(),
  };
}

export async function getDeletedSends(
  page: number,
  size: number,
): Promise<PagedResponse<DeletedSend>> {
  return { content: [], totalElements: 0, totalPages: 1, currentPage: page, pageSize: size };
}

// ── Settings ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Record<string, string> = {
  require_auth_for_download: 'false',
  require_send_password: 'false',
  max_upload_size_bytes: String(2 * 1024 * 1024 * 1024),
};

export async function getSettings(): Promise<Record<string, string>> {
  const db = await openDemoDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction('settings', 'readonly').objectStore('settings').getAll();
    req.onsuccess = () => {
      const stored: Record<string, string> = { ...DEFAULT_SETTINGS };
      for (const row of (req.result as DemoSetting[]) ?? []) {
        stored[row.key] = row.value;
      }
      resolve(stored);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function setSetting(key: string, value: string): Promise<void> {
  await tx<IDBValidKey>('settings', 'readwrite', (s) => s.put({ key, value } as DemoSetting));
}

// ── Meta ─────────────────────────────────────────────────────────────────────

export async function getMeta(key: string): Promise<string | null> {
  const db = await openDemoDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction('meta', 'readonly').objectStore('meta').get(key);
    req.onsuccess = () => resolve((req.result as DemoMeta | undefined)?.value ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function setMeta(key: string, value: string): Promise<void> {
  await tx<IDBValidKey>('meta', 'readwrite', (s) => s.put({ key, value } as DemoMeta));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toResponse(s: DemoSendRecord): SendResponse {
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    encryptedChunks: _ec,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ownerPassword: _op,
    ...rest
  } = s;
  return rest;
}
