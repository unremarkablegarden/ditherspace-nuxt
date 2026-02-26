# DitherSpace
**DitherSpace** is an open-source vanilla JS port of the original cyberspace.online dither algorithm.  
It provides real-time dithering with three algorithm options: GPU-accelerated Bayer matrix dithering and two CPU-based error diffusion methods (Floyd-Steinberg and Atkinson). Features include grayscale and full-color quantization, adjustable pixelation, customizable color mapping, and custom output resolution controls.

Original Vue-Bayer algorithm courtesy of @unremarkablegarden on GitHub.  
Translated to vanilla JavaScript by Landon J. Smith | Additional dithering algorithms by Landon J. Smith

---

## Features

### Image Loading
- Upload any local image (`.png`, `.jpg`, etc.)
- Drag and drop an image anywhere onto the page
- Includes a built-in sample generator for testing

### Algorithm Selection
Choose between three dithering methods:
- **Bayer 8×8 (WebGL-based)**: Fast, GPU-accelerated ordered dithering with real-time performance
- **Floyd-Steinberg (CPU-based)**: Higher-quality error diffusion dithering with more organic results
- **Atkinson (CPU-based)**: Classic Mac-style error diffusion that retains sharp contrast by intentionally discarding 25% of the quantization error

### Real-Time Controls
All rendering updates instantly (Bayer on GPU, Floyd-Steinberg and Atkinson on CPU).

| Control | Description |
|--------|-------------|
| **Algorithm** | Switches between Bayer, Floyd-Steinberg, and Atkinson dithering |
| **Color Mode** | Toggles between Black & White and Full Color output |
| **Pixel Size** | Adjusts blocky pixelation amount (1–20 px) |
| **Dither Amount** | Blends between pure quantization and full dithering |
| **Bit Depth** | Quantizes grayscale levels (1–8 bits) |
| **Contrast** | Applies contrast adjustment before dithering |
| **Scale** | Scales canvas output resolution |
| **Foreground Color** | Color of "ink" pixels (Black & White mode only) |
| **Background Color** | Color of empty/light pixels (Black & White mode only) |

### Output Resolution
- Displays the original image resolution alongside the current output resolution
- Set a custom width and height for the output canvas
- Optional aspect ratio lock keeps proportions intact when changing one dimension
- Reset button restores the canvas to the default scaled resolution

### Dark Mode
A dark mode toggle is available and persists between sessions via `localStorage`.

---

## Dithering Algorithms

### Bayer 8×8 (WebGL)
DitherSpace's Bayer algorithm uses a hybrid of:
- **8×8 Bayer ordered dithering**
- **Pseudo-random noise** (for texture variation)
- **Grayscale or per-channel reduction** via bit-depth quantization
- **Per-pixel thresholding** based on user-controlled dither strength

The Bayer process:
1. Convert source pixel to grayscale (B&W mode) or process per-channel (Full Color mode)
2. Apply contrast adjustment
3. Fetch Bayer threshold for current pixel
4. Optionally mix in small random noise
5. Quantize based on selected bit depth
6. Blend quantized and dithered results depending on **Dither Amount**
7. Map final value to **FG / BG** output colors (B&W), or output directly (Full Color)

Rendering is handled entirely in a WebGL fragment shader for real-time performance.

### Floyd-Steinberg (CPU)
The Floyd-Steinberg algorithm provides higher-quality error diffusion:
- **Error propagation**: Distributes quantization error to neighboring pixels
- **Organic dithering**: Creates more natural-looking patterns than ordered dithering
- **CPU processing**: Slower than Bayer but produces superior quality for final outputs
- **Full Color support**: Processes each RGB channel independently

The Floyd-Steinberg process:
1. Convert source pixel to grayscale (B&W) or read per-channel (Full Color)
2. Apply contrast adjustment
3. Quantize pixel based on bit depth
4. Calculate quantization error
5. Distribute error to adjacent unprocessed pixels:
   - 7/16 to the right pixel
   - 3/16 to the bottom-left pixel
   - 5/16 to the bottom pixel
   - 1/16 to the bottom-right pixel
6. Map final value to **FG / BG** output colors (B&W), or output directly (Full Color)

### Atkinson (CPU)
The Atkinson algorithm reproduces the high-contrast look of early Macintosh graphics:
- **Partial error propagation**: Distributes only 6/8 (75%) of the quantization error — the remaining 25% is discarded, preserving bright highlights and deep shadows
- **Compact kernel**: Spreads error across 6 neighbors rather than 4, producing a tighter, more detailed pattern
- **CPU processing**: Comparable speed to Floyd-Steinberg
- **Full Color support**: Processes each RGB channel independently

The Atkinson kernel (current pixel = `*`):
```
. * 1 1
1 1 1 .
. 1 . .
```
Each marked cell receives 1/8 of the quantization error.

The Atkinson process:
1. Convert source pixel to grayscale (B&W) or read per-channel (Full Color)
2. Apply contrast adjustment
3. Quantize pixel based on bit depth
4. Calculate quantization error
5. Distribute 6 × (error/8) to the six neighbors listed in the kernel above
6. Map final value to **FG / BG** output colors (B&W), or output directly (Full Color)

---

## Image Output
- Final result is drawn to an HTML `<canvas>`
- Users can export the dithered output as a **PNG file**
- All preferences (including dark mode) are saved to `localStorage` and persist between sessions
