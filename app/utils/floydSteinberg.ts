import type { ColorMode } from './types'

export interface FsOptions {
  contrast: number
  bitDepth: number
  ditherAmount: number
  colorMode: ColorMode
}

export function floydSteinberg(imageData: ImageData, opts: FsOptions): ImageData {
  const { contrast, bitDepth, ditherAmount, colorMode } = opts
  const data = imageData.data
  const W = imageData.width
  const H = imageData.height
  const levels = Math.pow(2, bitDepth) - 1

  const softBlend = (arr: Float32Array) => {
    const blurred = new Float32Array(arr.length)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x
        let s = arr[idx]! * 4
        let c = 4
        if (x > 0)     { s += arr[idx - 1]!; c++ }
        if (x < W - 1) { s += arr[idx + 1]!; c++ }
        if (y > 0)     { s += arr[idx - W]!; c++ }
        if (y < H - 1) { s += arr[idx + W]!; c++ }
        blurred[idx] = s / c
      }
    }
    for (let i = 0; i < arr.length; i++) arr[i] = arr[i]! * 0.8 + blurred[i]! * 0.2
  }

  const fsPass = (chan: Float32Array) => {
    for (let y = 0; y < H; y++) {
      const dir = (y % 2 === 0) ? 1 : -1
      const xs = (y % 2 === 0) ? 0 : W - 1
      const xe = (y % 2 === 0) ? W : -1
      for (let x = xs; x !== xe; x += dir) {
        const idx = y * W + x
        const old = chan[idx]!
        const nw = Math.round(old * levels) / levels
        chan[idx] = nw
        const err = (old - nw) * ditherAmount
        if (x + dir >= 0 && x + dir < W) chan[idx + dir]! += err * (7 / 16)
        if (y + 1 < H) {
          if (x - dir >= 0 && x - dir < W) chan[idx + W - dir]! += err * (3 / 16)
          chan[idx + W]! += err * (5 / 16)
          if (x + dir >= 0 && x + dir < W) chan[idx + W + dir]! += err * (1 / 16)
        }
      }
    }
  }

  if (colorMode === 'bw') {
    const gray = new Float32Array(W * H)
    for (let i = 0; i < data.length; i += 4) {
      let g = (data[i]! * 0.299 + data[i + 1]! * 0.587 + data[i + 2]! * 0.114) / 255
      g = Math.max(0, Math.min(1, (g - 0.5) * contrast + 0.5))
      gray[i / 4] = g
    }
    softBlend(gray)
    fsPass(gray)
    for (let i = 0; i < gray.length; i++) {
      const v = Math.floor(Math.max(0, Math.min(1, gray[i]!)) * 255)
      data[i * 4]     = v
      data[i * 4 + 1] = v
      data[i * 4 + 2] = v
      data[i * 4 + 3] = 255
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
    softBlend(rD); softBlend(gD); softBlend(bD)
    fsPass(rD);    fsPass(gD);    fsPass(bD)
    for (let i = 0; i < rD.length; i++) {
      data[i * 4]     = Math.floor(Math.max(0, Math.min(1, rD[i]!)) * 255)
      data[i * 4 + 1] = Math.floor(Math.max(0, Math.min(1, gD[i]!)) * 255)
      data[i * 4 + 2] = Math.floor(Math.max(0, Math.min(1, bD[i]!)) * 255)
      data[i * 4 + 3] = 255
    }
  }

  return imageData
}
