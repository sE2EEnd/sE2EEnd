import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const sectionHeaderVariants = cva(
  'text-sm font-bold uppercase tracking-widest flex items-center gap-2',
  {
    variants: {
      color: {
        default: 'text-gray-600 dark:text-gray-400',
        muted:   'text-gray-400 dark:text-gray-500',
      },
    },
    defaultVariants: { color: 'default' },
  }
);

interface SectionHeaderProps extends VariantProps<typeof sectionHeaderVariants> {
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function SectionHeader({ label, icon, color, className }: SectionHeaderProps) {
  return (
    <h3 className={cn(sectionHeaderVariants({ color }), className)}>
      {icon}
      {label}
    </h3>
  );
}
