import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

interface InitiateUploadResult {
  videoId: string
  uploadUrl: string
  objectKey: string
}

export function useUploadVideo() {
  const queryClient = useQueryClient()

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
      const { videoId, uploadUrl } = await api<InitiateUploadResult>(
        '/videos/upload-url',
        {
          method: 'POST',
          body: JSON.stringify({
            title,
            description,
            filename: file.name,
            mimeType: file.type,
            size: file.size,
          }),
        },
      )

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!uploadRes.ok) throw new Error('Upload to storage failed')

      return videoId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    },
  })
}
