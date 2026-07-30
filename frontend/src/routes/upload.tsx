import { createRoute, useNavigate } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { BrowseLayout } from '../layouts/browse-layout'
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !title.trim()) return

    const videoId = await upload.mutateAsync({
      file,
      title: title.trim(),
      description: description.trim() || undefined,
    })
    navigate({ to: '/watch/$videoId', params: { videoId } })
  }

  return (
    <BrowseLayout>
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
                  <p className="text-xs text-text-muted">MP4, WebM, or other formats</p>
                </div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
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

          {upload.error && (
            <p className="text-sm text-danger bg-danger/10 rounded-md px-3 py-2">
              {upload.error instanceof Error ? upload.error.message : 'Upload failed'}
            </p>
          )}

          <Button type="submit" disabled={!file || !title.trim() || upload.isPending} className="w-full">
            {upload.isPending ? 'Uploading...' : 'Upload'}
          </Button>
        </form>
      </div>
    </BrowseLayout>
  )
}
