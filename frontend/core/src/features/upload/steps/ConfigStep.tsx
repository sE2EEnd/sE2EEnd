import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Upload as UploadIcon, FileText,
  AlertCircle, AlertTriangle, Eye, EyeOff, Copy, CheckCircle, Dices,
} from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

interface ConfigStepProps {
  mode: 'file' | 'text';
  selectedFiles: File[];
  removeFile: (index: number) => void;
  textContent: string;
  sendName: string;
  setSendName: (v: string) => void;
  maxDownloads: number;
  setMaxDownloads: (v: number) => void;
  expirationHours: number;
  setExpirationHours: (v: number) => void;
  usePassword: boolean;
  setUsePassword: (v: boolean) => void;
  requireSendPassword: boolean;
  passwordRef: React.RefObject<HTMLInputElement | null>;
  passwordHasValue: boolean;
  setPasswordHasValue: (v: boolean) => void;
  error: string;
  uploading: boolean;
  onBack: () => void;
  onUpload: () => void;
}

export default function ConfigStep({
  mode, selectedFiles, removeFile, textContent,
  sendName, setSendName, maxDownloads, setMaxDownloads,
  expirationHours, setExpirationHours,
  usePassword, setUsePassword, requireSendPassword,
  passwordRef, passwordHasValue, setPasswordHasValue,
  error, uploading, onBack, onUpload,
}: ConfigStepProps) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

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

    if (passwordRef.current) passwordRef.current.value = chars.join('');
    setPasswordHasValue(true);
  };

  return (
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
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('upload.form.sendNameHelp')}</p>
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
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('upload.form.maxDownloadsHelp')}</p>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('upload.form.password')}
            </label>
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
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('upload.form.passwordHelp')}</p>
            <Alert variant="warning" className={`mt-4 animate-in fade-in slide-in-from-top-2 ${passwordHasValue ? 'block' : 'hidden'}`}>
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle>{t('upload.form.passwordWarningTitle')}</AlertTitle>
              <AlertDescription>{t('upload.form.passwordWarning')}</AlertDescription>
            </Alert>
          </div>
        )}

        {error && (
          <Alert variant="error">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{error}</span>
          </Alert>
        )}

        <div className="flex gap-3 pt-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </button>
          <button
            onClick={onUpload}
            disabled={uploading}
            className="flex-1 px-6 py-2.5 bg-gradient-primary text-white rounded-lg hover:bg-gradient-primary-reverse transition-all shadow-md hover:shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.upload')}
          </button>
        </div>
      </div>
    </div>
  );
}
