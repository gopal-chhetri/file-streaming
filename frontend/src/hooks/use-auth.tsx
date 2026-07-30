import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import type { User } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const REFRESH_INTERVAL_MS = 10 * 60 * 1000

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => Promise<User>
  register: (data: {
    email: string
    username: string
    password: string
    firstName: string
    lastName: string
  }) => Promise<User>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

let _token: string | null = localStorage.getItem('aura-token')

function setToken(token: string) {
  _token = token
  localStorage.setItem('aura-token', token)
}

function clearToken() {
  _token = null
  localStorage.removeItem('aura-token')
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return null
    const { accessToken } = await res.json()
    return accessToken
  } catch {
    return null
  }
}

async function fetchUser(token: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch user')
  const data = await res.json()
  return {
    id: data.id,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    role: data.role?.name || data.role,
    avatarUrl: data.avatarUrl,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Periodic refresh
  useEffect(() => {
    if (!user) return
    const id = setInterval(async () => {
      const newToken = await refreshAccessToken()
      if (newToken) {
        setToken(newToken)
      } else {
        clearToken()
        setUser(null)
      }
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [user])

  // Hydrate from stored token
  useEffect(() => {
    const init = async () => {
      if (!_token) {
        const newToken = await refreshAccessToken()
        if (newToken) {
          setToken(newToken)
          try { setUser(await fetchUser(newToken)) } catch { clearToken() }
        }
        setIsLoading(false)
        return
      }

      try {
        setUser(await fetchUser(_token))
      } catch {
        const newToken = await refreshAccessToken()
        if (newToken) {
          setToken(newToken)
          try { setUser(await fetchUser(newToken)) } catch { clearToken() }
        } else {
          clearToken()
        }
      }
      setIsLoading(false)
    }
    init()
  }, [])

  async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail: email, password }),
      credentials: 'include',
    })
    if (!res.ok) throw new Error('Invalid email or password')
    const { accessToken } = await res.json()
    setToken(accessToken)
    const u = await fetchUser(accessToken)
    setUser(u)
    return u
  }

  async function register(data: {
    email: string
    username: string
    password: string
    firstName: string
    lastName: string
  }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Registration failed')
    }
    const { accessToken } = await res.json()
    setToken(accessToken)
    const u = await fetchUser(accessToken)
    setUser(u)
    return u
  }

  function logout() {
    clearToken()
    setUser(null)
    fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {})
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
