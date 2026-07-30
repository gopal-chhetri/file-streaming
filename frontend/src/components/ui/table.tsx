import { clsx } from '../../lib/clsx'

export function Table({ className, children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border bg-surface">
      <table className={clsx('w-full text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHead({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={clsx('border-b border-border bg-page', className)} {...props}>
      {children}
    </thead>
  )
}

export function TableBody({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={clsx('divide-y divide-border', className)} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={clsx('transition-colors duration-150 hover:bg-accent/5', className)} {...props}>
      {children}
    </tr>
  )
}

export function TableHeaderCell({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) {
  return (
    <th className={clsx('px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted', className)} {...props}>
      {children}
    </th>
  )
}

export function TableCell({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableDataCellElement>) {
  return (
    <td className={clsx('px-4 py-3 text-text-primary', className)} {...props}>
      {children}
    </td>
  )
}
