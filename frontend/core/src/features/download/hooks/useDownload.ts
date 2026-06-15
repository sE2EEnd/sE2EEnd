import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import type { SendResponse } from '@/services/api.ts';
import { sendApi } from '@/services/api.ts';
import { decryptBlob, decryptChunkedBlob, decryptChunkedStream, decryptText, importKeyFromBase64 } from '@/lib/crypto.ts';
import { streamToDisk, supportsServiceWorkerStreaming } from '@/lib/streamDownload.ts';
import { getApiErrorMessage } from '@/lib/errors';

// Largest chunked file we'll decrypt fully in memory when streaming-to-disk is unavailable.
// Above this, holding the whole plaintext in RAM risks OOM, so we refuse with an honest
// message instead of crashing.
const IN_MEMORY_DOWNLOAD_LIMIT = 500 * 1024 * 1024;

export function useDownload() {
  const { t } = useTranslation();
  const { accessId } = useParams<{ accessId: string }>();
  const passwordRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef<CryptoKey | null>(null);
  const [sendInfo, setSendInfo] = useState<SendResponse | null>(null);
  const [decryptedSendName, setDecryptedSendName] = useState<string | null>(null);
  const [decryptedFilenames, setDecryptedFilenames] = useState<Record<string, string>>({});
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [hideText, setHideText] = useState(() => new URLSearchParams(window.location.search).get('h') === '1');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  // After the initial load (handled by loadSendInfo), clear any subsequent hash
  // that appears without a full page reload (e.g. user pastes the link again in the same tab)
  useEffect(() => {
    const clearHash = () => {
      if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };
    window.addEventListener('hashchange', clearHash);
    return () => window.removeEventListener('hashchange', clearHash);
  }, []);

  const loadSendInfo = useCallback(async () => {
    try {
      setLoading(true);
      const info = await sendApi.getSendInfo(accessId!);
      setSendInfo(info);

      const keyBase64 = window.location.hash.substring(1);
      if (keyBase64) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
        if (!keyRef.current) {
          try {
            keyRef.current = await importKeyFromBase64(keyBase64);
          } catch (e) {
            console.warn('Could not import encryption key:', e);
          }
        }
      }

      const encryptionKey = keyRef.current;
      if (encryptionKey) {
        if (info.name) {
          try {
            setDecryptedSendName(await decryptText(info.name, encryptionKey));
          } catch {
            console.warn('Could not decrypt send name, using encrypted value');
          }
        }
        if (info.type !== 'TEXT' && info.file) {
          try {
            setDecryptedFilenames({ [info.file.filename]: await decryptText(info.file.filename, encryptionKey) });
          } catch {
            setDecryptedFilenames({ [info.file.filename]: info.file.filename });
          }
        }
      }
      setError('');
    } catch (err) {
      setError(getApiErrorMessage(err, t('download.errors.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [accessId, t]);

  useEffect(() => {
    if (accessId) void loadSendInfo();
  }, [accessId, loadSendInfo]);

  const resolveFilename = useCallback((): string => {
    const encryptedFilename = sendInfo?.file?.filename;
    if (!encryptedFilename) return 'download';
    return decryptedFilenames[encryptedFilename] || encryptedFilename;
  }, [sendInfo, decryptedFilenames]);

  const reportDownloadError = useCallback((err: unknown) => {
    const status = (err as { status?: number })?.status
      ?? (isAxiosError(err) ? err.response?.status : undefined);
    if (status === 403) {
      setError(t('download.errors.invalidPassword'));
    } else if (status === 410) {
      setError(t('download.errors.expired'));
    } else if (err instanceof Error && (err.name === 'OperationError' || err.message?.includes('decrypt'))) {
      setError(t('download.errors.decryptionFailed'));
    } else {
      setError(getApiErrorMessage(err, t('download.errors.downloadFailed')));
    }
  }, [t]);

  const handleDownload = async () => {
    if (!accessId) return;
    const encryptionKey = keyRef.current;
    if (!encryptionKey) { setError(t('download.errors.keyMissing')); return; }

    const password = passwordRef.current?.value || undefined;
    const chunkSize = sendInfo?.file?.chunkSize;
    const isFile = sendInfo?.type !== 'TEXT';

    // Preferred path: stream chunked files straight to disk at constant RAM (all browsers
    // with a service worker + transferable streams). Fixes the Firefox large-download OOM.
    if (isFile && chunkSize && supportsServiceWorkerStreaming()) {
      setDownloading(true);
      setDownloadProgress(0);
      setError('');
      try {
        const { stream, encryptedSize } = await sendApi.downloadSendStream(accessId, password);
        let read = 0;
        const decrypted = decryptChunkedStream(stream, encryptionKey, chunkSize, (bytes) => {
          read += bytes;
          if (encryptedSize) setDownloadProgress(Math.min(99, Math.round((read / encryptedSize) * 100)));
        });
        // Resolves once the whole file has been decrypted and pumped to the download manager.
        await streamToDisk(decrypted, resolveFilename());
        setDownloadProgress(100);
        await loadSendInfo();
      } catch (err) {
        reportDownloadError(err);
      } finally {
        setDownloading(false);
        setDownloadProgress(null);
      }
      return;
    }

    // Fallback path: TEXT, non-chunked files, or browsers without streaming support.
    setDownloading(true);
    setDownloadProgress(0);
    setError('');
    try {
      if (isFile && chunkSize && (sendInfo?.file?.sizeBytes ?? 0) > IN_MEMORY_DOWNLOAD_LIMIT) {
        setError(t('download.errors.tooLargeNoStreaming'));
        return;
      }

      const encryptedBlob = await sendApi.downloadSend(accessId, password, setDownloadProgress);
      const decrypt = async (blob: Blob): Promise<Blob> =>
        chunkSize ? decryptChunkedBlob(blob, encryptionKey, chunkSize, setDownloadProgress)
                  : decryptBlob(blob, encryptionKey);

      if (!isFile) {
        const plaintext = await (await decrypt(encryptedBlob)).text();
        setDecryptedText(plaintext);
      } else {
        const decrypted = await decrypt(encryptedBlob);
        const url = window.URL.createObjectURL(decrypted);
        const a = document.createElement('a');
        a.href = url;
        a.download = resolveFilename();
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      await loadSendInfo();
    } catch (err) {
      reportDownloadError(err);
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  };

  return {
    sendInfo, decryptedSendName, decryptedFilenames,
    decryptedText, hideText, setHideText,
    passwordRef, loading, downloading, downloadProgress, error,
    handleDownload,
  };
}
