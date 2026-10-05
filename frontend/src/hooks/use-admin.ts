/**
 * @file use-admin.ts
 * @description React Query hooks for administrative operations including user management,
 * video moderation, system statistics, and audit logs.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { User } from '../types'

/**
 * Administrative statistics representing the platform health and activity.
 */
export interface AdminStats {
  totalVideos: number
  totalUsers: number
  storageUsedGb: number
  activeSessions: number
  pendingReview: number
  totalViews24h: number
}

/**
 * Single entry in the system audit log representing administrator or system actions.
 */
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

/**
 * Extended User properties containing administrative fields.
 */
export interface AdminUser extends User {
  username: string
  isActive: boolean
  createdAt: string
}

/**
 * Hook to fetch high-level system metrics and statistics for the admin dashboard.
 * @returns React Query result containing AdminStats
 */
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api<AdminStats>('/admin/stats'),
    staleTime: 60_000,
  })
}

/**
 * Hook to fetch system action audit logs.
 * @returns React Query result containing an array of AuditEntry
 */
export function useAuditLog() {
  return useQuery({
    queryKey: ['audit-log'],
    queryFn: () => api<AuditEntry[]>('/admin/audit-log'),
    staleTime: 60_000,
  })
}

/**
 * Hook to fetch the list of all registered users. Maps relational role structures to clean strings.
 * @returns React Query result containing AdminUser[]
 */
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

/**
 * Mutation to update a user's role (e.g. from user to admin).
 * Invalidates users list, admin stats, and audit logs on success.
 */
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

/**
 * Mutation to activate or deactivate a user account.
 * Invalidates users list, admin stats, and audit logs on success.
 */
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

/**
 * Mutation to hard delete a user from the system.
 * Invalidates users list and admin stats on success.
 */
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

/**
 * Mutation to moderate (approve, reject, flag, or ban) an uploaded video.
 * Invalidates admin stats, videos list, and audit logs on success.
 */
export function useModerateVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      videoId,
      action,
      reason,
    }: {
      videoId: string
      action: 'approve' | 'reject' | 'flag_pending' | 'flag_banned'
      reason?: string
    }) =>
      api(`/admin/videos/${videoId}/moderate`, {
        method: 'PATCH',
        body: JSON.stringify({ action, reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })
      queryClient.invalidateQueries({ queryKey: ['reported-videos'] })
    },
  })
}

/**
 * A video users have reported. Reports don't change a video's status; they
 * only flag it here for an admin to review.
 */
export interface ReportedVideo {
  videoId: string
  reports: number
  lastReportedAt: string
}

/**
 * Hook to fetch reported videos (most-reported first) for the moderation queue.
 * @returns React Query result containing ReportedVideo[]
 */
export function useReportedVideos() {
  return useQuery({
    queryKey: ['reported-videos'],
    queryFn: () => api<ReportedVideo[]>('/admin/videos/reported'),
    staleTime: 60_000,
  })
}
