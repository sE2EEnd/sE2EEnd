import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2, Shield, Copy, Check, Info, Upload } from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import StatusBadge from '@/components/StatusBadge';
import type { SendWithDecryptedNames } from '../types';
import { PAGE_SIZE } from '../types';

function formatExpiry(expiresAt: string | undefined, never: string) {
  if (!expiresAt) return { date: never, time: '', expired: false };
  const d = new Date(expiresAt);
  return {
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    expired: d < new Date(),
  };
}

interface SendsTableProps {
  sends: SendWithDecryptedNames[];
  currentPage: number;
  setCurrentPage: (p: number | ((prev: number) => number)) => void;
  copiedSendId: string | null;
  onCopyLink: (send: SendWithDecryptedNames) => void;
  onDeleteClick: (sendId: string) => void;
}

export default function SendsTable({
  sends, currentPage, setCurrentPage, copiedSendId, onCopyLink, onDeleteClick,
}: SendsTableProps) {
  const { t } = useTranslation();
  const totalPages = Math.ceil(sends.length / PAGE_SIZE);
  const paginatedSends = sends.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const paginationItems = Array.from({ length: totalPages }, (_, i) => i)
    .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 1)
    .reduce<(number | string)[]>((acc, i, idx, arr) => {
      if (idx > 0 && (i as number) - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
      acc.push(i);
      return acc;
    }, []);

  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50 dark:border-gray-700">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.myTransfers')}</h2>
      </div>

      {sends.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload className="w-7 h-7 text-primary" />
          </div>
          <p className="text-gray-900 dark:text-gray-100 font-semibold">{t('dashboard.noSends')}</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 mb-6">{t('dashboard.createFirst')}</p>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Upload className="w-4 h-4" />
            {t('dashboard.newTransfer')}
          </Link>
        </div>
      ) : (
        <div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 dark:border-gray-700">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    {t('dashboard.sendName')}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 cursor-help text-gray-300 dark:text-gray-600 hover:text-gray-400 transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent className="w-64 font-normal normal-case tracking-normal">
                        {t('dashboard.encryptedNameHelp')}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('dashboard.status')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hidden sm:table-cell">{t('dashboard.downloads')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hidden lg:table-cell">{t('dashboard.expires')}</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('dashboard.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {paginatedSends.map((send) => {
                const isExpired = !!(send.expiresAt && new Date(send.expiresAt) < new Date());
                const isExhausted = send.downloadCount >= send.maxDownloads;
                const isActive = !send.revoked && !isExpired && !isExhausted;
                const expiry = formatExpiry(send.expiresAt, t('dashboard.never'));

                return (
                  <tr key={send.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 min-w-0 max-w-[240px]">
                        <span className={cn(
                          'text-sm font-semibold truncate',
                          send.decryptedName || send.name
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-400 dark:text-gray-500 font-normal italic'
                        )}>
                          {send.decryptedName || send.name || t('dashboard.unnamedSend')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[240px]">
                        {send.file
                          ? <span>{send.decryptedFilenames?.[send.file.filename] || send.file.filename}</span>
                          : t('dashboard.noFiles')}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={isActive ? 'active' : send.revoked ? 'revoked' : isExpired ? 'expired' : 'exhausted'} />
                        {send.passwordProtected && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Shield className="w-3.5 h-3.5 text-blue-400 cursor-default flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>{t('upload.form.passwordProtect')}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{send.downloadCount}</span>
                        <span className="text-gray-400 dark:text-gray-500"> / {send.maxDownloads}</span>
                      </span>
                    </td>

                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className={cn('text-sm font-medium', expiry.expired ? 'text-gray-300 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400')}>
                        {expiry.date}
                      </span>
                      {expiry.time && (
                        <span className={cn('block text-xs', expiry.expired ? 'text-gray-200 dark:text-gray-700' : 'text-gray-400 dark:text-gray-500')}>
                          {expiry.time}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onCopyLink(send)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                        >
                          {copiedSendId === send.id ? (
                            <><Check className="w-3.5 h-3.5" />{t('common.copied')}</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5" />{t('dashboard.copyLink')}</>
                          )}
                        </button>
                        <button
                          onClick={() => onDeleteClick(send.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {t('admin.pagination.showing', {
                  from: currentPage * PAGE_SIZE + 1,
                  to: Math.min((currentPage + 1) * PAGE_SIZE, sends.length),
                  total: sends.length,
                })}
              </p>
              <Pagination className="w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      aria-disabled={currentPage === 0}
                      className={currentPage === 0 ? 'pointer-events-none opacity-40' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {paginationItems.map((item, idx) =>
                    item === 'ellipsis' ? (
                      <PaginationItem key={`e${idx}`}><PaginationEllipsis /></PaginationItem>
                    ) : (
                      <PaginationItem key={item}>
                        <PaginationLink
                          isActive={currentPage === item}
                          onClick={() => setCurrentPage(item as number)}
                          className="cursor-pointer"
                        >
                          {(item as number) + 1}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                      aria-disabled={currentPage >= totalPages - 1}
                      className={currentPage >= totalPages - 1 ? 'pointer-events-none opacity-40' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
