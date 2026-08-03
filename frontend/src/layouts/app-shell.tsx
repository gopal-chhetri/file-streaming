import { useState, useEffect, type ReactNode } from 'react'
import { useLocation } from '@tanstack/react-router'
import { Sidebar } from '../components/sidebar'
import { AdminSidebar } from '../components/admin-sidebar'
import { Topbar } from '../components/topbar'
import { LoginModal } from '../components/auth/login-modal'
import { clsx } from '../lib/clsx'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const isAdmin = location.pathname.startsWith('/admin')

  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileSidebarOpen])

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden lg:flex">
        {isAdmin ? (
          <AdminSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((c) => !c)}
          />
        ) : (
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((c) => !c)}
          />
        )}
      </div>

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div
        className={clsx(
          'fixed left-0 top-0 z-50 h-full transition-transform duration-250 ease-[cubic-bezier(.4,0,.2,1)] lg:hidden',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {isAdmin ? <AdminSidebar /> : <Sidebar mobile onClose={() => setMobileSidebarOpen(false)} />}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onToggleSidebar={() => setMobileSidebarOpen((c) => !c)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 lg:p-6 stagger">
            {children}
          </div>
        </main>
      </div>

      <LoginModal />
    </div>
  )
}
