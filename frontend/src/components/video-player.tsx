import { useRef, useEffect, useCallback, useState } from 'react'
import Hls from 'hls.js'
import {
  Play,
  Pause,
  ArrowsOut,
  SpeakerHigh,
  SpeakerNone,
} from '@phosphor-icons/react'

interface VideoPlayerProps {
  src: string
  poster?: string
  onProgress?: (progress: number) => void
  initialTime?: number
}

export function VideoPlayer({
  src,
  poster,
  onProgress,
  initialTime,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (Hls.isSupported() && src.includes('.m3u8')) {
      const hls = new Hls({})
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (initialTime) video.currentTime = initialTime
      })
      return () => hls.destroy()
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      if (initialTime) video.currentTime = initialTime
    } else {
      video.src = src
      if (initialTime) video.currentTime = initialTime
    }
  }, [src, initialTime])

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current
    if (!video || !duration) return
    setCurrentTime(video.currentTime)
    onProgress?.(Math.round((video.currentTime / duration) * 100))
  }, [duration, onProgress])

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }, [])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
      setPlaying(true)
    } else {
      video.pause()
      setPlaying(false)
    }
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      containerRef.current.requestFullscreen()
    }
  }, [])

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const video = videoRef.current
      if (!video || !duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      const pct = (e.clientX - rect.left) / rect.width
      video.currentTime = pct * duration
    },
    [duration],
  )

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (!playing) return
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowControls(false), 3000)
  }, [playing])

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-lg"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <div className="absolute -inset-20 bg-gradient-radial from-accent/5 via-transparent to-transparent pointer-events-none" />

      <video
        ref={videoRef}
        poster={poster}
        className="relative h-full w-full cursor-pointer"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setPlaying(false)}
        playsInline
      />

      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-250 ${
          showControls || !playing
            ? 'opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
        onClick={togglePlay}
      >
        {!playing && (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent shadow-md transition-all duration-150 hover:scale-105 hover:brightness-110">
            <Play size={28} weight="fill" className="text-white" />
          </div>
        )}
      </div>

      <div
        className={`absolute bottom-0 left-0 right-0 p-4 pt-12 transition-all duration-250 ${
          showControls || !playing
            ? 'translate-y-0 opacity-100'
            : 'translate-y-2 opacity-0 pointer-events-none'
        }`}
        style={{
          background:
            'linear-gradient(transparent, rgba(0,0,0,.85))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="group mb-3 h-1 cursor-pointer rounded-full bg-white/20 transition-all duration-150 hover:h-1.5"
          onClick={handleSeek}
        >
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${duration ? (currentTime / duration) * 100 : 0}%`,
              background:
                'linear-gradient(90deg, var(--accent), var(--secondary))',
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="rounded-lg p-1.5 text-white/80 transition-all duration-150 hover:bg-white/10 hover:text-accent"
            >
              {playing ? (
                <Pause size={18} weight="fill" />
              ) : (
                <Play size={18} weight="fill" />
              )}
            </button>
            <button
              onClick={toggleMute}
              className="rounded-lg p-1.5 text-white/80 transition-all duration-150 hover:bg-white/10 hover:text-accent"
            >
              {muted ? (
                <SpeakerNone size={18} />
              ) : (
                <SpeakerHigh size={18} />
              )}
            </button>
            <span className="text-xs font-mono text-white/60">
              {fmt(currentTime)} / {fmt(duration)}
            </span>
          </div>
          <button
            onClick={toggleFullscreen}
            className="rounded-lg p-1.5 text-white/80 transition-all duration-150 hover:bg-white/10 hover:text-accent"
          >
            <ArrowsOut size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
