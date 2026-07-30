import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { BrowseLayout } from '../layouts/browse-layout'
import { useAnalyticsDashboard } from '../hooks/use-analytics'
import {
  ChartBar,
  PlayCircle,
  Users,
  Clock,
  Video as VideoIcon,
} from '@phosphor-icons/react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics',
  component: AnalyticsPage,
})

function AnalyticsPage() {
  const { data: summary, isLoading } = useAnalyticsDashboard()

  const cards = [
    {
      label: 'Total Views',
      value: summary?.totalViews ?? '-',
      icon: PlayCircle,
    },
    {
      label: 'Unique Viewers',
      value: summary?.uniqueViewers ?? '-',
      icon: Users,
    },
    {
      label: 'Completion Rate',
      value: summary ? `${summary.completionRate}%` : '-',
      icon: ChartBar,
    },
    {
      label: 'Watch Time',
      value: summary ? `${summary.totalWatchTimeHours}h` : '-',
      icon: Clock,
    },
    {
      label: 'Videos Tracked',
      value: summary?.videoCount ?? '-',
      icon: VideoIcon,
    },
  ]

  return (
    <BrowseLayout>
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-xl font-medium text-text-primary">Analytics</h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Engagement metrics across the platform
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 animate-shimmer rounded-xl border border-border bg-surface" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-border bg-surface p-5 transition-all duration-150 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm text-text-muted">{card.label}</p>
                <div className="rounded-lg bg-accent/10 p-2 text-accent">
                  <card.icon size={18} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-semibold text-text-primary">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (!summary || summary.totalViews === 0) && (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <ChartBar size={40} className="mb-3 opacity-30" />
          <p className="text-sm">No analytics data yet</p>
          <p className="text-xs text-text-muted mt-1">
            Data will appear once viewers start watching videos
          </p>
        </div>
      )}
    </div>
    </BrowseLayout>
  )
}
