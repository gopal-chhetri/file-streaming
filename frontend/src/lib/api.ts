const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface JwtPayload {
  sub: string
  email: string
  role: string
  exp: number
  iat: number
}

function decodeToken(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

async function getFreshToken(): Promise<string | null> {
  const token = localStorage.getItem('aura-token')
  if (!token) return null
  const payload = decodeToken(token)
  if (!payload) return null

  // If token expires in more than 30 seconds, use it as-is
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp > now + 30) return token

  // Otherwise, try to refresh
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      localStorage.removeItem('aura-token')
      return null
    }
    const { accessToken } = await res.json()
    localStorage.setItem('aura-token', accessToken)
    return accessToken
  } catch {
    return null
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getFreshToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

