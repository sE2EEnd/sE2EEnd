import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import type { ReleaseNote } from '../releaseNotes';

interface WhatsNewDialogProps {
  open: boolean;
  releases: ReleaseNote[];
  onClose: () => void;
}

function formatReleaseDate(date: string, language: string): string {
  // Parse as local midnight so the day does not shift in negative UTC offsets.
  return new Intl.DateTimeFormat(language, { dateStyle: 'long' }).format(new Date(`${date}T00:00:00`));
}

export default function WhatsNewDialog({ open, releases, onClose }: WhatsNewDialogProps) {
  const { t, i18n } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-primary/10 text-primary">
            <Sparkles className="w-6 h-6" />
          </div>
          <DialogTitle className="text-gray-900 dark:text-gray-100">{t('whatsNew.title')}</DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">{t('whatsNew.description')}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto -mx-2 px-2 space-y-6">
          {releases.map((release) => (
            <section key={release.version}>
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {t('whatsNew.version', { version: release.version })}
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatReleaseDate(release.date, i18n.language)}
                </span>
              </div>
              <ul className="space-y-3">
                {release.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {t(`whatsNew.items.${item.id}.title`)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t(`whatsNew.items.${item.id}.description`)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-sm bg-primary hover:bg-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary dark:focus-visible:ring-offset-gray-800"
          >
            {t('whatsNew.close')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
