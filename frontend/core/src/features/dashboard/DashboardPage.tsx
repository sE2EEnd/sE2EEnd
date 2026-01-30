import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Shield,
  Copy,
  Check,
} from 'lucide-react';
import { sendApi } from '../../services/api';
import type { SendResponse } from '../../services/api';
import { getSendKey } from '../../lib/sendKeysDB';
import { importKeyFromBase64, decryptText } from '../../lib/crypto';

interface SendWithDecryptedNames extends SendResponse {
  decryptedName?: string;
  decryptedFilenames?: Record<string, string>;
}

export default function DashboardPage() {
    const { t} = useTranslation();
  const [sends, setSends] = useState<SendWithDecryptedNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sendToDelete, setSendToDelete] = useState<string | null>(null);
  const [copiedSendId, setCopiedSendId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadSends();
  }, []);

  const loadSends = async () => {
    try {
      setLoading(true);
      const response = await sendApi.getAllSends();

      // Decrypt names for each send where we have the key
      const sendsWithDecryptedNames = await Promise.all(
        response.map(async (send) => {
          try {
            const keyBase64 = await getSendKey(send.id);
            if (!keyBase64) {
              return send; // No key stored, return as is
            }

            const encryptionKey = await importKeyFromBase64(keyBase64);
            const decryptedSend: SendWithDecryptedNames = { ...send };

            // Decrypt Send name
            if (send.name) {
              try {
                decryptedSend.decryptedName = await decryptText(send.name, encryptionKey);
              } catch {
                // Name might not be encrypted
                console.warn('Could not decrypt send name');
              }
            }

            // Decrypt file names
            const decryptedFilenames: Record<string, string> = {};
            for (const file of send.files || []) {
              try {
                decryptedFilenames[file.filename] = await decryptText(
                  file.filename,
                  encryptionKey
                );
              } catch {
                // Filename might not be encrypted
                decryptedFilenames[file.filename] = file.filename;
              }
            }
            decryptedSend.decryptedFilenames = decryptedFilenames;

            return decryptedSend;
          } catch (e) {
            console.error('Error decrypting send names:', e);
            return send;
          }
        })
      );

      setSends(sendsWithDecryptedNames);
    } catch {
      setError('Failed to load sends');
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
      setSends(sends.filter((s) => s.id !== sendToDelete));
      setDeleteDialogOpen(false);
      setSendToDelete(null);
    } catch {
      setError('Failed to delete send');
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

      const baseUrl = window.location.origin;
      const shareLink = `${baseUrl}/download/${send.accessId}#${keyBase64}`;

      await navigator.clipboard.writeText(shareLink);

      setCopiedSendId(send.id);
      setToastMessage(t('dashboard.linkCopied'));
      setShowToast(true);

      setTimeout(() => {
        setCopiedSendId(null);
        setShowToast(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      setToastMessage('Failed to copy link');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-gray-900">{t('dashboard.title')}</h1>
        <Link
          to="/upload"
          className="px-4 py-2 bg-gradient-primary text-white rounded-lg hover:bg-gradient-primary-reverse transition-all shadow-md hover:shadow-lg font-medium"
        >
          {t('dashboard.newSend')}
        </Link>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Empty State */}
      {sends.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="max-w-sm mx-auto">
            <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('dashboard.noSends')}</h3>
            <p className="text-gray-600 mb-6">{t('dashboard.createFirst')}</p>
            <Link
              to="/upload"
              className="inline-block px-6 py-2.5 bg-gradient-primary text-white rounded-lg hover:bg-gradient-primary-reverse transition-all shadow-md hover:shadow-lg font-medium"
            >
              {t('dashboard.newSend')}
            </Link>
          </div>
        </div>
      ) : (
        /* Sends Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sends.map((send) => {
            const isExpired = send.expiresAt && new Date(send.expiresAt) < new Date();
            const isExhausted = send.downloadCount >= send.maxDownloads;
            const isActive = !send.revoked && !isExpired && !isExhausted;

            return (
              <div
                key={send.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Card Content */}
                <div className="p-5 flex-grow">
                  {/* Header with title and status */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-grow mr-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {send.decryptedName || send.name || t('dashboard.unnamedSend')}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {send.files && send.files.length > 0
                          ? send.files.map((f, i) => (
                              <span key={i}>
                                {i > 0 && ', '}
                                {send.decryptedFilenames?.[f.filename] || f.filename}
                              </span>
                            ))
                          : t('dashboard.noFiles')}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        isActive
                          ? 'bg-green-100 text-green-700'
                          : send.revoked
                          ? 'bg-gray-100 text-gray-700'
                          : isExpired
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {isActive ? t('common.active') : send.revoked ? t('common.revoked') : isExpired ? t('common.expired') : t('common.exhausted')}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Download className="w-4 h-4" />
                      <span>
                        <span className="font-medium text-gray-900">{send.downloadCount}</span> /{' '}
                        {send.maxDownloads} {t('dashboard.downloads')}
                      </span>
                    </div>

                    {send.expiresAt && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span className="truncate">
                          {t('dashboard.expires')}: {new Date(send.expiresAt).toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="truncate">{t('dashboard.created')}: {new Date(send.createdAt).toLocaleString()}</span>
                    </div>

                    {send.passwordProtected && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary bg-opacity-10 text-primary-dark rounded-md text-xs font-medium">
                          <Shield className="w-3.5 h-3.5" />
                          {t('upload.form.passwordProtect')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleCopyLink(send)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors"
                  >
                    {copiedSendId === send.id ? (
                      <>
                        <Check className="w-4 h-4" />
                        {t('common.copied')}
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        {t('dashboard.copyLink')}
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDeleteClick(send.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleDeleteCancel}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('common.delete')}</h3>
            <p className="text-gray-600 mb-6">
              {t('admin.deleteDialog.message')}
            </p>

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

      {/* Toast Notification */}
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
