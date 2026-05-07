import api from './http';

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

export interface FileMetadata {
  fileId: string;
  filename: string;
  fileSize: number;
  chunkSize?: number;
}

export const sendApi = {
  getAllSends: async (): Promise<SendResponse[]> => {
    const response = await api.get('/sends');
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

  getSendInfo: async (accessId: string): Promise<SendResponse> => {
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
