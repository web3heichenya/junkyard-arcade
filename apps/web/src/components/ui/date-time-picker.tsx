'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { CalendarIcon, Clock3, X } from 'lucide-react';

import { useI18n } from '@/providers/i18n-provider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type DateTimePickerProps = {
  value?: Date;
  onChange: (value?: Date) => void;
  placeholder: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
};

function withTime(date: Date, source?: Date) {
  const next = new Date(date);
  const hours = source?.getHours() ?? 0;
  const minutes = source?.getMinutes() ?? 0;
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function formatTimeValue(value?: Date) {
  if (!value) return '';
  const hours = `${value.getHours()}`.padStart(2, '0');
  const minutes = `${value.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder,
  allowClear = false,
  disabled = false,
  className,
}: DateTimePickerProps) {
  const { locale, t } = useI18n();
  const dateLocale = locale === 'zh' ? zhCN : enUS;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-11 w-full justify-between rounded-none border-2 border-foreground/80 bg-background px-3 text-sm normal-case tracking-normal shadow-[4px_4px_0_0_var(--color-shadow)]',
            className
          )}
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value ? format(value, 'PPP p', { locale: dateLocale }) : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => onChange(date ? withTime(date, value) : undefined)}
          defaultMonth={value ?? new Date()}
          locale={dateLocale}
          initialFocus
        />
        <div className="border-t-2 border-border/60 p-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              {t('create.timeLabel')}
            </div>
            {allowClear ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto h-8 px-2 text-[11px]"
                onClick={() => onChange(undefined)}
              >
                <X className="h-3.5 w-3.5" />
                {t('create.clearDate')}
              </Button>
            ) : null}
          </div>
          <Input
            type="time"
            step="60"
            disabled={!value}
            className="mt-3 h-10 rounded-none border-2 border-foreground/80 bg-background shadow-[3px_3px_0_0_var(--color-shadow)]"
            value={formatTimeValue(value)}
            onChange={(event) => {
              if (!value) return;
              const [hours, minutes] = event.target.value.split(':').map(Number);
              if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return;
              const next = new Date(value);
              next.setHours(hours, minutes, 0, 0);
              onChange(next);
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
