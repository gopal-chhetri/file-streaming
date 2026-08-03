import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  DotsThreeVertical,
  PencilSimple,
  Trash,
  ShareNetwork,
  Clock,
  Check,
  Flag,
  X,
  Copy,
  LinkSimple,
  FacebookLogo,
  TwitterLogo,
  InstagramLogo,
  DiscordLogo,
  MessengerLogo,
} from '@phosphor-icons/react'
import { api } from '../lib/api'
import { useAuth } from '../hooks/use-auth'
import { useWatchLaterIds, useToggleWatchLater } from '../hooks/use-watch-later'
import { Button } from './ui/button'
import { ConfirmDialog } from './ui/confirm-dialog'
import { clsx } from '../lib/clsx'
import type { Video } from '../types'

type MenuContext = 'mine' | 'browse'

interface VideoCardMenuProps {
  video: Video
  context: MenuContext
  position?: 'grid' | 'list'
  className?: string
}

export function VideoCardMenu({
  video,
  context,
  position = 'grid',
  className,
}: VideoCardMenuProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const ref = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const watchLaterIds = useWatchLaterIds(!!user)
  const toggleWatchLater = useToggleWatchLater()
  const isSaved = watchLaterIds.has(video.id)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      document.addEventListener('keydown', handleKey)
    }
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function stop(e: React.SyntheticEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['my-videos'] })
    queryClient.invalidateQueries({ queryKey: ['videos'] })
    queryClient.invalidateQueries({ queryKey: ['video', video.id] })
    queryClient.invalidateQueries({ queryKey: ['watch-later'] })
  }

  const isMine = context === 'mine'

  return (
    <div ref={ref} className={clsx('relative flex-shrink-0', className)}>
      <button
        onMouseDown={stop}
        onClick={(e) => {
          stop(e)
          setOpen((v) => !v)
        }}
        aria-label="More options"
        title="More options"
        className={clsx(
          'flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-all duration-150',
          'hover:bg-accent/10 hover:text-text-primary',
          open && 'bg-accent/10 text-text-primary',
        )}
      >
        <DotsThreeVertical size={18} weight="bold" />
      </button>

      {open && (
        <div
          onMouseDown={stop}
          onClick={stop}
          className={clsx(
            'absolute right-0 z-50 min-w-[190px] origin-top-right rounded-xl border border-border bg-surface p-1.5 shadow-lg animate-in',
            position === 'grid' ? 'bottom-full mb-1.5' : 'top-full mt-1',
          )}
        >
          {isMine && (
            <>
              <MenuItem
                icon={PencilSimple}
                label="Edit"
                onClick={() => {
                  setOpen(false)
                  setEditing(true)
                }}
              />
              <MenuItem
                icon={Trash}
                label="Delete"
                danger
                onClick={() => {
                  setOpen(false)
                  setDeleting(true)
                }}
              />
            </>
          )}

          {!isMine && user && (
            <MenuItem
              icon={isSaved ? Check : Clock}
              label={isSaved ? 'Remove from Watch Later' : 'Watch Later'}
              onClick={() => {
                setOpen(false)
                toggleWatchLater.mutate({ videoId: video.id, isSaved })
              }}
            />
          )}

          <MenuItem
            icon={ShareNetwork}
            label="Share"
            onClick={() => {
              setOpen(false)
              setSharing(true)
            }}
          />

          {!isMine && user && (
            <MenuItem
              icon={Flag}
              label="Report"
              danger
              onClick={() => {
                setOpen(false)
                setReporting(true)
              }}
            />
          )}
        </div>
      )}

      {editing &&
        createPortal(
          <EditVideoDialog
            video={video}
            onClose={() => setEditing(false)}
            onSaved={invalidate}
          />,
          document.body,
        )}
      {sharing &&
        createPortal(
          <ShareDialog video={video} onClose={() => setSharing(false)} />,
          document.body,
        )}
      {reporting &&
        createPortal(
          <ReportDialog
            video={video}
            onClose={() => setReporting(false)}
            onReported={invalidate}
          />,
          document.body,
        )}
      {deleting && (
        <ConfirmDialog
          open
          title="Delete video?"
          message={`"${video.title}" will be permanently deleted. This cannot be undone.`}
          onConfirm={() => {
            api(`/videos/${video.id}`, { method: 'DELETE' })
              .then(() => {
                invalidate()
                setDeleting(false)
              })
              .catch(() => setDeleting(false))
          }}
          onCancel={() => setDeleting(false)}
        />
      )}
    </div>
  )
}

function MenuItem({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number }>
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150',
        danger
          ? 'text-danger hover:bg-danger/10 hover:text-danger'
          : 'text-text-secondary hover:bg-accent/10 hover:text-accent',
      )}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  )
}

/* ---------- Edit dialog ---------- */

function EditVideoDialog({
  video,
  onClose,
  onSaved,
}: {
  video: Video
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(video.title)
  const [description, setDescription] = useState(video.description)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    setError(null)
    try {
      await api(`/videos/${video.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
        }),
      })
      onSaved()
      onClose()
    } catch {
      setError('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalShell onClose={onClose} title="Edit video">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-text-primary">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-page px-3 text-sm text-text-primary outline-none transition-colors focus:border-accent"
          placeholder="Video title"
        />
      </label>
      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-medium text-text-primary">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-border bg-page px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent"
          placeholder="Describe your video (optional)"
        />
      </label>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving || !title.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </ModalShell>
  )
}

/* ---------- Share dialog ---------- */

const PLATFORMS = [
  {
    name: 'Facebook',
    icon: FacebookLogo,
    url: (link: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
  },
  {
    name: 'X (Twitter)',
    icon: TwitterLogo,
    url: (link: string, title: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}&text=${encodeURIComponent(title)}`,
  },
  {
    name: 'Messenger',
    icon: MessengerLogo,
    url: () => 'https://www.messenger.com/',
  },
  {
    name: 'Instagram',
    icon: InstagramLogo,
    url: () => 'https://www.instagram.com/',
  },
  {
    name: 'Discord',
    icon: DiscordLogo,
    url: () => 'https://discord.com/app',
  },
]

function ShareDialog({ video, onClose }: { video: Video; onClose: () => void }) {
  const link =
    typeof window !== 'undefined'
      ? `${window.location.origin}/watch/${video.id}`
      : ''
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    await copyText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openPlatform(platform: (typeof PLATFORMS)[number]) {
    copyLink()
    window.open(platform.url(link, video.title), '_blank', 'noopener,noreferrer')
  }

  return (
    <ModalShell onClose={onClose} title="Share video">
      <p className="mb-4 text-sm text-text-muted">Share "{video.title}" with others</p>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-page p-2">
        <LinkSimple size={16} className="ml-1 shrink-0 text-text-muted" />
        <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">{link}</span>
        <Button size="sm" onClick={copyLink} disabled={copied}>
          {copied ? (
            <>
              <Check size={14} weight="bold" /> Copied
            </>
          ) : (
            <>
              <Copy size={14} /> Copy link
            </>
          )}
        </Button>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.name}
            onClick={() => openPlatform(p)}
            title={`Share on ${p.name}`}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent transition-all duration-150 hover:bg-accent hover:text-white"
          >
            <p.icon size={20} weight="fill" />
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-text-muted">
        Facebook and X open a share window; others open the platform with the link copied.
      </p>
    </ModalShell>
  )
}

/* ---------- Report dialog ---------- */

const REPORT_REASONS = [
  'Spam or misleading',
  'Harassment or hate speech',
  'Inappropriate content',
  'Copyright violation',
  'Other',
]

function ReportDialog({
  video,
  onClose,
  onReported,
}: {
  video: Video
  onClose: () => void
  onReported: () => void
}) {
  const [reason, setReason] = useState(REPORT_REASONS[0])
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      await api(`/videos/${video.id}/report`, {
        method: 'POST',
        body: JSON.stringify({
          reason: details.trim() ? `${reason}: ${details.trim()}` : reason,
        }),
      })
      onReported()
      setDone(true)
    } catch {
      setError('Failed to submit report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <ModalShell onClose={onClose} title="Report submitted">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <Check size={24} weight="bold" className="text-green-500" />
          </div>
          <p className="text-sm font-medium text-text-primary">Thanks for reporting</p>
          <p className="mt-1 max-w-xs text-sm text-text-muted">
            This video has been sent for review and removed from browsing while a moderator looks at it.
          </p>
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell onClose={onClose} title="Report video">
      <p className="mb-4 text-sm text-text-muted">
        Why are you reporting "{video.title}"?
      </p>
      <div className="space-y-1.5">
        {REPORT_REASONS.map((r) => (
          <label
            key={r}
            className={clsx(
              'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-all duration-150',
              reason === r
                ? 'border-accent bg-accent/5 text-text-primary'
                : 'border-border text-text-secondary hover:bg-accent/5',
            )}
          >
            <input
              type="radio"
              name="report-reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
              className="accent-accent"
            />
            {r}
          </label>
        ))}
      </div>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={3}
        placeholder="Additional details (optional)"
        className="mt-4 w-full rounded-lg border border-border bg-page px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent"
      />
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={submit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Report'}
        </Button>
      </div>
    </ModalShell>
  )
}

/* ---------- shared bits ---------- */

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm animate-in rounded-xl border border-border bg-surface p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-base font-medium text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted transition-colors hover:bg-accent/10 hover:text-text-primary"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}
