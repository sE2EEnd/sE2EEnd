// Barrel re-export — all existing imports from '@/services/api.ts' remain valid.
export { default } from './http';
export { sendApi } from './sendApi';
export { adminApi } from './adminApi';
export { configApi } from './configApi';
export { settingsApi } from './settingsApi';
export type { SendCreateRequest, SendResponse, FileMetadata } from './sendApi';
export type { StorageMetrics, CleanupResult, PagedResponse, AdminStats, DeletedSend } from './adminApi';
export type { ThemeConfig, SendPolicy } from './configApi';
