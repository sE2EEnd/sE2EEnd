import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { adminApi, settingsApi } from '@/services/api.ts';
import type { AdminStats, CleanupResult, StorageMetrics } from '@/services/api.ts';
import { AlertCircle, Loader2, Trash } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ConfirmDialog';
import PageHeader from '@/components/PageHeader';
import { formatBytes } from '@/lib/format';
import { useAdminSends } from './hooks/useAdminSends';
import { useAdminDeletedSends } from './hooks/useAdminDeletedSends';
import StorageMetricsPanel from './components/StorageMetrics';
import SettingsPanel from './components/SettingsPanel';
import AdminSendsTable from './components/AdminSendsTable';

export default function AdminPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [cleanupRunning, setCleanupRunning] = useState(false);

  const adminSends = useAdminSends();
  const { reloadFromFirstPage } = adminSends;

  const deletedSends = useAdminDeletedSends();

  useEffect(() => {
    void loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsData, storageData, settingsData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getStorageMetrics(),
        settingsApi.getAll(),
      ]);
      setStats(statsData);
      setStorageMetrics(storageData);
      setSettings(settingsData);
    } catch (err) {
      setError(isAxiosError(err) && err.response?.status === 403
        ? t('admin.errors.accessDenied')
        : t('admin.errors.loadFailed')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    try {
      setCleanupRunning(true);
      setCleanupDialogOpen(false);
      const result: CleanupResult = await adminApi.runCleanup();
      toast.success(t('admin.cleanupSuccess', {
        deletedSends: result.deletedSends,
        deletedFiles: result.deletedFiles,
        freedSpace: formatBytes(result.freedSpace),
      }));
      await Promise.all([loadData(), reloadFromFirstPage(), deletedSends.reloadFromFirstPage()]);
    } catch {
      toast.error(t('admin.errors.cleanupFailed'));
    } finally {
      setCleanupRunning(false);
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
    <div className="space-y-8 pb-10">
      <PageHeader title={t('admin.title')} subtitle={t('admin.subtitle')} />

      {error && (
        <Alert variant="error" className="animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{error}</span>
        </Alert>
      )}

      <StorageMetricsPanel
        stats={stats}
        storageMetrics={storageMetrics}
        cleanupRunning={cleanupRunning}
        onCleanupRequest={() => setCleanupDialogOpen(true)}
      />

      <SettingsPanel initialSettings={settings} />

      <AdminSendsTable
        {...adminSends}
        deletedSends={deletedSends.deletedSends}
        deletedTotalPages={deletedSends.totalPages}
        deletedTotalElements={deletedSends.totalElements}
        deletedCurrentPage={deletedSends.currentPage}
        setDeletedCurrentPage={deletedSends.setCurrentPage}
        deletedLoading={deletedSends.deletedLoading}
        reloadDeleted={deletedSends.reloadFromFirstPage}
      />

      <ConfirmDialog
        open={cleanupDialogOpen}
        onConfirm={handleCleanup}
        onCancel={() => setCleanupDialogOpen(false)}
        icon={<Trash className="w-6 h-6" />}
        iconVariant="warning"
        title={t('admin.cleanupDialog.title')}
        description={t('admin.cleanupDialog.message')}
        confirmLabel={t('admin.cleanupDialog.confirm')}
        cancelLabel={t('admin.cleanupDialog.cancel')}
      />
    </div>
  );
}
