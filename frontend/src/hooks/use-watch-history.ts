import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { WatchHistory } from '../types'

export function useWatchHistory(enabled = true) {
  return useQuery({
    queryKey: ['watch-history'],
    enabled,
    queryFn: () => api<WatchHistory[]>('/watch-history'),
    staleTime: 60_000,
  })
}

export function useWatchProgressMap(enabled = true) {
  const { data } = useWatchHistory(enabled)
  return useMemo(() => {
    const map: Record<string, number> = {}
    for (const h of data ?? []) {
      map[h.videoId] = h.progress
    }
    return map
  }, [data])
}

export function useUpdateProgress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ videoId, progress }: { videoId: string; progress: number }) =>
      api(`/videos/${videoId}/progress`, {
        method: 'POST',
        body: JSON.stringify({ progress }),
      }),
    onMutate: async ({ videoId, progress }) => {
      await queryClient.cancelQueries({ queryKey: ['watch-history'] })
      const previous = queryClient.getQueryData<WatchHistory[]>([
        'watch-history',
      ])
      queryClient.setQueryData<WatchHistory[]>(
        ['watch-history'],
        (old) =>
          old
            ? old.map((h) =>
                h.videoId === videoId ? { ...h, progress } : h,
              )
            : old,
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['watch-history'], context.previous)
      }
    },
    onSuccess: (_data, { progress }) => {
      if (progress >= 100) {
        queryClient.invalidateQueries({ queryKey: ['watch-later'] })
      }
    },
  })
}

export function useProgress(videoId: string) {
  return useQuery({
    queryKey: ['watch-progress', videoId],
    queryFn: () =>
      api<{ videoId: string; progress: number; watchedAt: string | null }>(
        `/watch-history/${videoId}`,
      ),
    staleTime: 300_000,
  })
}

