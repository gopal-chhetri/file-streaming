import { clsx } from '../lib/clsx'

interface FilterPill {
  label: string
  value: string
}

interface FilterPillsProps {
  items: FilterPill[]
  selected?: string
  onSelect: (value: string | undefined) => void
}

export function FilterPills({ items, selected, onSelect }: FilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(undefined)}
        className={clsx(
          'rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150',
          !selected
            ? 'bg-accent text-white'
            : 'border border-border bg-surface text-text-secondary hover:bg-accent/5 hover:text-accent hover:border-accent/30',
        )}
      >
        All
      </button>
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onSelect(item.value)}
          className={clsx(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150',
            selected === item.value
              ? 'bg-accent text-white'
              : 'border border-border bg-surface text-text-secondary hover:bg-accent/5 hover:text-accent hover:border-accent/30',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
