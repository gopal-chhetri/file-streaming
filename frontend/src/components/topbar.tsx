import { Link, useLocation } from '@tanstack/react-router'
import { List, Sun, Moon, CloudArrowUp } from '@phosphor-icons/react'
import { clsx } from '../lib/clsx'
import { UserDropdown } from './user-dropdown'
import { useTheme } from '../hooks/use-theme'

interface TopbarProps {
  onToggleSidebar?: () => void
}

const navLinks = [
  { to: '/browse', label: 'Browse' },
  { to: '/library', label: 'Library' },
  { to: '/watch-history', label: 'History' },
]

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const location = useLocation()
  const { theme, toggle: toggleTheme } = useTheme()

  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-page px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-text-secondary transition-all duration-150 hover:bg-accent/10 hover:text-accent lg:hidden"
        >
          <List size={18} weight="bold" />
        </button>
        <Link
          to="/browse"
          className="flex items-center gap-2 text-text-primary transition-all duration-150 hover:text-accent"
        >
          <img src="/logo.png" alt="Aurora" className="h-7 w-auto" />
          <span className="hidden sm:inline text-base font-medium tracking-tight">Aurora</span>
        </Link>
      </div>

      {!isAdmin && (
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active =
              location.pathname === link.to ||
              (link.to !== '/browse' && location.pathname.startsWith(link.to))
            return (
              <Link
                key={link.to}
                to={link.to}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-secondary hover:bg-accent/5 hover:text-accent',
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>
      )}

      <div className="flex items-center gap-2">
        {!isAdmin && (
          <Link
            to="/upload"
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary transition-all duration-150 hover:bg-accent/10 hover:text-accent"
          >
            <CloudArrowUp size={18} />
            <span className="hidden sm:inline">Upload</span>
          </Link>
        )}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-text-secondary transition-all duration-150 hover:bg-accent/10 hover:text-accent"
          title={`Theme: ${theme}`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <UserDropdown />
      </div>
    </header>
  )
}
