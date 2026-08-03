import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '../__root'

import { useVideo } from '../../hooks/use-videos'
import { useUpdateProgress, useProgress } from '../../hooks/use-watch-history'
import { sendHeartbeat } from '../../hooks/use-analytics'
import { VideoPlayer } from '../../components/video-player'
import { formatViews, timeAgo } from '../../lib/format'
import { randomUUID } from '../../lib/uuid'
import { Button } from '../../components/ui/button'
import { ThumbsUp, ThumbsDown, Share, BookmarkSimple } from '@phosphor-icons/react'
import { useRef, useCallback } from 'react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/watch/$videoId',
  component: WatchPage,
})

function WatchPage() {
  const { videoId } = Route.useParams()
  const { data: video, isLoading } = useVideo(videoId)
  const { data: savedProgress } = useProgress(videoId)
  const updateProgress = useUpdateProgress()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastHeartbeatRef = useRef(0)
  const sessionId = useRef(randomUUID()).current
  const hasStarted = useRef(false)
  const hasEnded = useRef(false)

  const handleProgress = useCallback(
    (pct: number) => {
      if (!video) return
      const position = (pct / 100) * video.duration

      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        updateProgress.mutate({ videoId, progress: Math.round(pct) })
      }, 3000)

      if (!hasStarted.current) {
        hasStarted.current = true
        sendHeartbeat(sessionId, videoId, position, video.duration, 'play')
      }

      const now = Date.now()
      if (now - lastHeartbeatRef.current >= 10_000) {
        lastHeartbeatRef.current = now
        sendHeartbeat(sessionId, videoId, position, video.duration, 'heartbeat')
      }

      if (pct >= 99 && !hasEnded.current) {
        hasEnded.current = true
        sendHeartbeat(sessionId, videoId, position, video.duration, 'end')
      }
    },
    [videoId, video, updateProgress, sessionId],
  )

  return (
    <>
    {isLoading ? (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 animate-shimmer rounded-full" />
          <div className="h-4 w-32 animate-shimmer rounded" />
        </div>
      </div>
    ) : !video ? (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-lg text-text-muted">Video not found</p>
        </div>
      </div>
    ) : (
    <div className="mx-auto max-w-6xl space-y-6 animate-in">
      <VideoPlayer
        src={video.hlsUrl || ''}
        poster={video.thumbnailUrl}
        initialTime={
          savedProgress?.progress
            ? (savedProgress.progress / 100) * video.duration
            : video.watchProgress
              ? (video.watchProgress / 100) * video.duration
              : 0
        }
        onProgress={handleProgress}
      />
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-medium text-text-primary">
            {video.title}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-text-muted">
            <span className="font-medium text-text-secondary">
              {video.channel}
            </span>
            <span>{formatViews(video.views)} views</span>
            <span>{timeAgo(video.uploadedAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            <ThumbsUp size={16} />
            <span>Like</span>
          </Button>
          <Button variant="secondary" size="sm">
            <ThumbsDown size={16} />
          </Button>
          <div className="w-px h-6 bg-border" />
          <Button variant="secondary" size="sm">
            <Share size={16} />
            <span>Share</span>
          </Button>
          <Button variant="secondary" size="sm">
            <BookmarkSimple size={16} />
            <span>Save</span>
          </Button>
        </div>

        {video.description && (
          <div className="rounded-lg bg-surface border border-border p-4">
            <p className="text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
              {video.description}
            </p>
          </div>
        )}
      </div>
      </div>
    )}
    </>
  )
}
