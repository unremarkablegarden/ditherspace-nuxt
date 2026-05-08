<script setup lang="ts">
import type { ExportAudioRate, ExportFormat, ExportFps } from '~/utils/types'

const props = defineProps<{
  isPlaying: boolean
  currentTime: number
  duration: number
  isExporting: boolean
  progressLabel: string
  progressPct: number
  enabled: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-play'): void
  (e: 'stop'): void
  (e: 'seek', t: number): void
  (e: 'export', opts: { format: ExportFormat; fps: ExportFps; audioRate: ExportAudioRate }): void
  (e: 'live-audio-rate', rate: ExportAudioRate): void
}>()

const format = ref<ExportFormat>('webm')
const fps = ref<ExportFps>(30)
const audioRate = ref<ExportAudioRate>(0)
const scrub = ref(props.currentTime)
let dragging = false

watch(() => props.currentTime, (t) => { if (!dragging) scrub.value = t })
watch(audioRate, (r) => emit('live-audio-rate', r))

function fmt(t: number) {
  if (!isFinite(t)) return '0:00'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function onScrubMouseDown() { dragging = true }
function onScrubMouseUp()   { dragging = false }
function onScrubInput()     { emit('seek', scrub.value) }

function onExport() {
  emit('export', { format: format.value, fps: fps.value, audioRate: audioRate.value })
}

const fpsOptions: ExportFps[] = [15, 24, 30]
const audioOptions: { value: ExportAudioRate; label: string }[] = [
  { value: 0,     label: 'No audio' },
  { value: 11025, label: '11 kHz' },
  { value: 22050, label: '22 kHz' },
  { value: 44100, label: '44.1 kHz' },
]
</script>

<template>
  <div class="space-y-4 text-sm">
    <!-- Transport -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        :disabled="!enabled"
        class="px-3 py-1 border border-border text-fg-dim hover:text-fg hover:bg-fg-dim/20 disabled:opacity-40 disabled:cursor-not-allowed w-16"
        @click="emit('toggle-play')"
      >{{ isPlaying ? 'Pause' : 'Play' }}</button>
      <button
        type="button"
        :disabled="!enabled"
        class="px-3 py-1 border border-border text-fg-dim hover:text-fg hover:bg-fg-dim/20 disabled:opacity-40 disabled:cursor-not-allowed"
        @click="emit('stop')"
      >Stop</button>
      <input
        type="range"
        class="flex-1 min-w-20"
        :min="0"
        :max="duration || 0"
        :step="0.1"
        v-model.number="scrub"
        :disabled="!enabled"
        @mousedown="onScrubMouseDown"
        @mouseup="onScrubMouseUp"
        @input="onScrubInput"
      >
      <span class="font-mono text-xs text-fg-dim tabular-nums">{{ fmt(currentTime) }} / {{ fmt(duration) }}</span>
    </div>

    <!-- Export options -->
    <div class="grid grid-cols-3 gap-4 pt-2 border-t border-border">
      <fieldset>
        <legend class="text-fg-dim uppercase tracking-wider text-xs mb-1">Format</legend>
        <label class="flex items-center gap-2"><input type="radio" value="webm" v-model="format" :disabled="!enabled"> WebM</label>
        <label class="flex items-center gap-2"><input type="radio" value="mp4"  v-model="format" :disabled="!enabled"> MP4</label>
      </fieldset>

      <fieldset>
        <legend class="text-fg-dim uppercase tracking-wider text-xs mb-1">Frame rate</legend>
        <label v-for="f in fpsOptions" :key="f" class="flex items-center gap-2">
          <input type="radio" :value="f" v-model.number="fps" :disabled="!enabled"> {{ f }} fps
        </label>
      </fieldset>

      <fieldset>
        <legend class="text-fg-dim uppercase tracking-wider text-xs mb-1">Audio</legend>
        <label v-for="a in audioOptions" :key="a.value" class="flex items-center gap-2">
          <input type="radio" :value="a.value" v-model.number="audioRate" :disabled="!enabled"> {{ a.label }}
        </label>
      </fieldset>
    </div>

    <div class="flex items-center gap-3">
      <button
        type="button"
        :disabled="!enabled || isExporting"
        class="px-3 py-1 border border-fg bg-fg text-bg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        @click="onExport"
      >Export dithered video</button>

      <div v-if="isExporting" class="flex-1 flex items-center gap-2">
        <div class="flex-1 h-1.5 bg-fg-dim/20">
          <div class="h-full bg-fg transition-all" :style="{ width: progressPct + '%' }"></div>
        </div>
        <span class="text-xs text-fg-dim font-mono">{{ progressLabel }}</span>
      </div>
    </div>
  </div>
</template>
