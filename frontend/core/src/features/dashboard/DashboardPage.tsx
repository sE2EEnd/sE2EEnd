import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import { useTranslation } from 'react-i18next';
import {
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Shield,
  Copy,
  Check,
  Info,
  ArrowRight,
  Ban,
  Upload,
} from 'lucide-react';
import { sendApi } from '@/services/api.ts';
import type { SendResponse } from '@/services/api.ts';
import { getSendKey, deleteSendKey } from '@/lib/sendKeysDB.ts';
import { importKeyFromBase64, decryptText } from '@/lib/crypto.ts';
import { cn } from '@/lib/utils.ts';

interface SendWithDecryptedNames extends SendResponse {
  decryptedName?: string;
  decryptedFilenames?: Record<string, string>;
}

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

            const decryptedFilenames: Record<string, string> = {};
            for (const file of send.files) {
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

  const formatExpiry = (expiresAt?: string): { label: string; expired: boolean } => {
    if (!expiresAt) return { label: t('dashboard.never'), expired: false };
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return { label: '—', expired: true };
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return { label: `${hours}h`, expired: false };
    return { label: `${Math.floor(hours / 24)}d`, expired: false };
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          {t('dashboard.welcome', { name: username })}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">{t('dashboard.subtitle')}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Stats + CTA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('dashboard.stats.active')}</p>
          <p className="text-4xl font-bold text-gray-900 mt-2">{activeSends}</p>
          <p className="text-xs text-gray-400 mt-1">{t('dashboard.stats.transfers')}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('dashboard.stats.downloads')}</p>
          <p className="text-4xl font-bold text-gray-900 mt-2">{totalDownloads}</p>
          <p className="text-xs text-gray-400 mt-1">{t('dashboard.stats.total')}</p>
        </div>

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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-50">
          <h2 className="text-base font-semibold text-gray-900">{t('dashboard.myTransfers')}</h2>
        </div>

        {sends.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-7 h-7 text-primary" />
            </div>
            <p className="text-gray-900 font-semibold">{t('dashboard.noSends')}</p>
            <p className="text-gray-400 text-sm mt-1 mb-6">{t('dashboard.createFirst')}</p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {t('dashboard.newTransfer')}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      {t('dashboard.sendName')}
                      <div className="group/header-info relative">
                        <Info className="w-3.5 h-3.5 cursor-help text-gray-300 hover:text-gray-400 transition-colors" />
                        <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-[11px] rounded-xl opacity-0 invisible group-hover/header-info:opacity-100 group-hover/header-info:visible transition-all z-50 shadow-xl font-normal normal-case tracking-normal">
                          {t('dashboard.encryptedNameHelp')}
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('dashboard.status')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">{t('common.files')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">{t('dashboard.downloads')}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">{t('dashboard.expires')}</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('dashboard.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sends.map((send) => {
                  const isExpired = !!(send.expiresAt && new Date(send.expiresAt) < new Date());
                  const isExhausted = send.downloadCount >= send.maxDownloads;
                  const isActive = !send.revoked && !isExpired && !isExhausted;
                  const expiry = formatExpiry(send.expiresAt);

                  return (
                    <tr key={send.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 min-w-0 max-w-[240px]">
                          <span className={cn("text-sm font-semibold truncate", send.decryptedName || send.name ? "text-gray-900" : "text-gray-400 font-normal italic")}>
                            {send.decryptedName || send.name || t('dashboard.unnamedSend')}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[240px]">
                          {send.files.length > 0
                            ? send.files.map((f, i) => (
                                <span key={i}>{i > 0 && ', '}{send.decryptedFilenames?.[f.filename] || f.filename}</span>
                              ))
                            : t('dashboard.noFiles')}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-tight",
                            isActive ? "bg-green-50 text-green-600" :
                            send.revoked ? "bg-gray-100 text-gray-500" :
                            isExpired ? "bg-orange-50 text-orange-600" :
                            "bg-red-50 text-red-600"
                          )}>
                            {isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                             send.revoked ? <Ban className="w-3.5 h-3.5" /> :
                             isExpired ? <Clock className="w-3.5 h-3.5" /> :
                             <AlertCircle className="w-3.5 h-3.5" />}
                            {isActive ? t('common.active') :
                             send.revoked ? t('common.revoked') :
                             isExpired ? t('common.expired') :
                             t('common.exhausted')}
                          </span>
                          {send.passwordProtected && (
                            <div className="group/shield relative flex-shrink-0">
                              <Shield className="w-3.5 h-3.5 text-blue-400 cursor-default" />
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-[11px] rounded-lg opacity-0 invisible group-hover/shield:opacity-100 group-hover/shield:visible transition-all z-50 shadow-xl whitespace-nowrap">
                                {t('upload.form.passwordProtect')}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-gray-600">{send.files.length}</span>
                      </td>

                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span className="text-sm text-gray-600">
                          <span className="font-semibold text-gray-900">{send.downloadCount}</span>
                          <span className="text-gray-400"> / {send.maxDownloads}</span>
                        </span>
                      </td>

                      <td className="px-6 py-4 hidden lg:table-cell">
                        <span className={cn("text-sm font-medium", expiry.expired ? "text-gray-300" : "text-gray-600")}>
                          {expiry.label}
                        </span>
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
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleDeleteCancel} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('common.delete')}</h3>
            <p className="text-gray-600 mb-6">{t('admin.deleteDialog.message')}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

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
