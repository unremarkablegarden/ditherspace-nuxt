# DitherSpace (Nuxt)

A real-time image and video dithering tool, refactored as a Nuxt 4 + Vue 3 + Tailwind 4 app.

Live: https://ditherspace-nuxt.vercel.app/

This is a Nuxt rewrite of [landonjsmith/DitherSpace](https://github.com/landonjsmith/DitherSpace), itself a vanilla-JS port of the original cyberspace.online dither algorithm. Bayer-WebGL algorithm originally by [@unremarkablegarden](https://github.com/unremarkablegarden); Floyd–Steinberg and Atkinson by Landon J. Smith. This version reorganizes that codebase into Vue components and composables; the feature set (image and video dithering, WebM/MP4 export) is carried over from DitherSpace v1.6.x.

## Stack

- Nuxt 4 / Vue 3 / TypeScript
- Tailwind CSS 4
- WebGL fragment shader (Bayer, blue noise, halftone) + CPU pipelines (Floyd–Steinberg, Atkinson)
- `MediaRecorder` for video export

## Setup

```bash
bun install
bun run dev      # http://localhost:3000
bun run build
bun run preview
```

## Features

### Modes
- **Image**: drop or upload `.png` / `.jpg` / etc., or use the built-in sample generator.
- **Video**: drop or upload a video, scrub a timeline, and export the dithered result.

### Algorithms
- **Bayer 8×8 (WebGL)** — GPU-accelerated ordered dithering, real-time.
- **Blue noise (WebGL)** — Interleaved Gradient Noise threshold pattern; less grid-y than Bayer at the same bit depth.
- **Halftone (WebGL)** — luminance-driven circular dot screen; works in B&W and color (per-channel dots).
- **Floyd–Steinberg (CPU)** — error diffusion with a 4-neighbor kernel (7/16, 3/16, 5/16, 1/16).
- **Atkinson (CPU)** — classic Mac-style 6-neighbor kernel; only 6/8 of the error is propagated, preserving highlights and shadows.

### Controls

| Control | Description |
|---|---|
| Algorithm | Bayer / Blue noise / Halftone / Floyd–Steinberg / Atkinson |
| Color Mode | Black & White or Full Color |
| Pixel Size | Block size, 1–20 px |
| Dither Amount | Blends pure quantization with full dithering |
| Bit Depth | Levels per channel, 1–8 bits |
| Contrast | Pre-dither contrast adjustment |
| Scale | Output canvas scale |
| Foreground / Background | Ink and paper colors (B&W mode) |

### Output Resolution
Original and current dimensions are shown side by side. Set custom width/height with optional aspect-ratio lock; reset returns to the default scaled resolution.

### Image Export
PNG download of the current canvas.

### Video Export
- Format: **WebM** or **MP4** (browser support permitting; falls back via `MediaRecorder.isTypeSupported`)
- FPS: 15 / 24 / 30
- Audio: off, 11.025, 22.05, or 44.1 kHz — built from the source clip via `buildAudioStream`
- Live audio rate preview while playing back

## Project Layout

```
app/
  components/Dither/      DitherSpace, Canvas, Controls, Resolution, ModeTabs, FileLoader, VideoControls, Credits
  composables/            useDitherEngine, useBayerWebGL, useVideoDither, useVideoExport, useDitherDropZone
  utils/                  bayerMatrix, floydSteinberg, atkinson, sampleImage, buildAudioStream, pickMimeType, hexToRgb, types
  pages/index.vue
reference/                Original single-file v1.6.5 build, kept for reference
```

## Credits

- Original Vue-Bayer algorithm: [@unremarkablegarden](https://github.com/unremarkablegarden)
- Vanilla-JS port + Floyd–Steinberg / Atkinson implementations: [Landon J. Smith](https://github.com/landonjsmith)
- Nuxt refactor: this repo
