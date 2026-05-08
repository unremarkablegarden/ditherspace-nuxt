import type { DitherParams } from '~/utils/types'

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
varying vec2 v_texCoord;

${BAYER_8X8_GLSL}

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
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
    } else {
        vec2 uv = v_texCoord;
        vec2 pixelatedUV = floor(uv * u_resolution / u_pixelSize) * u_pixelSize / u_resolution;
        vec4 color = texture2D(u_image, pixelatedUV);
        vec2 pixelPos = floor(gl_FragCoord.xy);
        float bayerValue = bayer8x8(pixelPos);
        float noise = random(pixelPos * 0.01) * 0.1;
        bayerValue = mix(bayerValue, noise, 0.3);
        float effectiveThreshold = mix(0.5, bayerValue, u_ditherAmount);
        float levels = pow(2.0, u_bitDepth);
        #define BAYER_QUANTIZE(v) (floor((v) * levels + (1.0 - effectiveThreshold)) / levels)
        if (u_colorMode == 0) {
            float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            gray = clamp((gray - 0.5) * u_contrast + 0.5, 0.0, 1.0);
            float final = clamp(BAYER_QUANTIZE(gray), 0.0, 1.0);
            gl_FragColor = vec4(mix(u_bgColor, u_fgColor, final), 1.0);
        } else {
            vec3 rgb = clamp((color.rgb - 0.5) * u_contrast + 0.5, 0.0, 1.0);
            vec3 final = clamp(vec3(BAYER_QUANTIZE(rgb.r), BAYER_QUANTIZE(rgb.g), BAYER_QUANTIZE(rgb.b)), 0.0, 1.0);
            gl_FragColor = vec4(final, 1.0);
        }
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
