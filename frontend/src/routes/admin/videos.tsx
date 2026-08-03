import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '../__root'
import { useVideos } from '../../hooks/use-videos'
import { useModerateVideo } from '../../hooks/use-admin'
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
import { Flag, ProhibitInset } from '@phosphor-icons/react'

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  active: 'success',
  processing: 'warning',
  pending: 'default',
  pending_review: 'default',
  failed: 'danger',
  banned: 'danger',
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/videos',
  component: AdminVideos,
})

function AdminVideos() {
  const { data: videos, isLoading } = useVideos()
  const moderate = useModerateVideo()
  const moderating = useRef<Set<string>>(new Set())

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-text-primary">Videos</h1>
          <p className="mt-0.5 text-sm text-text-muted">Manage and moderate video content</p>
        </div>
      </div>

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
              <TableHeaderCell>Actions</TableHeaderCell>
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
                <TableCell>
                  <div className="flex items-center gap-1">
                    {v.status !== 'pending' && v.status !== 'processing' && v.status !== 'failed' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={moderating.current.has(v.id)}
                        title="Flag as Pending Review"
                        onClick={() => {
                          moderating.current.add(v.id)
                          moderate.mutate(
                            { videoId: v.id, action: 'flag_pending' },
                            { onSettled: () => moderating.current.delete(v.id) },
                          )
                        }}
                      >
                        <Flag size={14} />
                      </Button>
                    )}
                    {v.status !== 'banned' && v.status !== 'failed' && (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={moderating.current.has(v.id)}
                        title="Ban Video"
                        onClick={() => {
                          moderating.current.add(v.id)
                          moderate.mutate(
                            { videoId: v.id, action: 'flag_banned' },
                            { onSettled: () => moderating.current.delete(v.id) },
                          )
                        }}
                      >
                        <ProhibitInset size={14} />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
