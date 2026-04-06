import { useTranslation } from 'react-i18next';
import { Database, FileText, Info, RefreshCw, Trash } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { AdminStats, StorageMetrics as StorageMetricsType } from '@/services/api.ts';
import { formatBytes } from '@/lib/format';

interface StorageMetricsProps {
  stats: AdminStats | null;
  storageMetrics: StorageMetricsType | null;
  cleanupRunning: boolean;
  onCleanupRequest: () => void;
}

export default function StorageMetrics({ stats, storageMetrics, cleanupRunning, onCleanupRequest }: StorageMetricsProps) {
  const { t } = useTranslation();
  const pct = storageMetrics?.percentageUsed || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Stats card */}
      <Card className="p-6 flex items-center gap-5 hover:shadow-md transition-all">
        <div className="p-3 bg-primary/10 rounded-2xl text-primary flex-shrink-0">
          <FileText className="w-8 h-8" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t('admin.stats.totalSends')}</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 cursor-help transition-colors" />
              </TooltipTrigger>
              <TooltipContent className="w-64">{t('admin.stats.totalSendsHelp')}</TooltipContent>
            </Tooltip>
          </div>
          <h2 className="text-4xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{stats?.totalSends || 0}</h2>
        </div>
      </Card>

      {/* Storage card */}
      <Card className="lg:col-span-2 p-8 hover:shadow-md transition-all">
        <div className="flex flex-col md:flex-row items-center gap-10">
          {/* Donut chart */}
          <div className="relative w-36 h-36 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="72" cy="72" r="64" fill="none" stroke="#F3F4F6" strokeWidth="12" />
              <circle
                cx="72" cy="72" r="64"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeDasharray={402}
                strokeDashoffset={402 * (1 - pct / 100)}
                strokeLinecap="round"
                className={pct > 90 ? 'text-red-500' : pct > 70 ? 'text-orange-500' : 'text-primary'}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold text-gray-900 dark:text-gray-100">{pct.toFixed(0)}%</span>
            </div>
          </div>

          <div className="flex-1 w-full space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t('admin.storage.capacity')}</h3>
                <p className="text-4xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
                  {formatBytes(storageMetrics?.usedSpace || 0)}{' '}
                  <span className="text-gray-300 dark:text-gray-600 font-medium text-2xl">/ {formatBytes(storageMetrics?.totalSpace || 0)}</span>
                </p>
              </div>
              <button
                onClick={onCleanupRequest}
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
  );
}
