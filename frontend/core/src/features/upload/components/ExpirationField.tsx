import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  EXPIRATION_STEPS, DEFAULT_EXPIRATION_HOURS, MAX_EXPIRATION_HOURS,
  addHours, hoursUntil, parseDateTimeLocalValue, toDateTimeLocalValue,
} from '../lib/sendLimits';

interface ExpirationFieldProps {
  /** Expiration delay in hours. */
  value: number;
  onChange: (hours: number) => void;
}

const STEPS: readonly number[] = EXPIRATION_STEPS;
const LAST_STEP = STEPS.length - 1;

function initialStepIndex(hours: number): number {
  const idx = STEPS.indexOf(hours);
  return idx >= 0 ? idx : STEPS.indexOf(DEFAULT_EXPIRATION_HOURS);
}

export default function ExpirationField({ value, onChange }: ExpirationFieldProps) {
  const { t, i18n } = useTranslation();
  const sliderId = useId();
  const customInputId = useId();
  const helpId = useId();

  const [stepIndex, setStepIndex] = useState(() => initialStepIndex(value));
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [now, setNow] = useState(() => Date.now());

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Keep the displayed deletion date fresh while the form stays open.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const closePicker = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  // Close the popover on Escape or on a click outside of it.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  const isCustom = customDate !== null;
  const deadline = customDate ?? addHours(now, value);
  const stepLabel = (hours: number, variant: 'short' | 'long') =>
    t(`upload.form.expirationSteps.${hours}.${variant}`);
  const badgeLabel = isCustom ? t('upload.form.expirationCustom') : stepLabel(STEPS[stepIndex], 'long');

  const formatDeadline = (d: Date) =>
    t('upload.form.expirationDateTime', {
      date: d.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' }),
      time: d.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }),
    });

  const selectStep = (idx: number) => {
    setStepIndex(idx);
    setCustomDate(null);
    setOpen(false);
    onChange(STEPS[idx]);
  };

  const togglePicker = () => {
    if (open) {
      closePicker(false);
      return;
    }
    const current = Date.now();
    setNow(current);
    setDraft(toDateTimeLocalValue(customDate ?? addHours(current, value)));
    setOpen(true);
  };

  const maxTime = now + MAX_EXPIRATION_HOURS * 60 * 60 * 1000;
  const draftDate = parseDateTimeLocalValue(draft);
  const draftValid = draftDate !== null && draftDate.getTime() > now && draftDate.getTime() <= maxTime;

  const applyPicker = () => {
    if (!draftDate || !draftValid) return;
    setCustomDate(draftDate);
    onChange(hoursUntil(draftDate, Date.now()));
    closePicker(true);
  };

  const fill = { '--fill': `${isCustom ? 0 : (stepIndex / LAST_STEP) * 100}%` } as CSSProperties;

  return (
    <div
      ref={containerRef}
      className="relative space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={sliderId} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('upload.form.expiration')}
        </label>
        <span className="rounded-full bg-blue-100 dark:bg-blue-900/60 px-3 py-1 text-xs font-semibold text-blue-800 dark:text-blue-100">
          {badgeLabel}
        </span>
      </div>

      <div className={cn('transition-opacity', isCustom && 'opacity-50')}>
        <input
          id={sliderId}
          type="range"
          className="range-slider"
          min={0}
          max={LAST_STEP}
          step={1}
          value={stepIndex}
          onChange={(e) => selectStep(Number(e.target.value))}
          aria-valuetext={badgeLabel}
          aria-describedby={helpId}
          style={fill}
        />
        <div className="-mx-2 mt-0.5 flex justify-between">
          {STEPS.map((hours, idx) => {
            const active = !isCustom && idx === stepIndex;
            return (
              <button
                key={hours}
                type="button"
                onClick={() => selectStep(idx)}
                aria-label={stepLabel(hours, 'long')}
                className={cn(
                  'min-w-11 py-1.5 text-xs rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  active
                    ? 'font-bold text-primary'
                    : 'font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200',
                )}
              >
                {stepLabel(hours, 'short')}
              </button>
            );
          })}
        </div>
      </div>

      <p id={helpId} className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        <span>{t('upload.form.expirationDeadline')}</span>
        <button
          ref={triggerRef}
          type="button"
          onClick={togglePicker}
          aria-haspopup="dialog"
          aria-expanded={open}
          title={t('upload.form.expirationPickTitle')}
          className="inline-flex min-h-8 items-center gap-1.5 rounded font-semibold text-primary underline decoration-dotted underline-offset-4 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {formatDeadline(deadline)}
        </button>
      </p>

      {open && (
        <div
          role="dialog"
          aria-label={t('upload.form.expirationPickTitle')}
          className="absolute inset-x-4 top-[calc(100%-0.5rem)] z-20 space-y-3 rounded-lg border border-primary bg-white dark:bg-gray-900 p-4 shadow-xl"
        >
          <label htmlFor={customInputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('upload.form.expirationCustomLabel')}
          </label>
          <Input
            id={customInputId}
            type="datetime-local"
            value={draft}
            min={toDateTimeLocalValue(new Date(now))}
            max={toDateTimeLocalValue(new Date(maxTime))}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            className="dark:[color-scheme:dark]"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('upload.form.expirationCustomHelp')}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => closePicker(true)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={applyPicker}
              disabled={!draftValid}
              className="rounded-lg bg-gradient-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gradient-primary-reverse disabled:cursor-not-allowed disabled:opacity-50 transition-all"
            >
              {t('common.apply')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
