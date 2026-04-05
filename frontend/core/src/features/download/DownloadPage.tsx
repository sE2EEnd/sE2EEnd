import {useCallback, useEffect, useRef, useState} from 'react';
import {useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {isAxiosError} from 'axios';
import {AlertCircle, ArrowDownToLine, Check, Clock, Copy, Download, Eye, EyeOff, FileText, Loader2, Shield, QrCode} from 'lucide-react';
import {QRCodeCanvas} from 'qrcode.react';
import type {SendResponse} from '@/services/api.ts';
import {sendApi} from '@/services/api.ts';
import {decryptBlob, decryptText, importKeyFromBase64} from '@/lib/crypto.ts';
import { Input } from '@/components/ui/input';

function DownloadPage() {
  const { t } = useTranslation();
  const { accessId } = useParams<{ accessId: string }>();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [sendInfo, setSendInfo] = useState<SendResponse | null>(null);
  const [decryptedSendName, setDecryptedSendName] = useState<string | null>(null);
  const [decryptedFilenames, setDecryptedFilenames] = useState<Record<string, string>>({});
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [hideText, setHideText] = useState(() => new URLSearchParams(window.location.search).get('h') === '1');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showQr, setShowQr] = useState<boolean>(false);

  const loadSendInfo = useCallback(async () => {
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
            } catch {
              // Name might not be encrypted (old send), just ignore
              console.warn('Could not decrypt send name, using encrypted value');
            }
          }

          // Decrypt file name
          if (info.type !== 'TEXT' && info.file) {
            try {
              const decrypted = await decryptText(info.file.filename, encryptionKey);
              setDecryptedFilenames({ [info.file.filename]: decrypted });
            } catch {
              setDecryptedFilenames({ [info.file.filename]: info.file.filename });
            }
          }
        } catch (e) {
          console.warn('Could not decrypt names:', e);
        }
      }

      setError('');
    } catch (err) {
      setError(isAxiosError(err) && err.response?.data?.message ? err.response.data.message : t('download.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [accessId, t]);

  useEffect(() => {
    if (accessId) {
      loadSendInfo();
    }
  }, [accessId, loadSendInfo]);

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

      // Download encrypted content
      const password = passwordRef.current?.value || undefined;
      const encryptedBlob = await sendApi.downloadSend(accessId, password);

      if (sendInfo?.type === 'TEXT') {
        // For text sends: decrypt the blob then read it as a string
        const decryptedBlob = await decryptBlob(encryptedBlob, encryptionKey);
        const plaintext = await decryptedBlob.text();
        setDecryptedText(plaintext);
      } else {
        // For file sends: decrypt blob and trigger browser download
        const decryptedBlob = await decryptBlob(encryptedBlob, encryptionKey);

        const url = window.URL.createObjectURL(decryptedBlob);
        const a = document.createElement('a');
        a.href = url;

        // Use decrypted filename if available, otherwise fall back to encrypted name or default
        const encryptedFilename = sendInfo?.file?.filename;
        a.download = encryptedFilename
            ? (decryptedFilenames[encryptedFilename] || encryptedFilename)
            : 'download';

        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      // Reload info to update download count
      await loadSendInfo();
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 403) {
        setError(t('download.errors.invalidPassword'));
      } else if (isAxiosError(err) && err.response?.status === 410) {
        setError(t('download.errors.expired'));
      } else if (err instanceof Error && (err.name === 'OperationError' || err.message?.includes('decrypt'))) {
        setError(t('download.errors.decryptionFailed'));
      } else {
        setError(isAxiosError(err) && err.response?.data?.message ? err.response.data.message : t('download.errors.downloadFailed'));
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

  const isText = sendInfo?.type === 'TEXT';

  return (
    <div className="min-h-screen bg-gradient-to-br bg-gradient-to-br-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">sE2EEnd</h1>
          <p className="text-xl text-blue-100">{t('download.title')}</p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          {sendInfo ? (
            <div className="space-y-6">
              {/* Send Name (if available) */}
              {decryptedSendName && (
                <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{decryptedSendName}</h2>
                </div>
              )}

              {/* File name (FILE sends only) */}
              {!isText && sendInfo.file && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('download.file')} :</p>
                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    📄 {decryptedFilenames[sendInfo.file.filename] || sendInfo.file.filename}
                  </div>
                </div>
              )}

              {/* Text type indicator (before reveal) */}
              {isText && decryptedText === null && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">{t('download.textContent')}</p>
                </div>
              )}

              {/* Decrypted text area */}
              {isText && decryptedText !== null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('download.textContent')}</label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(decryptedText);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-xs font-medium"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? t('common.copied') : t('common.copy')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setHideText(v => !v)}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-xs font-medium"
                      >
                        {hideText ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {hideText ? t('download.showText') : t('download.hideText')}
                      </button>
                    </div>
                  </div>
                  <textarea
                    readOnly
                    value={decryptedText}
                    rows={6}
                    className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-gray-100 font-mono text-sm resize-none focus:outline-none ${
                      hideText ? 'text-transparent [text-shadow:0_0_8px_rgba(0,0,0,0.5)] select-none' : ''
                    }`}
                  />
                </div>
              )}

              {/* Send Info */}
              <div className="p-4 bg-primary rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm text-white">
                  <ArrowDownToLine className="w-4 h-4 text-white" />
                  <span>
                    <strong>{t('download.downloads')}:</strong> {sendInfo.downloadCount} / {sendInfo.maxDownloads}
                  </span>
                </div>
                {sendInfo.expiresAt && (
                  <div className="flex items-center gap-2 text-sm text-white">
                    <Clock className="w-4 h-4 text-white" />
                    <span>
                      <strong>{t('download.expires')}:</strong> {new Date(sendInfo.expiresAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* QR Code */}
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
                      <QRCodeCanvas
                        value={window.location.href}
                        size={160}
                        level="H"
                        marginSize={4}
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 text-center">
                      {t('download.qrCodeDesc')}
                    </p>
                  </>
                )}
              </div>

              {/* Password Input */}
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

              {/* Error Alert */}
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleDownload}
                disabled={downloading || sendInfo.downloadCount >= sendInfo.maxDownloads || (isText && decryptedText !== null)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-primary text-white text-lg font-semibold rounded-lg hover:bg-gradient-primary-reverse transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed "
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

              {/* Download Limit Warning */}
              {sendInfo.downloadCount >= sendInfo.maxDownloads && (
                <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-orange-800 dark:text-orange-300">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {t('download.errors.limitReached')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Error State */
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300">
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
