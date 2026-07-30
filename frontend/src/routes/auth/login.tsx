import { createRoute, useNavigate, Link } from '@tanstack/react-router'
import { Route as rootRoute } from '../__root'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { useAuth } from '../../hooks/use-auth'
import { useState, useEffect } from 'react'
import { MonitorPlay } from '@phosphor-icons/react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/login',
  component: LoginPage,
})

function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) navigate({ to: user.role === 'admin' ? '/admin' : '/browse' })
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const u = await login(email, password)
      navigate({ to: u.role === 'admin' ? '/admin' : '/browse' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-4">
      <div className="w-full max-w-sm animate-in">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
              <MonitorPlay size={24} weight="fill" className="text-accent" />
            </div>
            <h1 className="text-2xl font-medium text-text-primary">Aurora</h1>
            <p className="mt-1 text-sm text-text-muted">Sign in to your account</p>
          </div>
          <div className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-md">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
            {error && (
              <p className="text-sm text-danger bg-danger/10 rounded-md px-3 py-2">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </div>
          <p className="text-center text-sm text-text-muted">
            Don't have an account?{' '}
            <Link to="/auth/register" className="text-accent hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
