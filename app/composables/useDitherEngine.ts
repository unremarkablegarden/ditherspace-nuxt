import type { Ref } from 'vue'
import type { DitherParams } from '~/utils/types'

export interface UseDitherEngineOptions {
  /** Optional: when set, render() uses this source instead of the loaded image (e.g. paused video frame). */
  getLiveSource?: () => TexImageSource | null
}

export function useDitherEngine(canvasRef: Ref<HTMLCanvasElement | null>, opts: UseDitherEngineOptions = {}) {
  const params = reactive<DitherParams>({ ...DEFAULT_PARAMS })
  const originalSize = ref({ w: 800, h: 600 })
  const aspectRatio = ref(800 / 600)
  const canvasSize = ref({ w: 800, h: 600 })

  let gl: ReturnType<typeof useBayerWebGL> | null = null
  let imgElement: HTMLImageElement | null = null
  const fsCanvas = (typeof document !== 'undefined') ? document.createElement('canvas') : null
  let loadGen = 0

  function ensureGL() {
    if (gl || !canvasRef.value) return gl
    gl = useBayerWebGL(canvasRef.value)
    return gl
  }

  function updateCanvasSize() {
    if (!canvasRef.value) return
    const w = Math.floor(originalSize.value.w * params.scale)
    const h = Math.floor(originalSize.value.h * params.scale)
    canvasRef.value.width = w
    canvasRef.value.height = h
    canvasSize.value = { w, h }
    ensureGL()?.setViewport(w, h)
  }

  function setSourceSize(w: number, h: number) {
    originalSize.value = { w, h }
    aspectRatio.value = w / h
    updateCanvasSize()
  }

  function _prepareCpuFrame(source: TexImageSource): ImageData | null {
    if (!fsCanvas || !canvasRef.value) return null
    const pSize = Math.max(1, params.pixelSize)
    const procW = Math.max(1, Math.floor(canvasRef.value.width / pSize))
    const procH = Math.max(1, Math.floor(canvasRef.value.height / pSize))
    fsCanvas.width = procW
    fsCanvas.height = procH
    const ctx = fsCanvas.getContext('2d')!
    ctx.drawImage(source as CanvasImageSource, 0, 0, procW, procH)
    return ctx.getImageData(0, 0, procW, procH)
  }

  function renderFrame(source?: TexImageSource | null) {
    const g = ensureGL()
    if (!g || !canvasRef.value) return
    const src = source ?? imgElement
    if (!src) return

    if (params.algorithm === 'fs' || params.algorithm === 'atkinson') {
      const prepared = _prepareCpuFrame(src as TexImageSource)
      if (prepared) {
        const o = {
          contrast: params.contrast,
          bitDepth: params.bitDepth,
          ditherAmount: params.ditherAmount,
          colorMode: params.colorMode,
        }
        const out = params.algorithm === 'fs' ? floydSteinberg(prepared, o) : atkinson(prepared, o)
        g.uploadTexture(out, 'NEAREST')
      }
      g.setUniforms(params, 'cpu', canvasRef.value.width, canvasRef.value.height)
    } else {
      g.uploadTexture(src as TexImageSource, 'LINEAR')
      g.setUniforms(params, 'gpu', canvasRef.value.width, canvasRef.value.height)
    }
    g.draw()
  }

  function render() {
    const live = opts.getLiveSource?.()
    renderFrame(live ?? imgElement)
  }

  function loadImage(src: string): Promise<void> {
    loadGen++
    const myGen = loadGen
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        if (myGen !== loadGen) return resolve()
        imgElement = img
        originalSize.value = { w: img.width, h: img.height }
        aspectRatio.value = img.width / img.height
        updateCanvasSize()
        renderFrame(img)
        resolve()
      }
      img.onerror = () => reject(new Error('Failed to load image.'))
      img.src = src
    })
  }

  function exportPng(filename = 'dithered-image.png') {
    if (!canvasRef.value || canvasRef.value.width === 0 || canvasRef.value.height === 0) return
    const a = document.createElement('a')
    a.download = filename
    a.href = canvasRef.value.toDataURL('image/png')
    a.click()
  }

  // Reactive re-render on any param change. Resize the canvas first when scale changes.
  let prevScale = params.scale
  const stop = watch(params, () => {
    if (params.scale !== prevScale) {
      prevScale = params.scale
      updateCanvasSize()
    }
    render()
  }, { deep: true })

  onBeforeUnmount(() => {
    stop()
    gl?.dispose()
    gl = null
  })

  return {
    params,
    originalSize,
    aspectRatio,
    canvasSize,
    loadImage,
    setSourceSize,
    updateCanvasSize,
    renderFrame,
    render,
    exportPng,
    getLoadedImage: () => imgElement,
    bumpLoadGen: () => { loadGen++ },
  }
}

export type DitherEngine = ReturnType<typeof useDitherEngine>
