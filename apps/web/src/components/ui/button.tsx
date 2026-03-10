import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap border-2 border-foreground bg-background font-[var(--font-body)] text-base font-normal uppercase tracking-[0.18em] text-foreground shadow-[4px_4px_0_0_var(--color-shadow)] transition-[transform,box-shadow,background-color,color,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_var(--color-shadow)] disabled:pointer-events-none disabled:translate-x-0 disabled:translate-y-0 disabled:border-foreground/30 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:-translate-y-px hover:bg-[color:var(--color-button-hot)] hover:text-foreground hover:shadow-[6px_6px_0_0_var(--color-shadow)]',
        destructive:
          'border-[color:var(--color-danger-border)] bg-destructive text-destructive-foreground hover:-translate-y-px hover:bg-[color:var(--color-danger-hot)] hover:shadow-[6px_6px_0_0_var(--color-shadow)]',
        outline:
          'border-[color:var(--color-outline-border)] bg-[color:var(--color-outline-fill)] hover:-translate-y-px hover:bg-[color:var(--color-outline-hot)] hover:text-foreground hover:shadow-[6px_6px_0_0_var(--color-shadow)]',
        secondary:
          'border-[color:var(--color-secondary-border)] bg-secondary text-secondary-foreground hover:-translate-y-px hover:bg-[color:var(--color-secondary-hot)] hover:shadow-[6px_6px_0_0_var(--color-shadow)]',
        ghost:
          'border-transparent bg-transparent shadow-none hover:border-foreground hover:bg-secondary hover:text-foreground hover:shadow-[4px_4px_0_0_var(--color-shadow)]',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 px-3 text-sm tracking-[0.14em]',
        action: 'h-11 w-36 px-4 text-sm tracking-[0.14em]',
        lg: 'h-13 px-8 text-lg',
        icon: 'h-11 w-11 px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
