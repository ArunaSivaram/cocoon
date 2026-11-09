/**
 * Browser-side image resizer for photo uploads (SPEC §6).
 *
 * Takes any image the user picks (including iPhone HEIC from Safari) and
 * returns a JPEG File whose longest edge is at most `maxEdge`. The resize
 * happens in a canvas, which has the useful side effect of converting HEIC
 * to a format the rest of our stack (and the server bucket, step 17) can
 * handle — Safari decodes HEIC when drawing to a canvas.
 *
 * `computeTargetSize` is split out as a pure helper so we can unit-test the
 * scaling maths in jsdom (canvas itself isn't available there).
 */

export interface ResizeOptions {
  /** Maximum size of the longest edge in CSS pixels. Default 1600 per SPEC §6. */
  maxEdge?: number;
  /** JPEG quality from 0 to 1. Default 0.85 — a good size/quality trade-off for journal photos. */
  quality?: number;
}

export interface TargetSize {
  width: number;
  height: number;
}

/**
 * Figure out the target dimensions for a resize. Preserves aspect ratio and
 * never upscales — a small photo comes back at its natural size.
 */
export function computeTargetSize(
  sourceWidth: number,
  sourceHeight: number,
  maxEdge: number,
): TargetSize {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    throw new Error('Invalid source dimensions.');
  }
  if (!Number.isFinite(maxEdge) || maxEdge <= 0) {
    throw new Error('maxEdge must be a positive number.');
  }
  const longest = Math.max(sourceWidth, sourceHeight);
  const scale = Math.min(1, maxEdge / longest);
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

/**
 * Resize a user-picked image to a JPEG File ≤ maxEdge on the longest side.
 * Throws on unreadable files (bad HEIC, corrupt, non-image).
 */
export async function resizeImageToJpeg(
  file: File,
  options: ResizeOptions = {},
): Promise<File> {
  const { maxEdge = 1600, quality = 0.85 } = options;

  const source = await loadImage(file);
  try {
    const { width, height } = computeTargetSize(source.width, source.height, maxEdge);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not open image on this device.');
    ctx.drawImage(source.drawable, 0, 0, width, height);
    const blob = await canvasToJpeg(canvas, quality);
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    source.release();
  }
}

interface LoadedImage {
  readonly width: number;
  readonly height: number;
  readonly drawable: CanvasImageSource;
  release(): void;
}

/**
 * Prefer `createImageBitmap` (off-main-thread decode where supported). Fall
 * back to an <img> element — essential for iOS Safari with HEIC, which
 * createImageBitmap can't decode but `<img>` + canvas can.
 */
async function loadImage(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      });
      return {
        width: bitmap.width,
        height: bitmap.height,
        drawable: bitmap,
        release: () => bitmap.close(),
      };
    } catch {
      // Fall through to the HTMLImageElement path.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(url);
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      drawable: img,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't open that photo."));
    img.src = url;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Couldn't save that photo."));
      },
      'image/jpeg',
      quality,
    );
  });
}
