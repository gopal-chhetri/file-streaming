import { createRoute, useNavigate } from '@tanstack/react-router'
import { Route as rootRoute } from '../__root'
import { useState } from 'react'
import { useVideos } from '../../hooks/use-videos'
import { useWatchProgressMap } from '../../hooks/use-watch-history'
import { useAuth } from '../../hooks/use-auth'
import { VideoCard } from '../../components/video-card'
import { FilterPills } from '../../components/filter-pills'
import { List, SquaresFour, MagnifyingGlass, X } from '@phosphor-icons/react'
import { clsx } from '../../lib/clsx'

const categories = [
  { label: 'Music', value: 'music' },
  { label: 'Gaming', value: 'gaming' },
  { label: 'Education', value: 'education' },
  { label: 'Technology', value: 'technology' },
  { label: 'Entertainment', value: 'entertainment' },
  { label: 'Sports', value: 'sports' },
]

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/browse',
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    const q = typeof search.q === 'string' ? search.q : undefined
    return q ? { q } : {}
  },
  component: BrowsePage,
})

function BrowsePage() {
  const navigate = useNavigate()
  const { q } = Route.useSearch()
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [category, setCategory] = useState<string | undefined>()
  const { user } = useAuth()
  const progressMap = useWatchProgressMap(!!user)
  const { data: videos, isLoading } = useVideos({ status: 'active', category, q: q || undefined })

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-text-primary">
            {q ? <>Results for &ldquo;{q}&rdquo;</> : 'Browse'}
          </h1>
          <p className="mt-0.5 text-sm text-text-muted">
            {q ? `${videos?.length ?? 0} video${(videos?.length ?? 0) === 1 ? '' : 's'} found` : 'Discover videos from across the library'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {q && (
            <button
              onClick={() => navigate({ to: '/browse', search: {} })}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-secondary transition-all duration-150 hover:bg-accent/5 hover:text-accent"
            >
              <X size={14} />
              <span className="hidden sm:inline">Clear</span>
            </button>
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
        </div>
      </div>

      {!q && <FilterPills items={categories} selected={category} onSelect={setCategory} />}

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
          <MagnifyingGlass size={40} className="mb-3 opacity-30" />
          <p className="text-sm">No videos found</p>
          <p className="text-xs text-text-muted mt-1">
            {q ? `No results for "${q}". Try a different search.` : 'Try adjusting your filters'}
          </p>
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
            <VideoCard
              key={video.id}
              video={{
                ...video,
                watchProgress: progressMap[video.id] || 0,
              }}
              layout={layout}
              menu={{ context: 'browse' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
