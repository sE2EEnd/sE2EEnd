import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DOWNLOAD_QUICK_PICKS, MAX_DOWNLOADS, MIN_DOWNLOADS, clampDownloads } from '../lib/sendLimits';

interface DownloadsFieldProps {
  value: number;
  onChange: (value: number) => void;
}

const stepButtonClass =
  'flex h-10 w-10 items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-300 dark:disabled:text-gray-600 disabled:hover:bg-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

export default function DownloadsField({ value, onChange }: DownloadsFieldProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const helpId = useId();
  // Raw text while the user is typing in the center field; null when not editing.
  const [draft, setDraft] = useState<string | null>(null);

  const set = (n: number) => onChange(clampDownloads(n));

  const onInput = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    setDraft(digits);
    if (digits) set(parseInt(digits, 10));
  };

  const help = value === 1
    ? t('upload.form.maxDownloadsHelpOnce')
    : t('upload.form.maxDownloadsHelpMany', { count: value });

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('upload.form.maxDownloads')}
        </label>
        <div className="flex items-center overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
          <button
            type="button"
            onClick={() => set(value - 1)}
            disabled={value <= MIN_DOWNLOADS}
            aria-label={t('upload.form.decreaseDownloads')}
            className={stepButtonClass}
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft ?? String(value)}
            onFocus={() => setDraft(String(value))}
            onBlur={() => setDraft(null)}
            onChange={(e) => onInput(e.target.value)}
            aria-describedby={helpId}
            className="h-10 w-16 bg-transparent text-center text-sm font-semibold text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          />
          <button
            type="button"
            onClick={() => set(value + 1)}
            disabled={value >= MAX_DOWNLOADS}
            aria-label={t('upload.form.increaseDownloads')}
            className={stepButtonClass}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {DOWNLOAD_QUICK_PICKS.map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => set(n)}
              aria-pressed={active}
              className={cn(
                'min-h-9 rounded-lg border text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                active
                  ? 'border-primary bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-100'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
              )}
            >
              {n}
            </button>
          );
        })}
      </div>

      <p id={helpId} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        <Download className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span>{help}</span>
      </p>
    </div>
  );
}
