import type { ExportFormat } from './types'

export interface PickedMime {
  mimeType: string
  ext: 'mp4' | 'webm'
  fellBack: boolean
}

export function pickMimeType(format: ExportFormat, withAudio: boolean): PickedMime {
  if (format === 'mp4') {
    const mp4 = withAudio
      ? ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=h264,aac', 'video/mp4']
      : ['video/mp4;codecs=avc1', 'video/mp4;codecs=h264', 'video/mp4']
    for (const t of mp4) {
      if (MediaRecorder.isTypeSupported(t)) return { mimeType: t, ext: 'mp4', fellBack: false }
    }
  }
  const webm = withAudio
    ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,vorbis', 'video/webm;codecs=vp8,vorbis', 'video/webm']
    : ['video/webm;codecs=vp9',      'video/webm;codecs=vp8',      'video/webm']
  for (const t of webm) {
    if (MediaRecorder.isTypeSupported(t)) return { mimeType: t, ext: 'webm', fellBack: format === 'mp4' }
  }
  return { mimeType: 'video/webm', ext: 'webm', fellBack: format === 'mp4' }
}
