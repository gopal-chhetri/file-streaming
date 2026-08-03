import { createRoute, useNavigate, Link } from '@tanstack/react-router'
import { Route as rootRoute } from '../__root'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { useAuth } from '../../hooks/use-auth'
import { useState, useEffect } from 'react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/register',
  component: RegisterPage,
})

function RegisterPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) navigate({ to: user.role === 'admin' ? '/admin' : '/browse' })
  }, [user, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const u = await register({ email, username, password, firstName, lastName })
      navigate({ to: u.role === 'admin' ? '/admin' : '/browse' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-15rem)] items-center justify-center p-4">
      <div className="w-full max-w-sm animate-in">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center">
            <img src="/logo.png" alt="Aurora" className="mx-auto mb-4 h-12 w-12 rounded-xl object-contain" />
            <h1 className="text-2xl font-medium text-text-primary">Aurora</h1>
            <p className="mt-1 text-sm text-text-muted">Create your account</p>
          </div>
          <div className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-md">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                placeholder="John"
              />
              <Input
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                placeholder="Doe"
              />
            </div>
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="johndoe"
            />
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
              Create Account
            </Button>
          </div>
          <p className="text-center text-sm text-text-muted">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
