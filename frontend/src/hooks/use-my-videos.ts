import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Video } from '../types'

function toVideo(raw: any): Video {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description || '',
    thumbnailUrl: raw.thumbnailUrl || '',
    duration: raw.duration || 0,
    channel: raw.user?.username || 'Unknown',
    channelAvatar: raw.user?.avatarUrl,
    uploadedAt: raw.createdAt,
    views: raw.views ?? 0,
    status: raw.status || 'pending',
    tags: [],
    hlsUrl: raw.hlsUrl,
    watchProgress: raw.watchProgress,
    failureReason: raw.failureReason || null,
  }
}

const POLLING_STATUSES = new Set(['pending', 'processing'])

export function useMyVideos() {
  return useQuery({
    queryKey: ['my-videos'],
    queryFn: async () => {
      const data = await api<any[]>('/videos/mine')
      return data.map(toVideo)
    },
    refetchInterval: (query) => {
      const videos = query.state.data
      if (!videos) return 5_000
      const hasActiveUploads = videos.some((v) => POLLING_STATUSES.has(v.status))
      return hasActiveUploads ? 5_000 : false
    },
  })
}
