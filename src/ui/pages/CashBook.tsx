/**
 * Cash Book Page
 * Shows cash/bank account ledger with opening/closing balance and transaction list.
 *
 * Source of Truth:
 *   - audit/13_CASH_BANK.md (Cash Book pages)
 *   - audit/MASTER_REVERSE_ENGINEERED_SPEC.md (cash book pages)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';
import { services } from '../services';
import { emitDataRefresh } from '../utils/dataRefresh';
import { AccountHead } from '../../domain/types/coa';
import { VoucherHeader, VOUCHER_TYPE_LABELS, VOUCHER_STATUS_LABELS } from '../../domain/types/voucher';
import { CashBookSummary, CashBookTransaction } from '../../domain/services/CashBookService';

/* ─── Helpers ──────────────────────────────────────────────── */

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

/* ─── Component ────────────────────────────────────────────── */

export const CashBook: React.FC = () => {
  const { tenant } = useAuth();
  const navigate = useNavigate();
  const tenantId = tenant.id;

  // Data
  const [accounts, setAccounts] = useState<AccountHead[]>([]);
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
  const [error, setError] = useState('');

  // Accounts for counter-account dropdown
  const [allAccounts, setAllAccounts] = useState<AccountHead[]>([]);

  /* ─── Load Data ──────────────────────────────────────────── */

  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      try {
        const cashAccounts = await services.cashBookService.getCashBankAccounts(tenantId);
        setAccounts(cashAccounts);
        if (cashAccounts.length > 0) {
          setSelectedAccountId(cashAccounts[0].id);
        }
        const allAccts = await services.coaRepository.getAccountsByTenantId(tenantId);
        setAllAccounts(allAccts.filter(a => a.isPosting && a.isActive));
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
      const s = await services.cashBookService.getCashBook(
        tenantId,
        selectedAccountId,
        startDate,
        endDate,
      );
      setSummary(s);
    } catch (err: any) {
      console.error('Failed to load cash book:', err);
    } finally {
      setLoadingBook(false);
    }
  }, [tenantId, selectedAccountId, startDate, endDate]);

  useEffect(() => {
    loadCashBook();
  }, [loadCashBook]);

  /* ─── Handlers ───────────────────────────────────────────── */

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amt = parseFloat(txAmount);
    if (!amt || amt <= 0) { setError('Amount must be greater than zero.'); return; }
    if (!counterAccountId) { setError('Please select a counter account.'); return; }
    if (!txNarration.trim()) { setError('Narration is required.'); return; }
    setSaving(true);
    try {
      if (newType === 'CR') {
        await services.cashBookService.createCashReceipt(
          tenantId,
          {
            cashAccountId: selectedAccountId,
            creditAccountId: counterAccountId,
            amount: amt,
            date: txDate,
            narration: txNarration.trim(),
          },
          'admin',
        );
      } else {
        await services.cashBookService.createCashPayment(
          tenantId,
          {
            cashAccountId: selectedAccountId,
            debitAccountId: counterAccountId,
            amount: amt,
            date: txDate,
            narration: txNarration.trim(),
          },
          'admin',
        );
      }
      setShowNewModal(false);
      setCounterAccountId('');
      setTxAmount('');
      setTxNarration('');
      setTxDate(today());
      await loadCashBook();
    } catch (err: any) {
      setError(err.message || 'Failed to create transaction.');
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async (voucherId: string) => {
    try {
      await services.cashBookService.postVoucher(tenantId, voucherId);
      emitDataRefresh('payment-posted');
      await loadCashBook();
    } catch (err: any) {
      alert(err.message || 'Failed to post voucher.');
    }
  };

  const handleDelete = async (voucherId: string) => {
    if (!confirm('Delete this draft voucher?')) return;
    try {
      await services.cashBookService.deleteVoucher(tenantId, voucherId);
      emitDataRefresh('payment-deleted');
      await loadCashBook();
    } catch (err: any) {
      alert(err.message || 'Failed to delete voucher.');
    }
  };

  /* ─── Filter accounts for counter-account dropdown ───────── */

  const counterAccounts = allAccounts.filter(a => a.id !== selectedAccountId);

  /* ─── Render ─────────────────────────────────────────────── */

  if (loading) {
    return <div style={styles.loading}>Loading cash accounts...</div>;
  }

  return (
    <div className="page-pad" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Cash Book</h1>
          <p style={styles.subtitle}>Cash and bank account ledger</p>
        </div>
        <button
          style={styles.primaryBtn}
          onClick={() => { setNewType('CR'); setShowNewModal(true); setError(''); }}
          disabled={!selectedAccountId}
        >
          + New Receipt
        </button>
        <button
          style={{ ...styles.primaryBtn, backgroundColor: '#7c3aed' }}
          onClick={() => { setNewType('CP'); setShowNewModal(true); setError(''); }}
          disabled={!selectedAccountId}
        >
          + New Payment
        </button>
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
            {accounts.length === 0 && <option value="">No cash/bank accounts</option>}
            {accounts.map(a => (
              <option key={a.id} value={a.id}>
                {a.accountCode} — {a.accountName}
              </option>
            ))}
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={styles.input} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={styles.input} />
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={styles.summaryRow}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Opening Balance</div>
            <div style={{ ...styles.summaryValue, color: summary.openingBalance >= 0 ? '#15803d' : '#dc2626' }}>
              {fmt(summary.openingBalance)}
            </div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Total Receipts</div>
            <div style={{ ...styles.summaryValue, color: '#15803d' }}>+{fmt(summary.totalReceipts)}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Total Payments</div>
            <div style={{ ...styles.summaryValue, color: '#dc2626' }}>-{fmt(summary.totalPayments)}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Closing Balance</div>
            <div style={{ ...styles.summaryValue, color: summary.closingBalance >= 0 ? '#15803d' : '#dc2626', fontWeight: 700 }}>
              {fmt(summary.closingBalance)}
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
                    {fmt(summary.openingBalance)}
                  </td>
                  <td style={styles.td}></td>
                </tr>
                {summary.transactions.map((tx) => (
                  <tr key={tx.ledgerEntry.id} style={styles.tr}>
                    <td style={styles.td}>{tx.ledgerEntry.entryDate}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.typeBadge,
                        backgroundColor: ['CR', 'CRV', 'BRV'].includes(tx.ledgerEntry.voucherType) ? '#dcfce7' : '#fee2e2',
                        color: ['CR', 'CRV', 'BRV'].includes(tx.ledgerEntry.voucherType) ? '#15803d' : '#dc2626',
                      }}>
                        {VOUCHER_TYPE_LABELS[tx.ledgerEntry.voucherType] ?? tx.ledgerEntry.voucherType}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => navigate(`/bills/${tx.ledgerEntry.voucherId}`)}
                        style={{ ...styles.voucherLink }}
                        title="View bill detail"
                      >
                        #{tx.ledgerEntry.voucherNumber}
                      </button>
                    </td>
                    <td style={styles.td}>{tx.ledgerEntry.narration || '—'}</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: tx.ledgerEntry.debit > 0 ? '#15803d' : '#94a3b8' }}>
                      {tx.ledgerEntry.debit > 0 ? fmt(tx.ledgerEntry.debit) : '—'}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', color: tx.ledgerEntry.credit > 0 ? '#dc2626' : '#94a3b8' }}>
                      {tx.ledgerEntry.credit > 0 ? fmt(tx.ledgerEntry.credit) : '—'}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: tx.runningBalance >= 0 ? '#15803d' : '#dc2626' }}>
                      {fmt(tx.runningBalance)}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                      }}>
                        Posted
                      </span>
                    </td>
                  </tr>
                ))}
                {/* Closing balance row */}
                <tr style={styles.closingRow}>
                  <td style={styles.td}>{endDate}</td>
                  <td style={styles.td}></td>
                  <td style={styles.td}></td>
                  <td style={{ ...styles.td, fontStyle: 'italic', fontWeight: 700, color: '#1e293b' }}>Closing Balance</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: '#15803d' }}>{fmt(summary.totalReceipts)}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>{fmt(summary.totalPayments)}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: summary.closingBalance >= 0 ? '#15803d' : '#dc2626' }}>
                    {fmt(summary.closingBalance)}
                  </td>
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
                <div style={styles.field}>
                  <label style={styles.label}>
                    {newType === 'CR' ? 'Credit Account (Income/Party)' : 'Debit Account (Expense/Party)'}
                  </label>
                  <select value={counterAccountId} onChange={e => setCounterAccountId(e.target.value)} style={styles.select}>
                    <option value="">Select account...</option>
                    {counterAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.accountCode} — {a.accountName}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={txAmount}
                    onChange={e => setTxAmount(e.target.value)}
                    style={styles.input}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.field}>
                  <label style={styles.label}>Date</label>
                  <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} style={styles.input} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Narration</label>
                  <input
                    value={txNarration}
                    onChange={e => setTxNarration(e.target.value)}
                    style={styles.input}
                    placeholder="Description..."
                  />
                </div>
              </div>
              {error && <div style={styles.error}>{error}</div>}
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowNewModal(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.primaryBtn} disabled={saving}>
                  {saving ? 'Saving...' : newType === 'CR' ? 'Create Receipt' : 'Create Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Styles ───────────────────────────────────────────────── */

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    padding: 24,
    maxWidth: 1200,
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
    gap: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 160,
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
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
    fontSize: 20,
    fontWeight: 700,
    color: '#1e293b',
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
    fontSize: 14,
  },
  th: {
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: 600,
    color: '#475569',
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '10px 12px',
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
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 12,
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
  primaryBtn: {
    padding: '8px 16px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
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
    fontSize: 14,
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
