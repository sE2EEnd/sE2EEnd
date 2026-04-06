import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

export default function DownloadQrCode() {
  const { t } = useTranslation();
  const [showQr, setShowQr] = useState(false);

  return (
    <div className="flex flex-col items-center p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
      <button
        onClick={() => setShowQr(v => !v)}
        className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        <QrCode className="w-4 h-4" />
        <span className="text-sm font-semibold">{t('download.qrCode')}</span>
      </button>
      {showQr && (
        <>
          <div className="mt-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200">
            <QRCodeCanvas value={window.location.href} size={160} level="H" marginSize={4} />
          </div>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 text-center">
            {t('download.qrCodeDesc')}
          </p>
        </>
      )}
    </div>
  );
}
