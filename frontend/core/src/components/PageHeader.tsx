import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export default function PageHeader({ title, subtitle, className }: PageHeaderProps) {
  return (
    <div className={cn(className)}>
      <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{title}</h1>
      {subtitle && <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{subtitle}</p>}
    </div>
  );
}
