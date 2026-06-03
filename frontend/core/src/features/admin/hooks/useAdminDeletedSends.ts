import { useState, useEffect, useCallback, useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { adminApi } from '@/services/api.ts';
import type { DeletedSend, PagedResponse } from '@/services/api.ts';
import { toast } from 'sonner';

export const DELETED_PAGE_SIZE = 10;

type DeletedState = {
  deletedSends: DeletedSend[];
  totalPages: number;
  totalElements: number;
  deletedLoading: boolean;
};

type DeletedAction =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; deletedSends: DeletedSend[]; totalPages: number; totalElements: number }
  | { type: 'LOAD_ERROR' };

const initialState: DeletedState = {
  deletedSends: [],
  totalPages: 0,
  totalElements: 0,
  deletedLoading: false,
};

function deletedReducer(state: DeletedState, action: DeletedAction): DeletedState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, deletedLoading: true };
    case 'LOAD_SUCCESS':
      return {
        deletedLoading: false,
        deletedSends: action.deletedSends,
        totalPages: action.totalPages,
        totalElements: action.totalElements,
      };
    case 'LOAD_ERROR':
      return { ...state, deletedLoading: false };
  }
}

export function useAdminDeletedSends() {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(deletedReducer, initialState);
  const [currentPage, setCurrentPage] = useState(0);

  const loadDeleted = useCallback(async (page: number, signal: AbortSignal) => {
    dispatch({ type: 'LOAD_START' });
    try {
      const data: PagedResponse<DeletedSend> = await adminApi.getDeletedSends(page, DELETED_PAGE_SIZE, signal);
      dispatch({
        type: 'LOAD_SUCCESS',
        deletedSends: data.content,
        totalPages: data.totalPages,
        totalElements: data.totalElements,
      });
    } catch (err) {
      if (isAxiosError(err) && err.code === 'ERR_CANCELED') return;
      dispatch({ type: 'LOAD_ERROR' });
      toast.error(t('admin.errors.loadFailed'));
    }
  }, [t]);

  useEffect(() => {
    const controller = new AbortController();
    void loadDeleted(currentPage, controller.signal);
    return () => controller.abort();
  }, [currentPage, loadDeleted]);

  const reloadFromFirstPage = useCallback(() => {
    setCurrentPage(0);
    return loadDeleted(0, new AbortController().signal);
  }, [loadDeleted]);

  return {
    ...state,
    currentPage,
    setCurrentPage,
    reloadFromFirstPage,
  };
}
