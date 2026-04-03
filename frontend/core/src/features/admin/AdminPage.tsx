import { useState, useEffect, useMemo } from 'react';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { adminApi, settingsApi } from '../../services/api';
import { cn } from '../../lib/utils';
import type { SendResponse, StorageMetrics, CleanupResult, AdminStats } from '../../services/api';
import {
  Loader2,
  AlertCircle,
  Database,
  Ban,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Trash,
  RefreshCw,
  Info,
  Search,
  Filter,
  FileText,
  ShieldCheck,
  Activity,
} from 'lucide-react';

export default function AdminPage() {
  const { t } = useTranslation();
  const [sends, setSends] = useState<SendResponse[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sendToDelete, setSendToDelete] = useState<string | null>(null);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Filtres
  const [filterSender, setFilterSender] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [sendsData, statsData, storageData, settingsData] = await Promise.all([
        adminApi.getAllSends(),
        adminApi.getStats(),
        adminApi.getStorageMetrics(),
        settingsApi.getAll(),
      ]);
      setSends(sendsData);
      setStats(statsData);
      setStorageMetrics(storageData);
      setSettings(settingsData);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 403) {
        setError(t('admin.errors.accessDenied'));
      } else {
        setError(t('admin.errors.loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredSends = useMemo(() => {
    return sends.filter(send => {
      const matchesSender = !filterSender || 
        (send.ownerEmail?.toLowerCase().includes(filterSender.toLowerCase())) ||
        (send.ownerName?.toLowerCase().includes(filterSender.toLowerCase())) ||
        (send.ownerId?.toLowerCase().includes(filterSender.toLowerCase()));
      
      const isExpired = !!(send.expiresAt && new Date(send.expiresAt) < new Date());
      const isExhausted = send.downloadCount >= send.maxDownloads;
      const isActive = !send.revoked && !isExpired && !isExhausted;

      let matchesStatus = true;
      if (filterStatus === 'active') matchesStatus = isActive;
      else if (filterStatus === 'expired') matchesStatus = isExpired && !send.revoked;
      else if (filterStatus === 'revoked') matchesStatus = send.revoked;
      else if (filterStatus === 'exhausted') matchesStatus = isExhausted && !isExpired && !send.revoked;

      return matchesSender && matchesStatus;
    });
  }, [sends, filterSender, filterStatus]);

  const handleCleanup = async () => {
    try {
      setCleanupRunning(true);
      setCleanupDialogOpen(false);
      setError('');
      setSuccess('');
      const result: CleanupResult = await adminApi.runCleanup();
      setSuccess(
        t('admin.cleanupSuccess', {
          deletedSends: result.deletedSends,
          deletedFiles: result.deletedFiles,
          freedSpace: formatBytes(result.freedSpace)
        })
      );
      await loadData();
    } catch {
      setError(t('admin.errors.cleanupFailed'));
    } finally {
      setCleanupRunning(false);
    }
  };

  const handleSettingToggle = async (key: string, currentValue: string) => {
    const newValue = currentValue === 'true' ? 'false' : 'true';
    setSettingsLoading(true);
    try {
      await settingsApi.update(key, newValue);
      setSettings(prev => ({ ...prev, [key]: newValue }));
    } catch {
      setError(t('admin.settings.updateFailed'));
    } finally {
      setSettingsLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleRevoke = async (sendId: string) => {
    try {
      await adminApi.revokeSend(sendId);
      await loadData();
    } catch {
      setError(t('admin.errors.revokeFailed'));
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
      await loadData();
    } catch {
      setError(t('admin.errors.deleteFailed'));
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
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">{t('admin.title')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{t('admin.subtitle')}</p>
        </div>
      </div>

      {/* Alertes Erreur/Succès */}
      {(error || success) && (
        <div className="space-y-2">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 shadow-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl text-green-800 shadow-sm animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{success}</span>
            </div>
          )}
        </div>
      )}

      {/* Grid Stats et Stockage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carte Nombre de Sends - Plus compacte et lisible */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-5 hover:shadow-md transition-all">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary flex-shrink-0">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('admin.stats.totalSends')}</p>
              <div className="group/tooltip relative">
                <Info className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 cursor-help transition-colors" />
                <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-10 shadow-xl font-normal">
                  {t('admin.stats.totalSendsHelp')}
                </div>
              </div>
            </div>
            <h2 className="text-4xl font-semibold text-gray-900 mt-1">{stats?.totalSends || 0}</h2>
          </div>
        </div>

        {/* Carte Capacité de Stockage - Plus aérée */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="relative w-36 h-36 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="72" cy="72" r="64" fill="none" stroke="#F3F4F6" strokeWidth="12" />
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={402}
                  strokeDashoffset={402 * (1 - (storageMetrics?.percentageUsed || 0) / 100)}
                  strokeLinecap="round"
                  className={(storageMetrics?.percentageUsed || 0) > 90 ? 'text-red-500' : (storageMetrics?.percentageUsed || 0) > 70 ? 'text-orange-500' : 'text-primary'}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-semibold text-gray-900">{storageMetrics?.percentageUsed.toFixed(0)}%</span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('admin.storage.capacity')}</h3>
                  <p className="text-4xl font-semibold text-gray-900 mt-1">
                    {formatBytes(storageMetrics?.usedSpace || 0)} <span className="text-gray-300 font-medium text-2xl">/ {formatBytes(storageMetrics?.totalSpace || 0)}</span>
                  </p>
                </div>
                <button
                  onClick={() => setCleanupDialogOpen(true)}
                  disabled={cleanupRunning}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all font-bold text-xs uppercase tracking-widest disabled:opacity-50"
                >
                  {cleanupRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash className="w-4 h-4" />}
                  {t('admin.storage.runCleanup')}
                </button>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Database className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold text-gray-900">{storageMetrics?.fileCount || 0}</span>
                <span>{t('admin.storage.filesInStorage', { count: storageMetrics?.fileCount || 0 }).toLowerCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Paramètres globaux */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          {t('admin.settings.title')}
        </h3>
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-base font-semibold text-gray-900">{t('admin.settings.requireAuthForDownload')}</p>
                <p className="text-sm text-gray-500">{t('admin.settings.requireAuthForDownloadDesc')}</p>
              </div>
            </div>
            <button

              onClick={() => handleSettingToggle('require_auth_for_download', settings['require_auth_for_download'] ?? 'true')}
              disabled={settingsLoading}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                settings['require_auth_for_download'] === 'true' ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  settings['require_auth_for_download'] === 'true' ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des transferts récents */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4" />
            {t('admin.recentTransfers')}
          </h3>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Barre de filtres */}
          <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row gap-4 bg-gray-50/30">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('admin.filterBySender')}
                value={filterSender}
                onChange={(e) => setFilterSender(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
            <div className="relative min-w-[160px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full appearance-none pl-10 pr-10 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              >
                <option value="all">{t('admin.filterByStatus')}</option>
                <option value="active">{t('common.active')}</option>
                <option value="expired">{t('common.expired')}</option>
                <option value="revoked">{t('common.revoked')}</option>
                <option value="exhausted">{t('common.exhausted')}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      {t('admin.table.sendName')}
                      <div className="group/header-info relative">
                        <Info className="w-3.5 h-3.5 cursor-help text-gray-300 hover:text-gray-400 transition-colors" />
                        <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-[11px] rounded-xl opacity-0 invisible group-hover/header-info:opacity-100 group-hover/header-info:visible transition-all z-[60] shadow-xl font-normal normal-case tracking-normal">
                          {t('admin.encryptedNameNotice')}
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('admin.table.owner')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('admin.table.status')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('admin.table.created')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('admin.table.expires')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">{t('admin.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSends.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400 italic">
                      {t('admin.table.noSends')}
                    </td>
                  </tr>
                ) : (
                  filteredSends.map((send) => {
                    const isExpired = !!(send.expiresAt && new Date(send.expiresAt) < new Date());
                    const isExhausted = send.downloadCount >= send.maxDownloads;
                    const isActive = !send.revoked && !isExpired && !isExhausted;

                    return (
                      <tr key={send.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                              <Database className="w-5 h-5" />
                            </div>
                            <div className="max-w-[240px]">
                              <div className="text-sm font-bold text-gray-900 truncate flex items-center gap-2">
                                {send.name || <span className="text-gray-400 italic font-normal">{t('admin.table.unnamedSend')}</span>}
                                {!send.name && (
                                  <div className="group/note relative">
                                    <Info className="w-3.5 h-3.5 text-gray-300 cursor-help" />
                                    <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-[11px] rounded-xl opacity-0 invisible group-hover/note:opacity-100 group-hover/note:visible transition-all z-[60] shadow-xl font-normal">
                                      {t('admin.encryptedNameNotice')}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {send.files?.length || 0} {send.files?.length === 1 ? t('common.file') : t('common.files')} • {send.accessId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm font-semibold text-gray-900 truncate max-w-[150px]">
                            {send.ownerName || send.ownerEmail || t('admin.table.unknown')}
                          </div>
                          {send.ownerEmail && send.ownerName && (
                            <div className="text-xs text-gray-500 truncate max-w-[150px]">
                              {send.ownerEmail}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5">
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
                             <ShieldAlert className="w-3.5 h-3.5" />}
                            {isActive ? t('common.active') :
                             send.revoked ? t('common.revoked') :
                             isExpired ? t('common.expired') :
                             t('common.exhausted')}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm font-bold text-gray-600">
                            {new Date(send.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(send.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm font-bold text-gray-600">
                            {send.expiresAt ? new Date(send.expiresAt).toLocaleDateString() : t('admin.table.never')}
                          </div>
                          {send.expiresAt && (
                            <div className="text-xs text-gray-400">
                              {new Date(send.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
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
                              onClick={() => handleDeleteClick(send.id)}
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
        </div>
      </div>

      {/* Boîte de dialogue de confirmation de suppression */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={handleDeleteCancel} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('admin.deleteDialog.title')}</h3>
            <p className="text-gray-500 text-sm mb-6">
              {t('admin.deleteDialog.message')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
              >
                {t('admin.deleteDialog.cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-lg shadow-red-200"
              >
                {t('admin.deleteDialog.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de confirmation du cleanup */}
      {cleanupDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setCleanupDialogOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center mb-4">
              <Trash className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('admin.cleanupDialog.title')}</h3>
            <p className="text-gray-500 text-sm mb-6">
              {t('admin.cleanupDialog.message')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCleanupDialogOpen(false)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
              >
                {t('admin.cleanupDialog.cancel')}
              </button>
              <button
                onClick={handleCleanup}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-all shadow-lg shadow-orange-200"
              >
                {t('admin.cleanupDialog.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

