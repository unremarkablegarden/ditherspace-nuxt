import type { ExportAudioRate } from '~/utils/types'

export interface UseVideoDitherOptions {
  renderFrame: (source: HTMLVideoElement) => void
}

export function useVideoDither(opts: UseVideoDitherOptions) {
  const videoEl = shallowRef<HTMLVideoElement | null>(null)
  const sourceFile = shallowRef<File | null>(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)

  let rafId: number | null = null
  let lastVideoTime = -1
  let audioCtx: AudioContext | null = null
  let audioFilter: BiquadFilterNode | null = null
  let audioGain: GainNode | null = null
  let liveAudioRate: ExportAudioRate = 0

  function disposeVideo() {
    stop()
    if (videoEl.value) {
      try { URL.revokeObjectURL(videoEl.value.src) } catch {}
      videoEl.value.removeAttribute('src')
      videoEl.value.load()
    }
    videoEl.value = null
    sourceFile.value = null
    if (audioCtx) {
      try { audioCtx.close() } catch {}
      audioCtx = null
      audioFilter = null
      audioGain = null
    }
  }

  function loadVideo(file: File): Promise<void> {
    disposeVideo()
    sourceFile.value = file
    const v = document.createElement('video')
    v.crossOrigin = 'anonymous'
    v.preload = 'auto'
    v.muted = false
    v.src = URL.createObjectURL(file)
    videoEl.value = v

    return new Promise((resolve) => {
      v.addEventListener('loadedmetadata', () => {
        duration.value = v.duration
        v.currentTime = 0
        try {
          if (audioCtx) { try { audioCtx.close() } catch {} }
          audioCtx = new AudioContext()
          const src = audioCtx.createMediaElementSource(v)
          audioFilter = audioCtx.createBiquadFilter()
          audioFilter.type = 'lowpass'
          audioGain = audioCtx.createGain()
          src.connect(audioFilter)
          audioFilter.connect(audioGain)
          audioGain.connect(audioCtx.destination)
          applyLivePreviewAudio()
        } catch (e) {
          console.warn('Audio routing setup failed:', e)
        }
        resolve()
      }, { once: true })

      v.addEventListener('seeked', () => {
        currentTime.value = v.currentTime
        if (!isPlaying.value) opts.renderFrame(v)
      })

      v.addEventListener('ended', () => {
        isPlaying.value = false
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
      })
    })
  }

  function videoLoopRVFC() {
    const v = videoEl.value
    if (!v || !isPlaying.value) return
    opts.renderFrame(v)
    currentTime.value = v.currentTime
    if (!v.paused && !v.ended) {
      ;(v as any).requestVideoFrameCallback(videoLoopRVFC)
    }
  }

  function videoLoopRAF() {
    const v = videoEl.value
    if (!v || v.paused || v.ended) return
    if (v.currentTime !== lastVideoTime) {
      lastVideoTime = v.currentTime
      opts.renderFrame(v)
      currentTime.value = v.currentTime
    }
    rafId = requestAnimationFrame(videoLoopRAF)
  }

  function startVideoLoop() {
    const v = videoEl.value
    if (!v) return
    if (typeof (v as any).requestVideoFrameCallback === 'function') {
      ;(v as any).requestVideoFrameCallback(videoLoopRVFC)
    } else {
      lastVideoTime = -1
      rafId = requestAnimationFrame(videoLoopRAF)
    }
  }

  function play() {
    const v = videoEl.value
    if (!v) return
    v.play().catch(() => {})
    isPlaying.value = true
    if (audioCtx?.state === 'suspended') audioCtx.resume()
    startVideoLoop()
  }

  function pause() {
    const v = videoEl.value
    if (!v) return
    v.pause()
    isPlaying.value = false
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
  }

  function toggle() { isPlaying.value ? pause() : play() }

  function stop() {
    const v = videoEl.value
    if (!v) {
      isPlaying.value = false
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
      return
    }
    v.pause()
    v.currentTime = 0
    isPlaying.value = false
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
    opts.renderFrame(v)
    currentTime.value = 0
  }

  function seek(t: number) {
    const v = videoEl.value
    if (!v) return
    v.currentTime = t
    currentTime.value = t
  }

  function applyLivePreviewAudio() {
    if (!audioCtx || !audioFilter || !audioGain) return
    if (audioCtx.state === 'suspended') audioCtx.resume()
    if (liveAudioRate === 0) {
      audioGain.gain.value = 0
    } else {
      audioGain.gain.value = 1
      audioFilter.frequency.value = liveAudioRate / 2
    }
  }

  function setLivePreviewRate(rate: ExportAudioRate) {
    liveAudioRate = rate
    applyLivePreviewAudio()
  }

  function muteForExport() { if (audioGain) audioGain.gain.value = 0 }
  function restoreLiveAudio() { applyLivePreviewAudio() }

  onBeforeUnmount(() => disposeVideo())

  return {
    videoEl,
    sourceFile,
    isPlaying,
    currentTime,
    duration,
    loadVideo,
    play,
    pause,
    toggle,
    stop,
    seek,
    setLivePreviewRate,
    muteForExport,
    restoreLiveAudio,
    disposeVideo,
  }
}

export type VideoDither = ReturnType<typeof useVideoDither>
