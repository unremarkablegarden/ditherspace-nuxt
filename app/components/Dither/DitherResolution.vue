<script setup lang="ts">
const props = defineProps<{
  originalWidth: number
  originalHeight: number
  outputWidth: number
  outputHeight: number
  aspectRatio: number
}>()

const emit = defineEmits<{
  (e: 'apply', size: { w: number; h: number }): void
  (e: 'reset'): void
}>()

const targetWidth = ref(props.outputWidth)
const targetHeight = ref(props.outputHeight)
const maintainAspect = ref(true)
let suppress = false

const SLIDER_MIN = 1
const SLIDER_MAX = 4096

watch(() => [props.outputWidth, props.outputHeight], ([w, h]) => {
  suppress = true
  targetWidth.value = w!
  targetHeight.value = h!
  queueMicrotask(() => { suppress = false })
})

function onWidthInput() {
  if (suppress) return
  if (maintainAspect.value && targetWidth.value > 0 && props.aspectRatio > 0) {
    targetHeight.value = Math.max(1, Math.round(targetWidth.value / props.aspectRatio))
  }
  apply()
}

function onHeightInput() {
  if (suppress) return
  if (maintainAspect.value && targetHeight.value > 0 && props.aspectRatio > 0) {
    targetWidth.value = Math.max(1, Math.round(targetHeight.value * props.aspectRatio))
  }
  apply()
}

function apply() {
  if (targetWidth.value > 0 && targetHeight.value > 0) {
    emit('apply', { w: targetWidth.value, h: targetHeight.value })
  }
}
</script>

<template>
  <fieldset class="space-y-3 text-sm">
    <legend class="text-fg-dim uppercase tracking-wider text-xs mb-1">Resolution</legend>

    <div class="flex items-center gap-2">
      <input
        type="number"
        :min="SLIDER_MIN"
        v-model.number="targetWidth"
        @input="onWidthInput"
        class="w-20 px-2 py-1 border border-border font-mono"
        aria-label="Width"
      >
      <span class="text-fg-dim">×</span>
      <input
        type="number"
        :min="SLIDER_MIN"
        v-model.number="targetHeight"
        @input="onHeightInput"
        class="w-20 px-2 py-1 border border-border font-mono"
        aria-label="Height"
      >
      <button
        type="button"
        class="ml-auto px-2 py-1 border border-border text-fg-dim hover:text-fg hover:bg-fg-dim/20"
        @click="emit('reset')"
      >Reset</button>
    </div>

    <div class="space-y-2">
      <input
        type="range"
        :min="SLIDER_MIN"
        :max="SLIDER_MAX"
        step="1"
        v-model.number="targetWidth"
        @input="onWidthInput"
        class="w-full"
        aria-label="Width slider"
      >
      <input
        type="range"
        :min="SLIDER_MIN"
        :max="SLIDER_MAX"
        step="1"
        v-model.number="targetHeight"
        @input="onHeightInput"
        class="w-full"
        aria-label="Height slider"
      >
    </div>

    <label class="flex items-center gap-2 text-xs">
      <input type="checkbox" v-model="maintainAspect">
      <span>Lock aspect ratio</span>
    </label>
  </fieldset>
</template>
