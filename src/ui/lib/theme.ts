/**
 * Theme System (Step 88A — Dashboard modernization)
 *
 * First light/dark + brand-aware theme mechanism for the ERP UI.
 * Scoped intentionally: provides tokens consumed via CSS custom properties;
 * pages opt in by using the tokens. No business logic.
 *
 * Resolution hierarchy:
 *   1. Active brand/tenant accent  → derived from tenant.primaryColor (existing
 *      tenant config field — no new backend fields invented)
 *   2. Light/dark mode             → persisted user preference ('erp_theme_mode'),
 *      falls back to system preference
 *   3. Application defaults        → :root tokens in styles/theme.css
 *
 * DEMO/production note: pure presentation — persistence uses localStorage per the
 * app's existing client-side preference conventions.
 */

import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedMode = 'light' | 'dark';

const STORAGE_KEY = 'erp_theme_mode';

/* ─── Mode persistence & resolution ───────────────────────────────────────── */

export function getStoredMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    /* storage unavailable — fall through */
  }
  return 'system';
}

export function getSystemDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function resolveMode(mode: ThemeMode): ResolvedMode {
  if (mode === 'system') return getSystemDark() ? 'dark' : 'light';
  return mode;
}

/** Apply the resolved mode to <html data-theme="..."> for CSS token selection. */
export function applyThemeMode(mode: ThemeMode): ResolvedMode {
  const resolved = resolveMode(mode);
  document.documentElement.setAttribute('data-theme', resolved);
  return resolved;
}

/* Apply stored preference as early as possible (avoids flash of wrong theme). */
if (typeof document !== 'undefined') {
  applyThemeMode(getStoredMode());
}

/* ─── Brand accent derivation (from existing tenant.primaryColor) ─────────── */

interface Rgb { r: number; g: number; b: number }
interface Hsl { h: number; s: number; l: number }

function isValidHex(hex: string): boolean {
  return /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(hex.trim());
}

function normalizeHex(hex: string): string {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return `#${h.toLowerCase()}`;
}

function hexToRgb(hex: string): Rgb {
  const h = normalizeHex(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0));
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function hslToCss({ h, s, l }: Hsl): string {
  return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

/**
 * Derive the accent token set from a brand color, with distinct light/dark
 * variants so both modes keep readable contrast. Pure presentation math.
 */
export function deriveBrandAccents(primaryColor: string): { light: Record<string, string>; dark: Record<string, string> } | null {
  if (!isValidHex(primaryColor)) return null;
  const { h, s, l } = rgbToHsl(hexToRgb(normalizeHex(primaryColor)));
  // Achromatic brand colors carry no hue worth theming — keep app defaults.
  if (s < 0.08) return null;

  const sat = clamp(s, 0.3, 0.8);

  const light = {
    '--accent': hslToCss({ h, s: sat, l: clamp(l, 0.3, 0.42) }),
    '--accent-strong': hslToCss({ h, s: sat, l: clamp(l, 0.22, 0.32) }),
    '--accent-soft': hslToCss({ h, s: clamp(s, 0.25, 0.7), l: 0.955 }),
    '--accent-softer': hslToCss({ h, s: clamp(s, 0.3, 0.7), l: 0.9 }),
    '--accent-soft-contrast': hslToCss({ h, s: sat, l: 0.3 }),
  };

  const dark = {
    '--accent': hslToCss({ h, s: clamp(s, 0.35, 0.75), l: clamp(l, 0.55, 0.66) }),
    '--accent-strong': hslToCss({ h, s: clamp(s, 0.35, 0.75), l: clamp(l, 0.65, 0.76) }),
    '--accent-soft': hslToCss({ h, s: clamp(s, 0.3, 0.55), l: 0.22 }),
    '--accent-softer': hslToCss({ h, s: clamp(s, 0.3, 0.55), l: 0.16 }),
    '--accent-soft-contrast': hslToCss({ h, s: clamp(s, 0.3, 0.7), l: 0.78 }),
  };

  return { light, dark };
}

const BRAND_STYLE_ID = 'brand-theme';

/**
 * Apply the active tenant's brand accent as CSS custom properties via a
 * dedicated <style> element (overriding theme.css defaults in both modes).
 * Clears the override when no reliable brand color exists — the application
 * default accent then applies (documented limitation: per-brand neutral theme).
 */
export function applyBrandTheme(tenant: { primaryColor?: string } | null | undefined): void {
  if (typeof document === 'undefined') return;
  let el = document.getElementById(BRAND_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = BRAND_STYLE_ID;
    document.head.appendChild(el);
  }
  const accents = tenant?.primaryColor ? deriveBrandAccents(tenant.primaryColor) : null;
  if (!accents) {
    el.textContent = '';
    return;
  }
  const block = (vars: Record<string, string>) =>
    Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n');
  el.textContent =
    `/* Brand accent (auto-derived from tenant config) */\n` +
    `:root {\n${block(accents.light)}\n}\n` +
    `[data-theme='dark'] {\n${block(accents.dark)}\n}\n`;
}

/* ─── React hook ──────────────────────────────────────────────────────────── */

export interface ThemeController {
  mode: ThemeMode;
  resolved: ResolvedMode;
  setMode: (mode: ThemeMode) => void;
  /** Convenience: light → dark → system → light */
  cycle: () => void;
}

export function useThemeMode(): ThemeController {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredMode());
  const [resolved, setResolved] = useState<ResolvedMode>(() => resolveMode(getStoredMode()));

  useEffect(() => {
    setResolved(applyThemeMode(mode));
  }, [mode]);

  // Follow OS changes while in 'system' mode.
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(applyThemeMode('system'));
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    setModeState(next);
  }, []);

  const cycle = useCallback(() => {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    setMode(order[(order.indexOf(getStoredMode()) + 1) % order.length]);
  }, [setMode]);

  return { mode, resolved, setMode, cycle };
}
