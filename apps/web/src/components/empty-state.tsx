import { PackageOpen } from 'lucide-react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  iconClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  iconClassName,
  titleClassName,
  descriptionClassName,
}: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center px-6 py-20 text-center', className)}
    >
      <div
        className={cn(
          'mb-6 flex h-20 w-20 items-center justify-center border-2 border-dashed border-foreground/20 bg-muted/40',
          iconClassName
        )}
      >
        {icon ?? <PackageOpen className="h-10 w-10 text-muted-foreground/50" />}
      </div>
      <h3
        className={cn(
          'mb-3 jy-display text-sm uppercase tracking-wider text-foreground/80',
          titleClassName
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            'max-w-xs font-(--font-body) text-sm leading-relaxed tracking-wide text-muted-foreground',
            descriptionClassName
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
