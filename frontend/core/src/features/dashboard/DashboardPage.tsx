import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import { useTranslation } from 'react-i18next';
import {
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
  Copy,
  Check,
  Info,
  ArrowRight,
  Upload,
} from 'lucide-react';
import { sendApi } from '@/services/api.ts';
import type { SendResponse } from '@/services/api.ts';
import { getSendKey, deleteSendKey } from '@/lib/sendKeysDB.ts';
import { importKeyFromBase64, decryptText } from '@/lib/crypto.ts';
import { cn } from '@/lib/utils.ts';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import ConfirmDialog from '@/components/ConfirmDialog';
import StatusBadge from '@/components/StatusBadge';
import PageHeader from '@/components/PageHeader';

interface SendWithDecryptedNames extends SendResponse {
  decryptedName?: string;
  decryptedFilenames?: Record<string, string>;
}

const PAGE_SIZE = 10;

export default function DashboardPage() {
  const { t } = useTranslation();
  const { keycloak } = useKeycloak();
  const [sends, setSends] = useState<SendWithDecryptedNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sendToDelete, setSendToDelete] = useState<string | null>(null);
  const [copiedSendId, setCopiedSendId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  const username = (keycloak.tokenParsed?.given_name as string | undefined)
    || (keycloak.tokenParsed?.preferred_username as string | undefined)
    || '';

  useEffect(() => {
    void loadSends();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSends = async () => {
    try {
      setLoading(true);
      const response = await sendApi.getAllSends();

      const sendsWithDecryptedNames = await Promise.all(
        response.map(async (send) => {
          try {
            const keyBase64 = await getSendKey(send.id);
            if (!keyBase64) return send;

            const encryptionKey = await importKeyFromBase64(keyBase64);
            const decryptedSend: SendWithDecryptedNames = { ...send };

            if (send.name) {
              try {
                decryptedSend.decryptedName = await decryptText(send.name, encryptionKey);
              } catch {
                // not encrypted or decryption failed
              }
            }

            if (send.file) {
              const decryptedFilenames: Record<string, string> = {};
              try {
                decryptedFilenames[send.file.filename] = await decryptText(send.file.filename, encryptionKey);
              } catch {
                decryptedFilenames[send.file.filename] = send.file.filename;
              }
              decryptedSend.decryptedFilenames = decryptedFilenames;
            }

            return decryptedSend;
          } catch {
            return send;
          }
        })
      );

      setSends(sendsWithDecryptedNames);
    } catch {
      setError(t('dashboard.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (sendId: string) => {
    setSendToDelete(sendId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!sendToDelete) return;
    try {
      await sendApi.deleteSend(sendToDelete);
      await deleteSendKey(sendToDelete);
      setSends(sends.filter((s) => s.id !== sendToDelete));
      setDeleteDialogOpen(false);
      setSendToDelete(null);
    } catch {
      setError(t('dashboard.deleteError'));
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSendToDelete(null);
  };

  const handleCopyLink = async (send: SendWithDecryptedNames) => {
    try {
      const keyBase64 = await getSendKey(send.id);
      if (!keyBase64) {
        setToastMessage(t('dashboard.keyMissingDesc'));
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
        return;
      }
      const shareLink = `${window.location.origin}/download/${send.accessId}#${keyBase64}`;
      await navigator.clipboard.writeText(shareLink);
      setCopiedSendId(send.id);
      setToastMessage(t('dashboard.linkCopied'));
      setShowToast(true);
      setTimeout(() => {
        setCopiedSendId(null);
        setShowToast(false);
      }, 2000);
    } catch {
      setToastMessage(t('dashboard.copyError'));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  // Stats computed from local data
  const activeSends = sends.filter((s) => {
    const isExpired = !!(s.expiresAt && new Date(s.expiresAt) < new Date());
    return !s.revoked && !isExpired && s.downloadCount < s.maxDownloads;
  }).length;
  const totalDownloads = sends.reduce((sum, s) => sum + s.downloadCount, 0);
  const totalPages = Math.ceil(sends.length / PAGE_SIZE);
  const paginatedSends = sends.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const formatExpiry = (expiresAt?: string): { date: string; time: string; expired: boolean } => {
    if (!expiresAt) return { date: t('dashboard.never'), time: '', expired: false };
    const d = new Date(expiresAt);
    const expired = d.getTime() < Date.now();
    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      expired,
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome */}
      <PageHeader title={t('dashboard.welcome', { name: username })} subtitle={t('dashboard.subtitle')} />

      {/* Error */}
      {error && (
        <Alert variant="error">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{error}</span>
        </Alert>
      )}

      {/* Stats + CTA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('dashboard.stats.active')}</p>
          <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 mt-2">{activeSends}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('dashboard.stats.transfers')}</p>
        </Card>

        <Card className="p-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('dashboard.stats.downloads')}</p>
          <p className="text-4xl font-bold text-gray-900 dark:text-gray-100 mt-2">{totalDownloads}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('dashboard.stats.total')}</p>
        </Card>

        {/* CTA */}
        <Link
          to="/upload"
          className="bg-gradient-primary rounded-2xl p-6 flex flex-col justify-between hover:shadow-lg transition-all group"
        >
          <div className="p-2 bg-white/20 rounded-xl w-fit">
            <Upload className="w-5 h-5 text-white" />
          </div>
          <div className="mt-4">
            <p className="text-white font-bold text-lg leading-tight">{t('dashboard.newTransfer')}</p>
            <p className="text-white/70 text-sm mt-0.5">{t('dashboard.newTransferDesc')}</p>
          </div>
          <div className="flex items-center gap-1.5 text-white/80 text-sm font-medium mt-4 group-hover:text-white transition-colors">
            {t('dashboard.getStarted')}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>

      {/* My Transfers */}
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
                  const expiry = formatExpiry(send.expiresAt);

                  return (
                    <tr key={send.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 min-w-0 max-w-[240px]">
                          <span className={cn("text-sm font-semibold truncate", send.decryptedName || send.name ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500 font-normal italic")}>
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
                          <StatusBadge
                            status={isActive ? 'active' : send.revoked ? 'revoked' : isExpired ? 'expired' : 'exhausted'}
                          />
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
                        <span className={cn("text-sm font-medium", expiry.expired ? "text-gray-300 dark:text-gray-600" : "text-gray-600 dark:text-gray-400")}>
                          {expiry.date}
                        </span>
                        {expiry.time && (
                          <span className={cn("block text-xs", expiry.expired ? "text-gray-200 dark:text-gray-700" : "text-gray-400 dark:text-gray-500")}>
                            {expiry.time}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCopyLink(send)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                          >
                            {copiedSendId === send.id ? (
                              <><Check className="w-3.5 h-3.5" />{t('common.copied')}</>
                            ) : (
                              <><Copy className="w-3.5 h-3.5" />{t('dashboard.copyLink')}</>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteClick(send.id)}
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
                    {Array.from({ length: totalPages }, (_, i) => i)
                      .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 1)
                      .reduce<(number | string)[]>((acc, i, idx, arr) => {
                        if (idx > 0 && (i as number) - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                        acc.push(i);
                        return acc;
                      }, [])
                      .map((item, idx) =>
                        item === 'ellipsis' ? (
                          <PaginationItem key={`e${idx}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
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

      {/* Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        icon={<Trash2 className="w-6 h-6" />}
        iconVariant="danger"
        title={t('common.delete')}
        description={t('admin.deleteDialog.message')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
      />

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
