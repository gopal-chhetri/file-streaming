import { clsx } from '../../lib/clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 focus:outline-none',
        size === 'sm' && 'h-8 px-3 gap-1.5 text-sm',
        size === 'md' && 'h-10 px-4 gap-2 text-sm',
        size === 'lg' && 'h-12 px-6 gap-2 text-base',
        variant === 'primary' &&
          'bg-accent text-white hover:brightness-110 active:brightness-95',
        variant === 'secondary' &&
          'border border-border bg-surface text-text-primary hover:bg-accent/5 hover:border-accent/30',
        variant === 'ghost' &&
          'text-text-secondary hover:bg-accent/10 hover:text-accent',
        variant === 'danger' &&
          'bg-danger text-white hover:brightness-110 active:brightness-95',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
