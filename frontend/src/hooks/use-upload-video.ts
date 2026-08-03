import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

interface InitiateUploadResult {
  videoId: string
  uploadUrl?: string
  objectKey: string
  multipart?: boolean
  uploadId?: string
  partSize?: number
  totalParts?: number
}

const MULTIPART_CONCURRENCY = 4

export function useUploadVideo() {
  const queryClient = useQueryClient()

  async function uploadSinglePut(file: File, uploadUrl: string): Promise<void> {
    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    })
  }

  async function uploadMultipart(
    file: File,
    videoId: string,
    uploadId: string,
    partSize: number,
    totalParts: number,
  ): Promise<void> {
    const parts: { partNumber: number; etag: string }[] = []

    async function uploadPart(partNumber: number) {
      const start = (partNumber - 1) * partSize
      const end = Math.min(start + partSize, file.size)
      const chunk = file.slice(start, end)

      const { url } = await api<{ url: string }>(
        `/videos/${videoId}/part-url?partNumber=${partNumber}&uploadId=${uploadId}`,
      )

      const res = await fetch(url, {
        method: 'PUT',
        body: chunk,
        headers: { 'Content-Type': 'application/octet-stream' },
      })
      if (!res.ok) throw new Error(`Part ${partNumber} upload failed: ${res.status}`)

      const etag = res.headers.get('ETag')
      if (!etag) throw new Error(`Missing ETag for part ${partNumber}`)
      parts.push({ partNumber, etag })
    }

    const queue: (() => Promise<void>)[] = []
    for (let i = 1; i <= totalParts; i++) {
      queue.push(() => uploadPart(i))
    }

    const workers = Array.from({ length: MULTIPART_CONCURRENCY }, async () => {
      while (queue.length > 0) {
        const task = queue.shift()!
        await task()
      }
    })
    await Promise.all(workers)

    await api(`/videos/${videoId}/complete-upload`, {
      method: 'POST',
      body: JSON.stringify({ uploadId, parts }),
    })
  }

  return useMutation({
    mutationFn: async ({
      file,
      title,
      description,
    }: {
      file: File
      title: string
      description?: string
    }) => {
      const result = await api<InitiateUploadResult>('/videos/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
        }),
      })

      if (result.multipart && result.uploadId) {
        await uploadMultipart(
          file,
          result.videoId,
          result.uploadId,
          result.partSize!,
          result.totalParts!,
        )
      } else if (result.uploadUrl) {
        await uploadSinglePut(file, result.uploadUrl)
        await api(`/videos/${result.videoId}/complete-upload`, {
          method: 'POST',
          body: JSON.stringify({}),
        })
      }

      return result.videoId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      queryClient.invalidateQueries({ queryKey: ['my-videos'] })
    },
  })
}
