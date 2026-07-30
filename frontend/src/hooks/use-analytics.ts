import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

interface DashboardSummary {
  totalViews: number
  uniqueViewers: number
  completionRate: number
  totalWatchTimeHours: number
  videoCount: number
}

export function useAnalyticsDashboard() {
  return useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => api<DashboardSummary>('/analytics/dashboard/summary'),
    staleTime: 120_000,
  })
}

export function sendHeartbeat(
  sessionId: string,
  videoId: string,
  position: number,
  duration: number,
  eventType: 'play' | 'pause' | 'heartbeat' | 'seek' | 'end',
) {
  api('/analytics/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ sessionId, videoId, position, duration, eventType }),
  }).catch(() => {})
}
