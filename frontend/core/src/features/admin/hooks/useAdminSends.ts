import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/services/api.ts';
import { getSendKey } from '@/lib/sendKeysDB.ts';
import { importKeyFromBase64, decryptText } from '@/lib/crypto.ts';
import type { SendResponse, PagedResponse } from '@/services/api.ts';
import { useDebounce } from '@/hooks/useDebounce';

export const PAGE_SIZE = 10;

interface UseAdminSendsOptions {
  onError: (msg: string) => void;
}

export function useAdminSends({ onError }: UseAdminSendsOptions) {
  const { t } = useTranslation();
  const [sends, setSends] = useState<SendResponse[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [sendsLoading, setSendsLoading] = useState(false);
  const [filterSender, setFilterSender] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [decryptedNames, setDecryptedNames] = useState<Record<string, string>>({});
  const debouncedSender = useDebounce(filterSender, 350);

  // Reset to page 0 when filter changes
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSender, filterStatus]);

  const loadSends = useCallback(async (page: number, ownerSearch: string, status: string) => {
    try {
      setSendsLoading(true);
      const data: PagedResponse<SendResponse> = await adminApi.getAllSends(page, PAGE_SIZE, ownerSearch, status);
      setSends(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);

      const names: Record<string, string> = {};
      await Promise.all(
        data.content.map(async (send) => {
          if (!send.name) return;
          try {
            const keyBase64 = await getSendKey(send.id);
            if (!keyBase64) return;
            const key = await importKeyFromBase64(keyBase64);
            names[send.id] = await decryptText(send.name, key);
          } catch {
            // no key or name not encrypted
          }
        })
      );
      setDecryptedNames(names);
    } catch {
      onError(t('admin.errors.loadFailed'));
    } finally {
      setSendsLoading(false);
    }
  }, [onError, t]);

  useEffect(() => {
    void loadSends(currentPage, debouncedSender, filterStatus);
  }, [currentPage, debouncedSender, filterStatus, loadSends]);

  /** Reload the current page (used after revoke / delete). */
  const reload = useCallback(() => {
    return loadSends(currentPage, debouncedSender, filterStatus);
  }, [loadSends, currentPage, debouncedSender, filterStatus]);

  /** Reset to page 0 and reload (used after cleanup). */
  const reloadFromFirstPage = useCallback(() => {
    setCurrentPage(0);
    return loadSends(0, debouncedSender, filterStatus);
  }, [loadSends, debouncedSender, filterStatus]);

  return {
    sends, totalPages, totalElements, currentPage, setCurrentPage,
    filterSender, setFilterSender, filterStatus, setFilterStatus,
    sendsLoading, decryptedNames,
    reload, reloadFromFirstPage,
  };
}
