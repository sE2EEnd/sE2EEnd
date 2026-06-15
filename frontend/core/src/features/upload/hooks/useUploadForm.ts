import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Zip, ZipPassThrough } from 'fflate';
import { sendApi, configApi } from '@/services/api.ts';
import { getApiErrorMessage } from '@/lib/errors';
import { generateKey, exportKeyToBase64, encryptFile, encryptChunk, encryptText } from '@/lib/crypto.ts';
import { storeSendKey } from '@/lib/sendKeysDB.ts';

const CHUNK_SIZE = 25 * 1024 * 1024; // 25 MB plaintext per chunk

// True pipeline: streams a multi-file zip via fflate and calls onChunk for each
// CHUNK_SIZE block as soon as it's ready, without buffering the full archive.
// Backpressure via `await pending` ensures at most one chunk is in-flight at a time.
// Peak RAM: ~2×CHUNK_SIZE (one source slice being read + one chunk being processed).
// Returns the actual number of chunks emitted.
function pipeZipChunks(
  files: File[],
  chunkSize: number,
  onChunk: (chunk: Uint8Array, index: number) => Promise<void>,
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    let pieces: Uint8Array[] = [];
    let pieceSize = 0;
    let chunkIndex = 0;
    let pending = Promise.resolve<void>(undefined);

    const flushChunk = () => {
      const merged = new Uint8Array(pieceSize);
      let pos = 0;
      for (const p of pieces) { merged.set(p, pos); pos += p.length; }
      pieces = [];
      pieceSize = 0;
      const idx = chunkIndex++;
      pending = pending.then(() => onChunk(merged, idx));
    };

    const zipStream = new Zip((err, data, final) => {
      if (err) { reject(err); return; }
      let offset = 0;
      while (offset < data.length) {
        const space = chunkSize - pieceSize;
        const piece = data.subarray(offset, offset + space);
        pieces.push(piece);
        pieceSize += piece.length;
        offset += piece.length;
        if (pieceSize >= chunkSize) flushChunk();
      }
      if (final) {
        if (pieceSize > 0) flushChunk();
        pending.then(() => resolve(chunkIndex)).catch(reject);
      }
    });

    (async () => {
      for (const file of files) {
        const entry = new ZipPassThrough(file.name);
        zipStream.add(entry);
        let offset = 0;
        while (offset < file.size) {
          const end = Math.min(offset + chunkSize, file.size);
          const data = new Uint8Array(await file.slice(offset, end).arrayBuffer());
          entry.push(data, end >= file.size);
          offset = end;
          await pending; // backpressure: don't read next slice until previous chunk is uploaded
        }
      }
      zipStream.end();
    })().catch(reject);
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
  const [uploadProgress, setUploadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [requireSendPassword, setRequireSendPassword] = useState(false);
  const [maxUploadSizeBytes, setMaxUploadSizeBytes] = useState(0);
  const [passwordHasValue, setPasswordHasValue] = useState(false);
  const [usedPassword, setUsedPassword] = useState('');

  useEffect(() => {
    configApi.getSendPolicy().then(policy => {
      if (policy.requireSendPassword) {
        setRequireSendPassword(true);
        setUsePassword(true);
      }
      setMaxUploadSizeBytes(policy.maxUploadSizeBytes ?? 0);
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
      if (maxUploadSizeBytes > 0) {
        const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
        if (totalSize > maxUploadSizeBytes) {
          const limitMb = Math.round(maxUploadSizeBytes / (1024 * 1024));
          const limitLabel = limitMb >= 1024 ? `${(limitMb / 1024).toFixed(1)} GB` : `${limitMb} MB`;
          setError(t('upload.errors.fileSizeLimit', { limit: limitLabel }));
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
          // Truly streaming: slice → encrypt → upload one chunk at a time, ~5 MB peak RAM
          const file = selectedFiles[0];
          const encryptedFilename = await encryptText(file.name, encryptionKey);
          const { sessionId } = await sendApi.initChunkedUpload(send.id, encryptedFilename);
          const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
          setUploadProgress({ loaded: 0, total: totalChunks });
          for (let i = 0, offset = 0; offset < file.size; i++, offset += CHUNK_SIZE) {
            const data = await file.slice(offset, Math.min(offset + CHUNK_SIZE, file.size)).arrayBuffer();
            const encrypted = await encryptChunk(data, encryptionKey);
            await sendApi.uploadChunk(sessionId, i, encrypted);
            setUploadProgress({ loaded: i + 1, total: totalChunks });
          }
          setFinalizing(true);
          await sendApi.completeChunkedUpload(sessionId, totalChunks, CHUNK_SIZE);
        } else {
          // Multi-file: true pipeline zip → encrypt → upload, one chunk at a time.
          // ZipPassThrough = no compression, so output ≈ input — safe estimate for the progress bar.
          const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
          const estimatedChunks = Math.ceil(totalSize / CHUNK_SIZE);
          const encryptedFilename = await encryptText('archive.zip', encryptionKey);
          const { sessionId } = await sendApi.initChunkedUpload(send.id, encryptedFilename);
          setUploadProgress({ loaded: 0, total: estimatedChunks });
          const actualChunks = await pipeZipChunks(selectedFiles, CHUNK_SIZE, async (chunk, i) => {
            const encrypted = await encryptChunk(chunk.buffer as ArrayBuffer, encryptionKey);
            await sendApi.uploadChunk(sessionId, i, encrypted);
            setUploadProgress({ loaded: i + 1, total: Math.max(estimatedChunks, i + 1) });
          });
          setFinalizing(true);
          await sendApi.completeChunkedUpload(sessionId, actualChunks, CHUNK_SIZE);
        }

        setShareLink(`${window.location.origin}/download/${send.accessId}#${keyBase64}`);
        setActiveStep(3);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t('upload.errors.uploadFailed')));
      setActiveStep(1);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      setFinalizing(false);
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
    setUploadProgress(null);
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
    uploadProgress,
    finalizing,
    error, setError,
    shareLink,
    requireSendPassword,
    maxUploadSizeBytes,
    passwordHasValue, setPasswordHasValue,
    usedPassword,
    handleFilesSelected,
    handleTextNext,
    handleUpload,
    goBack,
    reset,
  };
}
