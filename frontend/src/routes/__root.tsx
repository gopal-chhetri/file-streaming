import { createRootRoute, Outlet } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../hooks/use-auth'
import { AppShell } from '../layouts/app-shell'

const queryClient = new QueryClient()

export const Route = createRootRoute({
  component: Root,
})

function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </AuthProvider>
    </QueryClientProvider>
  )
}
