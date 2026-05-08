<script setup lang="ts">
import type { DitherMode, ExportAudioRate, ExportFormat, ExportFps, ResolutionState } from '~/utils/types'

const mode = ref<DitherMode>('image')
const canvasComp = ref<any>(null)
const sectionRef = ref<HTMLElement | null>(null)

const engineCanvas = shallowRef<HTMLCanvasElement | null>(null)
const engine = useDitherEngine(engineCanvas, {
  getLiveSource: () => (mode.value === 'video' && video.videoEl.value) ? video.videoEl.value : null,
})
const video = useVideoDither({
  renderFrame: (v) => engine.renderFrame(v),
})
const exporter = useVideoExport({
  canvas: () => engineCanvas.value,
  video: () => video.videoEl.value,
  renderFrame: (v) => engine.renderFrame(v),
})

let imageRes: ResolutionState | null = null
let videoRes: ResolutionState | null = null

function snapshotResolution(): ResolutionState | null {
  const c = engineCanvas.value
  if (!c) return null
  return {
    originalWidth:  engine.originalSize.value.w,
    originalHeight: engine.originalSize.value.h,
    aspectRatio:    engine.aspectRatio.value,
    scale:          engine.params.scale,
    canvasW:        c.width,
    canvasH:        c.height,
  }
}

function restoreResolution(s: ResolutionState) {
  const c = engineCanvas.value
  if (!c) return
  engine.originalSize.value = { w: s.originalWidth, h: s.originalHeight }
  engine.aspectRatio.value = s.aspectRatio
  engine.params.scale = s.scale
  c.width = s.canvasW
  c.height = s.canvasH
  engine.updateCanvasSize()
}

function switchMode(next: DitherMode) {
  if (next === mode.value) return
  video.stop()
  engine.bumpLoadGen()

  const snap = snapshotResolution()
  if (snap) {
    if (mode.value === 'image') imageRes = snap
    else videoRes = snap
  }

  mode.value = next

  const restore = next === 'image' ? imageRes : videoRes
  if (restore) restoreResolution(restore)

  if (next === 'image') {
    if (engine.getLoadedImage()) engine.render()
  } else if (video.videoEl.value) {
    engine.renderFrame(video.videoEl.value)
  }
}

function onSampleImage() {
  switchMode('image')
  engine.loadImage(generateSampleImage().toDataURL())
}

function onImageFile(file: File) {
  switchMode('image')
  const reader = new FileReader()
  reader.onload = (ev) => {
    const src = ev.target?.result
    if (typeof src === 'string') engine.loadImage(src)
  }
  reader.readAsDataURL(file)
}

async function onVideoFile(file: File) {
  switchMode('video')
  await video.loadVideo(file)
  const v = video.videoEl.value
  if (!v) return
  engine.setSourceSize(v.videoWidth, v.videoHeight)
  videoRes = snapshotResolution()
  engine.renderFrame(v)
}

function onApplyResolution(size: { w: number; h: number }) {
  const c = engineCanvas.value
  if (!c) return
  const prevAspect = engine.aspectRatio.value
  engine.originalSize.value = { w: size.w, h: size.h }
  engine.params.scale = 1.0
  c.width = size.w
  c.height = size.h
  engine.updateCanvasSize()
  engine.aspectRatio.value = prevAspect
  if (mode.value === 'video' && video.videoEl.value) engine.renderFrame(video.videoEl.value)
  else engine.render()
}

function onResetResolution() {
  engine.params.scale = 1.0
  engine.updateCanvasSize()
  if (mode.value === 'video' && video.videoEl.value) engine.renderFrame(video.videoEl.value)
  else engine.render()
}

function onExport(opts: { format: ExportFormat; fps: ExportFps; audioRate: ExportAudioRate }) {
  video.muteForExport()
  exporter.exportVideo({ ...opts, sourceFile: video.sourceFile.value })
    .then((res) => {
      video.restoreLiveAudio()
      if (!res) return
      const url = URL.createObjectURL(res.blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dithered-video.${res.ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      const v = video.videoEl.value
      if (v) {
        video.seek(0)
        engine.renderFrame(v)
      }
    })
    .catch((e) => {
      console.warn('Export failed:', e)
      video.restoreLiveAudio()
    })
}

const hasMedia = computed(() =>
  mode.value === 'image' ? !!engine.getLoadedImage() : !!video.videoEl.value
)

const dropzone = useDitherDropZone({
  zoneRef: sectionRef,
  targetRef: computed(() => canvasComp.value?.getContainer() ?? null) as any,
  fallbackTargetRef: computed(() => canvasComp.value?.getPlaceholder() ?? null) as any,
  overlayRef: computed(() => canvasComp.value?.getOverlay() ?? null) as any,
  onImage: onImageFile,
  onVideo: onVideoFile,
})

onMounted(async () => {
  await nextTick()
  engineCanvas.value = canvasComp.value?.getCanvas() ?? null
  onSampleImage()
})
</script>

<template>
  <div class="h-screen flex font-mono">
    <!-- Sidebar: header + controls -->
    <aside class="w-[300px] shrink-0 border-r border-border flex flex-col">
      <div class="px-5 py-4 border-b border-border space-y-3">
        <h1 class="text-sm font-mono tracking-wider">DitherSpace Nuxt</h1>
        <DitherModeTabs :model-value="mode" @update:model-value="switchMode" />
      </div>

      <div class="px-5 py-4 border-b border-border">
        <DitherFileLoader
          :mode="mode"
          @image-file="onImageFile"
          @video-file="onVideoFile"
          @sample="onSampleImage"
        />
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        <DitherControls :params="engine.params" />

        <div class="border-t border-border pt-5">
          <DitherResolution
            :original-width="engine.originalSize.value.w"
            :original-height="engine.originalSize.value.h"
            :output-width="engine.canvasSize.value.w"
            :output-height="engine.canvasSize.value.h"
            :aspect-ratio="engine.aspectRatio.value"
            @apply="onApplyResolution"
            @reset="onResetResolution"
          />
        </div>

        <div class="border-t border-border pt-5">
          <button
            v-if="mode === 'image'"
            type="button"
            class="w-full px-3 py-1.5 border border-fg bg-fg text-bg text-sm hover:opacity-90"
            @click="engine.exportPng()"
          >Export dithered image</button>

          <DitherVideoControls
            v-else
            :is-playing="video.isPlaying.value"
            :current-time="video.currentTime.value"
            :duration="video.duration.value"
            :is-exporting="exporter.isExporting.value"
            :progress-label="exporter.progress.value.label"
            :progress-pct="exporter.progress.value.pct"
            :enabled="hasMedia"
            @toggle-play="video.toggle"
            @stop="video.stop"
            @seek="video.seek"
            @live-audio-rate="(r) => video.setLivePreviewRate(r)"
            @export="onExport"
          />
        </div>

        <div class="border-t border-border pt-5">
          <DitherCredits />
        </div>
      </div>
    </aside>

    <!-- Output: canvas centered, overflows naturally -->
    <main ref="sectionRef" class="flex-1 overflow-auto relative">
      <div class="min-h-full min-w-full grid place-items-center p-6">
        <DitherCanvas
          ref="canvasComp"
          :mode="mode"
          :has-media="hasMedia"
          :is-dragging="dropzone.isDragging.value"
        />
      </div>
    </main>
  </div>
</template>
