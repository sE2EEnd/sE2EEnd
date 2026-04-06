import { useState, useCallback } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import { useTranslation } from 'react-i18next';
import { Trash2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { sendApi } from '@/services/api.ts';
import { getSendKey, deleteSendKey } from '@/lib/sendKeysDB.ts';
import { importKeyFromBase64, decryptText } from '@/lib/crypto.ts';
import { Alert } from '@/components/ui/alert';
import ConfirmDialog from '@/components/ConfirmDialog';
import PageHeader from '@/components/PageHeader';
import { useAsync } from '@/hooks/useAsync';
import DashboardStats from './components/DashboardStats';
import SendsTable from './components/SendsTable';
import type { SendWithDecryptedNames } from './types';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { keycloak } = useKeycloak();
  const [deleteError, setDeleteError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sendToDelete, setSendToDelete] = useState<string | null>(null);
  const [copiedSendId, setCopiedSendId] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  const username = (keycloak.tokenParsed?.given_name as string | undefined)
    || (keycloak.tokenParsed?.preferred_username as string | undefined)
    || '';

  const fetchSends = useCallback(async (): Promise<SendWithDecryptedNames[]> => {
    const response = await sendApi.getAllSends();
    return Promise.all(
      response.map(async (send) => {
        try {
          const keyBase64 = await getSendKey(send.id);
          if (!keyBase64) return send;
          const encryptionKey = await importKeyFromBase64(keyBase64);
          const decryptedSend: SendWithDecryptedNames = { ...send };
          if (send.name) {
            try { decryptedSend.decryptedName = await decryptText(send.name, encryptionKey); } catch { /* not encrypted */ }
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
  }, []);

  const { loading, error: loadError, data, refetch: reloadSends } = useAsync(fetchSends, () => t('dashboard.loadError'));
  const sends = data ?? [];
  const error = loadError ?? deleteError;

  const handleDeleteConfirm = async () => {
    if (!sendToDelete) return;
    try {
      await sendApi.deleteSend(sendToDelete);
      await deleteSendKey(sendToDelete);
      setDeleteDialogOpen(false);
      setSendToDelete(null);
      setDeleteError('');
      await reloadSends();
    } catch {
      setDeleteError(t('dashboard.deleteError'));
    }
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
      await navigator.clipboard.writeText(`${window.location.origin}/download/${send.accessId}#${keyBase64}`);
      setCopiedSendId(send.id);
      setToastMessage(t('dashboard.linkCopied'));
      setShowToast(true);
      setTimeout(() => { setCopiedSendId(null); setShowToast(false); }, 2000);
    } catch {
      setToastMessage(t('dashboard.copyError'));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const activeSends = sends.filter(s => {
    const isExpired = !!(s.expiresAt && new Date(s.expiresAt) < new Date());
    return !s.revoked && !isExpired && s.downloadCount < s.maxDownloads;
  }).length;
  const totalDownloads = sends.reduce((sum, s) => sum + s.downloadCount, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <PageHeader title={t('dashboard.welcome', { name: username })} subtitle={t('dashboard.subtitle')} />

      {error && (
        <Alert variant="error">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{error}</span>
        </Alert>
      )}

      <DashboardStats activeSends={activeSends} totalDownloads={totalDownloads} />

      <SendsTable
        sends={sends}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        copiedSendId={copiedSendId}
        onCopyLink={handleCopyLink}
        onDeleteClick={(id) => { setSendToDelete(id); setDeleteDialogOpen(true); }}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setDeleteDialogOpen(false); setSendToDelete(null); }}
        icon={<Trash2 className="w-6 h-6" />}
        iconVariant="danger"
        title={t('common.delete')}
        description={t('admin.deleteDialog.message')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
      />

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
