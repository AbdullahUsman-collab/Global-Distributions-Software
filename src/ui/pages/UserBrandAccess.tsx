/**
 * User Brand Access Management Page
 * Allows authorized administrators to manage user access to brands/tenants.
 *
 * Displays:
 * - All users with their brand access records
 * - Ability to add, edit, deactivate, reactivate brand access
 * - Role assignment per brand
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../components/auth/ProtectedRoute';
import {
  getUserBrandAccess,
  createUserBrandAccess,
  updateUserBrandAccess,
  deactivateUserBrandAccess,
  activateUserBrandAccess,
  getAuthorizedTenants,
} from '../lib/api';

interface BrandAccess {
  id: string;
  userId: string;
  tenantId: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BrandInfo {
  id: string;
  brandName: string;
  primaryColor: string;
}

const ROLES = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'PURCHASE', 'VIEWER'] as const;

export const UserBrandAccessPage: React.FC = () => {
  const { user, authorizedBrands } = useAuth();
  const [accessRecords, setAccessRecords] = useState<BrandAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newUserId, setNewUserId] = useState('');
  const [newTenantId, setNewTenantId] = useState('');
  const [newRole, setNewRole] = useState<string>('VIEWER');
  const [editRole, setEditRole] = useState<string>('VIEWER');

  const brandMap = new Map<string, BrandInfo>(
    authorizedBrands.map(b => [b.id, { id: b.id, brandName: b.brandName, primaryColor: b.primaryColor }])
  );

  const loadAccess = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUserBrandAccess(user.id);
      setAccessRecords(data);
    } catch {
      setError('Failed to load brand access records.');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { loadAccess(); }, [loadAccess]);

  const handleAdd = async () => {
    if (!newUserId.trim() || !newTenantId) {
      setError('User ID and Brand are required.');
      return;
    }
    setError('');
    try {
      await createUserBrandAccess({ userId: newUserId.trim(), tenantId: newTenantId, role: newRole });
      setSuccess('Brand access created.');
      setShowAddForm(false);
      setNewUserId('');
      setNewTenantId('');
      setNewRole('VIEWER');
      await loadAccess();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to create brand access.');
    }
  };

  const handleUpdateRole = async (id: string) => {
    setError('');
    try {
      await updateUserBrandAccess(id, { role: editRole });
      setSuccess('Role updated.');
      setEditingId(null);
      await loadAccess();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to update role.');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this brand access?')) return;
    setError('');
    try {
      await deactivateUserBrandAccess(id);
      setSuccess('Access deactivated.');
      await loadAccess();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.error || 'Failed to deactivate.');
    }
  };

  const handleActivate = async (id: string) => {
    setError('');
    try {
      await activateUserBrandAccess(id);
      setSuccess('Access reactivated.');
      await loadAccess();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.error || 'Failed to activate.');
    }
  };

  const uniqueUserIds = [...new Set(accessRecords.map(a => a.userId))];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>User Brand Access</h1>
          <p style={styles.subtitle}>Manage which users can access each brand and their roles.</p>
        </div>
        <button onClick={() => setShowAddForm(true)} style={styles.primaryBtn}>+ Add Access</button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {showAddForm && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Add Brand Access</h3>
          <div style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>User ID</label>
              <input value={newUserId} onChange={e => setNewUserId(e.target.value)} placeholder="e.g. user-admin-001" style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Brand</label>
              <select value={newTenantId} onChange={e => setNewTenantId(e.target.value)} style={styles.select}>
                <option value="">Select brand...</option>
                {authorizedBrands.map(b => (
                  <option key={b.id} value={b.id}>{b.brandName}</option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Role</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)} style={styles.select}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>&nbsp;</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleAdd} style={styles.saveBtn}>Save</button>
                <button onClick={() => setShowAddForm(false)} style={styles.cancelBtn}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>Loading brand access records...</div>
      ) : accessRecords.length === 0 ? (
        <div style={styles.empty}>No brand access records found.</div>
      ) : (
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User ID</th>
                <th style={styles.th}>Brand</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accessRecords.map(record => {
                const brand = brandMap.get(record.tenantId);
                const isEditing = editingId === record.id;
                return (
                  <tr key={record.id} style={{ ...styles.tr, opacity: record.isActive ? 1 : 0.5 }}>
                    <td style={styles.td}><code style={styles.code}>{record.userId}</code></td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: brand?.primaryColor || '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                          {brand?.brandName?.charAt(0) || '?'}
                        </div>
                        {brand?.brandName || record.tenantId}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <select value={editRole} onChange={e => setEditRole(e.target.value)} style={{ ...styles.select, width: 130 }}>
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <button onClick={() => handleUpdateRole(record.id)} style={styles.saveBtn}>Save</button>
                          <button onClick={() => setEditingId(null)} style={styles.cancelBtn}>Cancel</button>
                        </div>
                      ) : (
                        <span style={styles.roleBadge}>{record.role}</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusBadge, backgroundColor: record.isActive ? '#dcfce7' : '#fee2e2', color: record.isActive ? '#15803d' : '#dc2626' }}>
                        {record.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {!isEditing && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { setEditingId(record.id); setEditRole(record.role); }} style={styles.actionBtn}>Edit Role</button>
                          {record.isActive ? (
                            <button onClick={() => handleDeactivate(record.id)} style={styles.deactivateBtn}>Deactivate</button>
                          ) : (
                            <button onClick={() => handleActivate(record.id)} style={styles.activateBtn}>Reactivate</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .uba-form-row { flex-direction: column !important; }
          .uba-table { font-size: 12px !important; }
        }
      `}</style>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  page: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0 0' },
  primaryBtn: {
    padding: '10px 20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none',
    borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  error: {
    padding: '12px 16px', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: 8,
    fontSize: 14, marginBottom: 16, border: '1px solid #fecaca',
  },
  success: {
    padding: '12px 16px', backgroundColor: '#f0fdf4', color: '#15803d', borderRadius: 8,
    fontSize: 14, marginBottom: 16, border: '1px solid #bbf7d0',
  },
  card: {
    backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
    padding: 20, marginBottom: 20,
  },
  cardTitle: { fontSize: 16, fontWeight: 600, color: '#1e293b', margin: '0 0 16px' },
  formRow: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  field: { flex: '1 1 200px', minWidth: 150 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 },
  input: {
    width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6,
    fontSize: 14, outline: 'none',
  },
  select: {
    width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6,
    fontSize: 14, outline: 'none', backgroundColor: '#fff',
  },
  saveBtn: {
    padding: '8px 16px', backgroundColor: '#3b82f6', color: '#fff', border: 'none',
    borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  cancelBtn: {
    padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0',
    borderRadius: 6, fontSize: 13, cursor: 'pointer',
  },
  loading: { padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 },
  empty: { padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 },
  tableCard: {
    backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600,
    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
  },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '12px 16px', fontSize: 14, color: '#1e293b' },
  code: { fontSize: 12, backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' },
  roleBadge: {
    display: 'inline-block', padding: '3px 10px', backgroundColor: '#eff6ff',
    color: '#1d4ed8', borderRadius: 12, fontSize: 12, fontWeight: 600,
  },
  statusBadge: {
    display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
  },
  actionBtn: {
    padding: '4px 12px', backgroundColor: '#f8fafc', color: '#3b82f6', border: '1px solid #e2e8f0',
    borderRadius: 6, fontSize: 12, cursor: 'pointer',
  },
  deactivateBtn: {
    padding: '4px 12px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
    borderRadius: 6, fontSize: 12, cursor: 'pointer',
  },
  activateBtn: {
    padding: '4px 12px', backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0',
    borderRadius: 6, fontSize: 12, cursor: 'pointer',
  },
};
