import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { List, Sun, Moon, CloudArrowUp, MagnifyingGlass } from '@phosphor-icons/react'
import { useState, useEffect } from 'react'
import { clsx } from '../lib/clsx'
import { UserDropdown } from './user-dropdown'
import { useTheme } from '../hooks/use-theme'

interface TopbarProps {
  onToggleSidebar?: () => void
}

const navLinks = [
  { to: '/browse', label: 'Browse' },
  { to: '/watch-later', label: 'Watch Later' },
  { to: '/watch-history', label: 'History' },
]

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggle: toggleTheme } = useTheme()
  const [query, setQuery] = useState('')

  const isAdmin = location.pathname.startsWith('/admin')

  // Keep the search box in sync with the URL ?q param (e.g. after searching)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setQuery(params.get('q') || '')
  }, [location.search])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    navigate({ to: '/browse', search: q ? { q } : {} })
  }

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-page px-4">
      <div className="flex shrink-0 items-center gap-3">
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

      <form
        onSubmit={handleSearch}
        className="mx-auto hidden w-full max-w-xl flex-1 sm:block"
      >
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full rounded-full border border-border bg-surface py-1.5 pl-4 pr-10 text-sm text-text-primary outline-none transition-all duration-150 placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          <button
            type="submit"
            className="absolute right-0 top-0 flex h-full items-center rounded-r-full px-3.5 text-text-secondary transition-colors hover:text-accent"
            title="Search"
          >
            <MagnifyingGlass size={16} weight="bold" />
          </button>
        </div>
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:ml-0">
        {!isAdmin && (
          <nav className="hidden items-center gap-1 xl:flex">
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
