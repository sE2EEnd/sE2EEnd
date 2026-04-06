import type { SendResponse } from '@/services/api.ts';

export const PAGE_SIZE = 10;

export interface SendWithDecryptedNames extends SendResponse {
  decryptedName?: string;
  decryptedFilenames?: Record<string, string>;
}
