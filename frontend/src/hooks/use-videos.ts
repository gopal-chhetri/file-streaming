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
    views: 0,
    status: raw.status || 'pending',
    tags: [],
    hlsUrl: raw.hlsUrl,
    watchProgress: raw.watchProgress,
  }
}

export function useVideos(filters?: { status?: string; category?: string }) {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.category) params.set('category', filters.category)

  return useQuery({
    queryKey: ['videos', filters],
    queryFn: async () => {
      const data = await api<any[]>(`/videos?${params}`)
      return data.map(toVideo)
    },
    staleTime: 60_000,
  })
}

export function useVideo(videoId: string) {
  return useQuery({
    queryKey: ['video', videoId],
    queryFn: async () => {
      const data = await api<any>(`/videos/${videoId}`)
      return toVideo(data)
    },
    staleTime: 300_000,
  })
}
