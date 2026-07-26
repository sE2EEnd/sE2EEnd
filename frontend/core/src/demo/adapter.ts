import type {AxiosRequestConfig} from 'axios';
import api from '@/services/http';
import {
  appendChunk,
  createSend,
  deleteSend as dbDeleteSend,
  finalizeChunkedUpload,
  getAdminSends,
  getDeletedSends,
  getSendByAccessId,
  getSendById,
  getSettings,
  getStats,
  getStorageMetrics,
  initChunkedSession,
  listOwnerSends,
  readEncryptedBytes,
  revokeSend,
  runCleanup,
  setSetting,
  storeSendFile,
} from './store';

type DemoAxiosResponse<T = unknown> = {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: AxiosRequestConfig;
};

function ok<T>(data: T, config: AxiosRequestConfig): DemoAxiosResponse<T> {
  return { data, status: 200, statusText: 'OK', headers: {}, config };
}

function err(status: number, message: string): never {
  throw Object.assign(new Error(message), {
    isAxiosError: true,
    response: {status, data: {message}, headers: {}},
  });
}

export function installDemoAdapter(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (api.defaults as any).adapter = async (config: AxiosRequestConfig) => {
    const method = (config.method ?? 'GET').toUpperCase();
    const url = config.url ?? '';

    try {
      // ── sendApi ────────────────────────────────────────────────────────────

      if (method === 'GET' && url === '/sends') {
        const sends = await listOwnerSends();
        return ok(sends, config);
      }

      if (method === 'POST' && url === '/sends') {
        const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        const send = await createSend(body);
        return ok(send, config);
      }

      if (method === 'POST' && url === '/files') {
        const fd = config.data as FormData;
        const sendId = fd.get('sendId') as string;
        const file = fd.get('file') as File;
        const buf = await file.arrayBuffer();
        const meta = await storeSendFile(sendId, file.name, [new Uint8Array(buf)], undefined);
        return ok(meta, config);
      }

      const downloadMatch = url.match(/^\/sends\/([^/]+)\/download$/);
      if (method === 'GET' && downloadMatch) {
        const accessId = downloadMatch[1];
        const password = (config.headers as Record<string, string>)?.['X-Send-Password'];
        const { data } = await readEncryptedBytes(accessId, password);
        return ok(new Blob([data.buffer as ArrayBuffer], { type: 'application/octet-stream' }), config);
      }

      const sendInfoMatch = url.match(/^\/sends\/([^/]+)$/) && method === 'GET';
      if (sendInfoMatch) {
        const accessId = url.split('/').pop()!;
        const send = await getSendByAccessId(accessId);
        if (!send) err(404, 'Not found');
        return ok(send, config);
      }

      const deleteSendMatch = url.match(/^\/sends\/([^/]+)$/) && method === 'DELETE';
      if (deleteSendMatch) {
        const id = url.split('/').pop()!;
        await dbDeleteSend(id);
        return ok(null, config);
      }

      if (method === 'POST' && url === '/files/chunked/init') {
        const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        const sessionId = initChunkedSession(body.sendId, body.filename);
        return ok({ sessionId }, config);
      }

      const chunkMatch = url.match(/^\/files\/chunked\/([^/]+)\/chunk\/(\d+)$/);
      if (method === 'PUT' && chunkMatch) {
        const sessionId = chunkMatch[1];
        const chunkIndex = parseInt(chunkMatch[2], 10);
        // axios transformRequest converts Uint8Array → .buffer (ArrayBuffer) before the adapter;
        // wrap it back so store.ts receives a proper Uint8Array.
        const raw = config.data instanceof ArrayBuffer
          ? new Uint8Array(config.data)
          : config.data as Uint8Array;
        appendChunk(sessionId, chunkIndex, raw);
        return ok(null, config);
      }

      const completeMatch = url.match(/^\/files\/chunked\/([^/]+)\/complete$/);
      if (method === 'POST' && completeMatch) {
        const sessionId = completeMatch[1];
        const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        const meta = await finalizeChunkedUpload(sessionId, body.totalChunks, body.chunkSize);
        return ok(meta, config);
      }

      // ── adminApi ───────────────────────────────────────────────────────────

      if (method === 'GET' && url.startsWith('/admin/sends')) {
        const params = config.params as Record<string, string> ?? {};
        const page = parseInt(params.page ?? '0', 10);
        const size = parseInt(params.size ?? '20', 10);
        const result = await getAdminSends(page, size, params.ownerSearch, params.status);
        return ok(result, config);
      }

      if (method === 'GET' && url === '/admin/stats') {
        return ok(await getStats(), config);
      }

      const adminDeleteMatch = url.match(/^\/admin\/sends\/([^/]+)$/) && method === 'DELETE';
      if (adminDeleteMatch) {
        const id = url.split('/').pop()!;
        await dbDeleteSend(id);
        return ok(null, config);
      }

      const revokeMatch = url.match(/^\/admin\/sends\/([^/]+)\/revoke$/);
      if (method === 'POST' && revokeMatch) {
        const id = revokeMatch[1];
        await revokeSend(id);
        return ok(null, config);
      }

      if (method === 'GET' && url === '/admin/storage/metrics') {
        return ok(getStorageMetrics(), config);
      }

      if (method === 'POST' && url === '/admin/cleanup') {
        return ok(runCleanup(), config);
      }

      if (method === 'GET' && url === '/admin/deleted-sends') {
        const params = config.params as Record<string, string> ?? {};
        const result = await getDeletedSends(parseInt(params.page ?? '0', 10), parseInt(params.size ?? '20', 10));
        return ok(result, config);
      }

      if (method === 'GET' && url === '/admin/settings') {
        return ok(await getSettings(), config);
      }

      const settingMatch = url.match(/^\/admin\/settings\/([^/]+)$/);
      if (method === 'PATCH' && settingMatch) {
        const key = settingMatch[1];
        const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        await setSetting(key, body.value);
        return ok(null, config);
      }

      // ── configApi ──────────────────────────────────────────────────────────

      if (method === 'GET' && url === '/config/theme') {
        return ok(
          {
            appName: 'sE2EEnd',
            logoUrl: '',
            logoUrlDark: '',
            requireAuthForDownload: false,
            colors: {
              primaryFrom: 'blue-600',
              primaryTo: 'blue-700',
              primaryAccent: 'blue-500',
              primaryHex: '#2563eb',
              primaryDarkHex: '#1d4ed8',
              primaryLightHex: '#3b82f6',
            },
          },
          config,
        );
      }

      if (method === 'GET' && url === '/config/send-policy') {
        const settings = await getSettings();
        return ok(
          {
            requireSendPassword: settings.require_send_password === 'true',
            maxUploadSizeBytes: parseInt(settings.max_upload_size_bytes, 10),
          },
          config,
        );
      }

      // ── Fallback ───────────────────────────────────────────────────────────

      // GET /sends/:id (by send id, not accessId) used by getSendById
      const sendByIdMatch = url.match(/^\/sends\/([^/]+)$/) && method === 'GET';
      if (sendByIdMatch) {
        const id = url.split('/').pop()!;
        const send = await getSendById(id);
        if (!send) err(404, 'Not found');
        return ok(send, config);
      }

      console.warn('[DemoAdapter] Unhandled request:', method, url);
      err(404, `Demo: unhandled ${method} ${url}`);
    } catch (e: unknown) {
      const error = e as { status?: number; isAxiosError?: boolean };
      if (error.isAxiosError) throw e;
      if (error.status) {
        throw Object.assign(new Error((e as Error).message), {
          isAxiosError: true,
          response: {status: error.status, data: {message: (e as Error).message}, headers: {}},
        });
      }
      throw e;
    }
  };
}
