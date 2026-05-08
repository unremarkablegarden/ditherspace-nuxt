export function generateSampleImage(size = 400): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c)
  grad.addColorStop(0, '#ffffff')
  grad.addColorStop(0.5, '#888888')
  grad.addColorStop(1, '#000000')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 20; i++) {
    ctx.beginPath()
    ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 30 + 10, 0, Math.PI * 2)
    const r = Math.floor(Math.random() * 255)
    const g = Math.floor(Math.random() * 255)
    const b = Math.floor(Math.random() * 255)
    const a = Math.random() * 0.5 + 0.3
    ctx.fillStyle = `rgba(${r},${g},${b},${a})`
    ctx.fill()
  }
  return canvas
}
