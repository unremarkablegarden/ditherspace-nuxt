export interface BuiltAudioStream {
  stream: MediaStream
  ctx: AudioContext
  proc: ScriptProcessorNode
  numChannels: number
}

export async function buildAudioStream(file: File, targetSampleRate: number): Promise<BuiltAudioStream | null> {
  const arrayBuf = await file.arrayBuffer()

  const probeCtx = new AudioContext()
  const nativeRate = probeCtx.sampleRate
  await probeCtx.close()

  const decodeCtx = new AudioContext({ sampleRate: nativeRate })
  let decoded: AudioBuffer
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuf)
  } catch (e) {
    await decodeCtx.close()
    console.warn('Audio decode failed (maybe no audio track?):', e)
    return null
  }
  await decodeCtx.close()

  const numChannels = Math.min(decoded.numberOfChannels, 2)
  const dur = decoded.duration

  // Downsample to target rate (the lo-fi pass)
  const lofiFrames = Math.ceil(dur * targetSampleRate)
  const lofiCtx = new OfflineAudioContext(numChannels, lofiFrames, targetSampleRate)
  const lofiBuf = lofiCtx.createBuffer(numChannels, decoded.length, decoded.sampleRate)
  for (let c = 0; c < numChannels; c++) lofiBuf.copyToChannel(decoded.getChannelData(c), c)
  const lofiSrc = lofiCtx.createBufferSource()
  lofiSrc.buffer = lofiBuf
  lofiSrc.connect(lofiCtx.destination)
  lofiSrc.start(0)
  const lofi = await lofiCtx.startRendering()

  // Upsample back to native rate so it can ride the captureStream
  const nativeFrames = Math.ceil(dur * nativeRate)
  const upCtx = new OfflineAudioContext(numChannels, nativeFrames, nativeRate)
  const upBuf = upCtx.createBuffer(numChannels, lofi.length, targetSampleRate)
  for (let c = 0; c < numChannels; c++) upBuf.copyToChannel(lofi.getChannelData(c), c)
  const upSrc = upCtx.createBufferSource()
  upSrc.buffer = upBuf
  upSrc.connect(upCtx.destination)
  upSrc.start(0)
  const upsampled = await upCtx.startRendering()

  const liveCtx = new AudioContext({ sampleRate: nativeRate })
  const dest = liveCtx.createMediaStreamDestination()
  const bufSize = 4096
  const proc = liveCtx.createScriptProcessor(bufSize, 0, numChannels)
  let readPos = 0

  proc.onaudioprocess = (e) => {
    for (let c = 0; c < numChannels; c++) {
      const out = e.outputBuffer.getChannelData(c)
      const inp = upsampled.getChannelData(c)
      for (let i = 0; i < bufSize; i++) {
        out[i] = (readPos + i < inp.length) ? inp[readPos + i]! : 0
      }
    }
    readPos += bufSize
  }

  proc.connect(dest)
  return { stream: dest.stream, ctx: liveCtx, proc, numChannels }
}
