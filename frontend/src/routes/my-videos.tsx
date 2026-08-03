import { createRoute, useNavigate } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { useState } from 'react'
import { useMyVideos } from '../hooks/use-my-videos'
import { VideoCard } from '../components/video-card'
import { Button } from '../components/ui/button'
import { List, SquaresFour, CloudArrowUp, FilmStrip, ArrowsClockwise } from '@phosphor-icons/react'
import { clsx } from '../lib/clsx'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/my-videos',
  component: MyVideosPage,
})

const statusColors: Record<string, string> = {
  pending: 'text-yellow-500 bg-yellow-500/10',
  pending_review: 'text-yellow-500 bg-yellow-500/10',
  processing: 'text-blue-500 bg-blue-500/10',
  active: 'text-green-500 bg-green-500/10',
  failed: 'text-red-500 bg-red-500/10',
  banned: 'text-red-600 bg-red-600/10',
}

const statusLabels: Record<string, string> = {
  pending: 'queued',
  pending_review: 'pending review',
  processing: 'processing',
  active: 'active',
  failed: 'failed',
  banned: 'banned',
}

const IN_PROGRESS_STATUSES = new Set(['pending', 'processing'])

function MyVideosPage() {
  const navigate = useNavigate()
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const { data: videos, isLoading } = useMyVideos()

  const hasInProgressVideos = videos?.some((v) => IN_PROGRESS_STATUSES.has(v.status))

  return (
    <div className="space-y-6 animate-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium text-text-primary">Your Videos</h1>
            <p className="mt-0.5 text-sm text-text-muted">Manage and track your uploaded videos</p>
          </div>
          <div className="flex items-center gap-2">
            {hasInProgressVideos && (
              <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-500">
                <ArrowsClockwise size={12} className="animate-spin" />
                Processing
              </div>
            )}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5 shadow-sm">
              <button
                onClick={() => setLayout('list')}
                className={clsx(
                  'rounded-md p-1.5 transition-all duration-150',
                  layout === 'list'
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-text-primary hover:bg-accent/5',
                )}
              >
                <List size={16} weight="bold" />
              </button>
              <button
                onClick={() => setLayout('grid')}
                className={clsx(
                  'rounded-md p-1.5 transition-all duration-150',
                  layout === 'grid'
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-text-primary hover:bg-accent/5',
                )}
              >
                <SquaresFour size={16} weight="bold" />
              </button>
            </div>
            <Button onClick={() => navigate({ to: '/upload' })}>
              <CloudArrowUp size={16} weight="bold" />
              Upload
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex h-14 items-center gap-3 rounded-lg px-2">
                <div className="h-9 w-16 animate-shimmer rounded-md" />
                <div className="h-4 w-48 animate-shimmer rounded" />
              </div>
            ))}
          </div>
        ) : videos?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <FilmStrip size={48} className="mb-3 opacity-30" />
            <p className="text-sm">No videos uploaded yet</p>
            <p className="text-xs text-text-muted mt-1">Upload your first video to get started</p>
            <Button onClick={() => navigate({ to: '/upload' })} className="mt-4">
              <CloudArrowUp size={16} weight="bold" />
              Upload a Video
            </Button>
          </div>
        ) : (
          <div
            className={clsx(
              layout === 'grid'
                ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'divide-y divide-border',
            )}
          >
            {videos?.map((video) => (
              <div key={video.id} className="group relative">
                {video.status !== 'active' && (
                  <span
                    className={clsx(
                      'absolute top-2 right-2 z-10 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
                      statusColors[video.status] || 'text-text-muted bg-subtle',
                    )}
                    title={
                      video.status === 'failed'
                        ? video.failureReason === 'INCOMPATIBLE_FILE'
                          ? 'Incompatible file format'
                          : 'Processing failed'
                        : undefined
                    }
                  >
                    {IN_PROGRESS_STATUSES.has(video.status) && (
                      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                    )}
                    {statusLabels[video.status] ?? video.status}
                  </span>
                )}
                <VideoCard key={video.id} video={video} layout={layout} menu={{ context: 'mine' }} />
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
