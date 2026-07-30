import { clsx } from '../../lib/clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-text-secondary">{label}</label>
      )}
      <input
        className={clsx(
          'h-10 rounded-lg border bg-surface px-3 text-sm text-text-primary transition-all duration-150',
          'border-border placeholder:text-text-muted',
          'focus:border-accent/50 focus:outline-none',
          error && 'border-danger',
          className,
        )}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
