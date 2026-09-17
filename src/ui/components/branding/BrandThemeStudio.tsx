/**
 * BrandThemeStudio — Step 91
 *
 * The "Brand Logo" section: pick a logo by URL or local upload, see an
 * immediate preview, automatic color extraction, a live light/dark theme
 * preview over the REAL token system, and an explicit "Apply" that persists
 * through the EXISTING brand-update API (logoUrl + primaryColor fields —
 * no new backend behavior).
 *
 * Persistence honesty:
 *  - Logo URL     → persists via existing `updateBrand` (PUT /api/brands/:id).
 *  - Local upload → preview-only; the browser cannot upload files through the
 *    existing API, so Apply persists only the EXTRACTED COLORS (hex strings,
 *    existing fields). Documented as BACKEND CAPABILITY GAP — UI-ONLY TASK.
 *
 * The manual brand color remains authoritative: "Also apply extracted colors"
 * is opt-out, and the original color can be restored in the color pickers.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  validateLogoUrl,
  validateImageFile,
  extractPaletteFromImage,
  loadImage,
  type LogoPalette,
  type ExtractionResult,
} from '../../lib/brandTheme';
import { updateBrand } from '../../lib/api';

/* ─── Props ───────────────────────────────────────────────────────────────── */

interface BrandThemeStudioProps {
  tenant: { id: string; brandName: string; logoUrl: string; primaryColor: string };
  /** Called after a successful Apply so the parent can refreshAuth (theme + header re-render). */
  onBrandUpdated?: () => void;
}

type SourceKind = 'none' | 'url' | 'file';
type Phase = 'idle' | 'loading' | 'ready' | 'error';

interface StudioState {
  kind: SourceKind;
  /** URL for 'url' kind; object URL for 'file' kind. */
  src: string;
  fileName?: string;
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export const BrandThemeStudio: React.FC<BrandThemeStudioProps> = ({ tenant, onBrandUpdated }) => {
  const [urlInput, setUrlInput] = useState<string>('');
  const [source, setSource] = useState<StudioState>({ kind: 'none', src: '' });
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<string>('');
  const [palette, setPalette] = useState<LogoPalette | null>(null);
  const [extractionNote, setExtractionNote] = useState<string>('');
  const [applyColors, setApplyColors] = useState<boolean>(true);
  const [applying, setApplying] = useState<boolean>(false);
  const [applyMsg, setApplyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Revoke object URLs when replaced or unmounted (memory hygiene, §17/§26). */
  useEffect(() => {
    return () => {
      if (source.kind === 'file' && source.src.startsWith('blob:')) {
        URL.revokeObjectURL(source.src);
      }
    };
  }, [source]);

  const processSource = useCallback(async (kind: SourceKind, src: string, _fileName?: string) => {
    setPhase('loading');
    setMessage('');
    setExtractionNote('');
    setPalette(null);
    try {
      // One decode, then extract from the loaded element (works for URL and
      // object-URL sources alike; object URLs are CORS-free).
      const img = await loadImage(src);
      const result: ExtractionResult = extractPaletteFromImage(img);
      if (result.ok) {
        setPalette(result.palette);
        setExtractionNote(
          `Extracted from ${result.sampleCount.toLocaleString()} sampled pixels — dominant ${result.dominant.toUpperCase()}`,
        );
        setPhase('ready');
      } else {
        setPalette(null);
        setExtractionNote(result.reason);
        setPhase('ready'); // logo previews fine; theme falls back (§19)
      }
    } catch (err) {
      setPalette(null);
      setMessage(err instanceof Error ? err.message : 'Could not load that image.');
      setPhase('error');
    }
  }, []);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateLogoUrl(urlInput);
    if (!v.valid) {
      setMessage(v.reason);
      setPhase('error');
      return;
    }
    const src = urlInput.trim();
    // Track the source so Apply persists the logo URL (not a stale file source).
    setSource(prev => {
      if (prev.kind === 'file' && prev.src.startsWith('blob:')) URL.revokeObjectURL(prev.src);
      return { kind: 'url', src };
    });
    void processSource('url', src, undefined);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    const v = validateImageFile(file);
    if (!v.valid) {
      setMessage(v.reason);
      setPhase('error');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setSource(prev => {
      if (prev.kind === 'file' && prev.src.startsWith('blob:')) URL.revokeObjectURL(prev.src);
      return { kind: 'file', src: objectUrl, fileName: file.name };
    });
    void processSource('file', objectUrl, file.name);
  };

  const handleClear = () => {
    setSource(prev => {
      if (prev.kind === 'file' && prev.src.startsWith('blob:')) URL.revokeObjectURL(prev.src);
      return { kind: 'none', src: '' };
    });
    setUrlInput('');
    setPalette(null);
    setExtractionNote('');
    setMessage('');
    setPhase('idle');
  };

  const handleApply = async () => {
    if (!source.src || applying) return;
    setApplying(true);
    setApplyMsg(null);
    try {
      const payload: { logoUrl?: string; primaryColor?: string } = {};
      if (source.kind === 'url') payload.logoUrl = source.src;
      if (applyColors && palette) payload.primaryColor = palette.primary;
      if (Object.keys(payload).length === 0) {
        setApplyMsg({ ok: false, text: 'Nothing to apply — pick a logo or enable color application.' });
        return;
      }
      await updateBrand(tenant.id, payload);
      setApplyMsg({
        ok: true,
        text: source.kind === 'url'
          ? 'Saved — logo and theme applied to this brand.'
          : 'Saved — extracted theme colors applied to this brand. (Local uploads preview only; set a Logo URL to persist the image.)',
      });
      onBrandUpdated?.();
    } catch (err: any) {
      setApplyMsg({ ok: false, text: err?.error || err?.message || 'Failed to save brand theme.' });
    } finally {
      setApplying(false);
    }
  };

  const showPreview = source.src !== '' && phase !== 'error';

  return (
    <section style={styles.section} aria-labelledby="brand-logo-heading">
      <h2 id="brand-logo-heading" style={styles.sectionTitle}>Brand Logo</h2>
      <p style={styles.sectionDesc}>
        Upload a logo or paste an image URL. Colors are extracted automatically and previewed as a
        light/dark theme before you apply anything.
      </p>

      {/* ── Inputs ── */}
      <div style={styles.inputRow}>
        <form onSubmit={handleUrlSubmit} style={styles.urlForm}>
          <label htmlFor="logo-url" style={styles.label}>Logo URL</label>
          <div style={styles.urlRow}>
            <input
              id="logo-url"
              type="url"
              inputMode="url"
              placeholder="https://example.com/logo.png"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              style={styles.input}
              autoComplete="off"
            />
            <button type="submit" style={styles.secondaryBtn}>Preview</button>
          </div>
        </form>

        <div style={styles.uploadWrap}>
          <span style={styles.label}>Upload Image</span>
          <input
            ref={fileInputRef}
            id="logo-file"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            onChange={handleFileChange}
            style={styles.fileInput}
            aria-label="Upload logo image (PNG, JPG, WEBP, GIF — max 2 MB)"
          />
          <button
            type="button"
            style={styles.secondaryBtn}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose File…
          </button>
          <span style={styles.fileHint}>{source.kind === 'file' ? source.fileName : 'PNG · JPG · WEBP · max 2 MB'}</span>
        </div>
      </div>

      {/* ── Status / errors ── */}
      <div aria-live="polite">
        {message && (
          <div role="alert" style={styles.errorBanner}>
            {message}
          </div>
        )}
        {applyMsg && (
          <div role="status" style={applyMsg.ok ? styles.successBanner : styles.errorBanner}>
            {applyMsg.text}
          </div>
        )}
      </div>

      {/* ── Preview + palette ── */}
      {showPreview && (
        <div style={styles.previewGrid}>
          <div style={styles.previewCard}>
            <span style={styles.previewLabel}>Preview</span>
            <div style={styles.logoBox}>
              <img
                src={source.src}
                alt={`${tenant.brandName} logo preview`}
                onError={() => {
                  setMessage('That image could not be displayed. Check the URL or try another file.');
                  setPhase('error');
                }}
                style={styles.previewImg}
              />
            </div>
            {source.kind === 'file' && (
              <span style={styles.previewNote}>Local preview only — apply a Logo URL to persist the image.</span>
            )}
            <button type="button" onClick={handleClear} style={styles.linkBtn}>Clear preview</button>
          </div>

          <div style={styles.paletteCard}>
            <span style={styles.previewLabel}>Extracted Palette</span>
            {phase === 'loading' ? (
              <div style={styles.paletteLoading} role="status">Analyzing colors…</div>
            ) : palette ? (
              <>
                <div style={styles.swatchRow}>
                  <Swatch label="Primary" hex={palette.primary} />
                  <Swatch label="Secondary" hex={palette.secondary} />
                  <Swatch label="Accent" hex={palette.accent} />
                  <Swatch label="Surface tint" hex={palette.surfaceTint} />
                </div>
                {extractionNote && <p style={styles.paletteNote}>{extractionNote}</p>}
                <label style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={applyColors}
                    onChange={e => setApplyColors(e.target.checked)}
                  />
                  <span>Apply extracted colors to the brand theme</span>
                </label>
              </>
            ) : (
              <p style={styles.paletteNote}>{extractionNote || 'No distinct colors found — the current brand theme stays in place.'}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Live theme preview (light + dark) ── */}
      {palette && showPreview && (
        <div style={styles.themesGrid}>
          <ThemePreview title="Light mode" palette={palette} dark={false} />
          <ThemePreview title="Dark mode" palette={palette} dark />
        </div>
      )}

      {/* ── Apply ── */}
      {showPreview && (
        <div style={styles.applyRow}>
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            style={{ ...styles.primaryBtn, opacity: applying ? 0.7 : 1 }}
          >
            {applying ? 'Applying…' : 'Apply to Live Theme'}
          </button>
          <span style={styles.applyHint}>
            {source.kind === 'url'
              ? 'Saves the logo URL and (optionally) the extracted primary color for this brand.'
              : 'Saves the extracted colors for this brand. Local image files cannot be persisted — use a Logo URL for the image itself.'}
          </span>
        </div>
      )}
    </section>
  );
};

/* ─── Swatch ──────────────────────────────────────────────────────────────── */

const Swatch: React.FC<{ label: string; hex: string }> = ({ label, hex }) => (
  <div style={styles.swatch}>
    <div style={{ ...styles.swatchColor, backgroundColor: hex }} aria-hidden="true" />
    <span style={styles.swatchLabel}>{label}</span>
    <span style={styles.swatchHex}>{hex.toUpperCase()}</span>
  </div>
);

/* ─── ThemePreview: static miniature ERP chrome using the generated colors ── */

const ThemePreview: React.FC<{ title: string; palette: LogoPalette; dark: boolean }> = ({ title, palette, dark }) => {
  const surface = dark ? '#0f172a' : '#f8fafc';
  const card = dark ? '#1e293b' : '#ffffff';
  const border = dark ? '#334155' : '#e2e8f0';
  const text = dark ? '#f1f5f9' : '#0f172a';
  const muted = dark ? '#94a3b8' : '#64748b';
  const accent = dark ? palette.accent : palette.primary;

  return (
    <div style={styles.themePreviewCard}>
      <span style={styles.previewLabel}>{title}</span>
      <div style={{ ...styles.tpRoot, backgroundColor: surface, color: text }}>
        <div style={{ ...styles.tpHeader, backgroundColor: card, borderBottom: `1px solid ${border}` }}>
          <div style={styles.tpBrandBtn}>
            <span style={{ ...styles.tpLogo, backgroundColor: accent, color: palette.contrastText }}>F</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: text }}>Fauji Foods</span>
          </div>
          <span style={{ ...styles.tpPrimaryBtn, backgroundColor: accent, color: palette.contrastText }}>+ New Sale</span>
        </div>
        <div style={styles.tpBody}>
          <div style={styles.tpSidebar}>
            <div style={{ ...styles.tpNavItem, backgroundColor: hexAlpha(accent, 0.14), color: accent, boxShadow: `inset 3px 0 0 ${accent}` }}>Dashboard</div>
            <div style={{ ...styles.tpNavItem, color: muted }}>Finance</div>
            <div style={{ ...styles.tpNavItem, color: muted }}>Inventory</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ ...styles.tpCard, backgroundColor: card, border: `1px solid ${border}` }}>
              <div style={{ fontSize: 10, color: muted }}>Receivables</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: text }}>114,707</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ ...styles.tpBadge, backgroundColor: hexAlpha(accent, 0.15), color: accent }}>Posted</span>
              <span style={{ ...styles.tpBadge, backgroundColor: dark ? '#1a2e1a' : '#dcfce7', color: dark ? '#86efac' : '#166534' }}>Draft</span>
              <span style={{ ...styles.tpSecondaryBtn, border: `1px solid ${border}`, color: text, backgroundColor: card }}>Export</span>
            </div>
            <div style={{ ...styles.tpInput, backgroundColor: dark ? '#0b1220' : '#f1f5f9', border: `1px solid ${border}`, color: muted }}>Search…</div>
          </div>
        </div>
      </div>
    </div>
  );
};

function hexAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */

const styles: { [key: string]: React.CSSProperties } = {
  section: { display: 'flex', flexDirection: 'column', gap: 14 },
  sectionTitle: { fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 },
  sectionDesc: { fontSize: 14, color: 'var(--text-muted)', margin: '-8px 0 0 0', lineHeight: 1.5 },

  inputRow: { display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' },
  urlForm: { flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 6 },
  urlRow: { display: 'flex', gap: 8 },
  uploadWrap: { display: 'flex', flexDirection: 'column', gap: 6, flex: '0 1 auto' },
  uploadRow: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  fileInput: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)' },
  fileHint: { fontSize: 12, color: 'var(--text-muted)' },
  label: { fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' },
  input: {
    flex: 1, minWidth: 0, padding: '10px 12px', fontSize: 14,
    border: '1px solid var(--border)', borderRadius: 8, outline: 'none',
    backgroundColor: 'var(--surface-2)', color: 'var(--text-primary)',
  },
  secondaryBtn: {
    padding: '10px 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
    backgroundColor: 'var(--surface-2)', color: 'var(--text-primary)',
    border: '1px solid var(--border)', borderRadius: 8, minHeight: 44,
  },
  primaryBtn: {
    padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)',
    border: 'none', borderRadius: 8, minHeight: 44,
  },
  linkBtn: {
    background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13,
    cursor: 'pointer', padding: '4px 0', textDecoration: 'underline', alignSelf: 'flex-start',
  },

  errorBanner: {
    padding: '10px 14px', backgroundColor: 'var(--danger-soft)', border: '1px solid var(--danger)',
    borderRadius: 8, color: 'var(--danger-fg)', fontSize: 13,
  },
  successBanner: {
    padding: '10px 14px', backgroundColor: 'var(--success-soft)', border: '1px solid var(--success)',
    borderRadius: 8, color: 'var(--success-fg)', fontSize: 13,
  },

  previewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 },
  previewCard: {
    display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start',
    backgroundColor: 'var(--surface-2)', border: '1px dashed var(--border)',
    borderRadius: 12, padding: 16,
  },
  paletteCard: {
    display: 'flex', flexDirection: 'column', gap: 10,
    backgroundColor: 'var(--surface-2)', border: '1px dashed var(--border)',
    borderRadius: 12, padding: 16,
  },
  previewLabel: { fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  logoBox: {
    width: '100%', height: 96, backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundImage: 'linear-gradient(45deg, var(--border) 25%, transparent 25%, transparent 75%, var(--border) 75%), linear-gradient(45deg, var(--border) 25%, transparent 25%, transparent 75%, var(--border) 75%)',
    backgroundSize: '16px 16px', backgroundPosition: '0 0, 8px 8px',
  },
  previewImg: { maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain' as const },
  previewNote: { fontSize: 12, color: 'var(--text-muted)' },

  paletteLoading: { fontSize: 14, color: 'var(--text-muted)' },
  swatchRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  swatch: { display: 'flex', flexDirection: 'column', gap: 4, width: 88 },
  swatchColor: { height: 44, borderRadius: 8, border: '1px solid var(--border)' },
  swatchLabel: { fontSize: 11, color: 'var(--text-secondary)' },
  swatchHex: { fontSize: 11, color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace' },
  paletteNote: { fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' },

  themesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 },

  themePreviewCard: { position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 },

  tpRoot: {
    borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)',
    fontSize: 12, pointerEvents: 'none' as const,
  },
  tpHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', gap: 8 },
  tpBrandBtn: { display: 'flex', alignItems: 'center', gap: 6 },
  tpLogo: { width: 18, height: 18, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 },
  tpPrimaryBtn: { padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 },
  tpBody: { display: 'flex', gap: 10, padding: 10 },
  tpSidebar: { display: 'flex', flexDirection: 'column', gap: 4, width: 92 },
  tpNavItem: { padding: '5px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500 },
  tpCard: { borderRadius: 8, padding: '8px 10px' },
  tpBadge: { padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600 },
  tpSecondaryBtn: { padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500 },
  tpInput: { padding: '6px 10px', borderRadius: 6, fontSize: 11 },

  applyRow: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  applyHint: { fontSize: 12, color: 'var(--text-muted)', maxWidth: 480, lineHeight: 1.5 },
};
