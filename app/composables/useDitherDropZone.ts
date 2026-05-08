import type { Ref } from 'vue'

export interface UseDitherDropZoneArgs {
  /** The element files are dropped onto */
  zoneRef: Ref<HTMLElement | null>
  /** The element used to size the overlay (typically the canvas-container) */
  targetRef: Ref<HTMLElement | null>
  /** Optional secondary target shown when no media is loaded yet */
  fallbackTargetRef?: Ref<HTMLElement | null>
  /** Element used as the overlay box */
  overlayRef: Ref<HTMLElement | null>
  onImage: (file: File) => void
  onVideo: (file: File) => void
}

export function useDitherDropZone(args: UseDitherDropZoneArgs) {
  const isDragging = ref(false)

  function pickTarget(): HTMLElement | null {
    const fb = args.fallbackTargetRef?.value
    if (fb && fb.offsetParent !== null && fb.offsetWidth > 0) return fb
    return args.targetRef.value
  }

  function sizeOverlay() {
    const zone = args.zoneRef.value
    const overlay = args.overlayRef.value
    const target = pickTarget()
    if (!zone || !overlay || !target) return
    const rect = target.getBoundingClientRect()
    const parentRect = zone.getBoundingClientRect()
    overlay.style.left   = (rect.left - parentRect.left) + 'px'
    overlay.style.top    = (rect.top  - parentRect.top)  + 'px'
    overlay.style.width  = rect.width + 'px'
    overlay.style.height = rect.height + 'px'
  }

  function onDragEnter(e: DragEvent) {
    e.preventDefault()
    sizeOverlay()
    isDragging.value = true
  }

  function onDragLeave(e: DragEvent) {
    const zone = args.zoneRef.value
    if (!zone) return
    if (!zone.contains(e.relatedTarget as Node | null)) isDragging.value = false
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    isDragging.value = false
    const file = e.dataTransfer?.files[0]
    if (!file) return
    if (file.type.startsWith('video/')) args.onVideo(file)
    else if (file.type.startsWith('image/')) args.onImage(file)
  }

  onMounted(() => {
    const zone = args.zoneRef.value
    if (!zone) return
    zone.addEventListener('dragenter', onDragEnter)
    zone.addEventListener('dragleave', onDragLeave)
    zone.addEventListener('dragover',  onDragOver)
    zone.addEventListener('drop',      onDrop)
  })

  onBeforeUnmount(() => {
    const zone = args.zoneRef.value
    if (!zone) return
    zone.removeEventListener('dragenter', onDragEnter)
    zone.removeEventListener('dragleave', onDragLeave)
    zone.removeEventListener('dragover',  onDragOver)
    zone.removeEventListener('drop',      onDrop)
  })

  return { isDragging }
}
