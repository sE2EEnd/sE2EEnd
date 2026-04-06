import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle, Copy, Eye, EyeOff, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Input } from '@/components/ui/input';

interface ShareStepProps {
  mode: 'file' | 'text';
  shareLink: string;
  usedPassword: string;
  onUploadAnother: () => void;
}

export default function ShareStep({ mode, shareLink, usedPassword, onUploadAnother }: ShareStepProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showUsedPassword, setShowUsedPassword] = useState(false);
  const [usedPasswordCopied, setUsedPasswordCopied] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {mode === 'text' ? t('upload.success.titleText') : t('upload.success.title')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {mode === 'text' ? t('upload.success.messageText') : t('upload.success.message')}
        </p>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl">
        <button
          onClick={() => setShowQr(v => !v)}
          className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <QrCode className="w-5 h-5" />
          <span className="text-lg font-semibold">{t('upload.success.qrCode')}</span>
        </button>
        {showQr && (
          <>
            <div className="mt-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <QRCodeCanvas value={shareLink} size={200} level="H" marginSize={4} />
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 text-center">
              {t('upload.success.qrCodeDesc')}
            </p>
          </>
        )}
      </div>

      {/* Share link */}
      <div className="p-4 bg-primary rounded-lg">
        <label className="block text-sm font-medium text-white mb-2">
          {t('upload.success.shareLink')}
        </label>
        <div className="flex gap-2">
          <Input type="text" value={shareLink} readOnly className="flex-1 font-mono" />
          <button
            onClick={() => {
              navigator.clipboard.writeText(shareLink);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            {copied ? (
              <><CheckCircle className="w-4 h-4" />{t('common.copied')}</>
            ) : (
              <><Copy className="w-4 h-4" />{t('common.copy')}</>
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-white">{t('dashboard.warningKey')}</p>
      </div>

      {/* Used password reminder */}
      {usedPassword && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <label className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {t('upload.success.passwordLabel')}
            </label>
          </div>
          <div className="flex gap-2">
            <Input
              type={showUsedPassword ? 'text' : 'password'}
              value={usedPassword}
              readOnly
              className="flex-1 border-amber-200 dark:border-amber-700 font-mono"
            />
            <button
              onClick={() => setShowUsedPassword(v => !v)}
              className="px-3 py-2 border border-amber-200 dark:border-amber-700 bg-white dark:bg-gray-700 rounded-lg text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              title={showUsedPassword ? t('upload.form.hidePassword') : t('upload.form.showPassword')}
            >
              {showUsedPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(usedPassword);
                setUsedPasswordCopied(true);
                setTimeout(() => setUsedPasswordCopied(false), 2000);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              {usedPasswordCopied ? (
                <><CheckCircle className="w-4 h-4" />{t('common.copied')}</>
              ) : (
                <><Copy className="w-4 h-4" />{t('common.copy')}</>
              )}
            </button>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400">{t('upload.form.passwordWarning')}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          to="/dashboard"
          className="flex-1 px-6 py-2.5 bg-gradient-primary text-white rounded-lg hover:bg-gradient-primary-reverse transition-all shadow-md hover:shadow-lg font-medium text-center"
        >
          {t('upload.success.goToDashboard')}
        </Link>
        <button
          onClick={onUploadAnother}
          className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
        >
          {t('upload.success.uploadAnother')}
        </button>
      </div>
    </div>
  );
}
