import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { zip } from 'fflate';
import { sendApi, configApi } from '@/services/api.ts';
import { getApiErrorMessage } from '@/lib/errors';
import { generateKey, exportKeyToBase64, encryptFile, encryptText } from '@/lib/crypto.ts';
import { storeSendKey } from '@/lib/sendKeysDB.ts';

// Multi-file sends are zipped client-side before encryption.
// Above this threshold the browser risks running out of memory — split into multiple sends.
const MULTI_FILE_ZIP_SIZE_LIMIT = 150 * 1024 * 1024; // 150 MB

function zipFilesAsync(entries: Record<string, Uint8Array>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(entries, { level: 0 }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

export function useUploadForm() {
  const { t } = useTranslation();

  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [textContent, setTextContent] = useState('');
  const [hideByDefault, setHideByDefault] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sendName, setSendName] = useState('');
  const [maxDownloads, setMaxDownloads] = useState(5);
  const [expirationHours, setExpirationHours] = useState(24);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [usePassword, setUsePassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [requireSendPassword, setRequireSendPassword] = useState(false);
  const [passwordHasValue, setPasswordHasValue] = useState(false);
  const [usedPassword, setUsedPassword] = useState('');

  useEffect(() => {
    configApi.getSendPolicy().then(policy => {
      if (policy.requireSendPassword) {
        setRequireSendPassword(true);
        setUsePassword(true);
      }
    }).catch(() => { /* policy remains at default */ });
  }, []);

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    setError('');
    setActiveStep(1);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleTextNext = () => {
    if (!textContent.trim()) {
      setError(t('upload.textForm.empty'));
      return;
    }
    setError('');
    setActiveStep(1);
  };

  const handleUpload = async () => {
    const password = passwordRef.current?.value ?? '';
    if (usePassword && !password) {
      setError(t('upload.errors.enterPassword'));
      return;
    }
    if (usePassword && password) setUsedPassword(password);

    if (mode === 'file') {
      if (selectedFiles.length === 0) {
        setError(t('upload.errors.selectFile'));
        return;
      }
      if (selectedFiles.length > 1) {
        const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
        if (totalSize > MULTI_FILE_ZIP_SIZE_LIMIT) {
          setError(t('upload.errors.multiFileSizeLimit', { limit: Math.floor(MULTI_FILE_ZIP_SIZE_LIMIT / 1024 / 1024) }));
          return;
        }
      }
    } else {
      if (!textContent.trim()) {
        setError(t('upload.textForm.empty'));
        return;
      }
    }

    setUploading(true);
    setError('');
    setActiveStep(2);

    try {
      const encryptionKey = await generateKey();
      const keyBase64 = await exportKeyToBase64(encryptionKey);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);
      const year = expiresAt.getFullYear();
      const month = String(expiresAt.getMonth() + 1).padStart(2, '0');
      const day = String(expiresAt.getDate()).padStart(2, '0');
      const hours = String(expiresAt.getHours()).padStart(2, '0');
      const minutes = String(expiresAt.getMinutes()).padStart(2, '0');
      const seconds = String(expiresAt.getSeconds()).padStart(2, '0');
      const expiresAtStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

      const encryptedSendName = sendName
        ? await encryptText(sendName, encryptionKey)
        : undefined;

      if (mode === 'text') {
        const textBytes = new TextEncoder().encode(textContent);
        const textFile = new File([textBytes], 'text.txt', { type: 'text/plain' });
        const encryptedBlob = await encryptFile(textFile, encryptionKey);
        const encryptedFilename = await encryptText('text.txt', encryptionKey);
        const encryptedFile = new File([encryptedBlob], encryptedFilename, { type: 'application/octet-stream' });

        const send = await sendApi.createSend({
          name: encryptedSendName,
          type: 'TEXT' as const,
          expiresAt: expiresAtStr,
          maxDownloads,
          passwordProtected: usePassword,
          ...(usePassword && password ? { password } : {}),
        });
        await storeSendKey(send.id, keyBase64);
        await sendApi.uploadFile(send.id, encryptedFile);
        const hideParam = hideByDefault ? '?h=1' : '';
        setShareLink(`${window.location.origin}/download/${send.accessId}${hideParam}#${keyBase64}`);
        setActiveStep(3);
      } else {
        const send = await sendApi.createSend({
          name: encryptedSendName,
          type: 'FILE' as const,
          expiresAt: expiresAtStr,
          maxDownloads,
          passwordProtected: usePassword,
          ...(usePassword && password ? { password } : {}),
        });
        await storeSendKey(send.id, keyBase64);

        if (selectedFiles.length === 1) {
          const file = selectedFiles[0];
          const encryptedBlob = await encryptFile(file, encryptionKey);
          const encryptedFilename = await encryptText(file.name, encryptionKey);
          const encryptedFile = new File([encryptedBlob], encryptedFilename, { type: 'application/octet-stream' });
          await sendApi.uploadFile(send.id, encryptedFile);
        } else {
          const fileEntries: Record<string, Uint8Array> = {};
          for (const file of selectedFiles) {
            fileEntries[file.name] = new Uint8Array(await file.arrayBuffer());
          }
          const zipped = await zipFilesAsync(fileEntries);
          const zipBlob = new Blob([zipped.buffer as ArrayBuffer], { type: 'application/zip' });
          const zipFile = new File([zipBlob], 'archive.zip');
          const encryptedBlob = await encryptFile(zipFile, encryptionKey);
          const encryptedFilename = await encryptText('archive.zip', encryptionKey);
          const encryptedFile = new File([encryptedBlob], encryptedFilename, { type: 'application/octet-stream' });
          await sendApi.uploadFile(send.id, encryptedFile);
        }

        setShareLink(`${window.location.origin}/download/${send.accessId}#${keyBase64}`);
        setActiveStep(3);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t('upload.errors.uploadFailed')));
      setActiveStep(1);
    } finally {
      setUploading(false);
    }
  };

  // Go back to step 0 from config, clearing file selection (same as original behaviour)
  const goBack = () => {
    setSelectedFiles([]);
    setError('');
    setActiveStep(0);
  };

  const reset = () => {
    setActiveStep(0);
    setSelectedFiles([]);
    setShareLink('');
    setTextContent('');
    setHideByDefault(false);
    if (passwordRef.current) passwordRef.current.value = '';
    setUsePassword(false);
    setPasswordHasValue(false);
    setUsedPassword('');
    setError('');
  };

  return {
    mode, setMode,
    textContent, setTextContent,
    hideByDefault, setHideByDefault,
    activeStep,
    selectedFiles,
    removeFile,
    sendName, setSendName,
    maxDownloads, setMaxDownloads,
    expirationHours, setExpirationHours,
    passwordRef,
    usePassword, setUsePassword,
    uploading,
    error, setError,
    shareLink,
    requireSendPassword,
    passwordHasValue, setPasswordHasValue,
    usedPassword,
    handleFilesSelected,
    handleTextNext,
    handleUpload,
    goBack,
    reset,
  };
}
