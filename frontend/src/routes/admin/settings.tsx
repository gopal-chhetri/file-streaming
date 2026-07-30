import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '../__root'
import { AdminLayout } from '../../layouts/admin-layout'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Gear } from '@phosphor-icons/react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/settings',
  component: AdminSettings,
})

function AdminSettings() {
  return (
    <AdminLayout>
    <div className="mx-auto max-w-lg space-y-6 animate-in">
      <div>
        <h1 className="text-xl font-medium text-text-primary">Settings</h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Configure your platform
        </p>
      </div>
      <div className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Gear size={16} weight="fill" className="text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">General</p>
            <p className="text-xs text-text-muted">Basic platform settings</p>
          </div>
        </div>
        <Input label="Site Name" defaultValue="Aurora" />
        <Input label="Max Upload Size (MB)" defaultValue="500" type="number" />
        <Input label="Allow Registration" defaultValue="true" />
        <div className="flex justify-end border-t border-border pt-4">
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
    </AdminLayout>
  )
}
