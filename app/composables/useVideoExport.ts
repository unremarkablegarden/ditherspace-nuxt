import type { ExportOptions } from '~/utils/types'

export interface UseVideoExportArgs {
  canvas: () => HTMLCanvasElement | null
  video: () => HTMLVideoElement | null
  renderFrame: (v: HTMLVideoElement) => void
}

export function useVideoExport(args: UseVideoExportArgs) {
  const isExporting = ref(false)
  const progress = ref<{ label: string; pct: number }>({ label: '', pct: 0 })

  function setProgress(label: string, pct: number) {
    progress.value = { label, pct }
  }

  async function exportVideo(opts: ExportOptions): Promise<{ blob: Blob; ext: string } | null> {
    const canvas = args.canvas()
    const v = args.video()
    if (!canvas || !v) {
      alert('No video loaded.')
      return null
    }
    if (!v.paused) v.pause()
    isExporting.value = true
    setProgress('Starting…', 0)

    const withAudio = opts.audioRate > 0
    const { mimeType, ext, fellBack } = pickMimeType(opts.format, withAudio)
    if (fellBack) {
      alert('MP4/H.264 export is not supported in this browser.\nFalling back to WebM.\n\nMP4 support requires Chrome 130+ or Safari 17.4+.')
    }

    const dur = v.duration
    const totalFrames = Math.ceil(dur * opts.fps)

    let audioHandle: Awaited<ReturnType<typeof buildAudioStream>> = null
    if (withAudio) {
      if (!opts.sourceFile) {
        alert('Audio export requires the original file. Please reload the video using the file picker.\nExporting without audio.')
      } else {
        try {
          setProgress('Decoding audio…', 0)
          audioHandle = await buildAudioStream(opts.sourceFile, opts.audioRate)
        } catch (e) {
          console.warn('Audio setup failed, exporting without audio:', e)
          audioHandle = null
        }
      }
    }

    let stream: MediaStream
    try {
      stream = (canvas as any).captureStream(opts.fps)
    } catch {
      alert('canvas.captureStream() not supported. Try Chrome or Edge.')
      isExporting.value = false
      if (audioHandle) {
        audioHandle.proc.disconnect()
        await audioHandle.ctx.close()
      }
      return null
    }

    if (audioHandle) {
      audioHandle.stream.getAudioTracks().forEach((t) => stream.addTrack(t))
    }

    const chunks: Blob[] = []
    const recorder = new MediaRecorder(stream, { mimeType })
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    const donePromise = new Promise<void>((resolve) => { recorder.onstop = () => resolve() })

    v.currentTime = 0
    await new Promise<void>((r) => v.addEventListener('seeked', () => r(), { once: true }))
    recorder.start(100)

    const useRVFC = typeof (v as any).requestVideoFrameCallback === 'function'
    if (useRVFC) {
      let framesDone = 0
      await new Promise<void>((resolve, reject) => {
        let resolved = false
        const onFrame = (_now: number, meta: any) => {
          if (resolved) return
          args.renderFrame(v)
          framesDone++
          const pct = Math.min(99, Math.round((meta.mediaTime / dur) * 100))
          setProgress(`Rendering frame ${framesDone} (${pct}%)…`, pct)
          if (!v.ended && meta.mediaTime < dur - 0.1) {
            ;(v as any).requestVideoFrameCallback(onFrame)
          } else {
            resolved = true
            resolve()
          }
        }
        v.addEventListener('ended', () => { if (!resolved) { resolved = true; resolve() } }, { once: true })
        ;(v as any).requestVideoFrameCallback(onFrame)
        v.muted = false
        v.play().catch(reject)
      })
      v.pause()
    } else {
      const frameDuration = 1 / opts.fps
      for (let f = 0; f < totalFrames; f++) {
        v.currentTime = Math.min(f * frameDuration, dur - 0.001)
        await new Promise<void>((r) => v.addEventListener('seeked', () => r(), { once: true }))
        args.renderFrame(v)
        const pct = Math.round(((f + 1) / totalFrames) * 100)
        setProgress(`Rendering frame ${f + 1} of ${totalFrames} (${pct}%)`, pct)
      }
    }

    setProgress('Finalising…', 100)

    if (audioHandle) {
      audioHandle.proc.disconnect()
      audioHandle.stream.getAudioTracks().forEach((t) => t.stop())
    }
    recorder.stop()

    await Promise.race([
      donePromise,
      new Promise<void>((resolve) => setTimeout(resolve, 2000)),
    ])

    if (audioHandle) await audioHandle.ctx.close()

    const blob = new Blob(chunks, { type: mimeType })
    isExporting.value = false
    setProgress('', 0)
    return { blob, ext }
  }

  return { exportVideo, isExporting, progress }
}
