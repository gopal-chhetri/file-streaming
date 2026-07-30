import { clsx } from '../../lib/clsx'

interface BadgeProps {
  variant?: 'default' | 'accent' | 'secondary' | 'success' | 'warning' | 'danger'
  children: React.ReactNode
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-accent-bg text-accent-text',
        variant === 'accent' && 'bg-accent-bg text-accent-text',
        variant === 'secondary' && 'bg-secondary-bg text-secondary-text',
        variant === 'success' && 'bg-success/10 text-success',
        variant === 'warning' && 'bg-warning/10 text-warning',
        variant === 'danger' && 'bg-danger/10 text-danger',
      )}
    >
      {children}
    </span>
  )
}
