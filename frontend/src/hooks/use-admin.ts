import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { User, Video } from '../types'

export interface AdminStats {
  totalVideos: number
  totalUsers: number
  storageUsedGb: number
  activeSessions: number
  pendingReview: number
  totalViews24h: number
}

export interface AuditEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  actor: { id: string; firstName: string; lastName: string; email: string }
  metadata: Record<string, unknown> | null
  ip: string | null
  createdAt: string
}

export interface AdminUser extends User {
  username: string
  isActive: boolean
  createdAt: string
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api<AdminStats>('/admin/stats'),
    staleTime: 60_000,
  })
}

export function usePendingVideos() {
  return useQuery({
    queryKey: ['pending-videos'],
    queryFn: () => api<Video[]>('/admin/pending'),
    staleTime: 30_000,
  })
}

export function useAuditLog() {
  return useQuery({
    queryKey: ['audit-log'],
    queryFn: () => api<AuditEntry[]>('/admin/audit-log'),
    staleTime: 60_000,
  })
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const data = await api<any[]>('/users')
      return data.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        role: typeof u.role === 'string' ? u.role : (u.role?.name || 'user'),
        isActive: u.isActive,
        createdAt: u.createdAt,
        avatarUrl: u.avatarUrl,
      })) as AdminUser[]
    },
    staleTime: 30_000,
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, roleName }: { userId: string; roleName: string }) =>
      api(`/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ roleName }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
    },
  })
}

export function useToggleActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      api(`/users/${userId}/toggle-active`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      api(`/users/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

export function useModerateVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      videoId,
      action,
      reason,
    }: {
      videoId: string
      action: 'approve' | 'reject'
      reason?: string
    }) =>
      api(`/admin/videos/${videoId}/moderate`, {
        method: 'PATCH',
        body: JSON.stringify({ action, reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-videos'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
    },
  })
}
