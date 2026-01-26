import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CloudUpload,
  Loader2,
  AlertCircle,
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
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { sendApi } from '../../services/api';
import { generateKey, exportKeyToBase64, encryptFile, encryptText } from '../../lib/crypto';
import { storeSendKey } from '../../lib/sendKeysDB';

export default function UploadPage() {
  const { t } = useTranslation();
  useNavigate();
  const steps = [
    t('upload.steps.selectFiles'),
    t('upload.steps.configure'),
    t('upload.steps.upload'),
    t('upload.steps.share')
  ];
  const [activeStep, setActiveStep] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sendName, setSendName] = useState<string>('');
  const [maxDownloads, setMaxDownloads] = useState<number>(5);
  const [expirationHours, setExpirationHours] = useState<number>(24);
  const [password, setPassword] = useState<string>('');
  const [usePassword, setUsePassword] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [shareLink, setShareLink] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

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

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError(t('upload.errors.selectFile'));
      return;
    }

    if (usePassword && !password) {
      setError(t('upload.errors.enterPassword'));
      return;
    }

    setUploading(true);
    setError('');
    setActiveStep(2);

    try {
      // Generate encryption key (same key for all files)
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

      // Upload all files to the same Send
      for (const file of selectedFiles) {
        // Encrypt file content
        const encryptedBlob = await encryptFile(file, encryptionKey);

        // Encrypt filename (zero-knowledge)
        const encryptedFilename = await encryptText(file.name, encryptionKey);

        const encryptedFile = new File([encryptedBlob], encryptedFilename, {
          type: 'application/octet-stream',
        });

        await sendApi.uploadFile(send.id, encryptedFile);
      }

      // Create share link with encryption key in fragment
      const link = `${window.location.origin}/download/${send.accessId}#${keyBase64}`;
      setShareLink(link);
      setActiveStep(3);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
      setActiveStep(1);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900">{t('upload.title')}</h1>
      </div>

      {/* Stepper */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                    index < activeStep
                      ? 'bg-green-500 text-white'
                      : index === activeStep
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {index < activeStep ? '✓' : index + 1}
                </div>
                <span
                  className={`mt-2 text-sm font-medium ${
                    index <= activeStep ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {step}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-4 rounded transition-colors ${
                    index < activeStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Step 1: File Selection */}
            {activeStep === 0 && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-primary bg-primary bg-opacity-10'
                    : 'border-gray-300 bg-gray-50 hover:border-primary hover:bg-primary hover:bg-opacity-10'
                }`}
              >
                {isDragging ? (
                  <div className="flex flex-col items-center">
                    <CloudUpload className="w-20 h-20 text-primary mb-4" />
                    <h3 className="text-xl font-semibold text-primary">{t('upload.dropZone.dropHere')}</h3>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <CloudUpload className="w-20 h-20 text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {t('upload.dropZone.dragDrop')}
                    </h3>
                    <p className="text-gray-600 mb-6">{t('upload.dropZone.or')}</p>
                    <label className="px-6 py-2.5 bg-gradient-primary text-white rounded-lg hover:bg-gradient-primary-reverse transition-all shadow-md hover:shadow-lg font-medium cursor-pointer">
                      {t('upload.dropZone.browseFiles')}
                      <input type="file" multiple className="hidden" onChange={handleFileChange} />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Configuration */}
            {activeStep === 1 && selectedFiles.length > 0 && (
              <div className="space-y-6">
                {/* Selected Files List */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">
                    {t('upload.form.selectedFiles')} ({selectedFiles.length})
                  </h3>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-4 bg-primary bg-opacity-10 border border-primary border-opacity-30 rounded-lg">
                      <UploadIcon className="w-5 h-5 text-primary-dark flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">{file.name}</p>
                        <p className="text-xs text-primary-dark">
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

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* Send Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('upload.form.sendName')}
                    </label>
                    <input
                      type="text"
                      value={sendName}
                      onChange={(e) => setSendName(e.target.value)}
                      placeholder={t('upload.form.sendNamePlaceholder')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      {t('upload.form.sendNameHelp')}
                    </p>
                  </div>

                  {/* Max Downloads */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('upload.form.maxDownloads')}
                    </label>
                    <input
                      type="number"
                      value={maxDownloads}
                      onChange={(e) => setMaxDownloads(parseInt(e.target.value) || 1)}
                      min="1"
                      max="50"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      {t('upload.form.maxDownloadsHelp')}
                    </p>
                  </div>

                  {/* Expiration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('upload.form.expiration')}
                    </label>
                    <input
                      type="number"
                      value={expirationHours}
                      onChange={(e) => setExpirationHours(parseInt(e.target.value) || 1)}
                      min="1"
                      max="168"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <p className="mt-1 text-sm text-gray-500">{t('upload.form.expirationHelp')}</p>
                  </div>

                  {/* Password Protection */}
                  <div className="pt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={usePassword}
                        onChange={(e) => setUsePassword(e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {t('upload.form.passwordProtect')}
                      </span>
                    </label>
                  </div>

                  {usePassword && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('upload.form.password')}</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('upload.form.passwordPlaceholder')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        {t('upload.form.passwordHelp')}
                      </p>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
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
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
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
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('upload.uploading.title')}</h3>
                <p className="text-gray-600">{t('upload.uploading.message')}</p>
              </div>
            )}

            {/* Step 4: Success - Share Link */}
            {activeStep === 3 && shareLink && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">{t('upload.success.title')}</h3>
                  <p className="text-gray-600">{t('upload.success.message')}</p>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center p-6 bg-white border-2 border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <QrCode className="w-5 h-5 text-gray-700" />
                    <h4 className="text-lg font-semibold text-gray-900">{t('upload.success.qrCode')}</h4>
                  </div>
                  <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                    <QRCodeCanvas
                      value={shareLink}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <p className="mt-3 text-sm text-gray-600 text-center">
                    {t('upload.success.qrCodeDesc')}
                  </p>
                </div>

                <div className="p-4 bg-primary bg-opacity-10 border border-primary border-opacity-30 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('upload.success.shareLink')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-mono"
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
                  <p className="mt-2 text-xs text-gray-600">
                    {t('dashboard.warningKey')}
                  </p>
                </div>

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
                      setPassword('');
                      setUsePassword(false);
                    }}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    {t('upload.success.uploadAnother')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Security Features */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('upload.security.title')}</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('upload.security.endToEnd')}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{t('upload.security.endToEndDesc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('upload.security.zeroKnowledge')}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{t('upload.security.zeroKnowledgeDesc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('upload.security.autoDeletion')}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{t('upload.security.autoDeletionDesc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('upload.security.passwordProtection')}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{t('upload.security.passwordProtectionDesc')}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Download className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('upload.security.downloadLimits')}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{t('upload.security.downloadLimitsDesc')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
