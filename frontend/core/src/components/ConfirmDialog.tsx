import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import * as React from "react";

type IconVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  icon: React.ReactNode;
  iconVariant?: IconVariant;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
}

const iconVariantClasses: Record<IconVariant, string> = {
  danger:  'bg-red-50    dark:bg-red-900/20    text-red-600    dark:text-red-400',
  warning: 'bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400',
  info:    'bg-amber-50  dark:bg-amber-900/20  text-amber-500  dark:text-amber-400',
};

const confirmVariantClasses: Record<IconVariant, string> = {
  danger:  'bg-red-600    hover:bg-red-700    focus-visible:ring-red-500',
  warning: 'bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-400',
  info:    'bg-amber-500  hover:bg-amber-600  focus-visible:ring-amber-400',
};

export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  icon,
  iconVariant = 'danger',
  title,
  description,
  confirmLabel,
  cancelLabel,
}: ConfirmDialogProps) {
  const confirmRef = React.useRef<HTMLButtonElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent
        onKeyDown={handleKeyDown}
        // Make the confirm button the default action rather than Radix's first tabbable (Cancel).
        onOpenAutoFocus={(event) => { event.preventDefault(); confirmRef.current?.focus(); }}
      >
        <DialogHeader>
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', iconVariantClasses[iconVariant])}>
            {icon}
          </div>
          <DialogTitle className="text-gray-900 dark:text-gray-100">{title}</DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-sm',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800',
              confirmVariantClasses[iconVariant],
            )}
          >
            {confirmLabel}
            <kbd
              aria-hidden="true"
              className="hidden sm:inline-flex items-center justify-center h-5 min-w-5 px-1 rounded bg-white/20 text-white/90 text-xs font-sans font-medium leading-none"
            >
              ⏎
            </kbd>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
