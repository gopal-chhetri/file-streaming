import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '../__root'
import { useAdminStats } from '../../hooks/use-admin'
import { useVideos } from '../../hooks/use-videos'
import { Button } from '../../components/ui/button'
import {
  Plus,
  MonitorPlay,
  Users,
  HardDrives,
  ArrowsLeftRight,
  Clock,
  ShieldWarning,
} from '@phosphor-icons/react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminDashboard,
})

function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminStats()
  const { data: videos, isLoading: videosLoading } = useVideos()

  const cards = [
    { label: 'Total Videos', value: stats?.totalVideos ?? '-', icon: MonitorPlay, color: 'accent' },
    { label: 'Total Users', value: stats?.totalUsers ?? '-', icon: Users, color: 'secondary' },
    { label: 'Storage Used', value: stats ? `${stats.storageUsedGb} GB` : '-', icon: HardDrives, color: 'accent' },
    { label: 'Active Sessions', value: stats?.activeSessions ?? '-', icon: ArrowsLeftRight, color: 'secondary' },
    { label: 'Views (24h)', value: stats?.totalViews24h ?? '-', icon: Clock, color: 'accent' },
    { label: 'Pending Review', value: stats?.pendingReview ?? '-', icon: ShieldWarning, color: 'secondary' },
  ]

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-text-primary">Dashboard</h1>
          <p className="mt-0.5 text-sm text-text-muted">Overview of your streaming platform</p>
        </div>
        <Button size="sm">
          <Plus size={16} weight="bold" />
          <span>Upload</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6 stagger">
        {cards.map((card) => (
          <div
            key={card.label}
            className="group rounded-xl border border-border bg-surface p-5 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-text-muted">{card.label}</p>
              <div
                className={`rounded-lg p-2 transition-all duration-150 ${
                  card.color === 'accent'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-secondary-bg text-secondary'
                }`}
              >
                <card.icon size={18} weight="fill" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-medium text-text-primary">
              {statsLoading ? (
                <span className="inline-block h-6 w-16 animate-shimmer rounded" />
              ) : (
                card.value
              )}
            </p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-text-secondary">Recent Videos</h2>
        {videosLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 animate-shimmer rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            {videos?.slice(0, 5).map((v, i) => (
              <div
                key={v.id}
                className="flex items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-0 transition-colors hover:bg-accent/5"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-subtle text-xs font-medium text-text-muted">
                  {i + 1}
                </span>
                <span className="flex-1 truncate font-medium text-text-primary">
                  {v.title}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    v.status === 'active'
                      ? 'bg-success/10 text-success'
                      : v.status === 'processing'
                        ? 'bg-warning/10 text-warning'
                        : v.status === 'failed' || v.status === 'banned'
                          ? 'bg-danger/10 text-danger'
                          : 'bg-subtle text-text-muted'
                  }`}
                >
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
