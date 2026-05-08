<script setup lang="ts">
import type { DitherMode } from '~/utils/types'

const model = defineModel<DitherMode>({ required: true })

const tabs: { value: DitherMode; label: string }[] = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
]
</script>

<template>
  <div class="inline-flex border border-border rounded-sm overflow-hidden">
    <button
      v-for="(t, i) in tabs"
      :key="t.value"
      type="button"
      class="px-4 py-1 text-sm"
      :class="[
        model === t.value ? 'bg-fg text-bg' : 'text-fg-dim hover:text-fg',
        i > 0 ? 'border-l border-border' : '',
      ]"
      @click="model = t.value"
    >{{ t.label }}</button>
  </div>
</template>
