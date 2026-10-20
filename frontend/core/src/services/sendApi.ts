import api from './http';
import keycloak from '../keycloak';

export interface SendCreateRequest {
  name?: string;
  type: 'FILE' | 'TEXT';
  expiresAt?: string;
  maxDownloads?: number;
  passwordProtected?: boolean;
  password?: string;
}

export interface SendResponse {
  id: string;
  accessId: string;
  ownerId?: string;
  ownerEmail?: string;
  ownerName?: string;
  name?: string;
  type: string;
  expiresAt?: string;
  maxDownloads: number;
  downloadCount: number;
  passwordProtected: boolean;
  revoked: boolean;
  createdAt: string;
  file?: FileMetadata;
}

// Public metadata served on the access route: no owner info, no internal ids.
export interface PublicFileMetadata {
  filename: string;
  sizeBytes: number;
  chunkSize?: number;
}

export interface SendPublicResponse {
  accessId: string;
  name?: string;
  type: string;
  expiresAt?: string;
  maxDownloads: number;
  downloadCount: number;
  passwordProtected: boolean;
  createdAt: string;
  file?: PublicFileMetadata;
}

export type SendHistoryStatus = 'EXPIRED' | 'REVOKED' | 'EXHAUSTED' | 'USER';

// Non-sensitive record of a past send (payload and key are gone). `name` is still client-side ciphertext.
export interface SendHistoryEntry {
  id: string;
  name?: string;
  status: SendHistoryStatus;
  createdAt?: string;
  endedAt: string;
  expiresAt?: string;
  maxDownloads?: number;
  downloadCount?: number;
  totalSizeBytes: number;
}

export interface SendHistoryPage {
  content: SendHistoryEntry[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

// Field names mirror the backend FileMetadataDto exactly (id / sizeBytes / chunkSize).
export interface FileMetadata {
  id: string;
  filename: string;
  sizeBytes: number;
  chunkSize?: number;
}

export const sendApi = {
  getAllSends: async (): Promise<SendResponse[]> => {
    const response = await api.get('/sends');
    return response.data;
  },

  getHistory: async (page = 0, size = 10, status?: SendHistoryStatus, signal?: AbortSignal): Promise<SendHistoryPage> => {
    const response = await api.get('/sends/history', { params: { page, size, status }, signal });
    return response.data;
  },

  createSend: async (data: SendCreateRequest): Promise<SendResponse> => {
    const response = await api.post('/sends', data);
    return response.data;
  },

  uploadFile: async (sendId: string, file: File): Promise<FileMetadata> => {
    const formData = new FormData();
    formData.append('sendId', sendId);
    formData.append('file', file);
    const response = await api.post('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  downloadSend: async (
    accessId: string,
    password?: string,
    onProgress?: (percent: number) => void,
  ): Promise<Blob> => {
    const response = await api.get(`/sends/${accessId}/download`, {
      responseType: 'blob',
      headers: password ? { 'X-Send-Password': password } : undefined,
      onDownloadProgress: onProgress
        ? (e) => { if (e.total) onProgress(Math.round((e.loaded / e.total) * 100)); }
        : undefined,
    });
    return response.data;
  },

  // Streaming download: returns the raw (still-encrypted) network stream + its byte length.
  // Uses fetch (not axios) so response.body streams instead of buffering the whole file in RAM.
  downloadSendStream: async (
    accessId: string,
    password?: string,
  ): Promise<{ stream: ReadableStream<Uint8Array>; encryptedSize?: number }> => {
    const baseURL = window.__config.apiUrl || '/api/v1';
    const headers: Record<string, string> = {};
    if (keycloak.token) headers.Authorization = `Bearer ${keycloak.token}`;
    if (password) headers['X-Send-Password'] = password;

    const response = await fetch(`${baseURL}/sends/${accessId}/download`, { headers });
    if (!response.ok) {
      const error = new Error(`Download failed with status ${response.status}`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }
    if (!response.body) throw new Error('Streaming downloads are not supported by this browser');

    const contentLength = response.headers.get('Content-Length');
    return { stream: response.body, encryptedSize: contentLength ? Number(contentLength) : undefined };
  },

  getSendInfo: async (accessId: string): Promise<SendPublicResponse> => {
    const response = await api.get(`/sends/${accessId}`);
    return response.data;
  },

  deleteSend: async (sendId: string): Promise<void> => {
    await api.delete(`/sends/${sendId}`);
  },

  initChunkedUpload: async (sendId: string, filename: string): Promise<{ sessionId: string }> => {
    const response = await api.post('/files/chunked/init', { sendId, filename });
    return response.data;
  },

  uploadChunk: async (sessionId: string, chunkIndex: number, chunk: Uint8Array): Promise<void> => {
    await api.put(`/files/chunked/${sessionId}/chunk/${chunkIndex}`, chunk, {
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  },

  completeChunkedUpload: async (sessionId: string, totalChunks: number, chunkSize: number): Promise<FileMetadata> => {
    const response = await api.post(`/files/chunked/${sessionId}/complete`, { totalChunks, chunkSize });
    return response.data;
  },
};
