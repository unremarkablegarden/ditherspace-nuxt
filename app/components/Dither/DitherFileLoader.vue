<script setup lang="ts">
import type { DitherMode } from '~/utils/types'

const props = defineProps<{ mode: DitherMode }>()
const emit = defineEmits<{
  (e: 'image-file', file: File): void
  (e: 'video-file', file: File): void
  (e: 'sample'): void
}>()

function onImagePick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('image-file', file)
  input.value = ''
}

function onVideoPick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) emit('video-file', file)
  input.value = ''
}
</script>

<template>
  <div class="text-sm">
    <div v-if="props.mode === 'image'" class="flex items-center flex-wrap gap-2">
      <input type="file" accept="image/*" @change="onImagePick">
      <button
        type="button"
        class="px-2 py-1 border border-border text-fg-dim hover:text-fg hover:bg-fg-dim/20"
        @click="emit('sample')"
      >Generate test image</button>
    </div>

    <div v-else class="flex items-center flex-wrap gap-2">
      <input type="file" accept="video/*" @change="onVideoPick">
      <span class="text-fg-dim">MP4 / WebM / MOV — dithered live; export with audio downsampled to 11–44 kHz.</span>
    </div>
  </div>
</template>
