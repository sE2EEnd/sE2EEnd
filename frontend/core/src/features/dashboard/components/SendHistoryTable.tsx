import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { sendApi } from '@/services/api.ts';
import type { SendHistoryPage, SendHistoryStatus } from '@/services/api.ts';
import { getSendKey } from '@/lib/sendKeysDB.ts';
import { importKeyFromBase64, decryptText } from '@/lib/crypto.ts';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge, { deleteReasonToStatus } from '@/components/StatusBadge';
import TablePagination from '@/components/TablePagination';
import { PAGE_SIZE } from '../types';

type StatusFilter = 'all' | SendHistoryStatus;

const FILTERS: SendHistoryStatus[] = ['EXPIRED', 'REVOKED', 'EXHAUSTED', 'USER'];

interface SendHistoryTableProps {
  /** Bump to reload the history (e.g. after a send was deleted). */
  reloadToken: number;
}

export default function SendHistoryTable({ reloadToken }: SendHistoryTableProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [history, setHistory] = useState<SendHistoryPage | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const result = await sendApi.getHistory(
          currentPage, PAGE_SIZE, filter === 'all' ? undefined : filter, controller.signal,
        );
        // Names are client-side ciphertext: decrypt only when the key is still in this browser.
        const decrypted: Record<string, string> = {};
        await Promise.all(result.content.map(async (entry) => {
          if (!entry.name) return;
          try {
            const keyBase64 = await getSendKey(entry.id);
            if (!keyBase64) return;
            decrypted[entry.id] = await decryptText(entry.name, await importKeyFromBase64(keyBase64));
          } catch { /* key missing or name not encrypted */ }
        }));
        if (controller.signal.aborted) return;
        setHistory(result);
        setNames(decrypted);
        setError(false);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [currentPage, filter, reloadToken]);

  const entries = history?.content ?? [];

  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.history.title')}</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('dashboard.history.subtitle')}</p>
        </div>
        <div className="w-48" aria-label={t('dashboard.history.statusFilter')}>
          <Select value={filter} onValueChange={(v) => { setFilter(v as StatusFilter); setCurrentPage(0); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dashboard.history.filterAll')}</SelectItem>
              {FILTERS.map((f) => (
                <SelectItem key={f} value={f}>{t(`common.${deleteReasonToStatus(f)}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && !history ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : error ? (
        <p className="px-6 py-10 text-center text-sm text-red-500">{t('dashboard.history.loadError')}</p>
      ) : entries.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-gray-400 dark:text-gray-500">{t('dashboard.history.empty')}</p>
      ) : (
        <div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 dark:border-gray-700">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('dashboard.sendName')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('dashboard.status')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('dashboard.downloads')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('dashboard.history.endedOn')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {entries.map((entry) => {
                const ended = new Date(entry.endedAt);
                return (
                  <tr key={entry.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="block text-sm font-semibold truncate max-w-[240px] text-gray-900 dark:text-gray-100">
                        {names[entry.id] ?? t('dashboard.unnamedSend')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={deleteReasonToStatus(entry.status)} />
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{entry.downloadCount ?? '–'}</span>
                        {entry.maxDownloads != null && <span className="text-gray-400 dark:text-gray-500"> / {entry.maxDownloads}</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{ended.toLocaleDateString()}</span>
                      <span className="block text-xs text-gray-400 dark:text-gray-500">
                        {ended.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <TablePagination
            totalPages={history?.totalPages ?? 0}
            totalElements={history?.totalElements ?? 0}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={PAGE_SIZE}
            loading={loading}
          />
        </div>
      )}
    </Card>
  );
}
