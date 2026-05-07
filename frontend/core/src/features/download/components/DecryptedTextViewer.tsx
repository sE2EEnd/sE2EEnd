import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';

interface DecryptedTextViewerProps {
  text: string;
  hideText: boolean;
  setHideText: (v: boolean) => void;
}

export default function DecryptedTextViewer({ text, hideText, setHideText }: DecryptedTextViewerProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('download.textContent')}</label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-xs font-medium"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? t('common.copied') : t('common.copy')}
          </button>
          <button
            type="button"
            onClick={() => setHideText(!hideText)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-xs font-medium"
          >
            {hideText ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {hideText ? t('download.showText') : t('download.hideText')}
          </button>
        </div>
      </div>
      <textarea
        readOnly
        value={text}
        rows={6}
        className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-gray-100 font-mono text-sm resize-none focus:outline-none ${
          hideText ? '!text-transparent [text-shadow:0_0_12px_rgba(0,0,0,0.9)] dark:[text-shadow:0_0_12px_rgba(255,255,255,0.7)] select-none' : ''
        }`}
      />
    </div>
  );
}
