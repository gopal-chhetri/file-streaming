import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  User,
  SignOut,
  BookOpen,
  ClockCounterClockwise,
  Gear,
  Shield,
} from '@phosphor-icons/react'
import { clsx } from '../lib/clsx'
import { useAuth } from '../hooks/use-auth'

export function UserDropdown() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleLogout() {
    logout()
    setOpen(false)
    navigate({ to: '/auth/login' })
  }

  if (!user) {
    return (
      <Link
        to="/auth/login"
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary transition-all duration-150 hover:bg-accent/10 hover:text-accent"
      >
        <User size={18} />
        <span className="hidden sm:inline">Sign In</span>
      </Link>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-secondary transition-all duration-150 hover:bg-accent/10 hover:text-accent',
          open && 'bg-accent/10 text-accent',
        )}
      >
        <div className="h-7 w-7 overflow-hidden rounded-full bg-accent/20 ring-1 ring-border">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-medium text-accent">
              {user.firstName[0]}{user.lastName[0]}
            </div>
          )}
        </div>
        <span className="hidden sm:inline text-sm font-medium">{user.firstName}</span>
      </button>

      {open && (
        <div
          className={clsx(
            'absolute right-0 top-full z-50 mt-1.5 min-w-[200px] origin-top-right',
            'rounded-xl border border-border bg-surface p-1.5 shadow-lg',
            'animate-in',
          )}
        >
          <div className="border-b border-border px-3 py-2">
            <p className="text-sm font-medium text-text-primary">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-text-muted">{user.email}</p>
          </div>

          <div className="mt-1 space-y-0.5">
            <DropdownItem to="/library" icon={BookOpen} label="Library" onClick={() => setOpen(false)} />
            <DropdownItem to="/watch-history" icon={ClockCounterClockwise} label="History" onClick={() => setOpen(false)} />

            {user.role === 'admin' && (
              <>
                <div className="my-1 border-t border-border" />
                <DropdownItem to="/admin" icon={Shield} label="Admin Dashboard" onClick={() => setOpen(false)} />
                <DropdownItem to="/admin/settings" icon={Gear} label="Settings" onClick={() => setOpen(false)} />
              </>
            )}
          </div>

          <div className="mt-1 border-t border-border pt-1">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger transition-all duration-150 hover:bg-danger/10"
            >
              <SignOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DropdownItem({
  to,
  icon: Icon,
  label,
  onClick,
}: {
  to: string
  icon: React.ComponentType<{ size?: number }>
  label: string
  onClick: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary transition-all duration-150 hover:bg-accent/10 hover:text-accent"
    >
      <Icon size={16} />
      <span>{label}</span>
    </Link>
  )
}
