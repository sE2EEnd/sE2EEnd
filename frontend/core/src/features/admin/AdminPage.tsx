import { useState, useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { adminApi, settingsApi } from '@/services/api.ts';
import { cn } from '@/lib/utils.ts';
import { getSendKey } from '@/lib/sendKeysDB.ts';
import { importKeyFromBase64, decryptText } from '@/lib/crypto.ts';
import type { SendResponse, StorageMetrics, CleanupResult, AdminStats, DeletedSend, PagedResponse } from '@/services/api.ts';
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
  History,
} from 'lucide-react';
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

export default function AdminPage() {
  const { t } = useTranslation();
  const PAGE_SIZE = 10;

  const [sends, setSends] = useState<SendResponse[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [sendsLoading, setSendsLoading] = useState(false);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sendToDelete, setSendToDelete] = useState<string | null>(null);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [decryptedNames, setDecryptedNames] = useState<Record<string, string>>({});
  const [deletedSends, setDeletedSends] = useState<DeletedSend[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [pendingSettings, setPendingSettings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [filterSender, setFilterSender] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [debouncedSender, setDebouncedSender] = useState('');
  const [cronInput, setCronInput] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSender(filterSender), 350);
    return () => clearTimeout(timer);
  }, [filterSender]);

  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSender, filterStatus]);

  const hasPendingChanges = Object.keys(pendingSettings).length > 0;

  const blocker = useBlocker(hasPendingChanges);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasPendingChanges) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasPendingChanges]);

  useEffect(() => {
    void loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void loadSends(currentPage, debouncedSender, filterStatus);
  }, [currentPage, debouncedSender, filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsData, storageData, settingsData, deletedData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getStorageMetrics(),
        settingsApi.getAll(),
        adminApi.getDeletedSends(),
      ]);
      setStats(statsData);
      setStorageMetrics(storageData);
      setSettings(settingsData);
      setCronInput(settingsData['cleanup_cron'] ?? '0 0 2 * * *');
      setDeletedSends(deletedData);
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

  const loadSends = async (page: number, ownerSearch: string, status: string) => {
    try {
      setSendsLoading(true);
      const data: PagedResponse<SendResponse> = await adminApi.getAllSends(page, PAGE_SIZE, ownerSearch, status);
      setSends(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);

      const names: Record<string, string> = {};
      await Promise.all(
        data.content.map(async (send) => {
          if (!send.name) return;
          try {
            const keyBase64 = await getSendKey(send.id);
            if (!keyBase64) return;
            const key = await importKeyFromBase64(keyBase64);
            names[send.id] = await decryptText(send.name, key);
          } catch {
            // pas de clé ou nom non chiffré
          }
        })
      );
      setDecryptedNames(names);
    } catch {
      setError(t('admin.errors.loadFailed'));
    } finally {
      setSendsLoading(false);
    }
  };


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
      await Promise.all([loadData(), loadSends(0, debouncedSender, filterStatus)]);
      setCurrentPage(0);
    } catch {
      setError(t('admin.errors.cleanupFailed'));
    } finally {
      setCleanupRunning(false);
    }
  };

  const setPendingSetting = (key: string, value: string) => {
    setPendingSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    setError('');
    try {
      await Promise.all(
        Object.entries(pendingSettings).map(([key, value]) => settingsApi.update(key, value))
      );
      setSettings(prev => ({ ...prev, ...pendingSettings }));
      setPendingSettings({});
      setSuccess(t('admin.settings.saveSuccess'));
    } catch {
      setError(t('admin.settings.updateFailed'));
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleDiscardSettings = () => {
    setPendingSettings({});
    setCronInput(settings['cleanup_cron'] ?? '0 0 2 * * *');
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
      await loadSends(currentPage, debouncedSender, filterStatus);
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
      setDeleteDialogOpen(false);
      setSendToDelete(null);
      await loadSends(currentPage, debouncedSender, filterStatus);
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
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{t('admin.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{t('admin.subtitle')}</p>
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
        <Card className="p-6 flex items-center gap-5 hover:shadow-md transition-all">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary flex-shrink-0">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t('admin.stats.totalSends')}</p>
              <div className="group/tooltip relative">
                <Info className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 cursor-help transition-colors" />
                <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-10 shadow-xl font-normal">
                  {t('admin.stats.totalSendsHelp')}
                </div>
              </div>
            </div>
            <h2 className="text-4xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{stats?.totalSends || 0}</h2>
          </div>
        </Card>

        {/* Carte Capacité de Stockage - Plus aérée */}
        <Card className="lg:col-span-2 p-8 hover:shadow-md transition-all">
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
                <span className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{storageMetrics?.percentageUsed.toFixed(0)}%</span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t('admin.storage.capacity')}</h3>
                  <p className="text-4xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
                    {formatBytes(storageMetrics?.usedSpace || 0)} <span className="text-gray-300 dark:text-gray-600 font-medium text-2xl">/ {formatBytes(storageMetrics?.totalSpace || 0)}</span>
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

              <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                <Database className="w-4 h-4 flex-shrink-0" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">{storageMetrics?.fileCount || 0}</span>
                <span>{t('admin.storage.filesInStorage', { count: storageMetrics?.fileCount || 0 }).toLowerCase()}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Paramètres globaux */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          {t('admin.settings.title')}
        </h3>
        <div className="flex flex-col gap-4">
          <Card className="p-6 flex items-center justify-between group hover:shadow-md transition-all">
            <div>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('admin.settings.requireAuthForDownload')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.settings.requireAuthForDownloadDesc')}</p>
            </div>
            <button
              onClick={() => {
                const cur = pendingSettings['require_auth_for_download'] ?? settings['require_auth_for_download'] ?? 'true';
                setPendingSetting('require_auth_for_download', cur === 'true' ? 'false' : 'true');
              }}
              disabled={settingsLoading}
              className={cn(
                "relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50",
                (pendingSettings['require_auth_for_download'] ?? settings['require_auth_for_download']) === 'true' ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'
              )}
            >
              <span className={cn(
                "inline-block h-6 w-6 transform rounded-full bg-white transition-transform",
                (pendingSettings['require_auth_for_download'] ?? settings['require_auth_for_download']) === 'true' ? 'translate-x-7' : 'translate-x-1'
              )} />
            </button>
          </Card>

          <Card className="p-6 flex items-center justify-between group hover:shadow-md transition-all">
            <div>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('admin.settings.requireSendPassword')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.settings.requireSendPasswordDesc')}</p>
            </div>
            <button
              onClick={() => {
                const cur = pendingSettings['require_send_password'] ?? settings['require_send_password'] ?? 'false';
                setPendingSetting('require_send_password', cur === 'true' ? 'false' : 'true');
              }}
              disabled={settingsLoading}
              className={cn(
                "relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50",
                (pendingSettings['require_send_password'] ?? settings['require_send_password']) === 'true' ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'
              )}
            >
              <span className={cn(
                "inline-block h-6 w-6 transform rounded-full bg-white transition-transform",
                (pendingSettings['require_send_password'] ?? settings['require_send_password']) === 'true' ? 'translate-x-7' : 'translate-x-1'
              )} />
            </button>
          </Card>

          <Card className="p-6 group hover:shadow-md transition-all space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('admin.settings.cleanupSchedule')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.settings.cleanupScheduleDesc')}</p>
              </div>
            </div>
            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: t('admin.settings.cleanupPresetNightly'), value: '0 0 2 * * *' },
                { label: t('admin.settings.cleanupPresetWeekly'), value: '0 0 2 * * 0' },
                { label: t('admin.settings.cleanupPresetDisabled'), value: 'disabled' },
              ].map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => { setCronInput(preset.value); setPendingSetting('cleanup_cron', preset.value); }}
                  disabled={settingsLoading}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50",
                    cronInput === preset.value
                      ? "bg-primary text-white border-primary"
                      : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary/40 hover:text-primary"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {/* Cron input */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={cronInput}
                onChange={(e) => { setCronInput(e.target.value); setPendingSetting('cleanup_cron', e.target.value); }}
                disabled={settingsLoading}
                placeholder="0 0 2 * * *"
                className="flex-1 font-mono text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 text-gray-700 dark:text-gray-300"
              />
              <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{t('admin.settings.cleanupCronHint')}</span>
            </div>
          </Card>
        </div>

        {/* Barre de confirmation */}
        {hasPendingChanges && (
          <div className="flex items-center justify-between gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-medium text-amber-800">{t('admin.settings.unsavedChanges')}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDiscardSettings}
                disabled={settingsLoading}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={settingsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {settingsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {t('admin.settings.saveChanges')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tableau des transferts récents */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4" />
            {t('admin.recentTransfers')}
          </h3>
        </div>

        <Card className="overflow-hidden">
          {/* Barre de filtres */}
          <div className="p-4 border-b border-gray-50 dark:border-gray-700 flex flex-col sm:flex-row gap-4 bg-gray-50/30 dark:bg-gray-700/20">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder={t('admin.filterBySender')}
                value={filterSender}
                onChange={(e) => setFilterSender(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl text-sm dark:text-gray-100 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
            <div className="relative min-w-[160px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full appearance-none pl-10 pr-10 py-2 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl text-sm dark:text-gray-100 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              >
                <option value="all">{t('admin.filterByStatus')}</option>
                <option value="active">{t('common.active')}</option>
                <option value="expired">{t('common.expired')}</option>
                <option value="revoked">{t('common.revoked')}</option>
                <option value="exhausted">{t('common.exhausted')}</option>
              </select>
            </div>
          </div>

          <div className={cn("overflow-x-auto transition-opacity", sendsLoading && "opacity-50")}>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-700">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
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
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('admin.table.owner')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('admin.table.status')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('admin.table.created')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('admin.table.expires')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">{t('admin.table.actions')}</th>
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
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[150px]">
                            {send.ownerName || send.ownerEmail || t('admin.table.unknown')}
                          </div>
                          {send.ownerEmail && send.ownerName && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                              {send.ownerEmail}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-tight",
                            isActive ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" :
                            send.revoked ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400" :
                            isExpired ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" :
                            "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
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
                          <div className="text-sm font-bold text-gray-600 dark:text-gray-400">
                            {new Date(send.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(send.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm font-bold text-gray-600 dark:text-gray-400">
                            {send.expiresAt ? new Date(send.expiresAt).toLocaleDateString() : t('admin.table.never')}
                          </div>
                          {send.expiresAt && (
                            <div className="text-xs text-gray-400 dark:text-gray-500">
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
                      onClick={() => setCurrentPage(p => p - 1)}
                      aria-disabled={currentPage === 0 || sendsLoading}
                      className={currentPage === 0 || sendsLoading ? 'pointer-events-none opacity-40' : 'cursor-pointer'}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i)
                    .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 1)
                    .reduce<(number | 'ellipsis')[]>((acc, i, idx, arr) => {
                      if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
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
                      onClick={() => setCurrentPage(p => p + 1)}
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

      {/* Historique des suppressions */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <History className="w-4 h-4" />
          {t('admin.history.title')}
        </h3>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-700">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('admin.table.owner')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('admin.history.reason')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('admin.history.createdAt')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('admin.history.deletedAt')}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('admin.history.size')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {deletedSends.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400 italic">
                      {t('admin.history.empty')}
                    </td>
                  </tr>
                ) : (
                  deletedSends.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[180px]">
                          {d.ownerName || d.ownerEmail || t('admin.table.unknown')}
                        </div>
                        {d.ownerEmail && d.ownerName && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[180px]">{d.ownerEmail}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-tight",
                          d.deleteReason === 'EXPIRED'   ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" :
                          d.deleteReason === 'REVOKED'   ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400" :
                          d.deleteReason === 'EXHAUSTED' ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" :
                                                           "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
                        )}>
                          {t(`admin.history.reasons.${d.deleteReason.toLowerCase()}`)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {d.sendCreatedAt ? (
                          <>
                            <div className="text-sm font-bold text-gray-600 dark:text-gray-400">
                              {new Date(d.sendCreatedAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {new Date(d.sendCreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-600 dark:text-gray-400">
                          {new Date(d.deletedAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(d.deletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 font-semibold">{formatBytes(d.totalSizeBytes)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Boîte de dialogue de confirmation de suppression */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={handleDeleteCancel} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('admin.deleteDialog.title')}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              {t('admin.deleteDialog.message')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
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
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400 rounded-xl flex items-center justify-center mb-4">
              <Trash className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('admin.cleanupDialog.title')}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              {t('admin.cleanupDialog.message')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCleanupDialogOpen(false)}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
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

      {/* Dialog navigation bloquée - modifications non enregistrées */}
      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => blocker.reset()} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400 rounded-xl flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('admin.settings.leaveTitle')}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{t('admin.settings.leaveMessage')}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => blocker.reset()}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                {t('admin.settings.leaveCancel')}
              </button>
              <button
                onClick={() => blocker.proceed()}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-all shadow-lg shadow-amber-200"
              >
                {t('admin.settings.leaveConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

