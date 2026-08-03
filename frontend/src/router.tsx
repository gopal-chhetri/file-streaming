import { createRouter } from '@tanstack/react-router'
import { Route as rootRoute } from './routes/__root'
import { Route as indexRoute } from './routes/index'
import { Route as browseRoute } from './routes/browse/index'
import { Route as watchRoute } from './routes/watch/$videoId'
import { Route as watchLaterRoute } from './routes/watch-later'
import { Route as watchHistoryRoute } from './routes/watch-history'
import { Route as uploadRoute } from './routes/upload'
import { Route as myVideosRoute } from './routes/my-videos'
import { Route as loginRoute } from './routes/auth/login'
import { Route as registerRoute } from './routes/auth/register'
import { Route as analyticsRoute } from './routes/analytics'
import { Route as adminRoute } from './routes/admin/index'
import { Route as adminVideosRoute } from './routes/admin/videos'
import { Route as adminUsersRoute } from './routes/admin/users'
import { Route as adminAuditRoute } from './routes/admin/audit'
import { Route as adminSettingsRoute } from './routes/admin/settings'

const routeTree = rootRoute.addChildren([
  indexRoute,
  browseRoute,
  watchRoute,
  uploadRoute,
  myVideosRoute,
  watchLaterRoute,
  watchHistoryRoute,
  loginRoute,
  registerRoute,
  analyticsRoute,
  adminRoute.addChildren([
    adminVideosRoute,
    adminUsersRoute,
    adminAuditRoute,
    adminSettingsRoute,
  ]),
])

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: () => (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center text-text-muted">
      <div className="text-center">
        <h1 className="text-4xl font-medium">404</h1>
        <p className="mt-2">Page not found</p>
      </div>
    </div>
  ),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
