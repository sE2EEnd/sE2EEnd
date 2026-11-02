import type { LucideIcon } from 'lucide-react';
import { Flame, History, RefreshCw } from 'lucide-react';

export interface ReleaseNoteItem {
  // i18n keys: whatsNew.items.<id>.title / whatsNew.items.<id>.description
  id: string;
  icon: LucideIcon;
}

export interface ReleaseNote {
  version: string;
  // ISO date (YYYY-MM-DD)
  date: string;
  items: ReleaseNoteItem[];
}

/**
 * Release notes shown in the "What's new" dialog, newest first.
 * Adding an entry at the top makes the dialog open once for every signed-in user.
 * Add the matching translations in both locales/en and locales/fr.
 */
export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.5.0',
    date: '2026-11-02',
    items: [
      { id: 'recipientDestroy', icon: Flame },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-10-20',
    items: [
      { id: 'sendHistory', icon: History },
      { id: 'dashboardRefresh', icon: RefreshCw },
    ],
  },
];
