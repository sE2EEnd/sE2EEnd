import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Upload, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface DashboardStatsProps {
  activeSends: number;
  totalDownloads: number;
}

export default function DashboardStats({ activeSends, totalDownloads }: DashboardStatsProps) {
  const { t } = useTranslation();
  return (
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
  );
}
