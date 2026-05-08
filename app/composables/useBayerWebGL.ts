import type { Algorithm, DitherParams } from '~/utils/types'

export type WebGLFilter = 'NEAREST' | 'LINEAR'

export interface BayerWebGL {
  uploadTexture(src: TexImageSource | ImageData, filter: WebGLFilter): void
  setUniforms(p: DitherParams, mode: 'cpu' | 'gpu', canvasW: number, canvasH: number): void
  draw(): void
  setViewport(w: number, h: number): void
  dispose(): void
}

const VERT_SRC = /* glsl */ `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); v_texCoord = a_texCoord; }
`

function buildFragSrc() {
  return /* glsl */ `
precision mediump float;
uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_pixelSize;
uniform float u_ditherAmount;
uniform float u_bitDepth;
uniform float u_contrast;
uniform vec3 u_fgColor;
uniform vec3 u_bgColor;
uniform int u_mode;
uniform int u_colorMode;
uniform int u_algorithm;
varying vec2 v_texCoord;

${BAYER_8X8_GLSL}

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// Interleaved Gradient Noise (Jorge Jimenez) — cheap blue-noise-like threshold pattern.
float ign(vec2 pos) {
    return fract(52.9829189 * fract(0.06711056 * pos.x + 0.00583715 * pos.y));
}

void main() {
    if (u_mode == 1) {
        vec4 color = texture2D(u_image, v_texCoord);
        if (u_colorMode == 0) {
            float gray = color.r;
            gl_FragColor = vec4(mix(u_bgColor, u_fgColor, gray), 1.0);
        } else {
            gl_FragColor = color;
        }
        return;
    }

    vec2 uv = v_texCoord;
    vec2 pixelatedUV = floor(uv * u_resolution / u_pixelSize) * u_pixelSize / u_resolution;
    vec4 color = texture2D(u_image, pixelatedUV);
    vec2 pixelPos = floor(gl_FragCoord.xy);

    if (u_algorithm == 2) {
        // Halftone: luminance drives a circular dot inside each pixelSize cell.
        vec2 cellSize = vec2(max(u_pixelSize, 1.0));
        vec2 cellId = floor(gl_FragCoord.xy / cellSize);
        vec2 cellCenter = (cellId + 0.5) * cellSize;
        float halfDiag = length(cellSize * 0.5);
        float dist = length(gl_FragCoord.xy - cellCenter) / halfDiag;
        float levels = max(pow(2.0, u_bitDepth) - 1.0, 1.0);
        if (u_colorMode == 0) {
            float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            gray = clamp((gray - 0.5) * u_contrast + 0.5, 0.0, 1.0);
            float quant = floor(gray * levels + 0.5) / levels;
            float radius = sqrt(quant);
            radius = mix(quant, radius, u_ditherAmount);
            float ink = step(dist, radius);
            gl_FragColor = vec4(mix(u_bgColor, u_fgColor, ink), 1.0);
        } else {
            vec3 c = clamp((color.rgb - 0.5) * u_contrast + 0.5, 0.0, 1.0);
            vec3 quant = floor(c * levels + 0.5) / levels;
            vec3 radius = sqrt(quant);
            radius = mix(quant, radius, u_ditherAmount);
            vec3 ink = vec3(step(dist, radius.r), step(dist, radius.g), step(dist, radius.b));
            gl_FragColor = vec4(ink, 1.0);
        }
        return;
    }

    // Threshold-based dithering (Bayer or blue noise).
    float threshold;
    if (u_algorithm == 1) {
        threshold = ign(pixelPos);
    } else {
        float bayerValue = bayer8x8(pixelPos);
        float noise = random(pixelPos * 0.01) * 0.1;
        threshold = mix(bayerValue, noise, 0.3);
    }
    float effectiveThreshold = mix(0.5, threshold, u_ditherAmount);
    float levels = pow(2.0, u_bitDepth);
    #define DITHER_QUANTIZE(v) (floor((v) * levels + (1.0 - effectiveThreshold)) / levels)
    if (u_colorMode == 0) {
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        gray = clamp((gray - 0.5) * u_contrast + 0.5, 0.0, 1.0);
        float final = clamp(DITHER_QUANTIZE(gray), 0.0, 1.0);
        gl_FragColor = vec4(mix(u_bgColor, u_fgColor, final), 1.0);
    } else {
        vec3 rgb = clamp((color.rgb - 0.5) * u_contrast + 0.5, 0.0, 1.0);
        vec3 final = clamp(vec3(DITHER_QUANTIZE(rgb.r), DITHER_QUANTIZE(rgb.g), DITHER_QUANTIZE(rgb.b)), 0.0, 1.0);
        gl_FragColor = vec4(final, 1.0);
    }
}
`
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type)
  if (!sh) return null
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(sh))
    gl.deleteShader(sh)
    return null
  }
  return sh
}

function link(gl: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram | null {
  const p = gl.createProgram()
  if (!p) return null
  gl.attachShader(p, vs)
  gl.attachShader(p, fs)
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error('Link error:', gl.getProgramInfoLog(p))
    gl.deleteProgram(p)
    return null
  }
  return p
}

export function useBayerWebGL(canvas: HTMLCanvasElement): BayerWebGL {
  const ctx = canvas.getContext('webgl', { preserveDrawingBuffer: true })
  if (!ctx) throw new Error('WebGL is not supported in your browser')
  const gl: WebGLRenderingContext = ctx

  const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC)
  const fs = compile(gl, gl.FRAGMENT_SHADER, buildFragSrc())
  if (!vs || !fs) throw new Error('Failed to compile dither shaders')
  const program = link(gl, vs, fs)
  if (!program) throw new Error('Failed to link dither shader program')

  const positionBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

  const texCoordBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), gl.STATIC_DRAW)

  const texture = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  gl.useProgram(program)

  const u = {
    resolution:   gl.getUniformLocation(program, 'u_resolution'),
    pixelSize:    gl.getUniformLocation(program, 'u_pixelSize'),
    ditherAmount: gl.getUniformLocation(program, 'u_ditherAmount'),
    bitDepth:     gl.getUniformLocation(program, 'u_bitDepth'),
    contrast:     gl.getUniformLocation(program, 'u_contrast'),
    fgColor:      gl.getUniformLocation(program, 'u_fgColor'),
    bgColor:      gl.getUniformLocation(program, 'u_bgColor'),
    mode:         gl.getUniformLocation(program, 'u_mode'),
    colorMode:    gl.getUniformLocation(program, 'u_colorMode'),
    algorithm:    gl.getUniformLocation(program, 'u_algorithm'),
  }
  const a = {
    position: gl.getAttribLocation(program, 'a_position'),
    texCoord: gl.getAttribLocation(program, 'a_texCoord'),
  }

  function bindAttribs() {
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.enableVertexAttribArray(a.position)
    gl.vertexAttribPointer(a.position, 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
    gl.enableVertexAttribArray(a.texCoord)
    gl.vertexAttribPointer(a.texCoord, 2, gl.FLOAT, false, 0, 0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
  }

  function uploadTexture(src: TexImageSource | ImageData, filter: WebGLFilter) {
    bindAttribs()
    const f = filter === 'NEAREST' ? gl.NEAREST : gl.LINEAR
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src as TexImageSource)
  }

  function algorithmId(a: Algorithm): number {
    if (a === 'blue-noise') return 1
    if (a === 'halftone') return 2
    return 0 // bayer (also used as default for cpu-display passthrough)
  }

  function setUniforms(p: DitherParams, mode: 'cpu' | 'gpu', canvasW: number, canvasH: number) {
    gl.useProgram(program)
    gl.uniform1i(u.mode, mode === 'cpu' ? 1 : 0)
    gl.uniform2f(u.resolution, canvasW, canvasH)
    gl.uniform1f(u.pixelSize, p.pixelSize)
    gl.uniform1f(u.ditherAmount, p.ditherAmount)
    gl.uniform1f(u.bitDepth, p.bitDepth)
    gl.uniform1f(u.contrast, p.contrast)
    const fg = hexToRgb(p.fgColor)
    const bg = hexToRgb(p.bgColor)
    gl.uniform3f(u.fgColor, fg[0], fg[1], fg[2])
    gl.uniform3f(u.bgColor, bg[0], bg[1], bg[2])
    gl.uniform1i(u.colorMode, p.colorMode === 'color' ? 1 : 0)
    gl.uniform1i(u.algorithm, algorithmId(p.algorithm))
  }

  function draw() {
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  function setViewport(w: number, h: number) {
    gl.viewport(0, 0, w, h)
  }

  function dispose() {
    gl.deleteTexture(texture)
    gl.deleteBuffer(positionBuffer)
    gl.deleteBuffer(texCoordBuffer)
    gl.deleteProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
  }

  return { uploadTexture, setUniforms, draw, setViewport, dispose }
}
