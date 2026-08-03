import { createRoute, useNavigate, Link } from '@tanstack/react-router'
import { Route as rootRoute } from '../__root'
import { useAuth } from '../../hooks/use-auth'
import { useEffect } from 'react'
import { LoginForm } from '../../components/auth/login-form'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/login',
  component: LoginPage,
})

function LoginPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate({ to: user.role === 'admin' ? '/admin' : '/browse' })
  }, [user, navigate])

  return (
    <div className="flex min-h-[calc(100dvh-15rem)] items-center justify-center p-4">
      <div className="w-full max-w-sm animate-in">
        <div className="space-y-6">
          <div className="text-center">
            <img src="/logo.png" alt="Aurora" className="mx-auto mb-4 h-12 w-12 rounded-xl object-contain" />
            <h1 className="text-2xl font-medium text-text-primary">Aurora</h1>
            <p className="mt-1 text-sm text-text-muted">Sign in to your account</p>
          </div>
          <div className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-md">
            <LoginForm />
          </div>
          <p className="text-center text-sm text-text-muted">
            Don't have an account?{' '}
            <Link to="/auth/register" className="text-accent hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
