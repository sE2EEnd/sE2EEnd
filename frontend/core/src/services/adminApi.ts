import api from './http';
import type { SendResponse } from './sendApi';

export interface StorageMetrics {
  totalSpace: number;
  freeSpace: number;
  usableSpace: number;
  usedSpace: number;
  percentageUsed: number;
  fileCount: number;
  storageSize: number;
  storagePath: string;
}

export interface CleanupResult {
  deletedSends: number;
  deletedFiles: number;
  freedSpace: number;
  timestamp: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface AdminStats {
  totalSends: number;
  activeSends: number;
  revokedSends: number;
  totalFiles: number;
}

export interface DeletedSend {
  id: string;
  originalSendId: string;
  accessId?: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  sendCreatedAt?: string;
  deletedAt: string;
  deleteReason: 'EXPIRED' | 'REVOKED' | 'EXHAUSTED' | 'MANUAL';
  fileCount: number;
  totalSizeBytes: number;
}

export const adminApi = {
  getAllSends: async (page = 0, size = 20, ownerSearch?: string, status?: string, signal?: AbortSignal): Promise<PagedResponse<SendResponse>> => {
    const response = await api.get('/admin/sends', {
      params: { page, size, ownerSearch: ownerSearch || undefined, status: status === 'all' ? undefined : status },
      signal,
    });
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

  getDeletedSends: async (): Promise<DeletedSend[]> => {
    const response = await api.get('/admin/deleted-sends');
    return response.data;
  },
};
