<script setup lang="ts">
import type { Algorithm, ColorMode, DitherParams } from '~/utils/types'

defineProps<{ params: DitherParams }>()

const algorithms: { value: Algorithm; label: string }[] = [
  { value: 'bayer',      label: 'Bayer 8×8' },
  { value: 'blue-noise', label: 'Blue noise' },
  { value: 'halftone',   label: 'Halftone' },
  { value: 'fs',         label: 'Floyd–Steinberg' },
  { value: 'atkinson',   label: 'Atkinson' },
]

const colorModes: { value: ColorMode; label: string }[] = [
  { value: 'bw',    label: 'B&W' },
  { value: 'color', label: 'Color' },
]
</script>

<template>
  <div class="space-y-5 text-sm">
    <!-- Algorithm -->
    <fieldset class="space-y-1.5">
      <legend class="text-fg-dim uppercase tracking-wider text-xs mb-1">Algorithm</legend>
      <label
        v-for="a in algorithms"
        :key="a.value"
        class="flex items-center gap-2 cursor-pointer"
      >
        <input type="radio" :value="a.value" v-model="params.algorithm">
        <span>{{ a.label }}</span>
      </label>
    </fieldset>

    <!-- Color mode (segmented) -->
    <fieldset class="space-y-2">
      <legend class="text-fg-dim uppercase tracking-wider text-xs mb-1">Color</legend>
      <div class="inline-flex border border-border rounded-sm overflow-hidden">
        <button
          v-for="(c, i) in colorModes"
          :key="c.value"
          type="button"
          class="px-3 py-1 text-sm"
          :class="[
            params.colorMode === c.value ? 'bg-fg text-bg' : 'text-fg-dim hover:text-fg',
            i > 0 ? 'border-l border-border' : '',
          ]"
          @click="params.colorMode = c.value"
        >{{ c.label }}</button>
      </div>
      <div v-if="params.colorMode === 'bw'" class="grid grid-cols-2 gap-3 pt-2">
        <label class="flex items-center gap-2">
          <input type="color" v-model="params.fgColor" class="h-6 w-8 cursor-pointer">
          <span class="text-fg-dim text-xs">Foreground</span>
        </label>
        <label class="flex items-center gap-2">
          <input type="color" v-model="params.bgColor" class="h-6 w-8 cursor-pointer">
          <span class="text-fg-dim text-xs">Background</span>
        </label>
      </div>
    </fieldset>

    <!-- Sliders -->
    <fieldset class="space-y-1.5">
      <legend class="text-fg-dim uppercase tracking-wider text-xs mb-1">Adjustments</legend>

      <div>
        <div class="flex justify-between text-xs leading-tight"><span>Pixel size</span><span class="font-mono text-fg-dim tabular-nums">{{ params.pixelSize }}</span></div>
        <input type="range" min="1" max="20" step="1" v-model.number="params.pixelSize" class="w-full block h-4">
      </div>
      <div>
        <div class="flex justify-between text-xs leading-tight"><span>Dither amount</span><span class="font-mono text-fg-dim tabular-nums">{{ params.ditherAmount.toFixed(2) }}</span></div>
        <input type="range" min="0" max="1" step="0.05" v-model.number="params.ditherAmount" class="w-full block h-4">
      </div>
      <div>
        <div class="flex justify-between text-xs leading-tight"><span>Bit depth</span><span class="font-mono text-fg-dim tabular-nums">{{ params.bitDepth }}</span></div>
        <input type="range" min="1" max="8" step="1" v-model.number="params.bitDepth" class="w-full block h-4">
      </div>
      <div>
        <div class="flex justify-between text-xs leading-tight"><span>Contrast</span><span class="font-mono text-fg-dim tabular-nums">{{ params.contrast.toFixed(1) }}</span></div>
        <input type="range" min="0.5" max="2" step="0.1" v-model.number="params.contrast" class="w-full block h-4">
      </div>
      <div>
        <div class="flex justify-between text-xs leading-tight"><span>Scale</span><span class="font-mono text-fg-dim tabular-nums">{{ params.scale.toFixed(1) }}×</span></div>
        <input type="range" min="0.1" max="2" step="0.1" v-model.number="params.scale" class="w-full block h-4">
      </div>
    </fieldset>
  </div>
</template>
