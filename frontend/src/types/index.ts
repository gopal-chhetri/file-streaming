export type VideoStatus = 'pending' | 'pending_review' | 'processing' | 'ready' | 'failed'

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
  progress: number
  watchedAt: string
}

