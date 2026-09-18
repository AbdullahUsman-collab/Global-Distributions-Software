/**
 * Brand Management Page
 * Admin-only page for creating and managing brands/tenants.
 *
 * Features:
 * - List all brands with status
 * - Create new brands
 * - Edit brand metadata
 * - Activate/deactivate brands
 * - Responsive design
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';
import { getBrands, createBrand, updateBrand, deactivateBrand } from '../lib/api';
import { BrandLogo } from '../components/BrandLogo';
import { BrandThemeStudio } from '../components/branding/BrandThemeStudio';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface Brand {
  id: string;
  slug: string;
  brandName: string;
  logoUrl: string;
  primaryColor: string;
}

const fmt = (d: string | Date) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const Brands: React.FC = () => {
  const { tenant, refreshAuth } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editBrand, setEditBrand] = useState<Brand | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getBrands();
      setBrands(data);
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to load brands');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = brands.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    return b.brandName.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q);
  });

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this brand? Users will lose access.')) return;
    try {
      await deactivateBrand(id);
      setSuccess('Brand deactivated.');
      await load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.error || 'Failed to deactivate brand.');
    }
  };

  return (
    <div className="page-pad tx-page" style={styles.page}>
      <div style={styles.header}>
        <div>
          <Link to="/dashboard" className="tx-btn tx-btn-link" style={styles.backBtn}>← Dashboard</Link>
          <h1 style={styles.title}>Brand Management</h1>
          <p style={styles.subtitle}>{tenant.brandName} — Manage all brands</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={styles.primaryBtn}>+ New Brand</button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="Search brands..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <span style={styles.statChip}>
          <span style={{ ...styles.statDot, backgroundColor: 'var(--info-soft)', color: 'var(--info-fg)' }}>{filtered.length}</span>
          <span style={styles.statLabel}>Brands</span>
        </span>
      </div>

      <div className="table-wrap" style={styles.card}>
        {loading ? (
          <div style={styles.empty}>Loading brands...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>{search ? 'No brands match your search.' : 'No brands found.'}</div>
        ) : (
          <>
            <div style={{ ...styles.treeHeader, minWidth: 700 }}>
              <span style={{ ...styles.col, flex: '0 0 40px' }}></span>
              <span style={{ ...styles.col, flex: '1' }}>Brand Name</span>
              <span style={{ ...styles.col, flex: '0 0 120px' }}>Slug</span>
              <span style={{ ...styles.col, flex: '0 0 100px' }}>Status</span>
              <span style={{ ...styles.col, flex: '0 0 100px' }}>Actions</span>
            </div>
            {filtered.map(b => (
              <div key={b.id} style={{ ...styles.voucherRow, minWidth: 700 }}>
                <span style={{ ...styles.col, flex: '0 0 40px' }}>
                  <BrandLogo
                    logoUrl={b.logoUrl}
                    brandName={b.brandName}
                    color={b.primaryColor || '#3b82f6'}
                    size={28}
                    radius={6}
                    fontSize={12}
                  />
                </span>
                <span style={{ ...styles.col, flex: '1', fontWeight: 500 }}>{b.brandName}</span>
                <span style={{ ...styles.col, flex: '0 0 120px', fontSize: 13, color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace' }}>{b.slug}</span>
                <span style={{ ...styles.col, flex: '0 0 100px' }}>
                  <span style={{ ...styles.typeBadge, backgroundColor: 'var(--success-soft)', color: 'var(--success-fg)' }}>Active</span>
                </span>
                <span style={{ ...styles.col, flex: '0 0 100px', display: 'flex', gap: 4 }}>
                  <button onClick={() => setEditBrand(b)} className="inv-row-btn" style={styles.rowBtn} title="Edit" aria-label={`Edit brand ${b.brandName}`}>✎</button>
                  <button onClick={() => handleDeactivate(b.id)} className="inv-row-btn inv-row-btn--danger" style={{ ...styles.rowBtn, color: 'var(--danger)' }} title="Deactivate" aria-label={`Deactivate brand ${b.brandName}`}>✕</button>
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {showCreate && (
        <CreateBrandModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}

      {/* Step 91 — Brand Logo + Automatic Theme Studio for the active brand. */}
      <div style={styles.card} >
        <div style={{ padding: 24 }}>
          <BrandThemeStudio
            tenant={tenant}
            onBrandUpdated={refreshAuth}
          />
        </div>
      </div>

      {editBrand && (
        <EditBrandModal
          brand={editBrand}
          onClose={() => setEditBrand(null)}
          onUpdated={async () => { setEditBrand(null); await load(); if (editBrand.id === tenant.id) await refreshAuth(); }}
        />
      )}
    </div>
  );
};

/* ─── Create Brand Modal ───────────────────────────────────── */

const CreateBrandModal: React.FC<{
  onClose: () => void;
  onCreated: () => void;
}> = ({ onClose, onCreated }) => {
  useEscapeKey(onClose);
  const [slug, setSlug] = useState('');
  const [brandName, setBrandName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [accentColor, setAccentColor] = useState('#1e40af');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await createBrand({ slug, brandName, primaryColor, accentColor });
      onCreated();
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to create brand');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Create New Brand</h2>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Brand Name</label>
            <input
              type="text"
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              style={styles.input}
              placeholder="e.g. Apex Trading"
              required
              maxLength={256}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Slug (URL-friendly)</label>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              style={styles.input}
              placeholder="e.g. apex-trading"
              required
              maxLength={128}
              pattern="[a-z0-9-]+"
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Primary Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  style={{ width: 40, height: 36, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  style={{ ...styles.input, flex: 1 }}
                />
              </div>
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Accent Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  style={{ width: 40, height: 36, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  style={{ ...styles.input, flex: 1 }}
                />
              </div>
            </div>
          </div>
          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" style={styles.primaryBtn} disabled={saving}>
              {saving ? 'Creating...' : 'Create Brand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Edit Brand Modal ─────────────────────────────────────── */

const EditBrandModal: React.FC<{
  brand: Brand;
  onClose: () => void;
  onUpdated: () => void;
}> = ({ brand, onClose, onUpdated }) => {
  useEscapeKey(onClose);
  const [brandName, setBrandName] = useState(brand.brandName);
  const [logoUrl, setLogoUrl] = useState(brand.logoUrl || '');
  const [primaryColor, setPrimaryColor] = useState(brand.primaryColor);
  const [accentColor, setAccentColor] = useState(brand.primaryColor === '#3b82f6' ? '#1e40af' : brand.primaryColor);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await updateBrand(brand.id, { brandName, logoUrl: logoUrl.trim(), primaryColor, accentColor });
      onUpdated();
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to update brand');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Edit Brand — {brand.brandName}</h2>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Brand Name</label>
            <input
              type="text"
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              style={styles.input}
              required
              maxLength={256}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Logo URL (optional)</label>
            <input
              type="url"
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              style={styles.input}
              placeholder="https://example.com/logo.png"
              maxLength={2048}
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Primary Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  style={{ width: 40, height: 36, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  style={{ ...styles.input, flex: 1 }}
                />
              </div>
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Accent Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  style={{ width: 40, height: 36, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  style={{ ...styles.input, flex: 1 }}
                />
              </div>
            </div>
          </div>
          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" style={styles.primaryBtn} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Styles ───────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 32, maxWidth: 1200, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  backBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', marginBottom: 4, padding: 0, textDecoration: 'none', display: 'inline-block', paddingTop: 10, paddingBottom: 10, paddingRight: 12, marginTop: -10 },
  title: { fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'var(--text-muted)' },

  toolbar: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  searchInput: { flex: '1 1 200px', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', color: 'var(--text-primary)', backgroundColor: 'var(--surface-2)' },
  statChip: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' },
  statDot: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, fontWeight: 600, fontSize: 12 },
  statLabel: { fontSize: 13, color: 'var(--text-secondary)' },

  card: { backgroundColor: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 1px 3px rgb(0 0 0 / 0.06)' },
  treeHeader: { display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-2)', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  voucherRow: { display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: 14 },
  col: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  typeBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 },
  rowBtn: { background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },

  primaryBtn: { padding: '10px 20px', backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { padding: '10px 20px', backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, cursor: 'pointer' },

  empty: { padding: 40, textAlign: 'center' as const, color: 'var(--text-muted)', fontSize: 14 },

  error: { padding: '10px 14px', backgroundColor: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 8, color: 'var(--danger-fg)', fontSize: 13, marginBottom: 16 },
  success: { padding: '10px 14px', backgroundColor: 'var(--success-soft)', border: '1px solid var(--success)', borderRadius: 8, color: 'var(--success-fg)', fontSize: 13, marginBottom: 16 },

  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { backgroundColor: 'var(--surface-raised)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgb(0 0 0 / 0.2)' },
  modalTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  label: { fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' },
  input: { padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', color: 'var(--text-primary)', backgroundColor: 'var(--surface-2)' },
  select: { padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', color: 'var(--text-primary)', backgroundColor: 'var(--surface-2)' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
};
