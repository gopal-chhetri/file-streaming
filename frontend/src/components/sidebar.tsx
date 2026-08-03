import { Link, useLocation } from '@tanstack/react-router'
  import {
  ClockCounterClockwise,
  Stack,
  BookOpen,
  Gear,
  MonitorPlay,
  FilmStrip,
  CloudArrowUp,
  Sidebar as SidebarIcon,
  SignOut,
  User,
  Users,
  ChartBar,
  Barricade,
  type IconWeight,
} from '@phosphor-icons/react'
import { clsx } from '../lib/clsx'
import { useAuth } from '../hooks/use-auth'

const navItems = [
  { to: '/browse', icon: Stack, label: 'Browse' },
  { to: '/watch-history', icon: ClockCounterClockwise, label: 'History' },
  { to: '/watch-later', icon: BookOpen, label: 'Watch Later' },
  { to: '/my-videos', icon: FilmStrip, label: 'Your Videos' },
  { to: '/upload', icon: CloudArrowUp, label: 'Upload' },
]

const adminNavItems = [
  { to: '/admin', icon: ChartBar, label: 'Dashboard' },
  { to: '/admin/videos', icon: MonitorPlay, label: 'Videos' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/audit', icon: Barricade, label: 'Audit' },
  { to: '/admin/settings', icon: Gear, label: 'Settings' },
]

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
  mobile?: boolean
  onClose?: () => void
}

export function Sidebar({ collapsed, onToggle, mobile, onClose }: SidebarProps) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'
  const items = isAdmin ? adminNavItems : navItems

  function NavLink({
    to,
    icon: Icon,
    label,
  }: {
    to: string
    icon: React.ComponentType<{ size?: number; weight?: IconWeight }>
    label: string
  }) {
    const active =
      location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
    return (
      <Link
        to={to}
        onClick={onClose}
        className={clsx(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
          active
            ? 'text-accent font-medium'
            : 'text-text-secondary hover:text-text-primary',
          collapsed && 'justify-center px-2',
        )}
      >
        {active && (
          <span className="absolute inset-0 rounded-lg bg-accent/10" />
        )}
        <span className="relative">
          <Icon size={20} weight={active ? 'fill' : 'regular'} />
        </span>
        {!collapsed && <span className="relative">{label}</span>}
        {collapsed && active && (
          <span className="absolute -right-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent" />
        )}
      </Link>
    )
  }

  function handleLogout() {
    logout()
  }
  return (
    <aside
      className={clsx(
        'flex h-full flex-col border-r border-border bg-surface transition-all duration-250 ease-[cubic-bezier(.4,0,.2,1)]',
        collapsed ? 'w-14' : 'w-55',
        mobile && 'w-55',
      )}
    >
      <div
        className={clsx(
          'flex h-14 items-center border-b border-border transition-all duration-150',
          collapsed ? 'justify-center px-0' : 'justify-between px-4',
        )}
      >
        <div className={clsx('flex items-center gap-2', collapsed && 'justify-center')}>
          <img src="/logo.png" alt="Aurora" className={clsx('h-7', collapsed ? 'w-7 object-contain' : 'w-auto')} />
          {!collapsed && (
            <span className="text-base font-medium tracking-tight text-text-primary">Aurora</span>
          )}
        </div>
        {!collapsed && !mobile && (
          <button
            onClick={onToggle}
            className="rounded-md p-1 text-text-muted transition-colors hover:bg-subtle hover:text-text-primary"
          >
            <SidebarIcon size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {items.map((item) => (
          <NavLink key={item.to} {...item} />
        ))}
      </nav>

      <div
        className={clsx(
          'border-t border-border p-2',
          collapsed && 'flex flex-col items-center',
        )}
      >
        {user ? (
          <>
            <Link
              to="/auth/login"
              onClick={onClose}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-secondary transition-all duration-150 hover:bg-accent/10 hover:text-accent',
                collapsed && 'justify-center px-2',
              )}
            >
              <div className="h-6 w-6 flex-shrink-0 overflow-hidden rounded-full bg-accent/20 ring-1 ring-border">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-accent">
                    {user.firstName[0]}
                  </div>
                )}
              </div>
              {!collapsed && (
                <span className="flex-1 truncate text-sm font-medium text-text-primary">
                  {user.firstName}
                </span>
              )}
            </Link>
            <button
              onClick={handleLogout}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-muted transition-all duration-150 hover:bg-danger/10 hover:text-danger',
                collapsed && 'justify-center px-2 mt-1',
              )}
              title="Sign Out"
            >
              <SignOut size={16} />
              {!collapsed && <span>Sign Out</span>}
            </button>
          </>
        ) : (
          <Link
            to="/auth/login"
            onClick={onClose}
            className={clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-secondary transition-all duration-150 hover:bg-accent/10 hover:text-accent',
              collapsed && 'justify-center px-2',
            )}
          >
            <User size={16} />
            {!collapsed && <span>Sign In</span>}
          </Link>
        )}
      </div>
    </aside>
  )
}
