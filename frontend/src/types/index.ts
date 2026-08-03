export type VideoStatus = 'pending' | 'pending_review' | 'processing' | 'active' | 'banned' | 'failed'

export type UserRole = 'admin' | 'staff' | 'user'

export interface Video {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  duration: number
  channel: string
  channelAvatar?: string
  uploadedAt: string
  views: number
  status: VideoStatus
  tags: string[]
  hlsUrl?: string
  watchProgress?: number
  failureReason?: string | null
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  avatarUrl?: string
}

export interface WatchHistory {
  videoId: string
  title: string
  thumbnailUrl: string | null
  channel?: string
  progress: number
  watchedAt: string
}

