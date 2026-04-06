import { useState, useEffect, useCallback, useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { adminApi } from '@/services/api.ts';
import { getSendKey } from '@/lib/sendKeysDB.ts';
import { importKeyFromBase64, decryptText } from '@/lib/crypto.ts';
import type { SendResponse, PagedResponse } from '@/services/api.ts';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';

export const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Reducer — groups the states that always transition together
// ---------------------------------------------------------------------------

type SendsState = {
  sends: SendResponse[];
  totalPages: number;
  totalElements: number;
  sendsLoading: boolean;
  decryptedNames: Record<string, string>;
};

type SendsAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; sends: SendResponse[]; totalPages: number; totalElements: number; decryptedNames: Record<string, string> }
  | { type: 'LOAD_ERROR' };

const initialState: SendsState = {
  sends: [],
  totalPages: 0,
  totalElements: 0,
  sendsLoading: false,
  decryptedNames: {},
};

function sendsReducer(state: SendsState, action: SendsAction): SendsState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, sendsLoading: true };
    case 'LOAD_SUCCESS':
      return {
        sendsLoading: false,
        sends: action.sends,
        totalPages: action.totalPages,
        totalElements: action.totalElements,
        decryptedNames: action.decryptedNames,
      };
    case 'LOAD_ERROR':
      return { ...state, sendsLoading: false };
  }
}

// ---------------------------------------------------------------------------

export function useAdminSends() {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(sendsReducer, initialState);
  const [currentPage, setCurrentPage] = useState(0);
  const [filterSender, setFilterSender] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const debouncedSender = useDebounce(filterSender, 350);

  // Reset to page 0 when filter changes
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSender, filterStatus]);

  const loadSends = useCallback(async (page: number, ownerSearch: string, status: string, signal: AbortSignal) => {
    dispatch({ type: 'LOAD_START' });
    try {
      const data: PagedResponse<SendResponse> = await adminApi.getAllSends(page, PAGE_SIZE, ownerSearch, status, signal);

      const decryptedNames: Record<string, string> = {};
      await Promise.all(
        data.content.map(async (send) => {
          if (!send.name) return;
          try {
            const keyBase64 = await getSendKey(send.id);
            if (!keyBase64) return;
            const key = await importKeyFromBase64(keyBase64);
            decryptedNames[send.id] = await decryptText(send.name, key);
          } catch {
            // no key or name not encrypted
          }
        })
      );

      dispatch({
        type: 'LOAD_SUCCESS',
        sends: data.content,
        totalPages: data.totalPages,
        totalElements: data.totalElements,
        decryptedNames,
      });
    } catch (err) {
      if (isAxiosError(err) && err.code === 'ERR_CANCELED') return;
      dispatch({ type: 'LOAD_ERROR' });
      toast.error(t('admin.errors.loadFailed'));
    }
  }, [t]);

  useEffect(() => {
    const controller = new AbortController();
    void loadSends(currentPage, debouncedSender, filterStatus, controller.signal);
    return () => controller.abort();
  }, [currentPage, debouncedSender, filterStatus, loadSends]);

  const reload = useCallback(() => {
    return loadSends(currentPage, debouncedSender, filterStatus, new AbortController().signal);
  }, [loadSends, currentPage, debouncedSender, filterStatus]);

  const reloadFromFirstPage = useCallback(() => {
    setCurrentPage(0);
    return loadSends(0, debouncedSender, filterStatus, new AbortController().signal);
  }, [loadSends, debouncedSender, filterStatus]);

  return {
    ...state,
    currentPage, setCurrentPage,
    filterSender, setFilterSender,
    filterStatus, setFilterStatus,
    reload, reloadFromFirstPage,
  };
}
