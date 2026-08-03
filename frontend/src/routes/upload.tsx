import { createRoute, useNavigate } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { useUploadVideo } from '../hooks/use-upload-video'
import { useState, useRef } from 'react'
import { CloudArrowUp, FileVideo } from '@phosphor-icons/react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/upload',
  component: UploadPage,
})

function UploadPage() {
  const navigate = useNavigate()
  const upload = useUploadVideo()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAllowedFile = (f: File) =>
    f.type.startsWith('video/') || f.type === 'image/gif' || /\.gif$/i.test(f.name)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title.trim()) return
    if (!isAllowedFile(file)) {
      setError('Incompatible file format. Supported formats: MP4, WebM, GIF and other video files.')
      return
    }

    setError(null)
    try {
      const videoId = await upload.mutateAsync({
        file,
        title: title.trim(),
        description: description.trim() || undefined,
      })

      setIsGeneratingThumbnail(true)

      const TERMINAL_STATUSES = new Set(['active', 'failed', 'banned'])
      const POLL_TIMEOUT_MS = 5 * 60 * 1000
      const startedAt = Date.now()

      // Poll until video has a thumbnail URL set (or processing fails)
      while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        try {
          const res = await fetch(`/api/videos/${videoId}`)
          if (res.ok) {
            const video = await res.json()
            if (video.thumbnailUrl) {
              break
            }
            if (TERMINAL_STATUSES.has(video.status)) {
              if (video.status === 'failed') {
                if (video.failureReason === 'INCOMPATIBLE_FILE') {
                  setError('Incompatible file format. Please upload a supported video file.')
                } else {
                  setError('Video processing failed. Please try again with a different file.')
                }
                throw new Error('Video processing failed')
              }
              throw new Error(`Video processing ${video.status}`)
            }
          }
        } catch (err) {
          if (err instanceof Error && err.message.startsWith('Video processing')) {
            throw err
          }
          console.error('Error polling video thumbnail:', err)
        }
      }

      navigate({ to: '/my-videos' })
    } catch (err) {
      console.error('Upload or processing failed:', err)
    } finally {
      setIsGeneratingThumbnail(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-in">
        <div>
          <h1 className="text-xl font-medium text-text-primary">Upload Video</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            Share a video with the community
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-page p-10 transition-all duration-150 hover:border-accent hover:bg-accent/5"
          >
            {file ? (
              <>
                <FileVideo size={32} className="text-accent" />
                <div className="text-center">
                  <p className="text-sm font-medium text-text-primary">{file.name}</p>
                  <p className="text-xs text-text-muted">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </>
            ) : (
              <>
                <CloudArrowUp size={32} className="text-text-muted" />
                <div className="text-center">
                  <p className="text-sm font-medium text-text-primary">
                    Click to select a video file
                  </p>
                  <p className="text-xs text-text-muted">MP4, WebM, GIF, or other formats</p>
                </div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,image/gif,.gif"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null)
              setError(null)
            }}
          />

          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Video title"
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your video (optional)"
          />

          {(upload.error || error) && (
            <p className="text-sm text-danger bg-danger/10 rounded-md px-3 py-2">
              {(error || (upload.error instanceof Error ? upload.error.message : 'Upload failed'))}
            </p>
          )}

          <Button type="submit" disabled={!file || !title.trim() || upload.isPending || isGeneratingThumbnail} className="w-full">
            {upload.isPending ? 'Uploading...' : isGeneratingThumbnail ? 'Generating Thumbnail...' : 'Upload'}
          </Button>
        </form>
    </div>
  )
}
