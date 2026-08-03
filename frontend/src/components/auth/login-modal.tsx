import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../../hooks/use-auth'
import { LoginForm } from './login-form'
import { X } from '@phosphor-icons/react'

export function LoginModal() {
  const { sessionExpired, dismissSessionExpired } = useAuth()

  useEffect(() => {
    if (!sessionExpired) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismissSessionExpired()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [sessionExpired, dismissSessionExpired])

  if (!sessionExpired) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={dismissSessionExpired} />
      <div className="relative z-10 w-full max-w-sm animate-in rounded-xl border border-border bg-surface p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Aurora" className="h-7 w-7 rounded-md object-contain" />
            <h2 className="text-base font-medium text-text-primary">Session expired</h2>
          </div>
          <button
            onClick={dismissSessionExpired}
            className="rounded-lg p-1 text-text-muted transition-colors hover:bg-accent/10 hover:text-text-primary"
            title="Continue browsing as guest"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-sm text-text-muted">
          Your session has expired. Sign in to continue, or keep browsing as a guest.
        </p>
        <LoginForm />
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <button
            onClick={dismissSessionExpired}
            className="text-sm text-text-secondary transition-colors hover:text-accent"
          >
            Browse as guest
          </button>
          <Link
            to="/auth/register"
            onClick={dismissSessionExpired}
            className="text-sm text-accent hover:underline"
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  )
}
