import {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {AlertCircle, ArrowDownToLine, Clock, Download, Loader2, Shield, QrCode} from 'lucide-react';
import {QRCodeCanvas} from 'qrcode.react';
import type {SendResponse} from '../../services/api';
import {sendApi} from '../../services/api';
import {decryptBlob, decryptText, importKeyFromBase64} from '../../lib/crypto';

function DownloadPage() {
  const { t } = useTranslation();
  const { accessId } = useParams<{ accessId: string }>();
  const [password, setPassword] = useState<string>('');
  const [sendInfo, setSendInfo] = useState<SendResponse | null>(null);
  const [decryptedSendName, setDecryptedSendName] = useState<string | null>(null);
  const [decryptedFilenames, setDecryptedFilenames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (accessId) {
      loadSendInfo();
    }
  }, [accessId]);

  const loadSendInfo = async () => {
    try {
      setLoading(true);
      const info = await sendApi.getSendInfo(accessId!);
      setSendInfo(info);

      // Try to decrypt names if we have the key
      const keyBase64 = window.location.hash.substring(1);
      if (keyBase64) {
        try {
          const encryptionKey = await importKeyFromBase64(keyBase64);

          // Decrypt Send name
          if (info.name) {
            try {
              const decrypted = await decryptText(info.name, encryptionKey);
              setDecryptedSendName(decrypted);
            } catch (e) {
              // Name might not be encrypted (old send), just ignore
              console.warn('Could not decrypt send name, using encrypted value');
            }
          }

          // Decrypt file names
          const decryptedNames: Record<string, string> = {};
          for (const file of info.files || []) {
            try {
              decryptedNames[file.filename] = await decryptText(file.filename, encryptionKey);
            } catch (e) {
              // Filename might not be encrypted (old send), use as is
              decryptedNames[file.filename] = file.filename;
            }
          }
          setDecryptedFilenames(decryptedNames);
        } catch (e) {
          console.warn('Could not decrypt names:', e);
        }
      }

      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || t('download.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!accessId) return;

    // Extract encryption key from URL fragment
    const keyBase64 = window.location.hash.substring(1); // Remove #
    if (!keyBase64) {
      setError(t('download.errors.keyMissing'));
      return;
    }

    setDownloading(true);
    setError('');

    try {
      // Import encryption key
      const encryptionKey = await importKeyFromBase64(keyBase64);

      // Download encrypted file
      const encryptedBlob = await sendApi.downloadSend(accessId, password || undefined);

      // Decrypt file
      const decryptedBlob = await decryptBlob(encryptedBlob, encryptionKey);

      // Create download link with decrypted filename
      const url = window.URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a');
      a.href = url;

      // Use decrypted filename if available, otherwise fall back to encrypted name or default
      const encryptedFilename = sendInfo?.files?.[0]?.filename;
      a.download = encryptedFilename
          ? (decryptedFilenames[encryptedFilename] || encryptedFilename)
          : 'download.zip';

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Reload info to update download count
      await loadSendInfo();
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError(t('download.errors.invalidPassword'));
      } else if (err.response?.status === 410) {
        setError(t('download.errors.expired'));
      } else if (err.name === 'OperationError' || err.message?.includes('decrypt')) {
        setError(t('download.errors.decryptionFailed'));
      } else {
        setError(err.response?.data?.message || t('download.errors.downloadFailed'));
      }
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br bg-gradient-to-br-primary flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br bg-gradient-to-br-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">sE2EEnd</h1>
          <p className="text-xl text-blue-100">{t('download.title')}</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {sendInfo ? (
            <div className="space-y-6">
              {/* Send Name (if available) */}
              {decryptedSendName && (
                <div className="text-center pb-4 border-b border-gray-200">
                  <h2 className="text-2xl font-semibold text-gray-900">{decryptedSendName}</h2>
                </div>
              )}

              {/* File List */}
              {sendInfo.files && sendInfo.files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    {sendInfo.files.length === 1 ? t('download.file') : t('download.files')} ({sendInfo.files.length}):
                  </p>
                  <div className="space-y-1">
                    {sendInfo.files.map((file, index) => (
                      <div key={index} className="text-sm text-gray-600 truncate">
                        📄 {decryptedFilenames[file.filename] || file.filename}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Send Info */}
              <div className="p-4 bg-primary bg-opacity-10 border border-primary border-opacity-30 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <ArrowDownToLine className="w-4 h-4 text-primary" />
                  <span>
                    <strong>{t('download.downloads')}:</strong> {sendInfo.downloadCount} / {sendInfo.maxDownloads}
                  </span>
                </div>
                {sendInfo.expiresAt && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>
                      <strong>{t('download.expires')}:</strong> {new Date(sendInfo.expiresAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <QrCode className="w-4 h-4 text-gray-700" />
                  <h4 className="text-sm font-semibold text-gray-900">{t('download.qrCode')}</h4>
                </div>
                <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                  <QRCodeCanvas
                    value={window.location.href}
                    size={160}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-600 text-center">
                  {t('download.qrCodeDesc')}
                </p>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('download.password')}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('download.passwordPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Error Alert */}
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              {/* Download Button */}
              <button
                onClick={handleDownload}
                disabled={downloading || sendInfo.downloadCount >= sendInfo.maxDownloads}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-primary text-white text-lg font-semibold rounded-lg hover:bg-gradient-primary-reverse transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed "
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('download.downloading')}
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    {t('download.downloadFile')}
                  </>
                )}
              </button>

              {/* Download Limit Warning */}
              {sendInfo.downloadCount >= sendInfo.maxDownloads && (
                <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t('download.errors.limitReached')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Error State */
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{error || t('download.errors.sendNotFound')}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-6 text-sm text-blue-100">
          <Shield className="w-4 h-4" />
          <span>{t('download.footer')}</span>
        </div>
      </div>
    </div>
  );
}

export default DownloadPage;
