const HOUR_MS = 60 * 60 * 1000;

/** Expiration slider steps, in hours: 1 h, 6 h, 12 h, 1 day, 3 days, 7 days. */
export const EXPIRATION_STEPS = [1, 6, 12, 24, 72, 168] as const;
export const DEFAULT_EXPIRATION_HOURS = 24;
export const MAX_EXPIRATION_HOURS = 168;

/**
 * Download limit bounds. The upper bound mirrors the backend validation
 * (`@Max(50)` on SendRequestDto.maxDownloads); a higher value would be rejected with a 400.
 */
export const MIN_DOWNLOADS = 1;
export const MAX_DOWNLOADS = 50;
export const DEFAULT_MAX_DOWNLOADS = 5;
export const DOWNLOAD_QUICK_PICKS = [1, 3, 5, 10] as const;

export function clampDownloads(value: number): number {
  if (!Number.isFinite(value)) return MIN_DOWNLOADS;
  return Math.min(MAX_DOWNLOADS, Math.max(MIN_DOWNLOADS, Math.round(value)));
}

/** Hours between `now` and `date`, rounded up, kept within [1, MAX_EXPIRATION_HOURS]. */
export function hoursUntil(date: Date, now: number): number {
  const hours = Math.ceil((date.getTime() - now) / HOUR_MS);
  return Math.min(MAX_EXPIRATION_HOURS, Math.max(1, hours));
}

export function addHours(now: number, hours: number): Date {
  return new Date(now + hours * HOUR_MS);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Formats a date as the local `YYYY-MM-DDTHH:mm` string expected by `<input type="datetime-local">`. */
export function toDateTimeLocalValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parses a `datetime-local` value as local time. Returns null when empty or invalid. */
export function parseDateTimeLocalValue(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
