import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { useWatchLater } from '../hooks/use-watch-later'
import { useWatchProgressMap } from '../hooks/use-watch-history'
import { useAuth } from '../hooks/use-auth'
import { VideoCard } from '../components/video-card'
import { BookOpen } from '@phosphor-icons/react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/watch-later',
  component: WatchLaterPage,
})

function WatchLaterPage() {
  const { data: watchLater, isLoading } = useWatchLater()
  const { user } = useAuth()
  const progressMap = useWatchProgressMap(!!user)
  const visible =
    watchLater?.filter((v) => (progressMap[v.id] ?? 0) < 100) ?? []

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-xl font-medium text-text-primary">Watch Later</h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Videos you've saved to watch later
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-video animate-shimmer rounded-lg" />
              <div className="h-4 w-2/3 animate-shimmer rounded" />
            </div>
          ))}
        </div>
      ) : visible.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((video) => (
            <VideoCard
              key={video.id}
              video={{
                ...video,
                watchProgress: progressMap[video.id] || 0,
              }}
              menu={{ context: 'browse' }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <BookOpen size={40} className="mb-3 opacity-30" />
          <p className="text-sm">Nothing saved for later</p>
          <p className="mt-1 text-xs text-text-muted">
            Use the Watch Later option on any video to save it here
          </p>
        </div>
      )}
    </div>
  )
}
