import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/services/api.ts';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/format';
import type { SendResponse, DeletedSend } from '@/services/api.ts';
import { Activity, Ban, Database, Filter, History, Info, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ConfirmDialog from '@/components/ConfirmDialog';
import StatusBadge, { deleteReasonToStatus } from '@/components/StatusBadge';
import SectionHeader from '@/components/SectionHeader';
import { PAGE_SIZE } from '../hooks/useAdminSends';

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn('px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider', className)}>
      {children}
    </th>
  );
}

function DateCell({ iso }: { iso?: string | null }) {
  if (!iso) return <span className="text-sm text-gray-300 dark:text-gray-600">—</span>;
  const d = new Date(iso);
  return (
    <>
      <div className="text-sm font-bold text-gray-600 dark:text-gray-400">{d.toLocaleDateString()}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    </>
  );
}

function OwnerCell({ name, email, unknown }: { name?: string | null; email?: string | null; unknown: string }) {
  return (
    <>
      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[180px]">{name || email || unknown}</div>
      {name && email && <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[180px]">{email}</div>}
    </>
  );
}

interface SendsTableProps {
  sends: SendResponse[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  filterSender: string;
  setFilterSender: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  sendsLoading: boolean;
  decryptedNames: Record<string, string>;
  reload: () => Promise<void>;
  deletedSends: DeletedSend[];
}

export default function SendsTable({
  sends, totalPages, totalElements, currentPage, setCurrentPage,
  filterSender, setFilterSender, filterStatus, setFilterStatus,
  sendsLoading, decryptedNames,
  reload, deletedSends,
}: SendsTableProps) {
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sendToDelete, setSendToDelete] = useState<string | null>(null);

  const handleRevoke = async (sendId: string) => {
    try {
      await adminApi.revokeSend(sendId);
      await reload();
    } catch {
      toast.error(t('admin.errors.revokeFailed'));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!sendToDelete) return;
    try {
      await adminApi.deleteSend(sendToDelete);
      setDeleteDialogOpen(false);
      setSendToDelete(null);
      await reload();
    } catch {
      toast.error(t('admin.errors.deleteFailed'));
    }
  };

  const paginationItems = Array.from({ length: totalPages }, (_, i) => i)
    .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 1)
    .reduce<(number | 'ellipsis')[]>((acc, i, idx, arr) => {
      if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
      acc.push(i);
      return acc;
    }, []);

  return (
    <>
      {/* Active sends */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeader label={t('admin.recentTransfers')} icon={<Activity className="w-4 h-4" />} />
        </div>

        <Card className="overflow-hidden">
          {/* Filter bar */}
          <div className="p-4 border-b border-gray-50 dark:border-gray-700 flex flex-col sm:flex-row gap-4 bg-gray-50/30 dark:bg-gray-700/20">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <Input
                type="text"
                placeholder={t('admin.filterBySender')}
                value={filterSender}
                onChange={(e) => setFilterSender(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="min-w-[160px]">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.filterByStatus')}</SelectItem>
                  <SelectItem value="active">{t('common.active')}</SelectItem>
                  <SelectItem value="expired">{t('common.expired')}</SelectItem>
                  <SelectItem value="revoked">{t('common.revoked')}</SelectItem>
                  <SelectItem value="exhausted">{t('common.exhausted')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className={cn('overflow-x-auto transition-opacity', sendsLoading && 'opacity-50')}>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-700">
                  <Th>
                    <div className="flex items-center gap-2">
                      {t('admin.table.sendName')}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 cursor-help text-gray-300 hover:text-gray-400 transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent className="w-64 font-normal normal-case tracking-normal">
                          {t('admin.encryptedNameNotice')}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </Th>
                  <Th>{t('admin.table.owner')}</Th>
                  <Th>{t('admin.table.status')}</Th>
                  <Th>{t('admin.table.created')}</Th>
                  <Th>{t('admin.table.expires')}</Th>
                  <Th className="text-right">{t('admin.table.actions')}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {sends.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400 dark:text-gray-500 italic">
                      {t('admin.table.noSends')}
                    </td>
                  </tr>
                ) : (
                  sends.map((send) => {
                    const isExpired = !!(send.expiresAt && new Date(send.expiresAt) < new Date());
                    const isExhausted = send.downloadCount >= send.maxDownloads;
                    const isActive = !send.revoked && !isExpired && !isExhausted;
                    return (
                      <tr key={send.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-400 dark:text-gray-500 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                              <Database className="w-5 h-5" />
                            </div>
                            <div className="max-w-[240px]">
                              <div className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 min-w-0">
                                {decryptedNames[send.id] || send.name
                                  ? <span className="truncate">{decryptedNames[send.id] || send.name}</span>
                                  : <span className="text-gray-400 dark:text-gray-500 italic font-normal truncate">{t('admin.table.unnamedSend')}</span>
                                }
                              </div>
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                                {send.file ? `1 ${t('common.file')}` : `0 ${t('common.file')}`} • {send.accessId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <OwnerCell name={send.ownerName} email={send.ownerEmail} unknown={t('admin.table.unknown')} />
                        </td>
                        <td className="px-6 py-5">
                          <StatusBadge status={isActive ? 'active' : send.revoked ? 'revoked' : isExpired ? 'expired' : 'exhausted'} />
                        </td>
                        <td className="px-6 py-5"><DateCell iso={send.createdAt} /></td>
                        <td className="px-6 py-5">
                          {send.expiresAt
                            ? <DateCell iso={send.expiresAt} />
                            : <span className="text-sm text-gray-400 dark:text-gray-500">{t('admin.table.never')}</span>
                          }
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!send.revoked && isActive && (
                              <button
                                onClick={() => handleRevoke(send.id)}
                                className="p-2.5 text-orange-500 hover:bg-orange-50 rounded-xl transition-all border border-transparent hover:border-orange-100"
                                title={t('admin.actions.revoke')}
                              >
                                <Ban className="w-5 h-5" />
                              </button>
                            )}
                            <button
                              onClick={() => { setSendToDelete(send.id); setDeleteDialogOpen(true); }}
                              className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                              title={t('admin.actions.delete')}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {t('admin.pagination.showing', {
                  from: currentPage * PAGE_SIZE + 1,
                  to: Math.min((currentPage + 1) * PAGE_SIZE, totalElements),
                  total: totalElements,
                })}
              </p>
              <Pagination className="w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(currentPage - 1)}
                      aria-disabled={currentPage === 0 || sendsLoading}
                      className={currentPage === 0 || sendsLoading ? 'pointer-events-none opacity-40' : 'cursor-pointer'}
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
                      onClick={() => setCurrentPage(currentPage + 1)}
                      aria-disabled={currentPage >= totalPages - 1 || sendsLoading}
                      className={currentPage >= totalPages - 1 || sendsLoading ? 'pointer-events-none opacity-40' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </Card>
      </div>

      {/* Deletion history */}
      <div className="space-y-4">
        <SectionHeader label={t('admin.history.title')} icon={<History className="w-4 h-4" />} />
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-700">
                  <Th>{t('admin.table.owner')}</Th>
                  <Th>{t('admin.history.reason')}</Th>
                  <Th>{t('admin.history.createdAt')}</Th>
                  <Th>{t('admin.history.deletedAt')}</Th>
                  <Th>{t('admin.history.size')}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {deletedSends.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400 italic">{t('admin.history.empty')}</td>
                  </tr>
                ) : (
                  deletedSends.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <OwnerCell name={d.ownerName} email={d.ownerEmail} unknown={t('admin.table.unknown')} />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge
                          status={deleteReasonToStatus(d.deleteReason)}
                          label={t(`admin.history.reasons.${d.deleteReason.toLowerCase()}`)}
                        />
                      </td>
                      <td className="px-6 py-4"><DateCell iso={d.sendCreatedAt} /></td>
                      <td className="px-6 py-4"><DateCell iso={d.deletedAt} /></td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 font-semibold">{formatBytes(d.totalSizeBytes)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setDeleteDialogOpen(false); setSendToDelete(null); }}
        icon={<Trash2 className="w-6 h-6" />}
        iconVariant="danger"
        title={t('admin.deleteDialog.title')}
        description={t('admin.deleteDialog.message')}
        confirmLabel={t('admin.deleteDialog.delete')}
        cancelLabel={t('admin.deleteDialog.cancel')}
      />
    </>
  );
}
