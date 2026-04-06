import { useTranslation } from 'react-i18next';
import { ArrowDownToLine, Clock } from 'lucide-react';

interface SendMetaPanelProps {
  downloadCount: number;
  maxDownloads: number;
  expiresAt?: string;
}

export default function SendMetaPanel({ downloadCount, maxDownloads, expiresAt }: SendMetaPanelProps) {
  const { t } = useTranslation();
  return (
    <div className="p-4 bg-primary rounded-lg space-y-2">
      <div className="flex items-center gap-2 text-sm text-white">
        <ArrowDownToLine className="w-4 h-4" />
        <span>
          <strong>{t('download.downloads')}:</strong> {downloadCount} / {maxDownloads}
        </span>
      </div>
      {expiresAt && (
        <div className="flex items-center gap-2 text-sm text-white">
          <Clock className="w-4 h-4" />
          <span>
            <strong>{t('download.expires')}:</strong> {new Date(expiresAt).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
