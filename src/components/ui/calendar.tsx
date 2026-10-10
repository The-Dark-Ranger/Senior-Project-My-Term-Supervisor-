'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const defaults = getDefaultClassNames();
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        root: cn('w-fit', defaults.root),
        months: cn('relative flex flex-col gap-4', defaults.months),
        month: cn('flex w-full flex-col gap-3', defaults.month),
        nav: cn('absolute inset-x-0 top-0 flex items-center justify-between', defaults.nav),
        button_previous: cn(buttonVariants({ variant: 'ghost' }), 'size-8 p-0', defaults.button_previous),
        button_next: cn(buttonVariants({ variant: 'ghost' }), 'size-8 p-0', defaults.button_next),
        month_caption: cn('flex h-8 items-center justify-center px-10', defaults.month_caption),
        caption_label: cn('text-sm font-medium', defaults.caption_label),
        month_grid: 'w-full border-collapse',
        weekdays: cn('flex', defaults.weekdays),
        weekday: cn('w-9 text-[0.8rem] font-normal text-muted-foreground', defaults.weekday),
        week: cn('mt-1 flex w-full', defaults.week),
        day: cn('relative size-9 p-0 text-center text-sm', defaults.day),
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-9 rounded-md p-0 font-normal aria-selected:opacity-100',
          defaults.day_button,
        ),
        selected:
          'rounded-md bg-primary text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground',
        today: 'rounded-md ring-1 ring-primary/50',
        outside: 'text-muted-foreground opacity-50',
        disabled: 'text-muted-foreground opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass }) =>
          orientation === 'left' ? (
            <ChevronLeft className={cn('size-4', chevronClass)} />
          ) : (
            <ChevronRight className={cn('size-4', chevronClass)} />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
