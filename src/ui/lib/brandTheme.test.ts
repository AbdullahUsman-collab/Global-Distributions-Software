/**
 * Step 91 — Brand Theme Engine Tests
 *
 * Covers the pure presentation logic: URL validation, deterministic palette
 * generation, contrast protection, and fallback behavior. Canvas/image
 * extraction is browser-dependent; generateTheme (the deterministic core that
 * extraction feeds into) is tested directly.
 */

import { describe, it, expect } from 'vitest';
import {
  validateLogoUrl,
  generateTheme,
  contrastRatio,
  relativeLuminance,
  parseHexForTest,
} from './brandTheme';

/* ─── URL validation ──────────────────────────────────────────────────────── */

describe('validateLogoUrl', () => {
  it('accepts https image URLs', () => {
    const r = validateLogoUrl('https://example.com/logo.png');
    expect(r.valid).toBe(true);
  });

  it('accepts extensionless CDN URLs (still loadable by <img>)', () => {
    expect(validateLogoUrl('https://cdn.example.com/brand/logo/v2').valid).toBe(true);
  });

  it('accepts data:image URLs', () => {
    expect(validateLogoUrl('data:image/png;base64,iVBORw0KGgo=').valid).toBe(true);
  });

  it('rejects empty input', () => {
    expect(validateLogoUrl('').valid).toBe(false);
    expect(validateLogoUrl('   ').valid).toBe(false);
  });

  it('rejects non-http schemes (javascript:, ftp:, file:)', () => {
    expect(validateLogoUrl('javascript:alert(1)').valid).toBe(false);
    expect(validateLogoUrl('ftp://example.com/logo.png').valid).toBe(false);
    expect(validateLogoUrl('file:///C:/logo.png').valid).toBe(false);
  });

  it('rejects obvious document URLs with a useful reason', () => {
    const r = validateLogoUrl('https://example.com/brand-guidelines.pdf');
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/image/i);
  });

  it('rejects overlong URLs', () => {
    expect(validateLogoUrl('https://example.com/' + 'a'.repeat(3000)).valid).toBe(false);
  });
});

/* ─── Contrast math ───────────────────────────────────────────────────────── */

describe('contrast helpers', () => {
  it('white vs black is 21:1', () => {
    expect(contrastRatio({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 })).toBeCloseTo(21, 1);
  });

  it('relativeLuminance matches WCAG anchor values', () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
  });
});

/* ─── Theme generation ────────────────────────────────────────────────────── */

describe('generateTheme', () => {
  it('produces a deterministic palette for identical inputs', () => {
    const dominant = { h: 210, s: 0.7, l: 0.5 };
    const a = generateTheme(dominant, []);
    const b = generateTheme(dominant, []);
    expect(a.primary).toBe(b.primary);
    expect(a.secondary).toBe(b.secondary);
    expect(a.accent).toBe(b.accent);
    expect(a.surfaceTint).toBe(b.surfaceTint);
    expect(a.contrastText).toBe(b.contrastText);
  });

  it('primary is dark enough for ≥4.5:1 contrast with white (WCAG AA)', () => {
    const cases = [
      { h: 210, s: 0.7, l: 0.5 },  // blue
      { h: 0, s: 0.75, l: 0.55 },  // bright red
      { h: 120, s: 0.6, l: 0.5 },  // green
      { h: 45, s: 0.9, l: 0.6 },   // yellow (worst case)
      { h: 280, s: 0.65, l: 0.45 } // purple
    ];
    for (const dominant of cases) {
      const t = generateTheme(dominant, []);
      const ratio = contrastRatio(parseHexForTest(t.primary), { r: 255, g: 255, b: 255 });
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(t.contrastText.toLowerCase()).toBe('#ffffff');
    }
  });

  it('yellow-driven primary flips contrast text to black when white cannot reach 4.5:1', () => {
    const t = generateTheme({ h: 55, s: 0.95, l: 0.6 }, []);
    const againstPrimary = contrastRatio(parseHexForTest(t.primary), parseHexForTest(t.contrastText));
    expect(againstPrimary).toBeGreaterThanOrEqual(4.5);
  });

  it('dark-mode accent is lighter than the primary', () => {
    const t = generateTheme({ h: 210, s: 0.7, l: 0.5 }, []);
    expect(relativeLuminance(parseHexForTest(t.accent)))
      .toBeGreaterThan(relativeLuminance(parseHexForTest(t.primary)));
  });

  it('surface tint stays near-white for light branded surfaces', () => {
    const t = generateTheme({ h: 210, s: 0.7, l: 0.5 }, []);
    expect(relativeLuminance(parseHexForTest(t.surfaceTint))).toBeGreaterThan(0.85);
  });

  it('uses a genuinely different companion hue for secondary when the logo provides one', () => {
    const dominant = { h: 210, s: 0.7, l: 0.5 };
    const companions = [{ h: 20, s: 0.7, l: 0.5 }]; // orange
    const t = generateTheme(dominant, companions);
    expect(t.secondary.toLowerCase()).not.toBe(t.primary.toLowerCase());
  });

  it('falls back to an analogous hue for secondary on monohue logos', () => {
    const dominant = { h: 210, s: 0.7, l: 0.5 };
    const t = generateTheme(dominant, []);
    const { h: sh } = hslOf(t.secondary);
    // Same metric as the engine's companion filter: 0 = same hue, 180 = opposite.
    const hueDelta = Math.abs(((sh - 210 + 540) % 360) - 180);
    expect(hueDelta).toBeLessThan(60); // analogous fallback stays near the dominant hue
  });
});

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function hslOf(hex: string): { h: number; s: number; l: number } {
  // Minimal HSL conversion for assertions (duplicated small math is fine in tests).
  const { r, g, b } = parseHexForTest(hex);
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
