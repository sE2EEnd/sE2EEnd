import { cva } from 'class-variance-authority';
import { CheckCircle2, Ban, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type SendStatus = 'active' | 'revoked' | 'expired' | 'exhausted' | 'deleted';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-tight',
  {
    variants: {
      status: {
        active:    'bg-green-50  dark:bg-green-900/20  text-green-600  dark:text-green-400',
        revoked:   'bg-gray-100  dark:bg-gray-700      text-gray-500   dark:text-gray-400',
        expired:   'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
        exhausted: 'bg-red-50    dark:bg-red-900/20    text-red-600    dark:text-red-400',
        deleted:   'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      },
    },
  }
);

const statusIcons: Record<SendStatus, React.ReactNode> = {
  active:    <CheckCircle2 className="w-3.5 h-3.5" />,
  revoked:   <Ban          className="w-3.5 h-3.5" />,
  expired:   <Clock        className="w-3.5 h-3.5" />,
  exhausted: <AlertCircle  className="w-3.5 h-3.5" />,
  deleted:   <Trash2       className="w-3.5 h-3.5" />,
};

const statusKeys: Record<SendStatus, string> = {
  active:    'common.active',
  revoked:   'common.revoked',
  expired:   'common.expired',
  exhausted: 'common.exhausted',
  deleted:   'common.deleted',
};

interface StatusBadgeProps {
  status: SendStatus;
  label?: string;
  className?: string;
}

export default function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <span className={cn(badgeVariants({ status }), className)}>
      {statusIcons[status]}
      {label ?? t(statusKeys[status])}
    </span>
  );
}

/** Maps a raw deleteReason string (EXPIRED, REVOKED, EXHAUSTED, MANUAL…) to a SendStatus */
// eslint-disable-next-line react-refresh/only-export-components
export function deleteReasonToStatus(reason: string): SendStatus {
  switch (reason) {
    case 'EXPIRED':   return 'expired';
    case 'REVOKED':   return 'revoked';
    case 'EXHAUSTED': return 'exhausted';
    default:          return 'deleted';
  }
}
