<script setup lang="ts">
import type { DitherMode } from '~/utils/types'

const props = defineProps<{
  mode: DitherMode
  hasMedia: boolean
  isDragging: boolean
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const placeholderRef = ref<HTMLDivElement | null>(null)
const overlayRef = ref<HTMLDivElement | null>(null)

defineExpose({
  getCanvas:      () => canvasRef.value,
  getContainer:   () => containerRef.value,
  getPlaceholder: () => placeholderRef.value,
  getOverlay:     () => overlayRef.value,
})

const showCanvas = computed(() => props.hasMedia || props.mode === 'image')
</script>

<template>
  <div class="relative">
    <div
      ref="containerRef"
      v-show="showCanvas"
      class="border border-border bg-bg"
    >
      <canvas ref="canvasRef" class="block"></canvas>
    </div>

    <div
      ref="placeholderRef"
      class="w-[400px] h-[300px] border border-border bg-fg-dim/10 text-fg-dim items-center justify-center text-sm"
      :class="(mode === 'video' && !hasMedia) ? 'flex' : 'hidden'"
    >No video file loaded.</div>

    <div
      ref="overlayRef"
      class="hidden absolute z-10 border-2 border-dashed border-fg-dim bg-bg/90 text-fg-dim items-center justify-center text-sm"
      :class="{ '!flex': isDragging }"
    >Drop {{ mode === 'video' ? 'video' : 'image' }} here.</div>
  </div>
</template>
