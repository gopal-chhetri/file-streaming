import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '../__root'
import { BrowseLayout } from '../../layouts/browse-layout'
import { useState } from 'react'
import { useVideos } from '../../hooks/use-videos'
import { VideoCard } from '../../components/video-card'
import { FilterPills } from '../../components/filter-pills'
import { List, SquaresFour } from '@phosphor-icons/react'
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
  component: BrowsePage,
})

function BrowsePage() {
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [category, setCategory] = useState<string | undefined>()
  const { data: videos, isLoading } = useVideos({ category })

  return (
    <BrowseLayout>
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-text-primary">Browse</h1>
          <p className="mt-0.5 text-sm text-text-muted">Discover videos from across the library</p>
        </div>
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

      <FilterPills items={categories} selected={category} onSelect={setCategory} />

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
          <div className="mb-3 text-4xl opacity-30">🎬</div>
          <p className="text-sm">No videos found</p>
          <p className="text-xs text-text-muted mt-1">Try adjusting your filters</p>
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
            <VideoCard key={video.id} video={video} layout={layout} />
          ))}
        </div>
      )}
    </div>
    </BrowseLayout>
  )
}
