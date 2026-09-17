/**
 * Step 91 — Brand Logo + Automatic Color Theme Engine (UI-only)
 *
 * Deterministic client-side color extraction from a brand logo image,
 * plus generation of a harmonious, contrast-protected light/dark palette
 * over the EXISTING token system (src/ui/styles/theme.css accent tokens,
 * applied via lib/theme.ts applyBrandTheme).
 *
 * Pure presentation. No backend, no persistence layer: "Applying" a generated
 * theme writes the extracted primary color through the existing brand-update
 * API (updateBrand → PUT /api/brands/:id), exactly the field the manual color
 * pickers already write. The manual accent stays authoritative — the engine
 * proposes, the user applies.
 *
 * Determinism: sampling grid + weights are fixed; same input image/URL → same
 * palette (canvas + browser JPEG decode can vary by ±1 per channel between
 * browsers/loads; the quantization + ranking threshold absorbs that).
 */

/* ─── URL validation ──────────────────────────────────────────────────────── */

const IMAGE_URL_RE = /^https?:\/\/\S+$/i;
/** Roughly what <img> can render; used for friendly early feedback only. */
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|svg|avif|bmp|ico)(\?\S*)?$/i;
/** Extension-looking suffix; used to reject obviously-not-image URLs (ftp:, file:, .pdf). */
const NON_IMAGE_EXT_RE = /\.(pdf|docx?|xlsx?|pptx?|zip|mp4|mp3|json|csv|txt|html?|css|js)(\?\S*)?$/i;
/** Data URLs are allowed for local-upload previews and self-contained logos. */
const DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif|svg\+xml|avif|bmp|ico);base64,/i;
const MAX_URL_LENGTH = 2048;

/**
 * NOTE (project convention): the root tsconfig runs with strictNullChecks off,
 * which disables discriminated-union narrowing. Result shapes here therefore
 * use single interfaces with optional fields instead of tagged unions.
 */
export interface LogoUrlValidation {
  valid: boolean;
  reason?: string;
  source?: 'url' | 'data-url';
}

/**
 * Validate a logo URL shape (client-side, browser-safe images only).
 * Accepts http(s) and data:image URLs; rejects obviously non-image targets
 * so the loader fails fast with a clear message instead of a broken image.
 */
export function validateLogoUrl(raw: string): LogoUrlValidation {
  const url = (raw || '').trim();
  if (!url) return { valid: false, reason: 'Enter an image URL (https://…).' };
  if (url.length > MAX_URL_LENGTH) return { valid: false, reason: 'URL is too long (max 2048 characters).' };
  if (DATA_URL_RE.test(url)) return { valid: true, source: 'data-url' };

  if (!IMAGE_URL_RE.test(url)) {
    return { valid: false, reason: 'URL must start with https:// (or http://).' };
  }
  if (NON_IMAGE_EXT_RE.test(url)) {
    return { valid: false, reason: 'That URL points to a document, not an image. Use a PNG, JPG, WEBP or SVG URL.' };
  }
  if (IMAGE_EXT_RE.test(url)) return { valid: true, source: 'url' };
  // No recognizable extension: many CDNs serve images without extensions.
  return { valid: true, source: 'url' };
}

/* ─── Palette types ───────────────────────────────────────────────────────── */

export interface LogoPalette {
  /** Contrast-protected primary accent (dark enough for white text on light mode). */
  primary: string;
  /** Complementary companion hue for secondary/emphasis surfaces. */
  secondary: string;
  /** Brighter, lighter companion for dark-mode accents. */
  accent: string;
  /** Soft surface tint (very light desaturated companion). */
  surfaceTint: string;
  /** Palette-level foreground for use on primary (always readable). */
  contrastText: string;
}

/* ─── Color math ──────────────────────────────────────────────────────────── */

interface Rgb { r: number; g: number; b: number }
interface Hsl { h: number; s: number; l: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number) => Math.round(v * 100) / 100;

function rgbToHex({ r, g, b }: Rgb): string {
  const to = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * clamp(s, 0, 1);
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0, gp = 0, bp = 0;
  if (hh < 60) [rp, gp, bp] = [c, x, 0];
  else if (hh < 120) [rp, gp, bp] = [x, c, 0];
  else if (hh < 180) [rp, gp, bp] = [0, c, x];
  else if (hh < 240) [rp, gp, bp] = [0, x, c];
  else  if (hh < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return {
    r: (rp + m) * 255,
    g: (gp + m) * 255,
    b: (bp + m) * 255,
  };
}

function hslToHex(hsl: Hsl): string {
  return rgbToHex(hslToRgb(hsl));
}

/**
 * WCAG 2.x relative luminance + contrast ratio (for contrast protection).
 */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function parseHex(hex: string): Rgb {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** Test-only export of the internal hex parser. */
export const parseHexForTest = parseHex;

/* ─── Extraction ──────────────────────────────────────────────────────────── */

const SAMPLE_GRID = 48;              // fixed sampling grid → determinism
const BIN_SIZE = 24;                 // RGB quantization bin size
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB safety cap for uploads
const MAX_DIMENSION = 512;           // downsample ceiling for processing

export interface ExtractionResult {
  ok: boolean;
  palette?: LogoPalette;
  dominant?: string;
  sampleCount?: number;
  reason?: string;
}

/**
 * Extract a brand palette from a loaded image element using a canvas.
 * Fixed sampling grid + quantization + saturation/value-weighted ranking →
 * stable, deterministic results. Transparent, near-white and near-black
 * pixels are excluded so backgrounds don't hijack the theme.
 */
export function extractPaletteFromImage(img: HTMLImageElement): ExtractionResult {
  try {
    const w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) return { ok: false, reason: 'Image has no drawable pixels.' };

    const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { ok: false, reason: 'Canvas is unavailable in this browser.' };

    ctx.drawImage(img, 0, 0, cw, ch);
    let data: Uint8ClampedArray;
    try {
      data = ctx.getImageData(0, 0, cw, ch).data;
    } catch {
      return { ok: false, reason: 'Image is protected by CORS — theme extraction is unavailable for this URL. Try uploading the file instead.' };
    }

    const cells = cw * ch;
    const stepX = cw / SAMPLE_GRID;
    const stepY = ch / SAMPLE_GRID;
    const counts = new Map<number, { count: number; r: number; g: number; b: number }>();
    let sampled = 0;

    for (let gy = 0; gy < SAMPLE_GRID; gy++) {
      const py = Math.min(ch - 1, Math.floor((gy + 0.5) * stepY));
      for (let gx = 0; gx < SAMPLE_GRID; gx++) {
        const px = Math.min(cw - 1, Math.floor((gx + 0.5) * stepX));
        const i = (py * cw + px) * 4;
        const a = data[i + 3];
        if (a < 200) continue; // transparent / mostly-transparent
        const r = data[i], g = data[i + 1], b = data[i + 2];
        // Skip near-white and near-black (backgrounds, outlines) — they carry no hue worth theming.
        const lum = 0.2126 * r + 0.2126 * g + 0.2126 * b; // fast approx is fine here (weights equal)
        if (lum > 242 || lum < 18) continue;
        const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3); // 15-bit quantized key
        const cell = counts.get(key) || { count: 0, r: 0, g: 0, b: 0 };
        cell.count++;
        cell.r += r; cell.g += g; cell.b += b;
        counts.set(key, cell);
        sampled++;
      }
    }

    if (sampled === 0 || counts.size === 0) {
      return { ok: false, reason: 'No usable colors found in this logo (it may be pure white, pure black or fully transparent).' };
    }


    // Score = frequency × chroma weight (favor saturated, mid-lightness colors).
    const ranked = [...counts.values()]
      .map(c => {
        const r = c.r / c.count, g = c.g / c.count, b = c.b / c.count;
        const { h, s, l } = rgbToHsl({ r, g, b });
        const freq = c.count / sampled;
        const chromaBoost = 0.5 + s; // saturated colors rank higher
        const lPenalty = 1 - Math.abs(l - 0.45) * 0.8; // mid tones preferred
        return { h, s, l, freq, score: freq * chromaBoost * Math.max(0.1, lPenalty) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const best = ranked[0];
    if (!best || best.s < 0.12) {
      return { ok: false, reason: 'Logo has no distinct color (grayscale/monochrome) — keeping the current brand theme.' };
    }

    const palette = generateTheme({ h: best.h, s: best.s, l: best.l }, ranked.filter(c => c !== best));
    const dominant = hslToHex({ h: best.h, s: best.s, l: best.l });
    return { ok: true, palette, dominant, sampleCount: sampled };
  } catch {
    return { ok: false, reason: 'Color extraction failed unexpectedly.' };
  }
}

/**
 * Generate the full logo palette (primary/secondary/accent/surfaceTint) from a
 * dominant hue + companions. Companions pick a different, reasonably saturated
 * hue from the logo when available (analogous ±40° fallback otherwise).
 */
export function generateTheme(dominant: Hsl, companions: Array<{ h: number; s: number; l: number }>): LogoPalette {
  const dh = ((dominant.h % 360) + 360) % 360;
  const ds = clamp(dominant.s, 0.35, 0.85);

  // Primary: dark enough for white-on-primary contrast (light mode accent).
  const primaryHsl: Hsl = { h: dh, s: ds, l: clamp(dominant.l, 0.3, 0.42) };
  const primaryRgb = hslToRgb(primaryHsl);
  const white: Rgb = { r: 255, g: 255, b: 255 };
  const black: Rgb = { r: 0, g: 0, b: 0 };
  // Contrast-protect: adjust lightness until white text ≥ 4.5:1 (WCAG AA).
  let l = primaryHsl.l;
  let textIsLight = true;
  for (let i = 0; i < 24; i++) {
    const rgb = hslToRgb({ h: dh, s: ds, l });
    if (contrastRatio(rgb, white) >= 4.5) break;
    l -= 0.02;
    if (l <= 0.18) { textIsLight = false; break; }
  }
  const finalPrimary = hslToRgb({ h: dh, s: ds, l: clamp(l, 0.18, 0.5) });
  const finalContrast = contrastRatio(finalPrimary, white) >= 4.5 ? white : black;

  // Secondary: pick a genuinely different companion hue from the logo, else analogous.
  const companionPool = companions.filter(c => c.s >= 0.15);
  let secondaryHue = (dh + 40) % 360;
  for (const c of companionPool) {
    const ch = ((c.h % 360) + 360) % 360;
    const delta = Math.abs(((ch - dh + 540) % 360) - 180); // 0=opposite, 180=same
    if (delta < 130) { // meaningfully different hue
      secondaryHue = ch;
      break;
    }
  }
  const secondary = hslToHex({ h: secondaryHue, s: clamp(companionPool[0]?.s ?? ds * 0.9, 0.3, 0.8), l: 0.44 });

  // Accent: brighter companion for dark mode.
  const accent = hslToHex({ h: dh, s: clamp(ds, 0.4, 0.8), l: 0.62 });

  // Surface tint: very light, desaturated wash of the dominant hue.
  const surfaceTint = hslToHex({ h: dh, s: clamp(ds * 0.5, 0.1, 0.5), l: 0.96 });

  return {
    primary: rgbToHex(finalPrimary),
    secondary,
    accent,
    surfaceTint,
    contrastText: rgbToHex(finalContrast),
  };
}

/** Extract from a Blob/File (local upload) — loads via object URL, then revokes it. */
export async function extractPaletteFromFile(file: File): Promise<ExtractionResult> {
  if (!file.type.startsWith('image/')) {
    return { ok: false, reason: 'That file is not an image.' };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, reason: 'Image is too large (max 2 MB).' };
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    return extractPaletteFromImage(img);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Extract from a URL string. */
export async function extractPaletteFromUrl(url: string): Promise<ExtractionResult> {
  const img = await loadImage(url);
  return extractPaletteFromImage(img);
}

/**
 * Load an image and wait for decode. Rejects with a friendly reason on error.
 * SVGs are fine for <img>, but canvas reads need intrinsic dimensions —
 * SVGs without width/height are rejected with a clear reason.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'sync';
    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) {
        reject(new Error('Image loaded but has no intrinsic dimensions (SVG without width/height is not supported for extraction).'));
        return;
      }
      resolve(img);
    };
    img.onerror = () => {
      reject(new Error('Could not load the image. Check the URL, or that the site allows cross-origin embedding (CORS).'));
    };
    img.src = src;
  });
}

/* ─── Shared file-validation helpers (used by the studio UI) ──────────────── */

export function validateImageFile(file: File): { valid: boolean; reason?: string } {
  if (!file.type.startsWith('image/')) {
    return { valid: false, reason: 'Unsupported file type — choose a PNG, JPG, WEBP or SVG image.' };
  }
  if (file.type === 'image/svg+xml') {
    return { valid: false, reason: 'SVG upload is not supported for uploads — paste an SVG URL in the Logo URL field instead.' };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { valid: false, reason: 'Image is too large — maximum size is 2 MB.' };
  }
  return { valid: true };
}


