/**
 * Cash Book Page — Redesigned
 * Single-page cash/bank account ledger with inline transaction entry.
 *
 * Architecture:
 *   React UI → api.ts → Express API → CashBookService → IVoucherRepository
 *
 * Accounting:
 *   Cash Receipt (CR): DEBIT cash/bank, CREDIT counter-account
 *   Cash Payment (CP): DEBIT counter-account, CREDIT cash/bank
 *   Opening = Σ(all debits before startDate) - Σ(all credits before startDate)
 *   Closing = Opening + Σ(debits in range) - Σ(credits in range)
 *
 * Workflow:
 *   DATE → MAIN ACCOUNT → SECOND ACCOUNT → DESCRIPTION → DEBIT OR CREDIT → SAVE
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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

/* ─── Account Selector Component ───────────────────────────── */

interface AccountSelectorProps {
  accounts: AccountHead[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  excludeId?: string;
}

const AccountSelector: React.FC<AccountSelectorProps> = ({ accounts, value, onChange, placeholder = 'Search account number or name...', excludeId }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return accounts.filter(a => {
      if (excludeId && a.id === excludeId) return false;
      if (!q) return true;
      return a.accountCode.toLowerCase().includes(q) || a.accountName.toLowerCase().includes(q);
    });
  }, [accounts, query, excludeId]);

  const selected = accounts.find(a => a.id === value);

  useEffect(() => {
    setHighlightIdx(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (id: string) => {
    onChange(id);
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[highlightIdx]) {
      e.preventDefault();
      select(filtered[highlightIdx].id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {selected && !open ? (
        <div
          className="tx-btn" style={styles.accountSelected}
          onClick={() => { setOpen(true); setQuery(''); inputRef.current?.focus(); }}
        >
          <span style={styles.accountCode}>{selected.accountCode}</span>
          <span style={styles.accountName}>{selected.accountName}</span>
          <span style={styles.accountChange}>change</span>
        </div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected ? `${selected.accountCode} — ${selected.accountName}` : placeholder}
          style={styles.accountInput}
        />
      )}
      {open && filtered.length > 0 && (
        <div style={styles.dropdown}>
          {filtered.slice(0, 20).map((a, i) => (
            <div
              key={a.id}
              className="cb-dd-item"
              data-active={i === highlightIdx || undefined}
              style={styles.dropdownItem}
              onClick={() => select(a.id)}
              onMouseEnter={() => setHighlightIdx(i)}
            >
              <span style={styles.dropdownCode}>{a.accountCode}</span>
              <span style={styles.dropdownName}>{a.accountName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Main Component ───────────────────────────────────────── */

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

  // Inline transaction entry
  const [txDate, setTxDate] = useState(today());
  const [counterAccountId, setCounterAccountId] = useState('');
  const [txDebit, setTxDebit] = useState('');
  const [txCredit, setTxCredit] = useState('');
  const [txNarration, setTxNarration] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // All posting accounts for second-account selector
  const [allAccounts, setAllAccounts] = useState<AccountHead[]>([]);

  // Search/filter for entries table
  const [searchQuery, setSearchQuery] = useState('');

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

  /* ─── Derived Data ───────────────────────────────────────── */

  const selectedAccount = cashAccounts.find(a => a.id === selectedAccountId);
  const counterAccount = allAccounts.find(a => a.id === counterAccountId);

  const filteredTransactions = useMemo(() => {
    if (!summary) return [];
    if (!searchQuery.trim()) return summary.transactions;
    const q = searchQuery.toLowerCase();
    return summary.transactions.filter(tx => {
      return (
        tx.ledgerEntry.entryDate.includes(q) ||
        tx.ledgerEntry.narration?.toLowerCase().includes(q) ||
        String(tx.ledgerEntry.voucherNumber).includes(q) ||
        tx.ledgerEntry.accountId?.toLowerCase().includes(q)
      );
    });
  }, [summary, searchQuery]);

  /* ─── Validation ─────────────────────────────────────────── */

  const validateForm = (): string | null => {
    if (!selectedAccountId) return 'Please select a Main Cash/Bank Account.';
    if (!counterAccountId) return 'Please select a Second Account.';
    if (!txDate) return 'Date is required.';
    if (!txNarration.trim()) return 'Description is required.';
    if (txNarration.trim().length < 3) return 'Description must be at least 3 characters.';

    const debit = txDebit ? parseFloat(txDebit) : 0;
    const credit = txCredit ? parseFloat(txCredit) : 0;
    const hasDebit = txDebit.trim() !== '' && !isNaN(debit) && debit > 0;
    const hasCredit = txCredit.trim() !== '' && !isNaN(credit) && credit > 0;

    if (!hasDebit && !hasCredit) return 'Enter an amount in either Debit or Credit.';
    if (hasDebit && hasCredit) return 'Enter an amount in either Debit or Credit, not both.';
    if (hasDebit && (Math.round(debit * 100) !== debit * 100)) return 'Debit amount must have at most 2 decimal places.';
    if (hasCredit && (Math.round(credit * 100) !== credit * 100)) return 'Credit amount must have at most 2 decimal places.';
    if (hasDebit && !Number.isFinite(debit)) return 'Debit is not a valid number.';
    if (hasCredit && !Number.isFinite(credit)) return 'Credit is not a valid number.';

    return null;
  };

  /* ─── Handlers ───────────────────────────────────────────── */

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const debit = txDebit ? parseFloat(txDebit) : 0;
    const credit = txCredit ? parseFloat(txCredit) : 0;
    const hasDebit = debit > 0;

    // CR = receipt (DEBIT cash), CP = payment (CREDIT cash)
    const type = hasDebit ? 'CR' : 'CP';
    const amount = hasDebit ? debit : credit;

    setSaving(true);
    try {
      await createCashBookVoucher({
        type,
        cashAccountId: selectedAccountId,
        counterAccountId,
        amount,
        date: txDate,
        narration: txNarration.trim(),
      });
      setFormSuccess(`Transaction saved successfully.`);
      setCounterAccountId('');
      setTxDebit('');
      setTxCredit('');
      setTxNarration('');
      setFormError('');
      emitDataRefresh('payment-posted');
      await loadCashBook();
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save transaction.');
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

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!summary) return;
    const rows = [
      ['Date', 'Voucher #', 'Account', 'Account Name', 'Description', 'Debit', 'Credit', 'Balance', 'Status'],
    ];
    for (const tx of filteredTransactions) {
      rows.push([
        tx.ledgerEntry.entryDate,
        String(tx.ledgerEntry.voucherNumber),
        tx.ledgerEntry.accountId || '',
        '',
        tx.ledgerEntry.narration || '',
        tx.ledgerEntry.debit > 0 ? String(tx.ledgerEntry.debit) : '',
        tx.ledgerEntry.credit > 0 ? String(tx.ledgerEntry.credit) : '',
        String(tx.runningBalance),
        tx.voucher?.status || '',
      ]);
    }
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cash-book-${selectedAccount?.accountCode || 'all'}-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ─── Loading State ──────────────────────────────────────── */

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

  /* ─── Render ─────────────────────────────────────────────── */

  return (
    <div className="page-pad tx-page" style={styles.page}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Cash Book</h1>
          <p style={styles.subtitle}>
            {selectedAccount ? `${selectedAccount.accountCode} — ${selectedAccount.accountName}` : 'Select a Cash/Bank account'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handlePrint} className="tx-btn tx-btn-tool" style={styles.actionBtn} title="Print Cash Book">Print</button>
          <button onClick={handleExport} className="tx-btn tx-btn-tool" style={styles.actionBtn} title="Export Cash Book">Export</button>
        </div>
      </div>

      {/* ── Filters Row ── */}
      <div style={styles.filters}>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>Main Account</label>
          <select
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
            style={styles.filterSelect}
          >
            {cashAccounts.map(a => (
              <option key={a.id} value={a.id}>{a.accountCode} — {a.accountName}</option>
            ))}
          </select>
        </div>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={styles.filterInput} />
        </div>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={styles.filterInput} />
        </div>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>Search</label>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Account, description, voucher..."
            style={styles.filterInput}
          />
        </div>
        <div style={styles.filterField}>
          <label style={styles.filterLabel}>&nbsp;</label>
          <button
            onClick={() => { setStartDate(firstOfMonth()); setEndDate(today()); setSearchQuery(''); }}
            className="tx-btn tx-btn-tool" style={styles.clearBtn}
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Summary ── */}
      {summary && (
        <div style={styles.summaryRow}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Opening Balance</div>
            <div style={{ ...styles.summaryValue, color: summary.openingBalance >= 0 ? 'var(--tx-money-in)' : 'var(--tx-money-out)' }}>
              {fmtPKR(summary.openingBalance)}
            </div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Total Debit</div>
            <div style={{ ...styles.summaryValue, color: 'var(--tx-money-in)' }}>+{fmtPKR(summary.totalReceipts)}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Total Credit</div>
            <div style={{ ...styles.summaryValue, color: 'var(--tx-money-out)' }}>-{fmtPKR(summary.totalPayments)}</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Closing Balance</div>
            <div style={{ ...styles.summaryValue, color: summary.closingBalance >= 0 ? 'var(--tx-money-in)' : 'var(--tx-money-out)', fontWeight: 700 }}>
              {fmtPKR(summary.closingBalance)}
            </div>
          </div>
        </div>
      )}

      {/* ── Transaction Entry ── */}
      <div style={styles.entryCard}>
        <h2 style={styles.entryTitle}>New Transaction</h2>
        <form onSubmit={handleCreate} style={styles.entryForm}>
          <div style={styles.entryRow}>
            <div style={styles.entryField}>
              <label style={styles.entryLabel}>Date</label>
              <input
                type="date"
                value={txDate}
                onChange={e => setTxDate(e.target.value)}
                style={styles.entryInput}
              />
            </div>
            <div style={{ ...styles.entryField, flex: 2 }}>
              <label style={styles.entryLabel}>Account (Second Account)</label>
              <AccountSelector
                accounts={allAccounts}
                value={counterAccountId}
                onChange={setCounterAccountId}
                excludeId={selectedAccountId}
                placeholder="Search account number or name..."
              />
            </div>
          </div>
          {counterAccount && (
            <div style={styles.accountDisplay}>
              <span style={styles.accountDisplayLabel}>Selected:</span>
              <span style={styles.accountDisplayCode}>{counterAccount.accountCode}</span>
              <span style={styles.accountDisplayName}>{counterAccount.accountName}</span>
            </div>
          )}
          <div style={styles.entryRow}>
            <div style={{ ...styles.entryField, flex: 3 }}>
              <label style={styles.entryLabel}>Description</label>
              <input
                type="text"
                value={txNarration}
                onChange={e => setTxNarration(e.target.value)}
                placeholder="e.g. Payment received from customer"
                style={styles.entryInput}
              />
            </div>
            <div style={styles.entryField}>
              <label style={styles.entryLabel}>Debit</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={txDebit}
                onChange={e => { setTxDebit(e.target.value); if (e.target.value) setTxCredit(''); }}
                placeholder="0.00"
                style={styles.entryInput}
              />
            </div>
            <div style={styles.entryField}>
              <label style={styles.entryLabel}>Credit</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={txCredit}
                onChange={e => { setTxCredit(e.target.value); if (e.target.value) setTxDebit(''); }}
                placeholder="0.00"
                style={styles.entryInput}
              />
            </div>
          </div>
          {formError && <div style={styles.error}>{formError}</div>}
          {formSuccess && <div style={styles.success}>{formSuccess}</div>}
          <div style={styles.entryActions}>
            <button
              type="submit"
              className="tx-btn tx-btn-success" style={styles.saveBtn}
              disabled={saving || !selectedAccountId}
            >
              {saving ? 'Saving...' : '+ Save Transaction'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Draft Vouchers Pending Posting ── */}
      {summary && summary.draftVouchers && summary.draftVouchers.length > 0 && (
        <div style={{ ...styles.tableCard, borderLeft: '3px solid var(--tx-tint-amber-border)', marginBottom: 16 }}>
          <h2 style={{ ...styles.tableTitle, color: 'var(--tx-tint-amber-fg)' }}>
            Pending Drafts ({summary.draftVouchers.length})
          </h2>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Voucher #</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {summary.draftVouchers.map((dv) => (
                  <tr key={dv.id} style={styles.tr}>
                    <td style={styles.td}>{dv.date}</td>
                    <td style={styles.td}>#{dv.voucherNumber}</td>
                    <td style={styles.td}>
                      <span style={styles.typeBadge}>
                        {VOUCHER_TYPE_LABELS[dv.voucherType] ?? dv.voucherType}
                      </span>
                    </td>
                    <td style={styles.td}>{dv.narration || '—'}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.statusBadge, backgroundColor: 'var(--tx-draft-bg)', color: 'var(--tx-draft-fg)' }}>Draft</span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => handlePost(dv.id)} className="tx-btn" style={styles.postBtn} title="Post voucher">Post</button>
                        <button onClick={() => handleDelete(dv.id)} className="tx-btn" style={styles.deleteBtn} title="Delete draft">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Entries Table ── */}
      <div style={styles.tableCard}>
        <h2 style={styles.tableTitle}>All Entries</h2>
        {loadingBook ? (
          <div style={styles.loading}>Loading entries...</div>
        ) : summary ? (
          filteredTransactions.length === 0 ? (
            <div style={styles.empty}>No entries found for this account and date range.</div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Voucher</th>
                    <th style={styles.th}>Account</th>
                    <th style={styles.th}>Description</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Debit</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Credit</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Balance</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening balance */}
                  <tr style={styles.openingRow}>
                    <td style={styles.td}>{startDate}</td>
                    <td style={styles.td}></td>
                    <td style={styles.td}></td>
                    <td style={{ ...styles.td, fontStyle: 'italic', color: 'var(--text-muted)' }}>Opening Balance</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}></td>
                    <td style={{ ...styles.td, textAlign: 'right' }}></td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: summary.openingBalance >= 0 ? 'var(--tx-money-in)' : 'var(--tx-money-out)' }}>
                      {fmtPKR(summary.openingBalance)}
                    </td>
                    <td style={styles.td}></td>
                    <td style={styles.td}></td>
                  </tr>
                  {/* Transactions */}
                  {filteredTransactions.map((tx) => {
                    const isReceipt = RECEIPT_TYPES.has(tx.ledgerEntry.voucherType);
                    const isDraft = tx.voucher?.status === 'DRAFT';
                    return (
                      <tr key={tx.ledgerEntry.id} style={styles.tr}>
                        <td style={styles.td}>{tx.ledgerEntry.entryDate}</td>
                        <td style={styles.td}>
                          <button
                            onClick={() => navigate(`/bills/${tx.ledgerEntry.voucherId}`)}
                            className="tx-btn tx-btn-link" style={styles.voucherLink}
                            title="View detail"
                          >
                            #{tx.ledgerEntry.voucherNumber}
                          </button>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.typeBadge}>
                            {VOUCHER_TYPE_LABELS[tx.ledgerEntry.voucherType] ?? tx.ledgerEntry.voucherType}
                          </span>
                        </td>
                        <td style={styles.td}>{tx.ledgerEntry.narration || '—'}</td>
                        <td style={{ ...styles.td, textAlign: 'right', color: tx.ledgerEntry.debit > 0 ? 'var(--tx-money-in)' : 'var(--text-disabled)', fontFamily: 'monospace' }}>
                          {tx.ledgerEntry.debit > 0 ? fmtPKR(tx.ledgerEntry.debit) : '—'}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', color: tx.ledgerEntry.credit > 0 ? 'var(--tx-money-out)' : 'var(--text-disabled)', fontFamily: 'monospace' }}>
                          {tx.ledgerEntry.credit > 0 ? fmtPKR(tx.ledgerEntry.credit) : '—'}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: tx.runningBalance >= 0 ? 'var(--tx-money-in)' : 'var(--tx-money-out)', fontFamily: 'monospace' }}>
                          {fmtPKR(tx.runningBalance)}
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: isDraft ? 'var(--tx-draft-bg)' : 'var(--tx-posted-bg)',
                            color: isDraft ? 'var(--tx-draft-fg)' : 'var(--tx-posted-fg)',
                          }}>
                            {isDraft ? 'Draft' : 'Posted'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {isDraft && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => handlePost(tx.ledgerEntry.voucherId)} className="tx-btn" style={styles.postBtn} title="Post voucher">Post</button>
                              <button onClick={() => handleDelete(tx.ledgerEntry.voucherId)} className="tx-btn" style={styles.deleteBtn} title="Delete draft">Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Closing balance */}
                  <tr style={styles.closingRow}>
                    <td style={styles.td}>{endDate}</td>
                    <td style={styles.td}></td>
                    <td style={styles.td}></td>
                    <td style={{ ...styles.td, fontStyle: 'italic', fontWeight: 700, color: 'var(--text-primary)' }}>Closing Balance</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: 'var(--tx-money-in)', fontFamily: 'monospace' }}>{fmtPKR(summary.totalReceipts)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: 'var(--tx-money-out)', fontFamily: 'monospace' }}>{fmtPKR(summary.totalPayments)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: summary.closingBalance >= 0 ? 'var(--tx-money-in)' : 'var(--tx-money-out)', fontFamily: 'monospace' }}>
                      {fmtPKR(summary.closingBalance)}
                    </td>
                    <td style={styles.td}></td>
                    <td style={styles.td}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </div>

      {/* ── Responsive CSS ── */}
      <style>{`
        @media (max-width: 768px) {
          .cashbook-summary { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .cashbook-summary { grid-template-columns: 1fr !important; }
        }
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

/* ─── Styles ───────────────────────────────────────────────── */

const styles: { [key: string]: React.CSSProperties } = {
  page: { padding: 24, maxWidth: 1400, margin: '0 auto' },
  loading: { padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  title: { fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  subtitle: { fontSize: 14, color: 'var(--text-muted)', margin: 0 },
  actionBtn: { padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' },

  // Filters
  filters: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' },
  filterField: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 },
  filterLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  filterInput: { padding: '7px 10px', border: '1px solid var(--cb-input-border)', borderRadius: 6, fontSize: 13, color: 'var(--text-primary)', backgroundColor: 'var(--surface)' },
  filterSelect: { padding: '7px 10px', border: '1px solid var(--cb-input-border)', borderRadius: 6, fontSize: 13, color: 'var(--text-primary)', backgroundColor: 'var(--surface)', minWidth: 200 },
  clearBtn: { padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' },

  // Summary
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 },
  summaryCard: { backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 },
  summaryLabel: { fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  summaryValue: { fontSize: 17, fontWeight: 700, fontFamily: 'monospace' },

  // Entry Card
  entryCard: { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, marginBottom: 20 },
  entryTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' },
  entryForm: { display: 'flex', flexDirection: 'column', gap: 12 },
  entryRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  entryField: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 },
  entryLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  entryInput: { padding: '8px 12px', border: '1px solid var(--cb-input-border)', borderRadius: 6, fontSize: 14, color: 'var(--text-primary)', backgroundColor: 'var(--surface)' },
  entryActions: { display: 'flex', justifyContent: 'flex-end', marginTop: 4 },
  saveBtn: { padding: '10px 24px', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },

  // Account selector
  accountSelected: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--cb-input-border)', borderRadius: 6, backgroundColor: 'var(--surface)', cursor: 'pointer', minHeight: 36 },
  accountCode: { fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 },
  accountName: { color: 'var(--text-secondary)', fontSize: 13 },
  accountChange: { marginLeft: 'auto', color: 'var(--accent)', fontSize: 11, fontWeight: 600 },
  accountInput: { padding: '8px 12px', border: '1px solid var(--cb-input-border)', borderRadius: 6, fontSize: 14, color: 'var(--text-primary)', backgroundColor: 'var(--surface)', width: '100%', boxSizing: 'border-box' as const },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--surface)', border: '1px solid var(--cb-input-border)', borderRadius: 6, maxHeight: 200, overflowY: 'auto', zIndex: 100, boxShadow: 'var(--shadow-md)' },
  dropdownItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--dash-table-row-border)' },
  dropdownCode: { fontWeight: 700, color: 'var(--text-primary)', fontSize: 13, minWidth: 40 },
  dropdownName: { color: 'var(--text-secondary)', fontSize: 13 },

  // Account display
  accountDisplay: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', backgroundColor: 'var(--tx-tint-sky)', borderRadius: 6, fontSize: 13 },
  accountDisplayLabel: { color: 'var(--text-muted)', fontWeight: 500 },
  accountDisplayCode: { fontWeight: 700, color: 'var(--text-primary)' },
  accountDisplayName: { color: 'var(--text-secondary)' },

  // Error/Success
  error: { padding: '8px 12px', backgroundColor: 'var(--tx-tint-red)', border: '1px solid var(--tx-tint-red-border)', borderRadius: 6, color: 'var(--danger)', fontSize: 13 },
  success: { padding: '8px 12px', backgroundColor: 'var(--tx-tint-green)', border: '1px solid var(--tx-tint-green-border)', borderRadius: 6, color: 'var(--tx-money-in)', fontSize: 13 },

  // Table
  tableCard: { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 },
  tableTitle: { fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', backgroundColor: 'var(--surface-2)', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  td: { padding: '8px 12px', borderBottom: '1px solid var(--dash-table-row-border)', color: 'var(--text-primary)', whiteSpace: 'nowrap' },
  tr: { transition: 'background-color 0.15s' },
  typeBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, backgroundColor: 'var(--tx-neutral-bg)', color: 'var(--tx-neutral-fg)' },
  statusBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 },
  openingRow: { backgroundColor: 'var(--tx-tint-sky)' },
  closingRow: { backgroundColor: 'var(--surface-2)', borderTop: '2px solid var(--border)' },
  empty: { padding: 40, textAlign: 'center', color: 'var(--text-disabled)', fontSize: 14 },
  postBtn: { padding: '4px 8px', backgroundColor: 'var(--tx-posted-bg)', color: 'var(--tx-posted-fg)', border: '1px solid var(--tint-ok-border)', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  deleteBtn: { padding: '4px 8px', backgroundColor: 'var(--tx-danger-bg)', color: 'var(--tx-danger-strong)', border: '1px solid var(--tx-danger-border)', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  voucherLink: { background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, textDecoration: 'none' },
};
