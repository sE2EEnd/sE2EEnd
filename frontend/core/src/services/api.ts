import axios from 'axios';
import keycloak from '../keycloak';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    if (keycloak.token) {
      config.headers.Authorization = `Bearer ${keycloak.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

interface SendCreateRequest {
  name?: string;
  type: 'FILE' | 'TEXT';
  encryptedMetadata?: string;
  expiresAt?: string;
  maxDownloads?: number;
  passwordProtected?: boolean;
  password?: string;
}

interface SendResponse {
  id: string;
  accessId: string;
  ownerId?: string;
  ownerEmail?: string;
  ownerName?: string;
  name?: string;
  type: string;
  encryptedMetadata?: string;
  expiresAt?: string;
  maxDownloads: number;
  downloadCount: number;
  passwordProtected: boolean;
  revoked: boolean;
  createdAt: string;
  files: FileMetadata[];
}

interface FileMetadata {
  fileId: string;
  filename: string;
  fileSize: number;
}

const sendApi = {
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
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  downloadSend: async (accessId: string, password?: string): Promise<Blob> => {
    const response = await api.get(`/sends/${accessId}/download`, {
      responseType: 'blob',
      params: password ? { password } : undefined,
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
};

interface StorageMetrics {
  totalSpace: number;
  freeSpace: number;
  usableSpace: number;
  usedSpace: number;
  percentageUsed: number;
  fileCount: number;
  storageSize: number;
  storagePath: string;
}

interface CleanupResult {
  deletedSends: number;
  deletedFiles: number;
  freedSpace: number;
  timestamp: string;
}

interface AdminStats {
  totalSends: number;
  activeSends: number;
  revokedSends: number;
  totalFiles: number;
}

const adminApi = {
  getAllSends: async (): Promise<SendResponse[]> => {
    const response = await api.get('/admin/sends');
    return response.data;
  },

  getStats: async (): Promise<AdminStats> => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  deleteSend: async (sendId: string): Promise<void> => {
    await api.delete(`/admin/sends/${sendId}`);
  },

  revokeSend: async (sendId: string): Promise<void> => {
    await api.post(`/admin/sends/${sendId}/revoke`);
  },

  getStorageMetrics: async (): Promise<StorageMetrics> => {
    const response = await api.get('/admin/storage/metrics');
    return response.data;
  },

  runCleanup: async (): Promise<CleanupResult> => {
    const response = await api.post('/admin/cleanup');
    return response.data;
  },
};

interface ThemeConfig {
  appName: string;
  logoUrl: string;
  colors: {
    primaryFrom: string;
    primaryTo: string;
    primaryAccent: string;
    primaryHex: string;
    primaryDarkHex: string;
    primaryLightHex: string;
  };
}

export { sendApi, adminApi };
export type { SendCreateRequest, SendResponse, FileMetadata, ThemeConfig, StorageMetrics, CleanupResult, AdminStats };
export default api;
