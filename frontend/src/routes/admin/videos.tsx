import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '../__root'
import { AdminLayout } from '../../layouts/admin-layout'
import { useVideos } from '../../hooks/use-videos'
import { usePendingVideos, useModerateVideo } from '../../hooks/use-admin'
import { useRef } from 'react'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Plus, Check, X } from '@phosphor-icons/react'

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  ready: 'success',
  processing: 'warning',
  pending_review: 'default',
  pending: 'default',
  failed: 'danger',
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/videos',
  component: AdminVideos,
})

function AdminVideos() {
  const { data: videos, isLoading } = useVideos()
  const { data: pending } = usePendingVideos()
  const moderate = useModerateVideo()
  const moderating = useRef<Set<string>>(new Set())

  return (
    <AdminLayout>
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-text-primary">Videos</h1>
          <p className="mt-0.5 text-sm text-text-muted">Manage video content</p>
        </div>
        <Button size="sm">
          <Plus size={16} weight="bold" />
          <span>Add Video</span>
        </Button>
      </div>

      {pending && pending.length > 0 && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="border-b border-border bg-warning/5 px-4 py-2 text-sm font-medium text-warning">
            {pending.length} video{pending.length !== 1 ? 's' : ''} pending review
          </div>
          {pending.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-0"
            >
              <span className="flex-1 truncate font-medium text-text-primary">
                {v.title}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={moderating.current.has(v.id)}
                  onClick={() => {
                    moderating.current.add(v.id)
                    moderate.mutate(
                      { videoId: v.id, action: 'approve' },
                      { onSettled: () => moderating.current.delete(v.id) },
                    )
                  }}
                >
                  <Check size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={moderating.current.has(v.id)}
                  onClick={() => {
                    moderating.current.add(v.id)
                    moderate.mutate(
                      { videoId: v.id, action: 'reject' },
                      { onSettled: () => moderating.current.delete(v.id) },
                    )
                  }}
                >
                  <X size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 animate-shimmer rounded-lg" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Title</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Views</TableHeaderCell>
              <TableHeaderCell>Uploaded</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {videos?.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.title}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[v.status] || 'default'}>
                    {v.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-text-muted">
                  {v.views.toLocaleString()}
                </TableCell>
                <TableCell className="text-text-muted">
                  {new Date(v.uploadedAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
    </AdminLayout>
  )
}
