import { AlertCircle, Download, FileText, Loader2, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { useDownload } from './hooks/useDownload';
import SendMetaPanel from './components/SendMetaPanel';
import DecryptedTextViewer from './components/DecryptedTextViewer';
import DownloadQrCode from './components/DownloadQrCode';

function DownloadPage() {
  const { t } = useTranslation();
  const {
    sendInfo, decryptedSendName, decryptedFilenames,
    decryptedText, hideText, setHideText,
    passwordRef, loading, downloading, error,
    handleDownload,
  } = useDownload();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br bg-gradient-to-br-primary flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-white animate-spin" />
      </div>
    );
  }

  const isText = sendInfo?.type === 'TEXT';

  return (
    <div className="min-h-screen bg-gradient-to-br bg-gradient-to-br-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">sE2EEnd</h1>
          <p className="text-xl text-blue-100">{t('download.title')}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          {sendInfo ? (
            <div className="space-y-6">
              {decryptedSendName && (
                <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{decryptedSendName}</h2>
                </div>
              )}

              {!isText && sendInfo.file && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('download.file')} :</p>
                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    📄 {decryptedFilenames[sendInfo.file.filename] || sendInfo.file.filename}
                  </div>
                </div>
              )}

              {isText && decryptedText === null && (
                <Alert variant="info">
                  <FileText className="w-5 h-5" />
                  <span className="text-sm font-medium">{t('download.textContent')}</span>
                </Alert>
              )}

              {isText && decryptedText !== null && (
                <DecryptedTextViewer text={decryptedText} hideText={hideText} setHideText={setHideText} />
              )}

              <SendMetaPanel
                downloadCount={sendInfo.downloadCount}
                maxDownloads={sendInfo.maxDownloads}
                expiresAt={sendInfo.expiresAt}
              />

              <DownloadQrCode />

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('download.password')}
                </label>
                <Input
                  id="password"
                  type="password"
                  ref={passwordRef}
                  autoComplete="current-password"
                  placeholder={t('download.passwordPlaceholder')}
                />
              </div>

              {error && (
                <Alert variant="error">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{error}</span>
                </Alert>
              )}

              <button
                onClick={handleDownload}
                disabled={downloading || sendInfo.downloadCount >= sendInfo.maxDownloads || (isText && decryptedText !== null)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-primary text-white text-lg font-semibold rounded-lg hover:bg-gradient-primary-reverse transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isText ? t('download.viewing') : t('download.downloading')}
                  </>
                ) : isText ? (
                  <>
                    <FileText className="w-5 h-5" />
                    {t('download.viewText')}
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    {t('download.downloadFile')}
                  </>
                )}
              </button>

              {sendInfo.downloadCount >= sendInfo.maxDownloads && (
                <Alert variant="warning">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{t('download.errors.limitReached')}</span>
                </Alert>
              )}
            </div>
          ) : (
            <Alert variant="error">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{error || t('download.errors.sendNotFound')}</span>
            </Alert>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-sm text-blue-100">
          <Shield className="w-4 h-4" />
          <span>{t('download.footer')}</span>
        </div>
      </div>
    </div>
  );
}

export default DownloadPage;
