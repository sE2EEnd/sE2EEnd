import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../services/api';
import type { SendResponse, StorageMetrics, CleanupResult } from '../../services/api';
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  Database,
  Ban,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Download,
  HardDrive,
  Trash,
  RefreshCw,
} from 'lucide-react';

export default function AdminPage() {
  const { t } = useTranslation();
  const [sends, setSends] = useState<SendResponse[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sendToDelete, setSendToDelete] = useState<string | null>(null);
  const [cleanupRunning, setCleanupRunning] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [sendsData, statsData, storageData] = await Promise.all([
        adminApi.getAllSends(),
        adminApi.getStats(),
        adminApi.getStorageMetrics(),
      ]);
      setSends(sendsData);
      setStats(statsData);
      setStorageMetrics(storageData);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Access denied. Admin role required.');
      } else {
        setError('Failed to load admin data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('Run cleanup to delete expired, revoked, and exhausted sends?')) {
      return;
    }

    try {
      setCleanupRunning(true);
      setError('');
      setSuccess('');
      const result: CleanupResult = await adminApi.runCleanup();
      setSuccess(
        `Cleanup completed: ${result.deletedSends} sends deleted, ${result.deletedFiles} files removed, ${formatBytes(result.freedSpace)} freed`
      );
      await loadData(); // Refresh data
    } catch (err: any) {
      setError('Cleanup failed');
    } finally {
      setCleanupRunning(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleRevoke = async (sendId: string) => {
    try {
      await adminApi.revokeSend(sendId);
      await loadData();
    } catch (err: any) {
      setError('Failed to revoke send');
    }
  };

  const handleDeleteClick = (sendId: string) => {
    setSendToDelete(sendId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!sendToDelete) return;

    try {
      await adminApi.deleteSend(sendToDelete);
      setSends(sends.filter((s) => s.id !== sendToDelete));
      setDeleteDialogOpen(false);
      setSendToDelete(null);
      await loadData(); // Reload to update stats
    } catch (err: any) {
      setError('Failed to delete send');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSendToDelete(null);
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
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">{t('admin.title')}</h1>
        <p className="text-gray-600 mt-1">{t('admin.subtitle')}</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('admin.stats.totalSends')}</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalSends}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('admin.stats.activeSends')}</p>
                <p className="text-3xl font-bold text-green-600">{stats.activeSends}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('admin.stats.revokedSends')}</p>
                <p className="text-3xl font-bold text-orange-600">{stats.revokedSends}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Ban className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('admin.stats.totalFiles')}</p>
                <p className="text-3xl font-bold text-primary">{stats.totalFiles}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Storage Metrics */}
      {storageMetrics && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('admin.storage.title')}</h2>
                <p className="text-sm text-gray-500">{storageMetrics.storagePath}</p>
              </div>
            </div>
            <button
              onClick={handleCleanup}
              disabled={cleanupRunning}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cleanupRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {t('admin.storage.running')}
                </>
              ) : (
                <>
                  <Trash className="w-4 h-4" />
                  {t('admin.storage.runCleanup')}
                </>
              )}
            </button>
          </div>

          {/* Storage Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">
                {t('admin.storage.used')}: {formatBytes(storageMetrics.usedSpace)}
              </span>
              <span className="text-gray-600">
                {t('admin.storage.free')}: {formatBytes(storageMetrics.freeSpace)}
              </span>
              <span className="text-gray-600">
                {t('admin.storage.total')}: {formatBytes(storageMetrics.totalSpace)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  storageMetrics.percentageUsed > 90
                    ? 'bg-red-600'
                    : storageMetrics.percentageUsed > 70
                    ? 'bg-orange-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${storageMetrics.percentageUsed}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              {storageMetrics.percentageUsed.toFixed(1)}% {t('admin.storage.percentUsed')}
            </p>
          </div>

          {/* Storage Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">{t('admin.storage.filesInStorage')}</p>
              <p className="text-2xl font-bold text-gray-900">{storageMetrics.fileCount}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">{t('admin.storage.storageSize')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatBytes(storageMetrics.storageSize)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">{t('admin.storage.usableSpace')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatBytes(storageMetrics.usableSpace)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">{t('admin.storage.available')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {(100 - storageMetrics.percentageUsed).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sends Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{t('admin.table.allSends')}</h2>
        </div>

        {sends.length === 0 ? (
          <div className="p-12 text-center text-gray-500">{t('admin.table.noSends')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.table.sendName')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.table.owner')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.table.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.table.downloads')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.table.created')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.table.expires')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sends.map((send) => {
                  const isExpired = send.expiresAt && new Date(send.expiresAt) < new Date();
                  const isExhausted = send.downloadCount >= send.maxDownloads;
                  const isActive = !send.revoked && !isExpired && !isExhausted;

                  return (
                    <tr key={send.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {send.name || <span className="text-gray-400 italic">Unnamed Send</span>}
                        </div>
                        <div className="text-xs text-gray-500">
                          {send.files && send.files.length > 0 ? (
                            `${send.files.length} ${send.files.length === 1 ? 'file' : 'files'}`
                          ) : (
                            'No files'
                          )}
                          {' • '}ID: {send.accessId}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {send.ownerName || send.ownerEmail || send.ownerId || (
                            <span className="text-gray-400 italic">Unknown</span>
                          )}
                        </div>
                        {send.ownerEmail && send.ownerName && (
                          <div className="text-xs text-gray-500">{send.ownerEmail}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            isActive
                              ? 'bg-green-100 text-green-700'
                              : send.revoked
                              ? 'bg-gray-100 text-gray-700'
                              : isExpired
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </>
                          ) : send.revoked ? (
                            <>
                              <Ban className="w-3 h-3" />
                              Revoked
                            </>
                          ) : isExpired ? (
                            <>
                              <Clock className="w-3 h-3" />
                              Expired
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3 h-3" />
                              Exhausted
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Download className="w-4 h-4 text-gray-400" />
                          {send.downloadCount} / {send.maxDownloads}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(send.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {send.expiresAt
                          ? new Date(send.expiresAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {!send.revoked && isActive && (
                            <button
                              onClick={() => handleRevoke(send.id)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Revoke send"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClick(send.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete send"
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

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleDeleteCancel} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Send</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this send? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
