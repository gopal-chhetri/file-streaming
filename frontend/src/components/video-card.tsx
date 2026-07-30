import { Link } from '@tanstack/react-router'
import { Play } from '@phosphor-icons/react'
import type { Video } from '../types'
import { formatDuration, formatViews, timeAgo } from '../lib/format'

interface VideoCardProps {
  video: Video
  layout?: 'grid' | 'list'
}

export function VideoCard({ video, layout = 'grid' }: VideoCardProps) {
  if (layout === 'list') {
    return (
      <Link
        to="/watch/$videoId"
        params={{ videoId: video.id }}
        className="group relative flex h-14 items-center gap-3 rounded-lg px-2 transition-all duration-150 hover:bg-accent/5"
      >
        <div className="relative h-9 w-16 flex-shrink-0 overflow-hidden rounded-md bg-subtle">
          <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-150 group-hover:bg-black/30">
            <Play size={14} weight="fill" className="text-white/0 transition-all duration-150 group-hover:text-white/90" />
          </div>
          {video.watchProgress !== undefined && video.watchProgress > 0 && (
            <div
              className="absolute bottom-0 left-0 h-0.5 bg-accent"
              style={{ width: `${video.watchProgress}%` }}
            />
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="truncate text-sm font-medium text-text-primary transition-all duration-150 group-hover:text-accent">
            {video.title}
          </span>
          <span className="hidden flex-shrink-0 text-xs text-text-muted sm:block">
            {video.channel}
          </span>
          <span className="hidden flex-shrink-0 text-xs text-text-muted md:block">
            {formatViews(video.views)} views
          </span>
          <span className="hidden flex-shrink-0 text-xs text-text-muted lg:block">
            {timeAgo(video.uploadedAt)}
          </span>
        </div>
      </Link>
    )
  }

  return (
    <Link
      to="/watch/$videoId"
      params={{ videoId: video.id }}
      className="group block space-y-2 transition-all duration-150"
    >
      <div className="relative aspect-video overflow-hidden rounded-lg bg-subtle transition-all duration-150 group-hover:shadow-md group-hover:-translate-y-0.5">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="h-full w-full object-cover transition-all duration-150 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-150 group-hover:bg-black/30">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/90 text-white opacity-0 transition-all duration-150 group-hover:opacity-100">
            <Play size={20} weight="fill" />
          </div>
        </div>
        <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-mono text-white shadow-sm">
          {formatDuration(video.duration)}
        </span>
        {video.watchProgress !== undefined && video.watchProgress > 0 && (
          <div
            className="absolute bottom-0 left-0 h-1 bg-accent"
            style={{ width: `${video.watchProgress}%` }}
          />
        )}
      </div>
      <div className="flex gap-3 px-1">
        <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-subtle ring-1 ring-border transition-all duration-150 group-hover:ring-accent/30">
          {video.channelAvatar && (
            <img src={video.channelAvatar} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-text-primary transition-all duration-150 group-hover:text-accent">
            {video.title}
          </h3>
          <p className="mt-0.5 text-xs text-text-muted">{video.channel}</p>
          <p className="text-xs text-text-muted">
            {formatViews(video.views)} views · {timeAgo(video.uploadedAt)}
          </p>
        </div>
      </div>
    </Link>
  )
}
