'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        root: 'w-fit',
        months: 'flex flex-col gap-4 sm:flex-row',
        month: 'space-y-4',
        month_caption: 'relative flex items-center justify-center pt-1',
        caption_label: 'jy-display text-sm uppercase tracking-[0.12em]',
        nav: 'flex items-center gap-1',
        button_previous:
          'absolute left-1 inline-flex h-8 w-8 items-center justify-center border-2 border-foreground bg-background text-foreground shadow-[2px_2px_0_0_var(--color-shadow)] transition-colors hover:bg-secondary',
        button_next:
          'absolute right-1 inline-flex h-8 w-8 items-center justify-center border-2 border-foreground bg-background text-foreground shadow-[2px_2px_0_0_var(--color-shadow)] transition-colors hover:bg-secondary',
        chevron: 'h-4 w-4',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'w-10 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground',
        weeks: 'mt-2 flex flex-col gap-1',
        week: 'flex w-full',
        day: 'h-10 w-10 p-0 text-center text-sm',
        day_button:
          'h-10 w-10 border border-transparent bg-transparent p-0 text-sm text-foreground transition-colors hover:border-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        selected:
          'border-foreground bg-accent text-accent-foreground hover:border-foreground hover:bg-accent hover:text-accent-foreground',
        today: 'border-foreground bg-muted text-foreground',
        outside: 'text-muted-foreground opacity-50',
        disabled: 'text-muted-foreground opacity-35',
        hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
