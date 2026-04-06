import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import type { SendResponse } from '@/services/api.ts';
import { sendApi } from '@/services/api.ts';
import { decryptBlob, decryptText, importKeyFromBase64 } from '@/lib/crypto.ts';
import { getApiErrorMessage } from '@/lib/errors';

export function useDownload() {
  const { t } = useTranslation();
  const { accessId } = useParams<{ accessId: string }>();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [sendInfo, setSendInfo] = useState<SendResponse | null>(null);
  const [decryptedSendName, setDecryptedSendName] = useState<string | null>(null);
  const [decryptedFilenames, setDecryptedFilenames] = useState<Record<string, string>>({});
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [hideText, setHideText] = useState(() => new URLSearchParams(window.location.search).get('h') === '1');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const loadSendInfo = useCallback(async () => {
    try {
      setLoading(true);
      const info = await sendApi.getSendInfo(accessId!);
      setSendInfo(info);

      const keyBase64 = window.location.hash.substring(1);
      if (keyBase64) {
        try {
          const encryptionKey = await importKeyFromBase64(keyBase64);
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
        } catch (e) {
          console.warn('Could not decrypt names:', e);
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
    const keyBase64 = window.location.hash.substring(1);
    if (!keyBase64) { setError(t('download.errors.keyMissing')); return; }

    setDownloading(true);
    setError('');

    try {
      const encryptionKey = await importKeyFromBase64(keyBase64);
      const password = passwordRef.current?.value || undefined;
      const encryptedBlob = await sendApi.downloadSend(accessId, password);

      if (sendInfo?.type === 'TEXT') {
        const plaintext = await (await decryptBlob(encryptedBlob, encryptionKey)).text();
        setDecryptedText(plaintext);
      } else {
        const decrypted = await decryptBlob(encryptedBlob, encryptionKey);
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
    }
  };

  return {
    sendInfo, decryptedSendName, decryptedFilenames,
    decryptedText, hideText, setHideText,
    passwordRef, loading, downloading, error,
    handleDownload,
  };
}
