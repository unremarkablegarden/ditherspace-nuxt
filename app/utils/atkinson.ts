import type { ColorMode } from './types'

export interface AtkinsonOptions {
  contrast: number
  bitDepth: number
  ditherAmount: number
  colorMode: ColorMode
}

export function atkinson(imageData: ImageData, opts: AtkinsonOptions): ImageData {
  const { contrast, bitDepth, ditherAmount, colorMode } = opts
  const data = imageData.data
  const W = imageData.width
  const H = imageData.height
  const levels = Math.pow(2, bitDepth) - 1

  const diffuse = (chan: Float32Array, x: number, y: number, err: number) => {
    const e = err * ditherAmount / 8
    const nbrs: [number, number][] = [
      [x + 1, y], [x + 2, y],
      [x - 1, y + 1], [x, y + 1], [x + 1, y + 1],
      [x, y + 2],
    ]
    for (const [nx, ny] of nbrs) {
      if (nx >= 0 && nx < W && ny >= 0 && ny < H) chan[ny * W + nx]! += e
    }
  }

  if (colorMode === 'bw') {
    const gray = new Float32Array(W * H)
    for (let i = 0; i < data.length; i += 4) {
      const g = (data[i]! * 0.299 + data[i + 1]! * 0.587 + data[i + 2]! * 0.114) / 255
      gray[i / 4] = Math.max(0, Math.min(1, (g - 0.5) * contrast + 0.5))
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x
        const old = gray[idx]!
        const nw = Math.round(old * levels) / levels
        gray[idx] = nw
        diffuse(gray, x, y, old - nw)
      }
    }
    for (let i = 0; i < gray.length; i++) {
      const v = Math.floor(Math.max(0, Math.min(1, gray[i]!)) * 255)
      data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = v; data[i * 4 + 3] = 255
    }
  } else {
    const rD = new Float32Array(W * H)
    const gD = new Float32Array(W * H)
    const bD = new Float32Array(W * H)
    for (let i = 0; i < data.length; i += 4) {
      const idx = i / 4
      rD[idx] = Math.max(0, Math.min(1, (data[i]!     / 255 - 0.5) * contrast + 0.5))
      gD[idx] = Math.max(0, Math.min(1, (data[i + 1]! / 255 - 0.5) * contrast + 0.5))
      bD[idx] = Math.max(0, Math.min(1, (data[i + 2]! / 255 - 0.5) * contrast + 0.5))
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x
        const oR = rD[idx]!, nR = Math.round(oR * levels) / levels; rD[idx] = nR; diffuse(rD, x, y, oR - nR)
        const oG = gD[idx]!, nG = Math.round(oG * levels) / levels; gD[idx] = nG; diffuse(gD, x, y, oG - nG)
        const oB = bD[idx]!, nB = Math.round(oB * levels) / levels; bD[idx] = nB; diffuse(bD, x, y, oB - nB)
      }
    }
    for (let i = 0; i < rD.length; i++) {
      data[i * 4]     = Math.floor(Math.max(0, Math.min(1, rD[i]!)) * 255)
      data[i * 4 + 1] = Math.floor(Math.max(0, Math.min(1, gD[i]!)) * 255)
      data[i * 4 + 2] = Math.floor(Math.max(0, Math.min(1, bD[i]!)) * 255)
      data[i * 4 + 3] = 255
    }
  }

  return imageData
}
