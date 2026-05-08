export type Algorithm = 'bayer' | 'fs' | 'atkinson'
export type ColorMode = 'bw' | 'color'
export type DitherMode = 'image' | 'video'

export interface DitherParams {
  algorithm: Algorithm
  colorMode: ColorMode
  pixelSize: number
  ditherAmount: number
  bitDepth: number
  contrast: number
  scale: number
  fgColor: string
  bgColor: string
}

export const DEFAULT_PARAMS: DitherParams = {
  algorithm: 'bayer',
  colorMode: 'bw',
  pixelSize: 4,
  ditherAmount: 0.75,
  bitDepth: 2,
  contrast: 1.0,
  scale: 1.0,
  fgColor: '#ffffff',
  bgColor: '#000000',
}

export interface ResolutionState {
  originalWidth: number
  originalHeight: number
  aspectRatio: number
  scale: number
  canvasW: number
  canvasH: number
}

export type ExportFormat = 'webm' | 'mp4'
export type ExportFps = 15 | 24 | 30
export type ExportAudioRate = 0 | 11025 | 22050 | 44100

export interface ExportOptions {
  format: ExportFormat
  fps: ExportFps
  audioRate: ExportAudioRate
  sourceFile: File | null
}
