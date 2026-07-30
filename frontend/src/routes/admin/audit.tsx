import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '../__root'
import { AdminLayout } from '../../layouts/admin-layout'
import { useAuditLog } from '../../hooks/use-admin'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '../../components/ui/table'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/audit',
  component: AdminAudit,
})

function AdminAudit() {
  const { data: entries, isLoading } = useAuditLog()

  return (
    <AdminLayout>
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-xl font-medium text-text-primary">Audit Log</h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Track changes across the platform
        </p>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 animate-shimmer rounded-lg" />
          ))}
        </div>
      ) : entries && entries.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Action</TableHeaderCell>
              <TableHeaderCell>User</TableHeaderCell>
              <TableHeaderCell>Timestamp</TableHeaderCell>
              <TableHeaderCell>IP</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <span className="rounded-md bg-accent/10 px-2 py-0.5 font-mono text-xs text-accent">
                    {entry.action}
                  </span>
                </TableCell>
                <TableCell>
                  {entry.actor.firstName} {entry.actor.lastName} ({entry.actor.email})
                </TableCell>
                <TableCell className="text-text-muted">
                  {new Date(entry.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="font-mono text-xs text-text-muted">
                  {entry.ip || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <p className="text-sm">No audit entries yet</p>
        </div>
      )}
    </div>
    </AdminLayout>
  )
}
