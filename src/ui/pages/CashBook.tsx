/**
 * Cash Book Page
 * Cash/bank account ledger with opening/closing balance and transaction list.
 *
 * Architecture:
 *   React UI → api.ts → Express API → CashBookService → IVoucherRepository
 *
 * Accounting:
 *   Cash Receipt (CR): DEBIT cash/bank, CREDIT counter-account
 *   Cash Payment (CP): DEBIT counter-account, CREDIT cash/bank
 *   Opening = Σ(all debits before startDate) - Σ(all credits before startDate)
 *   Closing = Opening + Σ(debits in range) - Σ(credits in range)
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';
import {
  getCashBookAccounts,
  getCashBookSummary,
  createCashBookVoucher,
  postCashBookVoucher,
  deleteCashBookVoucher,
  getAccounts,
} from '../lib/api';
import { emitDataRefresh } from '../utils/dataRefresh';
import { AccountHead } from '../../domain/types/coa';
import { VOUCHER_TYPE_LABELS } from '../../domain/types/voucher';
import { CashBookSummary, CashBookTransaction } from '../../domain/services/CashBookService';

/* ─── Helpers ──────────────────────────────────────────────── */

const fmtPKR = (n: number) => 'PKR ' + n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const RECEIPT_TYPES = new Set(['CR', 'CRV', 'BRV']);

/* ─── Component ────────────────────────────────────────────── */

export const CashBook: React.FC = () => {
  const { tenant, user } = useAuth();
  const navigate = useNavigate();
  const tenantId = tenant.id;

  // Data
  const [cashAccounts, setCashAccounts] = useState<AccountHead[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [startDate, setStartDate] = useState(firstOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [summary, setSummary] = useState<CashBookSummary | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [loadingBook, setLoadingBook] = useState(false);

  // New transaction modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newType, setNewType] = useState<'CR' | 'CP'>('CR');
  const [counterAccountId, setCounterAccountId] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(today());
  const [txNarration, setTxNarration] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // All posting accounts for counter-account dropdown
  const [allAccounts, setAllAccounts] = useState<AccountHead[]>([]);

  // Focus refs for keyboard navigation
  const counterAccountRef = useRef<HTMLSelectElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const narrationRef = useRef<HTMLInputElement>(null);

  /* ─── Load Data ──────────────────────────────────────────── */

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      try {
        const [cashAccts, allAcctData] = await Promise.all([
          getCashBookAccounts(),
          getAccounts(),
        ]);
        setCashAccounts(cashAccts);
        if (cashAccts.length > 0) {
          setSelectedAccountId(cashAccts[0].id);
        }
        setAllAccounts(allAcctData.filter((a: any) => a.isPosting && a.isActive));
      } catch (err: any) {
        console.error('Failed to load cash accounts:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  const loadCashBook = useCallback(async () => {
    if (!tenantId || !selectedAccountId) return;
    setLoadingBook(true);
    try {
      const result = await getCashBookSummary(selectedAccountId, startDate, endDate);
      setSummary(result);
    } catch (err: any) {
      console.error('Failed to load cash book:', err);
    } finally {
      setLoadingBook(false);
    }
  }, [tenantId, selectedAccountId, startDate, endDate]);

  useEffect(() => {
    loadCashBook();
  }, [loadCashBook]);

  /* ─── Validation ─────────────────────────────────────────── */

  const validateForm = (): string | null => {
    const amt = parseFloat(txAmount);
    if (!txAmount || isNaN(amt) || amt <= 0) return 'Amount must be greater than zero.';
    if (!Number.isFinite(amt)) return 'Amount is not a valid number.';
    if (Math.round(amt * 100) !== amt * 100) return 'Amount must have at most 2 decimal places.';
    if (!counterAccountId) return 'Please select a counter account.';
    if (!txDate) return 'Date is required.';
    if (!txNarration.trim()) return 'Narration/description is required.';
    if (txNarration.trim().length < 3) return 'Narration must be at least 3 characters.';
    return null;
  };

  /* ─── Handlers ───────────────────────────────────────────── */

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSaving(true);
    try {
      await createCashBookVoucher({
        type: newType,
        cashAccountId: selectedAccountId,
        counterAccountId,
        amount: parseFloat(txAmount),
        date: txDate,
        narration: txNarration.trim(),
      });
      setShowNewModal(false);
      setCounterAccountId('');
      setTxAmount('');
      setTxNarration('');
      setTxDate(today());
      setFormError('');
      emitDataRefresh('payment-posted');
      await loadCashBook();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create transaction.');
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async (voucherId: string) => {
    try {
      await postCashBookVoucher(voucherId);
      emitDataRefresh('payment-posted');
      await loadCashBook();
    } catch (err: any) {
      alert(err.message || 'Failed to post voucher.');
    }
  };

  const handleDelete = async (voucherId: string) => {
    if (!confirm('Delete this draft voucher? This cannot be undone.')) return;
    try {
      await deleteCashBookVoucher(voucherId);
      emitDataRefresh('payment-deleted');
      await loadCashBook();
    } catch (err: any) {
      alert(err.message || 'Failed to delete voucher.');
    }
  };

  const openNewModal = (type: 'CR' | 'CP') => {
    setNewType(type);
    setCounterAccountId('');
    setTxAmount('');
    setTxNarration('');
    setTxDate(today());
    setFormError('');
    setShowNewModal(true);
    // Focus first field after render
    setTimeout(() => counterAccountRef.current?.focus(), 100);
  };

  /* ─── Filter accounts for counter-account dropdown ───────── */

  const counterAccounts = allAccounts.filter(a => a.id !== selectedAccountId);
  const selectedAccount = cashAccounts.find(a => a.id === selectedAccountId);

  /* ─── Render ─────────────────────────────────────────────── */

  if (loading) {
    return <div style={styles.loading}>Loading cash accounts...</div>;
  }

  if (cashAccounts.length === 0) {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Cash Book</h1>
        <div style={styles.empty}>No cash or bank accounts found. Please set up your Chart of Accounts first.</div>
      </div>
    );
  }

  return (
    <div className="page-pad" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Cash Book</h1>
          <p style={styles.subtitle}>
            {selectedAccount ? `${selectedAccount.accountCode} — ${selectedAccount.accountName}` : 'Cash and bank account ledger'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={styles.receiptBtn}
            onClick={() => openNewModal('CR')}
            disabled={!selectedAccountId}
          >
            + Receipt
          </button>
          <button
            style={styles.paymentBtn}
            onClick={() => openNewModal('CP')}
            disabled={!selectedAccountId}
          >
            + Payment
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.field}>
          <label style={styles.label}>Account</label>
          <select
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
            style={styles.select}
          >
            {cashAccounts.map(a => (
              <option key={a.id} value={a.id}>
                {a.accountCode} — {a.accountName}
              </option>
            ))}
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>From</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>To</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>&nbsp;</label>
          <button
            style={styles.clearBtn}
            onClick={() => { setStartDate(firstOfMonth()); setEndDate(today()); }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={styles.summaryRow}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Opening Balance</div>
            <div style={{ ...styles.summaryValue, color: summary.openingBalance >= 0 ? '#15803d' : '#dc2626' }}>
              {fmtPKR(summary.openingBalance)}
            </div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Money In (Debits)</div>
            <div style={{ ...styles.summaryValue, color: '#15803d' }}>+{fmtPKR(summary.totalReceipts)}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Money Out (Credits)</div>
            <div style={{ ...styles.summaryValue, color: '#dc2626' }}>-{fmtPKR(summary.totalPayments)}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Closing Balance</div>
            <div style={{ ...styles.summaryValue, color: summary.closingBalance >= 0 ? '#15803d' : '#dc2626', fontWeight: 700 }}>
              {fmtPKR(summary.closingBalance)}
            </div>
          </div>
        </div>
      )}

      {/* Transaction Table */}
      {loadingBook ? (
        <div style={styles.loading}>Loading cash book...</div>
      ) : summary ? (
        <div style={styles.tableWrap}>
          {summary.transactions.length === 0 ? (
            <div style={styles.empty}>No transactions found for this account and date range.</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Voucher #</th>
                  <th style={styles.th}>Description</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Debit</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Credit</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Balance</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening balance row */}
                <tr style={styles.openingRow}>
                  <td style={styles.td}>{startDate}</td>
                  <td style={styles.td}></td>
                  <td style={styles.td}></td>
                  <td style={{ ...styles.td, fontStyle: 'italic', color: '#64748b' }}>Opening Balance</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}></td>
                  <td style={{ ...styles.td, textAlign: 'right' }}></td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: summary.openingBalance >= 0 ? '#15803d' : '#dc2626' }}>
                    {fmtPKR(summary.openingBalance)}
                  </td>
                  <td style={styles.td}></td>
                  <td style={styles.td}></td>
                </tr>
                {summary.transactions.map((tx) => {
                  const isReceipt = RECEIPT_TYPES.has(tx.ledgerEntry.voucherType);
                  const isDraft = tx.voucher?.status === 'DRAFT';
                  return (
                    <tr key={tx.ledgerEntry.id} style={styles.tr}>
                      <td style={styles.td}>{tx.ledgerEntry.entryDate}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.typeBadge,
                          backgroundColor: isReceipt ? '#dcfce7' : '#fee2e2',
                          color: isReceipt ? '#15803d' : '#dc2626',
                        }}>
                          {VOUCHER_TYPE_LABELS[tx.ledgerEntry.voucherType] ?? tx.ledgerEntry.voucherType}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => navigate(`/bills/${tx.ledgerEntry.voucherId}`)}
                          style={styles.voucherLink}
                          title="View bill detail"
                        >
                          #{tx.ledgerEntry.voucherNumber}
                        </button>
                      </td>
                      <td style={styles.td}>{tx.ledgerEntry.narration || '—'}</td>
                      <td style={{ ...styles.td, textAlign: 'right', color: tx.ledgerEntry.debit > 0 ? '#15803d' : '#94a3b8', fontFamily: 'monospace' }}>
                        {tx.ledgerEntry.debit > 0 ? fmtPKR(tx.ledgerEntry.debit) : '—'}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', color: tx.ledgerEntry.credit > 0 ? '#dc2626' : '#94a3b8', fontFamily: 'monospace' }}>
                        {tx.ledgerEntry.credit > 0 ? fmtPKR(tx.ledgerEntry.credit) : '—'}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: tx.runningBalance >= 0 ? '#15803d' : '#dc2626', fontFamily: 'monospace' }}>
                        {fmtPKR(tx.runningBalance)}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: isDraft ? '#fef3c7' : '#dcfce7',
                          color: isDraft ? '#92400e' : '#15803d',
                        }}>
                          {isDraft ? 'Draft' : 'Posted'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {isDraft && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={() => handlePost(tx.ledgerEntry.voucherId)}
                              style={styles.postBtn}
                              title="Post voucher"
                            >
                              Post
                            </button>
                            <button
                              onClick={() => handleDelete(tx.ledgerEntry.voucherId)}
                              style={styles.deleteBtn}
                              title="Delete draft"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {/* Closing balance row */}
                <tr style={styles.closingRow}>
                  <td style={styles.td}>{endDate}</td>
                  <td style={styles.td}></td>
                  <td style={styles.td}></td>
                  <td style={{ ...styles.td, fontStyle: 'italic', fontWeight: 700, color: '#1e293b' }}>Closing Balance</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: '#15803d', fontFamily: 'monospace' }}>{fmtPKR(summary.totalReceipts)}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: '#dc2626', fontFamily: 'monospace' }}>{fmtPKR(summary.totalPayments)}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: summary.closingBalance >= 0 ? '#15803d' : '#dc2626', fontFamily: 'monospace' }}>
                    {fmtPKR(summary.closingBalance)}
                  </td>
                  <td style={styles.td}></td>
                  <td style={styles.td}></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {/* New Transaction Modal */}
      {showNewModal && (
        <div style={styles.overlay} onClick={() => setShowNewModal(false)}>
          <div className="responsive-modal" style={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>
              {newType === 'CR' ? 'New Cash Receipt' : 'New Cash Payment'}
            </h2>
            <form onSubmit={handleCreate} style={styles.form}>
              <div style={styles.formRow}>
                <div style={{ ...styles.field, flex: 2 }}>
                  <label style={styles.label}>
                    {newType === 'CR' ? 'Received From (Account)' : 'Paid To (Account)'}
                  </label>
                  <select
                    ref={counterAccountRef}
                    value={counterAccountId}
                    onChange={e => setCounterAccountId(e.target.value)}
                    style={styles.select}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); amountRef.current?.focus(); } }}
                  >
                    <option value="">Select account...</option>
                    {counterAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.accountCode} — {a.accountName}</option>
                    ))}
                  </select>
                </div>
                <div style={{ ...styles.field, flex: 1 }}>
                  <label style={styles.label}>Amount (PKR)</label>
                  <input
                    ref={amountRef}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={txAmount}
                    onChange={e => setTxAmount(e.target.value)}
                    style={styles.input}
                    placeholder="0.00"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); dateRef.current?.focus(); } }}
                  />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.field}>
                  <label style={styles.label}>Date</label>
                  <input
                    ref={dateRef}
                    type="date"
                    value={txDate}
                    onChange={e => setTxDate(e.target.value)}
                    style={styles.input}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); narrationRef.current?.focus(); } }}
                  />
                </div>
                <div style={{ ...styles.field, flex: 2 }}>
                  <label style={styles.label}>Narration / Description</label>
                  <input
                    ref={narrationRef}
                    value={txNarration}
                    onChange={e => setTxNarration(e.target.value)}
                    style={styles.input}
                    placeholder="e.g. Cash received from Al-Noor Super Store"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(e as any); } }}
                  />
                </div>
              </div>
              {formError && <div style={styles.error}>{formError}</div>}
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowNewModal(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={newType === 'CR' ? styles.receiptBtn : styles.paymentBtn} disabled={saving}>
                  {saving ? 'Saving...' : newType === 'CR' ? 'Create Receipt' : 'Create Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Responsive CSS */}
      <style>{`
        .cashbook-filters { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; }
        @media (max-width: 768px) {
          .cashbook-summary { grid-template-columns: 1fr 1fr !important; }
          .cashbook-header { flex-direction: column; align-items: flex-start !important; }
        }
        @media (max-width: 480px) {
          .cashbook-summary { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

/* ─── Styles ───────────────────────────────────────────────── */

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    padding: 24,
    maxWidth: 1400,
    margin: '0 auto',
  },
  loading: {
    padding: 40,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    margin: 0,
  },
  filters: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 140,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#fff',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#fff',
    minWidth: 200,
  },
  clearBtn: {
    padding: '8px 12px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 500,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1e293b',
    fontFamily: 'monospace',
  },
  tableWrap: {
    overflowX: 'auto',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: 600,
    color: '#475569',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
    fontSize: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  td: {
    padding: '8px 12px',
    borderBottom: '1px solid #f1f5f9',
    color: '#334155',
    whiteSpace: 'nowrap',
  },
  tr: {
    transition: 'background-color 0.15s',
  },
  typeBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  openingRow: {
    backgroundColor: '#f0f9ff',
  },
  closingRow: {
    backgroundColor: '#f8fafc',
    borderTop: '2px solid #e2e8f0',
  },
  empty: {
    padding: 40,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 14,
  },
  receiptBtn: {
    padding: '8px 16px',
    backgroundColor: '#16a34a',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  paymentBtn: {
    padding: '8px 16px',
    backgroundColor: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  postBtn: {
    padding: '4px 8px',
    backgroundColor: '#dcfce7',
    color: '#15803d',
    border: '1px solid #bbf7d0',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '4px 8px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 560,
    maxHeight: '90vh',
    overflow: 'auto',
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: 16,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  formRow: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  cancelBtn: {
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  voucherLink: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    padding: 0,
    textDecoration: 'none',
  },
  error: {
    padding: '8px 12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 6,
    color: '#dc2626',
    fontSize: 13,
  },
};
