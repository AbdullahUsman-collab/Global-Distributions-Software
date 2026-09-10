/**
 * User Management Page
 * Full CRUD for user accounts with brand access integration.
 *
 * Source: audit/68_NEXT_AUTHORIZED_ROADMAP_AND_BUSINESS_MODULE_SPECIFICATION_AUDIT.md
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';
import { getUsers, createUser, updateUser, deactivateUser, activateUser, getUserBrandAccess } from '../lib/api';
import { useRefreshOnMount } from '../utils/useRefreshOnEvent';

/* ─── Types ────────────────────────────────────────────────── */

interface UserRecord {
  id: string;
  tenantId: string;
  username: string;
  displayName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BrandAccess {
  id: string;
  userId: string;
  tenantId: string;
  role: string;
  isActive: boolean;
}

const ROLES = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'PURCHASE', 'VIEWER'];

const ROLE_COLORS: Record<string, { bg: string; fg: string }> = {
  ADMIN:      { bg: '#fee2e2', fg: '#991b1b' },
  MANAGER:    { bg: '#fef3c7', fg: '#92400e' },
  ACCOUNTANT: { bg: '#dbeafe', fg: '#1d4ed8' },
  SALES:      { bg: '#dcfce7', fg: '#166534' },
  PURCHASE:   { bg: '#f3e8ff', fg: '#7c3aed' },
  VIEWER:     { bg: '#f1f5f9', fg: '#475569' },
};

const fmt = (d: string | Date) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
};

/* ═══════════════════════════════════════════════════════════ */
/* Main Users Component                                        */
/* ═══════════════════════════════════════════════════════════ */

export const Users: React.FC = () => {
  const { tenant, user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [brandAccessMap, setBrandAccessMap] = useState<Map<string, BrandAccess[]>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
      // Load brand access for each user
      const accessMap = new Map<string, BrandAccess[]>();
      await Promise.all(
        data.map(async (u: UserRecord) => {
          try {
            const access = await getUserBrandAccess(u.id);
            accessMap.set(u.id, access);
          } catch {
            accessMap.set(u.id, []);
          }
        })
      );
      setBrandAccessMap(accessMap);
    } finally {
      setLoading(false);
    }
  }, [tenant.id]);

  useEffect(() => { load(); }, [load]);

  useRefreshOnMount(load, ['any-change']);

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q);
  });

  return (
    <div className="page-pad" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>← Dashboard</button>
          <h1 style={styles.title}>User Management</h1>
          <p style={styles.subtitle}>{tenant.brandName}</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={styles.primaryBtn}>+ New User</button>
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <span style={styles.statChip}>
          <span style={{ ...styles.statDot, backgroundColor: '#dbeafe', color: '#1d4ed8' }}>{filtered.length}</span>
          <span style={styles.statLabel}>Users</span>
        </span>
      </div>

      {/* Table */}
      <div className="table-wrap" style={styles.card}>
        {loading ? (
          <div style={styles.empty}>Loading users...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>{search ? 'No users match your search.' : 'No users found.'}</div>
        ) : (
          <>
            <div style={{ ...styles.treeHeader, minWidth: 900 }}>
              <span style={{ ...styles.col, flex: '0 0 100px' }}>Username</span>
              <span style={{ ...styles.col, flex: '1' }}>Display Name</span>
              <span style={{ ...styles.col, flex: '0 0 100px' }}>Role</span>
              <span style={{ ...styles.col, flex: '0 0 140px' }}>Brand Access</span>
              <span style={{ ...styles.col, flex: '0 0 80px' }}>Status</span>
              <span style={{ ...styles.col, flex: '0 0 90px' }}>Created</span>
              <span style={{ ...styles.col, flex: '0 0 100px' }}>Actions</span>
            </div>
            {filtered.map(u => {
              const access = brandAccessMap.get(u.id) || [];
              const activeAccess = access.filter(a => a.isActive);
              const color = ROLE_COLORS[u.role] || ROLE_COLORS.VIEWER;
              return (
                <div key={u.id} style={{ ...styles.voucherRow, minWidth: 900 }}>
                  <span style={{ ...styles.col, flex: '0 0 100px', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
                    {u.username}
                  </span>
                  <span style={{ ...styles.col, flex: '1' }}>{u.displayName}</span>
                  <span style={{ ...styles.col, flex: '0 0 100px' }}>
                    <span style={{ ...styles.typeBadge, backgroundColor: color.bg, color: color.fg }}>
                      {u.role}
                    </span>
                  </span>
                  <span style={{ ...styles.col, flex: '0 0 140px', fontSize: 12, color: '#64748b' }}>
                    {activeAccess.length} brand{activeAccess.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ ...styles.col, flex: '0 0 80px' }}>
                    <span style={{
                      ...styles.typeBadge,
                      backgroundColor: u.isActive ? '#dcfce7' : '#fee2e2',
                      color: u.isActive ? '#166534' : '#991b1b',
                    }}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </span>
                  <span style={{ ...styles.col, flex: '0 0 90px', fontSize: 12, color: '#64748b' }}>
                    {fmt(u.createdAt)}
                  </span>
                  <span style={{ ...styles.col, flex: '0 0 100px', display: 'flex', gap: 4 }}>
                    <button onClick={() => setEditUser(u)} style={styles.rowBtn} title="Edit">✎</button>
                    <button
                      onClick={async () => {
                        if (u.isActive) {
                          await deactivateUser(u.id);
                        } else {
                          await activateUser(u.id);
                        }
                        load();
                      }}
                      style={{ ...styles.rowBtn, color: u.isActive ? '#dc2626' : '#16a34a' }}
                      title={u.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {u.isActive ? '✕' : '✓'}
                    </button>
                    <button
                      onClick={() => navigate('/brand-access')}
                      style={styles.rowBtn}
                      title="Manage Brand Access"
                    >
                      ≡
                    </button>
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}

      {/* Edit User Modal */}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onUpdated={() => { setEditUser(null); load(); }}
        />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Create User Modal                                            */
/* ═══════════════════════════════════════════════════════════ */

const CreateUserModal: React.FC<{
  onClose: () => void;
  onCreated: () => void;
}> = ({ onClose, onCreated }) => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await createUser({ username, displayName, password, role });
      onCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Create New User</h2>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={styles.input}
              required
              minLength={3}
              maxLength={50}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              style={styles.input}
              required
              maxLength={100}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              required
              minLength={6}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={styles.select}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" style={styles.primaryBtn} disabled={saving}>
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Edit User Modal                                              */
/* ═══════════════════════════════════════════════════════════ */

const EditUserModal: React.FC<{
  user: UserRecord;
  onClose: () => void;
  onUpdated: () => void;
}> = ({ user, onClose, onUpdated }) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [isActive, setIsActive] = useState(user.isActive);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await updateUser(user.id, { displayName, isActive });
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Edit User — {user.username}</h2>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              style={styles.input}
              required
              maxLength={100}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Status</label>
            <select
              value={isActive ? 'active' : 'inactive'}
              onChange={e => setIsActive(e.target.value === 'active')}
              style={styles.select}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
  backBtn: { background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', marginBottom: 4, padding: 0 },
  title: { fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b' },

  toolbar: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  searchInput: { flex: '1 1 200px', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' },
  statChip: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' },
  statDot: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, fontWeight: 600, fontSize: 12 },
  statLabel: { fontSize: 13, color: '#475569' },

  card: { backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgb(0 0 0 / 0.06)' },
  treeHeader: { display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' },
  voucherRow: { display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 14 },
  col: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  typeBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 },
  rowBtn: { background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 14, color: '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },

  primaryBtn: { padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { padding: '10px 20px', backgroundColor: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, cursor: 'pointer' },

  empty: { padding: 40, textAlign: 'center' as const, color: '#94a3b8', fontSize: 14 },

  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgb(0 0 0 / 0.2)' },
  modalTitle: { fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 16 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  label: { fontSize: 13, fontWeight: 500, color: '#374151' },
  input: { padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' },
  select: { padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', backgroundColor: '#fff' },
  error: { padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
};
