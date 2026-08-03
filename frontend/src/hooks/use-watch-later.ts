import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
    failureReason: raw.failureReason || null,
    watchProgress: raw.watchProgress,
  }
}

export function useWatchLater(enabled = true) {
  return useQuery({
    queryKey: ['watch-later'],
    enabled,
    queryFn: async () => {
      const data = await api<any[]>('/watch-later')
      return data.map(toVideo)
    },
    staleTime: 30_000,
  })
}

export function useWatchLaterIds(enabled = true) {
  const { data } = useWatchLater(enabled)
  return new Set((data ?? []).map((v) => v.id))
}

export function useToggleWatchLater() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ videoId, isSaved }: { videoId: string; isSaved: boolean }) =>
      api(isSaved ? `/videos/${videoId}/watch-later` : `/videos/${videoId}/watch-later`, {
        method: isSaved ? 'DELETE' : 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watch-later'] })
    },
  })
}
