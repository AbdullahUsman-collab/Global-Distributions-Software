/**
 * Customer Receipts Module Page
 * Cash/bank receipt entry against customer AR.
 *
 * Source of Truth:
 *   - audit/13_CASH_BANK.md (CR accounting: DEBIT Cash/Bank, CREDIT Customer AR)
 *   - audit/05_CUSTOMER_ACCOUNTING.md (Customer entity, AR balance)
 *   - audit/04_ACCOUNTING_ENGINE.md (CR voucher type)
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';
import { emitDataRefresh } from '../utils/dataRefresh';
import { getBills, getCustomers, getAccounts, createCustomerReceipt, postCustomerReceipt, deleteCustomerReceipt, getVoucherLines, getCustomerARBalance } from '../lib/api';
import {
  Customer,
} from '../../domain/types/customer';
import {
  AccountHead,
} from '../../domain/types/coa';
import {
  VoucherHeader,
  VoucherStatus,
  VoucherLine,
  VOUCHER_STATUS_LABELS,
} from '../../domain/types/voucher';

/* ─── Constants ────────────────────────────────────────────── */

const fmt = (n: number) => n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS: Record<VoucherStatus, { bg: string; fg: string }> = {
  DRAFT:  { bg: '#fef3c7', fg: '#92400e' },
  POSTED: { bg: '#dcfce7', fg: '#166534' },
};

/** Accepted cash/bank account codes */
const CASH_BANK_CODES = new Set(['11101', '11102']);

/* ═══════════════════════════════════════════════════════════ */
/* Main CustomerReceipts Component                               */
/* ═══════════════════════════════════════════════════════════ */

export const CustomerReceipts: React.FC = () => {
  const { tenant, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="page-pad" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>← Dashboard</button>
          <h1 style={styles.title}>Customer Receipts</h1>
          <p style={styles.subtitle}>{tenant.brandName}</p>
        </div>
      </div>

      {/* Receipts Tab */}
      <ReceiptsTab tenantId={tenant.id} />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Receipts Tab                                                 */
/* ═══════════════════════════════════════════════════════════ */

const ReceiptsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<VoucherHeader[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cashAccounts, setCashAccounts] = useState<AccountHead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allBills, customerData, coaData] = await Promise.all([
        getBills(),
        getCustomers(),
        getAccounts(),
      ]);
      const receiptData = (allBills as any[]).filter((b: any) => b.voucher?.voucherType === 'CR');
      setReceipts(receiptData.sort((a: any, b: any) => (b.date ?? b.voucher?.date ?? '').localeCompare(a.date ?? a.voucher?.date ?? '')));
      setCustomers((customerData as any[]).filter((c: any) => c.isActive));
      setCashAccounts((coaData as any[]).filter((a: any) => a.isPosting && CASH_BANK_CODES.has(a.accountCode) && a.isActive));
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Build customer map for display
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of customers) {
      map.set(c.accountHeadId, c);
    }
    return map;
  }, [customers]);

  // Build cash account map for display
  const cashAccountMap = useMemo(() => {
    const map = new Map<string, AccountHead>();
    for (const a of cashAccounts) {
      map.set(a.id, a);
    }
    return map;
  }, [cashAccounts]);

  const handlePost = async (id: string) => {
    if (!confirm('Post this receipt? This will create GL entries and update customer AR balance.')) return;
    try {
      await postCustomerReceipt(id);
      emitDataRefresh('receipt-posted');
      await loadData();
    } catch (err) {
      console.error('Failed to post receipt:', err);
      alert(err instanceof Error ? err.message : 'Failed to post receipt');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft receipt?')) return;
    try {
      await deleteCustomerReceipt(id);
      emitDataRefresh('receipt-deleted');
      await loadData();
    } catch (err) {
      console.error('Failed to delete receipt:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete receipt');
    }
  };

  // Resolve voucher lines to get amounts
  const getReceiptAmount = (voucher: VoucherHeader): number => {
    // The first line (DEBIT Cash/Bank) has the receipt amount
    // We need to fetch lines separately for display, but for the list
    // we can use a simple heuristic: the voucher narration or just show the voucher
    // For now, we'll fetch lines on demand when viewing details
    return 0; // Will be populated by detail view
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <h2 style={styles.sectionTitle}>Receipts</h2>
        <button onClick={() => setShowForm(true)} style={styles.primaryBtn}>+ New Receipt</button>
      </div>

      {/* Receipt Form Modal */}
      {showForm && (
        <ReceiptForm
          tenantId={tenantId}
          customers={customers}
          cashAccounts={cashAccounts}
          onSaved={async () => { setShowForm(false); await loadData(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Receipt List */}
      {loading ? (
        <p style={styles.loading}>Loading receipts...</p>
      ) : receipts.length === 0 ? (
        <p style={styles.empty}>No receipts yet.</p>
      ) : (
        <ReceiptList
          receipts={receipts}
          customerMap={customerMap}
          cashAccountMap={cashAccountMap}
          tenantId={tenantId}
          onPost={handlePost}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Receipt List                                                 */
/* ═══════════════════════════════════════════════════════════ */

const ReceiptList: React.FC<{
  receipts: VoucherHeader[];
  customerMap: Map<string, Customer>;
  cashAccountMap: Map<string, AccountHead>;
  tenantId: string;
  onPost: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ receipts, customerMap, cashAccountMap, tenantId, onPost, onDelete }) => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lineCache, setLineCache] = useState<Map<string, VoucherLine[]>>(new Map());

  const toggleExpand = async (voucherId: string) => {
    if (expandedId === voucherId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(voucherId);

    // Load lines if not cached
    if (!lineCache.has(voucherId)) {
      try {
        const lines = await getVoucherLines(voucherId);
        setLineCache(prev => new Map(prev).set(voucherId, lines));
      } catch (err) {
        console.error('Failed to load voucher lines:', err);
      }
    }
  };

  return (
    <div className="table-wrap">
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Receipt #</th>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Customer</th>
            <th style={styles.th}>Amount</th>
            <th style={styles.th}>Received Via</th>
            <th style={styles.th}>Narration</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map(r => {
            const lines = lineCache.get(r.id);
            // Find DEBIT line (Cash/Bank) and CREDIT line (Customer AR)
            const debitLine = lines?.find(l => l.debit > 0);
            const creditLine = lines?.find(l => l.credit > 0);
            const amount = debitLine?.debit ?? creditLine?.credit ?? 0;
            const cashAccount = debitLine ? cashAccountMap.get(debitLine.accountId) : null;
            const customer = creditLine ? customerMap.get(creditLine.accountId) : null;

            return (
              <React.Fragment key={r.id}>
                <tr
                  style={{ ...styles.tr, cursor: 'pointer' }}
                  onClick={() => toggleExpand(r.id)}
                >
                  <td style={styles.td}>{r.voucherNumber}</td>
                  <td style={styles.td}>{r.date}</td>
                  <td style={styles.td}>{customer?.name ?? '—'}</td>
                  <td style={styles.td}><strong>{fmt(amount)}</strong></td>
                  <td style={styles.td}>{cashAccount?.accountName ?? '—'}</td>
                  <td style={styles.td}>{r.narration}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: STATUS_COLORS[r.status]?.bg ?? '#f1f5f9',
                      color: STATUS_COLORS[r.status]?.fg ?? '#475569',
                    }}>
                      {VOUCHER_STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td style={styles.td} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/bills/${r.id}`)}
                      style={styles.linkBtn}
                      title="View bill detail"
                    >
                      View
                    </button>
                    {r.status === 'DRAFT' && (
                      <>
                        <button onClick={() => onPost(r.id)} style={styles.linkBtn}>Post</button>
                        <button onClick={() => onDelete(r.id)} style={styles.dangerBtn}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
                {expandedId === r.id && (
                  <tr>
                    <td colSpan={8} style={styles.detailRow}>
                      <div style={styles.detailBox}>
                        <p style={styles.detailText}>Voucher ID: {r.id}</p>
                        <p style={styles.detailText}>Created by: {r.createdBy}</p>
                        {lines && (
                          <div style={{ marginTop: '8px' }}>
                            <p style={{ ...styles.detailText, fontWeight: '600' }}>GL Lines:</p>
                            {lines.map(l => (
                              <p key={l.id} style={styles.detailText}>
                                {l.debit > 0 ? 'DEBIT' : 'CREDIT'}: {l.accountId} — {fmt(l.debit > 0 ? l.debit : l.credit)}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Receipt Form                                                 */
/* ═══════════════════════════════════════════════════════════ */

const ReceiptForm: React.FC<{
  tenantId: string;
  customers: Customer[];
  cashAccounts: AccountHead[];
  onSaved: () => void;
  onCancel: () => void;
}> = ({ tenantId, customers, cashAccounts, onSaved, onCancel }) => {
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState('');
  const [cashAccountId, setCashAccountId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState('');
  const [saving, setSaving] = useState(false);
  const [customerBalance, setCustomerBalance] = useState<number | null>(null);

  // Auto-select first cash account
  useEffect(() => {
    if (cashAccounts.length > 0 && !cashAccountId) {
      setCashAccountId(cashAccounts[0].id);
    }
  }, [cashAccounts, cashAccountId]);

  // Load customer AR balance when customer changes
  useEffect(() => {
    if (!customerId) {
      setCustomerBalance(null);
      return;
    }
    const loadBalance = async () => {
      try {
        const balance = await getCustomerARBalance(customerId);
        setCustomerBalance(balance);
      } catch (err) {
        console.error('Failed to load customer balance:', err);
        setCustomerBalance(null);
      }
    };
    loadBalance();
  }, [customerId, tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      alert('Select a customer');
      return;
    }
    if (!cashAccountId) {
      alert('Select a receiving account');
      return;
    }
    if (amount <= 0) {
      alert('Amount must be greater than zero');
      return;
    }
    if (!narration.trim()) {
      alert('Narration is required');
      return;
    }

    setSaving(true);
    try {
      const voucher = await createCustomerReceipt({
        customerId,
        cashAccountId,
        amount,
        date,
        narration: narration.trim(),
      });

      // Auto-post
      await postCustomerReceipt(voucher.id);
      onSaved();
    } catch (err) {
      console.error('Failed to create receipt:', err);
      alert(err instanceof Error ? err.message : 'Failed to create receipt');
    } finally {
      setSaving(false);
    }
  };

  // Get selected customer name
  const selectedCustomer = customers.find(c => c.id === customerId);

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h2 style={styles.modalTitle}>New Customer Receipt</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Customer *</label>
              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                style={styles.select}
              >
                <option value="">Select Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Receiving Account *</label>
              <select
                value={cashAccountId}
                onChange={e => setCashAccountId(e.target.value)}
                style={styles.select}
              >
                {cashAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.accountName} ({a.accountCode})</option>
                ))}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Amount *</label>
              <input
                type="number"
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value))}
                style={styles.input}
                min={0.01}
                step={0.01}
                placeholder="0.00"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Date *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
              <label style={styles.label}>Narration *</label>
              <input
                value={narration}
                onChange={e => setNarration(e.target.value)}
                style={styles.input}
                placeholder="e.g. Cash received from customer"
              />
            </div>
          </div>

          {/* Customer Balance Display */}
          {selectedCustomer && (
            <div style={styles.balanceBox}>
              <span style={styles.balanceLabel}>Current AR Balance ({selectedCustomer.name}):</span>
              <span style={{
                ...styles.balanceValue,
                color: (customerBalance ?? 0) > 0 ? '#dc2626' : '#16a34a',
              }}>
                {customerBalance !== null ? fmt(customerBalance) : 'Loading...'}
              </span>
            </div>
          )}

          {/* Accounting Preview */}
          {amount > 0 && selectedCustomer && (
            <div style={styles.previewBox}>
              <p style={styles.previewTitle}>Accounting Entry:</p>
              <p style={styles.previewLine}>
                DEBIT: {cashAccounts.find(a => a.id === cashAccountId)?.accountName ?? 'Cash/Bank'} — {fmt(amount)}
              </p>
              <p style={styles.previewLine}>
                CREDIT: {selectedCustomer.name} (AR) — {fmt(amount)}
              </p>
              <p style={styles.previewDiff}>
                Difference: {fmt(amount - amount)} (balanced)
              </p>
            </div>
          )}

          <div style={styles.formActions}>
            <button type="button" onClick={onCancel} style={styles.secondaryBtn}>Cancel</button>
            <button
              type="submit"
              disabled={saving || !customerId || !cashAccountId || amount <= 0 || !narration.trim()}
              style={styles.primaryBtn}
            >
              {saving ? 'Saving...' : 'Save & Post Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Styles                                                      */
/* ═══════════════════════════════════════════════════════════ */

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '24px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '13px',
    padding: 0,
    marginBottom: '4px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    gap: '12px',
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
  },
  primaryBtn: {
    padding: '8px 16px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '2px 6px',
  },
  dangerBtn: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '2px 6px',
  },
  loading: {
    color: '#94a3b8',
    fontSize: '14px',
    textAlign: 'center',
    padding: '32px',
  },
  empty: {
    color: '#94a3b8',
    fontSize: '14px',
    textAlign: 'center',
    padding: '32px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '2px solid #e2e8f0',
    color: '#64748b',
    fontWeight: '600',
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '10px 12px',
    color: '#1e293b',
    verticalAlign: 'middle',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  detailRow: {
    backgroundColor: '#f8fafc',
    padding: '12px',
  },
  detailBox: {
    padding: '8px 12px',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  detailText: {
    fontSize: '12px',
    color: '#64748b',
    margin: '2px 0',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '16px',
    color: '#1e293b',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
  },
  input: {
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
  },
  select: {
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  balanceBox: {
    marginTop: '12px',
    padding: '10px 14px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#64748b',
  },
  balanceValue: {
    fontSize: '14px',
    fontWeight: '700',
  },
  previewBox: {
    marginTop: '12px',
    padding: '10px 14px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    border: '1px solid #bfdbfe',
  },
  previewTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#1e40af',
    margin: '0 0 4px 0',
  },
  previewLine: {
    fontSize: '12px',
    color: '#1e40af',
    margin: '2px 0',
    fontFamily: 'monospace',
  },
  previewDiff: {
    fontSize: '12px',
    color: '#16a34a',
    margin: '4px 0 0 0',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
};
