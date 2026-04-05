import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { zip } from 'fflate';

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
import {
  CloudUpload,
  Loader2,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Upload as UploadIcon,
  Shield,
  Clock,
  Download,
  Lock,
  Zap,
  CheckCircle,
  Copy,
  QrCode,
  FileText,
  Eye,
  EyeOff,
  Dices,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { isAxiosError } from 'axios';
import { sendApi, configApi } from '@/services/api.ts';
import { generateKey, exportKeyToBase64, encryptFile, encryptText } from '@/lib/crypto.ts';
import { storeSendKey } from '@/lib/sendKeysDB.ts';

import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function UploadPage() {
  const { t } = useTranslation();
  useNavigate();

  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [textContent, setTextContent] = useState('');
  const [hideText, setHideText] = useState(false);
  const [hideByDefault, setHideByDefault] = useState(false);

  const steps = [
    mode === 'file' ? t('upload.steps.selectFiles') : t('upload.steps.writeText'),
    t('upload.steps.configure'),
    t('upload.steps.upload'),
    t('upload.steps.share')
  ];
  const [activeStep, setActiveStep] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sendName, setSendName] = useState<string>('');
  const [maxDownloads, setMaxDownloads] = useState<number>(5);
  const [expirationHours, setExpirationHours] = useState<number>(24);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [usePassword, setUsePassword] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [shareLink, setShareLink] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [showQr, setShowQr] = useState<boolean>(false);
  const [requireSendPassword, setRequireSendPassword] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [passwordCopied, setPasswordCopied] = useState<boolean>(false);
  const [passwordHasValue, setPasswordHasValue] = useState<boolean>(false);
  const [usedPassword, setUsedPassword] = useState<string>('');
  const [showUsedPassword, setShowUsedPassword] = useState<boolean>(false);
  const [usedPasswordCopied, setUsedPasswordCopied] = useState<boolean>(false);

  const generatePassword = () => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const all = upper + lower + digits + symbols;

    const raw = new Uint32Array(20);
    window.crypto.getRandomValues(raw);

    // Guarantee at least one character from each class
    const chars: string[] = [
      upper[raw[0] % upper.length],
      lower[raw[1] % lower.length],
      digits[raw[2] % digits.length],
      symbols[raw[3] % symbols.length],
    ];
    for (let i = 4; i < 20; i++) {
      chars.push(all[raw[i] % all.length]);
    }

    // Fisher-Yates shuffle using fresh random values
    const shuffle = new Uint32Array(20);
    window.crypto.getRandomValues(shuffle);
    for (let i = chars.length - 1; i > 0; i--) {
      const j = shuffle[i] % (i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    const password = chars.join('');
    if (passwordRef.current) passwordRef.current.value = password;
    setPasswordHasValue(true);
  };

  useEffect(() => {
    configApi.getSendPolicy().then(policy => {
      if (policy.requireSendPassword) {
        setRequireSendPassword(true);
        setUsePassword(true);
      }
    }).catch(() => {/* ignore — policy remains at default */});
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFiles(Array.from(event.target.files));
      setError('');
      setActiveStep(1);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
      setError('');
      setActiveStep(1);
    }
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
      // Generate encryption key
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

      // Encrypt Send name if provided (zero-knowledge)
      const encryptedSendName = sendName
        ? await encryptText(sendName, encryptionKey)
        : undefined;

      if (mode === 'text') {
        // Convert text to a File, encrypt it client-side and upload like a regular file.
        // The backend stays agnostic — type: TEXT only tells the frontend to render as textarea.
        const textBytes = new TextEncoder().encode(textContent);
        const textFile = new File([textBytes], 'text.txt', { type: 'text/plain' });
        const encryptedBlob = await encryptFile(textFile, encryptionKey);
        const encryptedFilename = await encryptText('text.txt', encryptionKey);
        const encryptedFile = new File([encryptedBlob], encryptedFilename, {
          type: 'application/octet-stream',
        });

        const sendData = {
          name: encryptedSendName,
          type: 'TEXT' as const,
          expiresAt: expiresAtStr,
          maxDownloads: maxDownloads,
          passwordProtected: usePassword,
          ...(usePassword && password ? { password: password } : {}),
        };
        const send = await sendApi.createSend(sendData);
        await storeSendKey(send.id, keyBase64);
        await sendApi.uploadFile(send.id, encryptedFile);
        const hideParam = hideByDefault ? '?h=1' : '';
        const link = `${window.location.origin}/download/${send.accessId}${hideParam}#${keyBase64}`;
        setShareLink(link);
        setActiveStep(3);
      } else {
        const sendData = {
          name: encryptedSendName,
          type: 'FILE' as const,
          expiresAt: expiresAtStr,
          maxDownloads: maxDownloads,
          passwordProtected: usePassword,
          ...(usePassword && password ? { password: password } : {}),
        };

        // Create the Send container
        const send = await sendApi.createSend(sendData);

        // Store the encryption key locally for the owner to decrypt later
        await storeSendKey(send.id, keyBase64);

        // For multiple files: zip client-side first, then encrypt the zip as a single blob.
        if (selectedFiles.length === 1) {
          const file = selectedFiles[0];
          const encryptedBlob = await encryptFile(file, encryptionKey);
          const encryptedFilename = await encryptText(file.name, encryptionKey);
          const encryptedFile = new File([encryptedBlob], encryptedFilename, {
            type: 'application/octet-stream',
          });
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
          const encryptedFile = new File([encryptedBlob], encryptedFilename, {
            type: 'application/octet-stream',
          });
          await sendApi.uploadFile(send.id, encryptedFile);
        }

        // Create share link with encryption key in fragment
        const link = `${window.location.origin}/download/${send.accessId}#${keyBase64}`;
        setShareLink(link);
        setActiveStep(3);
      }
    } catch (err) {
      setError(isAxiosError(err) && err.response?.data?.message ? err.response.data.message : 'Upload failed. Please try again.');
      setActiveStep(1);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{t('upload.title')}</h1>
      </div>

      {/* Stepper */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center flex-1">
              {/* Step + Label */}
              <div className="flex flex-col items-center flex-shrink-0 min-w-0">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-medium transition-colors flex-shrink-0 ${
                    index < activeStep
                      ? 'bg-green-500 text-white'
                      : index === activeStep
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {index < activeStep ? '✓' : index + 1}
                </div>
                <span
                  className={`mt-2 text-[10px] sm:text-xs font-medium text-center leading-tight max-w-[64px] sm:max-w-[80px] ${
                    index <= activeStep ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {step}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 sm:mx-4 rounded transition-colors mb-6 ${
                    index < activeStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Form */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            {/* Step 1: Content Selection */}
            {activeStep === 0 && (
              <div className="space-y-4">
                {/* Mode Tabs */}
                <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <button
                    onClick={() => { setMode('file'); setError(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                      mode === 'file'
                        ? 'bg-primary text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <UploadIcon className="w-4 h-4" />
                    {t('upload.tabs.file')}
                  </button>
                  <button
                    onClick={() => { setMode('text'); setError(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                      mode === 'text'
                        ? 'bg-primary text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    {t('upload.tabs.text')}
                  </button>
                </div>

                {/* File mode — dropzone */}
                {mode === 'file' && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                      isDragging
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-primary hover:bg-primary/10'
                    }`}
                  >
                    {isDragging ? (
                      <div className="flex flex-col items-center">
                        <CloudUpload className="w-20 h-20 text-primary mb-4" />
                        <h3 className="text-xl font-semibold text-primary">{t('upload.dropZone.dropHere')}</h3>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <CloudUpload className="w-20 h-20 text-gray-400 dark:text-gray-500 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          {t('upload.dropZone.dragDrop')}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">{t('upload.dropZone.or')}</p>
                        <label className="px-6 py-2.5 bg-gradient-primary text-white rounded-lg hover:bg-gradient-primary-reverse transition-all shadow-md hover:shadow-lg font-medium cursor-pointer">
                          {t('upload.dropZone.browseFiles')}
                          <input type="file" multiple className="hidden" onChange={handleFileChange} />
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Text mode — textarea */}
                {mode === 'text' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <textarea
                        value={textContent}
                        onChange={e => setTextContent(e.target.value)}
                        placeholder={t('upload.textForm.placeholder')}
                        rows={8}
                        className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm ${
                          hideText ? 'text-transparent [text-shadow:0_0_8px_rgba(0,0,0,0.5)] select-none' : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setHideText(v => !v)}
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-white/80 dark:bg-gray-600/80 backdrop-blur-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-600 shadow-sm transition-all"
                        title={hideText ? t('upload.textForm.showText') : t('upload.textForm.hideText')}
                      >
                        {hideText ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {t('upload.textForm.summary', { count: textContent.length })}
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer w-fit">
                      <input
                        type="checkbox"
                        checked={hideByDefault}
                        onChange={e => setHideByDefault(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 dark:border-gray-600 rounded focus:ring-primary"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t('upload.textForm.hideByDefault')}</span>
                    </label>

                    {error && (
                      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium">{error}</span>
                      </div>
                    )}

                    <button
                      onClick={handleTextNext}
                      className="w-full px-6 py-2.5 bg-gradient-primary text-white rounded-lg hover:bg-gradient-primary-reverse transition-all shadow-md hover:shadow-lg font-medium"
                    >
                      {t('upload.steps.configure')} →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Configuration */}
            {activeStep === 1 && (
              <div className="space-y-6">
                {/* Content summary */}
                {mode === 'file' && selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('upload.form.selectedFiles')} ({selectedFiles.length})
                    </h3>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <UploadIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {mode === 'text' && (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('upload.textForm.summary', { count: textContent.length })}
                    </p>
                  </div>
                )}

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* Send Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('upload.form.sendName')}
                    </label>
                    <Input
                      type="text"
                      value={sendName}
                      onChange={(e) => setSendName(e.target.value)}
                      placeholder={t('upload.form.sendNamePlaceholder')}
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {t('upload.form.sendNameHelp')}
                    </p>
                  </div>

                  {/* Max Downloads */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('upload.form.maxDownloads')}
                    </label>
                    <Input
                      type="number"
                      value={maxDownloads}
                      onChange={(e) => setMaxDownloads(parseInt(e.target.value) || 1)}
                      min="1"
                      max="50"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {t('upload.form.maxDownloadsHelp')}
                    </p>
                  </div>

                  {/* Expiration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('upload.form.expiration')}
                    </label>
                    <Input
                      type="number"
                      value={expirationHours}
                      onChange={(e) => setExpirationHours(parseInt(e.target.value) || 1)}
                      min="1"
                      max="168"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('upload.form.expirationHelp')}</p>
                  </div>

                  {/* Password Protection */}
                  <div className="pt-2">
                    <label className={`flex items-center gap-3 ${requireSendPassword ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={usePassword}
                        onChange={(e) => { if (!requireSendPassword) setUsePassword(e.target.checked); }}
                        disabled={requireSendPassword}
                        className="w-4 h-4 text-primary border-gray-300 dark:border-gray-600 rounded focus:ring-primary disabled:opacity-60"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('upload.form.passwordProtect')}
                        {requireSendPassword && (
                          <span className="ml-2 text-xs text-orange-600 font-normal">({t('upload.form.passwordRequired')})</span>
                        )}
                      </span>
                    </label>
                  </div>

                  {usePassword && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('upload.form.password')}</label>
                        <div className="relative flex items-center">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            ref={passwordRef}
                            autoComplete="new-password"
                            placeholder={t('upload.form.passwordPlaceholder')}
                            onChange={e => setPasswordHasValue(e.target.value.length > 0)}
                            className="pr-24"
                          />
                          <div className="absolute right-2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={generatePassword}
                              title={t('upload.form.generatePassword')}
                              className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"
                            >
                              <Dices className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowPassword(v => !v)}
                              title={showPassword ? t('upload.form.hidePassword') : t('upload.form.showPassword')}
                              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const val = passwordRef.current?.value ?? '';
                                if (!val) return;
                                navigator.clipboard.writeText(val);
                                setPasswordCopied(true);
                                setTimeout(() => setPasswordCopied(false), 2000);
                              }}
                              title={t('upload.form.copyPassword')}
                              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"
                            >
                              {passwordCopied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {t('upload.form.passwordHelp')}
                        </p>
                        <Alert className={`mt-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 animate-in fade-in slide-in-from-top-2 ${passwordHasValue ? 'block' : 'hidden'}`}>
                          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <AlertTitle>{t('upload.form.passwordWarningTitle')}</AlertTitle>
                          <AlertDescription>
                            {t('upload.form.passwordWarning')}
                          </AlertDescription>
                        </Alert>
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm font-medium">{error}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setSelectedFiles([]);
                        setActiveStep(0);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      {t('common.back')}
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="flex-1 px-6 py-2.5 bg-gradient-primary text-white rounded-lg hover:bg-gradient-primary-reverse transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('common.upload')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Uploading */}
            {activeStep === 2 && (
              <div className="text-center py-12">
                <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {mode === 'text' ? t('upload.uploading.titleText') : t('upload.uploading.title')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {mode === 'text' ? t('upload.uploading.messageText') : t('upload.uploading.message')}
                </p>
              </div>
            )}

            {/* Step 4: Success - Share Link */}
            {activeStep === 3 && shareLink && (
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
                        <QRCodeCanvas
                          value={shareLink}
                          size={200}
                          level="H"
                          marginSize={4}
                        />
                      </div>
                      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 text-center">
                        {t('upload.success.qrCodeDesc')}
                      </p>
                    </>
                  )}
                </div>

                <div className="p-4 bg-primary rounded-lg">
                  <label className="block text-sm font-medium text-white mb-2">
                    {t('upload.success.shareLink')}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareLink);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          {t('common.copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          {t('common.copy')}
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-white">
                    {t('dashboard.warningKey')}
                  </p>
                </div>

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
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {t('upload.form.passwordWarning')}
                    </p>
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
                    onClick={() => {
                      setActiveStep(0);
                      setSelectedFiles([]);
                      setShareLink('');
                      setTextContent('');
                      setHideText(false);
                      setHideByDefault(false);
                      if (passwordRef.current) passwordRef.current.value = '';
                      setUsePassword(false);
                      setShowPassword(false);
                      setPasswordHasValue(false);
                      setUsedPassword('');
                      setShowUsedPassword(false);
                    }}
                    className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                  >
                    {t('upload.success.uploadAnother')}
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Security Features */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('upload.security.title')}</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('upload.security.endToEnd')}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{t('upload.security.endToEndDesc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('upload.security.zeroKnowledge')}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{t('upload.security.zeroKnowledgeDesc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('upload.security.autoDeletion')}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{t('upload.security.autoDeletionDesc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('upload.security.passwordProtection')}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{t('upload.security.passwordProtectionDesc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Download className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('upload.security.downloadLimits')}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{t('upload.security.downloadLimitsDesc')}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
