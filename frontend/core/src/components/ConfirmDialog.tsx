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
  danger:  'bg-red-600    hover:bg-red-700    shadow-red-200',
  warning: 'bg-orange-500 hover:bg-orange-600 shadow-orange-200',
  info:    'bg-amber-500  hover:bg-amber-600  shadow-amber-200',
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
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent>
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
            onClick={onConfirm}
            className={cn('flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-lg', confirmVariantClasses[iconVariant])}
          >
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
