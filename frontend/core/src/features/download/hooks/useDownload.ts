import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import type { SendResponse } from '@/services/api.ts';
import { sendApi } from '@/services/api.ts';
import { decryptBlob, decryptChunkedBlob, decryptText, importKeyFromBase64 } from '@/lib/crypto.ts';
import { getApiErrorMessage } from '@/lib/errors';

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
  const [downloadProgress, setDownloadProgress] = useState<{ phase: 'downloading' | 'decrypting'; percent: number } | null>(null);
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

  const handleDownload = async () => {
    if (!accessId) return;
    const encryptionKey = keyRef.current;
    if (!encryptionKey) { setError(t('download.errors.keyMissing')); return; }

    setDownloading(true);
    setDownloadProgress({ phase: 'downloading', percent: 0 });
    setError('');

    try {
      const password = passwordRef.current?.value || undefined;
      const encryptedBlob = await sendApi.downloadSend(
        accessId,
        password,
        (percent) => setDownloadProgress({ phase: 'downloading', percent }),
      );

      const chunkSize = sendInfo?.file?.chunkSize;
      const decrypt = async (blob: Blob): Promise<Blob> => {
        if (chunkSize) {
          setDownloadProgress({ phase: 'decrypting', percent: 0 });
          return decryptChunkedBlob(blob, encryptionKey, chunkSize, (percent) =>
            setDownloadProgress({ phase: 'decrypting', percent }),
          );
        }
        return decryptBlob(blob, encryptionKey);
      };

      if (sendInfo?.type === 'TEXT') {
        const plaintext = await (await decrypt(encryptedBlob)).text();
        setDecryptedText(plaintext);
      } else {
        const decrypted = await decrypt(encryptedBlob);
        const url = window.URL.createObjectURL(decrypted);
        const a = document.createElement('a');
        a.href = url;
        const encryptedFilename = sendInfo?.file?.filename;
        a.download = encryptedFilename ? (decryptedFilenames[encryptedFilename] || encryptedFilename) : 'download';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      await loadSendInfo();
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 403) {
        setError(t('download.errors.invalidPassword'));
      } else if (isAxiosError(err) && err.response?.status === 410) {
        setError(t('download.errors.expired'));
      } else if (err instanceof Error && (err.name === 'OperationError' || err.message?.includes('decrypt'))) {
        setError(t('download.errors.decryptionFailed'));
      } else {
        setError(getApiErrorMessage(err, t('download.errors.downloadFailed')));
      }
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
