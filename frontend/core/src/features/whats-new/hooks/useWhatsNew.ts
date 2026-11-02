import { useState } from 'react';
import { releaseNotes as defaultReleaseNotes, type ReleaseNote } from '../releaseNotes';

export const LAST_SEEN_STORAGE_KEY = 'se2eend.whatsNew.lastSeen';

function readLastSeen(): string | null {
  try {
    return localStorage.getItem(LAST_SEEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeLastSeen(version: string): void {
  try {
    localStorage.setItem(LAST_SEEN_STORAGE_KEY, version);
  } catch {
    // Storage unavailable (private mode, blocked site data): the dialog will simply show again.
  }
}

/**
 * Returns the release notes newer than the last version the user has seen.
 * When nothing was seen yet (or the seen version is no longer listed), only the latest release is returned.
 */
export function getUnseenReleases(notes: ReleaseNote[], lastSeen: string | null): ReleaseNote[] {
  if (notes.length === 0 || notes[0].version === lastSeen) return [];
  const seenIndex = lastSeen ? notes.findIndex((note) => note.version === lastSeen) : -1;
  return seenIndex === -1 ? notes.slice(0, 1) : notes.slice(0, seenIndex);
}

export function useWhatsNew(notes: ReleaseNote[] = defaultReleaseNotes) {
  const [releases, setReleases] = useState(() => getUnseenReleases(notes, readLastSeen()));
  const [open, setOpen] = useState(releases.length > 0);

  const showAll = () => {
    setReleases(notes);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    if (notes.length > 0) writeLastSeen(notes[0].version);
  };

  return { open, releases, showAll, close };
}
