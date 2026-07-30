import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { BrowseLayout } from '../layouts/browse-layout'
import { useWatchHistory } from '../hooks/use-watch-history'
import { Link } from '@tanstack/react-router'
import { ClockCounterClockwise } from '@phosphor-icons/react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/watch-history',
  component: WatchHistoryPage,
})

function WatchHistoryPage() {
  const { data: history, isLoading } = useWatchHistory()

  return (
    <BrowseLayout>
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-xl font-medium text-text-primary">Watch History</h1>
        <p className="mt-0.5 text-sm text-text-muted">Videos you've watched</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 animate-shimmer rounded-lg" />
          ))}
        </div>
      ) : history && history.length > 0 ? (
        <div className="divide-y divide-border rounded-lg border border-border bg-surface">
          {history.map((item) => (
            <div
              key={item.videoId}
              className="flex items-center gap-4 px-4 py-3 text-sm"
            >
              <Link
                to="/watch/$videoId"
                params={{ videoId: item.videoId }}
                className="flex-1 truncate font-medium text-text-primary hover:text-accent transition-colors"
              >
                {item.videoId}
              </Link>
              <div className="flex items-center gap-3">
                <div className="relative h-2 w-24 overflow-hidden rounded-full bg-subtle">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-300"
                    style={{ width: `${Math.round(item.progress)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-text-muted w-8 text-right">
                  {Math.round(item.progress)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <ClockCounterClockwise size={40} className="mb-3 opacity-30" />
          <p className="text-sm">No watch history yet</p>
          <p className="text-xs text-text-muted mt-1">
            Start watching videos to build your history
          </p>
        </div>
      )}
    </div>
    </BrowseLayout>
  )
}
