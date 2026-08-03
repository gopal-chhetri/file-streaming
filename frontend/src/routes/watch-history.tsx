import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { useWatchHistory } from '../hooks/use-watch-history'
import { Link } from '@tanstack/react-router'
import { ClockCounterClockwise, Play } from '@phosphor-icons/react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/watch-history',
  component: WatchHistoryPage,
})

function WatchHistoryPage() {
  const { data: history, isLoading } = useWatchHistory()

  return (
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
            <Link
              key={item.videoId}
              to="/watch/$videoId"
              params={{ videoId: item.videoId }}
              className="group flex items-center gap-4 px-4 py-3 text-sm transition-all duration-150 hover:bg-accent/5"
            >
              <div className="relative h-12 w-20 flex-shrink-0 overflow-hidden rounded-md bg-subtle">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-150 group-hover:bg-black/30">
                  <Play
                    size={16}
                    weight="fill"
                    className="text-white/0 transition-all duration-150 group-hover:text-white/90"
                  />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate font-medium text-text-primary transition-colors group-hover:text-accent">
                  {item.title}
                </span>
                {item.channel && (
                  <span className="mt-0.5 block truncate text-xs text-text-muted">
                    {item.channel}
                  </span>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                <div className="relative h-2 w-24 overflow-hidden rounded-full bg-subtle">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-300"
                    style={{ width: `${Math.round(item.progress)}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-mono text-text-muted">
                  {Math.round(item.progress)}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <ClockCounterClockwise size={40} className="mb-3 opacity-30" />
          <p className="text-sm">No watch history yet</p>
          <p className="mt-1 text-xs text-text-muted">
            Start watching videos to build your history
          </p>
        </div>
      )}
    </div>
  )
}
