/**
 * Bills List / Transaction Register
 * Unified view of SV, PV, SRV, PRV bill vouchers with filtering.
 *
 * Source of Truth:
 *   - audit/37_COMPLETE_LEGACY_REMAINING_PARITY_DISCOVERY.md (ListofBills parity)
 *   - audit/39_STEP20_BILLS_LIST_IMPLEMENTATION_REPORT.md
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';
import { services } from '../services';
import {
  BillRecord,
  BillsListService,
  BILL_VOUCHER_TYPES,
  BILL_TYPE_LABELS,
  BILL_TYPE_COLORS,
} from '../../domain/services/BillsListService';
import { VoucherType } from '../../domain/types/voucher';
import {
  VoucherStatus,
  VOUCHER_STATUS_LABELS,
} from '../../domain/types/voucher';
import { Customer } from '../../domain/types/customer';
import { Supplier } from '../../domain/types/supplier';
import { Product } from '../../domain/types/inventory';
import { printWindow, generateCsv, downloadFile, generateExportFilename } from '../utils/export';

/* ─── Constants ────────────────────────────────────────────── */

const fmt = (n: number) => n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS: Record<VoucherStatus, { bg: string; fg: string }> = {
  DRAFT:  { bg: '#fef3c7', fg: '#92400e' },
  POSTED: { bg: '#dcfce7', fg: '#166534' },
};

/* ═══════════════════════════════════════════════════════════ */
/* Main BillsList Component                                     */
/* ═══════════════════════════════════════════════════════════ */

export const BillsList: React.FC = () => {
  const { tenant } = useAuth();
  const navigate = useNavigate();

  const [bills, setBills] = useState<BillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<VoucherType | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [partyId, setPartyId] = useState('');
  const [itemId, setItemId] = useState('');
  const [search, setSearch] = useState('');

  // Lookup data for filter dropdowns
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Create service instance once
  const billsService = useMemo(() => new BillsListService(
    services.voucherRepository,
    services.customerRepository,
    services.supplierRepository,
    services.inventoryRepository,
  ), []);

  // Load bills
  const loadBills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await billsService.getAllBills(tenant.id);
      setBills(data);
    } catch (err) {
      console.error('Failed to load bills:', err);
      setError('Failed to load bills. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [tenant.id, billsService]);

  // Load lookup data for filter dropdowns
  const loadLookups = useCallback(async () => {
    try {
      const [custs, sups, prods] = await Promise.all([
        services.customerRepository.getCustomersByTenantId(tenant.id),
        services.supplierRepository.getSuppliers(tenant.id),
        services.inventoryRepository.getProducts(tenant.id),
      ]);
      setCustomers(custs);
      setSuppliers(sups);
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load lookup data:', err);
    }
  }, [tenant.id]);

  useEffect(() => { loadBills(); loadLookups(); }, [loadBills, loadLookups]);

  // Apply filters
  const filteredBills = useMemo(() => {
    const filters = {
      voucherType: typeFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      partyId: partyId || undefined,
      itemId: itemId || undefined,
      search: search || undefined,
    };

    let result = [...bills];

    if (filters.voucherType) {
      result = result.filter(b => b.voucher.voucherType === filters.voucherType);
    }
    if (filters.dateFrom) {
      result = result.filter(b => b.voucher.date >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      result = result.filter(b => b.voucher.date <= filters.dateTo!);
    }
    if (filters.partyId) {
      result = result.filter(b => b.partyId === filters.partyId);
    }
    if (filters.itemId) {
      result = result.filter(b => b.itemIds.includes(filters.itemId!));
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(b =>
        String(b.voucher.voucherNumber).includes(q) ||
        b.voucher.narration.toLowerCase().includes(q) ||
        b.partyName.toLowerCase().includes(q) ||
        b.itemNames.some(name => name.toLowerCase().includes(q))
      );
    }

    return result;
  }, [bills, typeFilter, dateFrom, dateTo, partyId, itemId, search]);

  // Reset filters
  const resetFilters = useCallback(() => {
    setTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setPartyId('');
    setItemId('');
    setSearch('');
  }, []);

  // Delete a draft bill
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this draft bill?')) return;
    try {
      await billsService.deleteBill(tenant.id, id);
      await loadBills();
    } catch (err) {
      console.error('Failed to delete bill:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete bill');
    }
  }, [tenant.id, billsService, loadBills]);

  // Open/navigate to bill detail
  const handleOpen = useCallback((record: BillRecord) => {
    navigate(`/bills/${record.voucher.id}`);
  }, [navigate]);

  // Party options (combined customers + suppliers)
  const partyOptions = useMemo(() => {
    const opts: { id: string; label: string }[] = [];
    for (const c of customers) opts.push({ id: c.id, label: `Customer: ${c.name}` });
    for (const s of suppliers) opts.push({ id: s.id, label: `Supplier: ${s.name}` });
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }, [customers, suppliers]);

  // Item options
  const itemOptions = useMemo(() => {
    return products.map(p => ({ id: p.id, label: p.name }));
  }, [products]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (typeFilter) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (partyId) count++;
    if (itemId) count++;
    if (search) count++;
    return count;
  }, [typeFilter, dateFrom, dateTo, partyId, itemId, search]);

  // Export CSV handler
  const handleExportCsv = useCallback(() => {
    if (filteredBills.length === 0) return;
    const headers = ['Voucher #', 'Type', 'Date', 'Party', 'Items', 'Total', 'Status', 'Narration'];
    const rows = filteredBills.map(b => [
      b.voucher.voucherNumber,
      BILL_TYPE_LABELS[b.voucher.voucherType] || b.voucher.voucherType,
      b.voucher.date,
      b.partyName,
      b.lineCount,
      b.total.toFixed(2),
      VOUCHER_STATUS_LABELS[b.voucher.status],
      b.voucher.narration,
    ]);
    const csv = generateCsv(headers, rows);
    const filename = generateExportFilename('Bills-Register');
    downloadFile(csv, filename);
  }, [filteredBills]);

  // Print handler
  const handlePrint = useCallback(() => {
    printWindow();
  }, []);

  return (
    <div className="page-pad" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>← Dashboard</button>
          <h1 style={styles.title}>Bills List</h1>
          <p style={styles.subtitle}>{tenant.brandName} — All transactions</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }} className="no-print">
          <button onClick={handleExportCsv} style={styles.exportBtn} disabled={filteredBills.length === 0}>
            Export CSV
          </button>
          <button onClick={handlePrint} style={styles.printBtn} disabled={filteredBills.length === 0}>
            Print
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bills-filters" style={styles.filterBar}>
        {/* Row 1: Type + Search */}
        <div className="bills-filters-row" style={styles.filterRow}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as VoucherType | '')}
              style={styles.filterSelect}
            >
              <option value="">All Types</option>
              {BILL_VOUCHER_TYPES.map(t => (
                <option key={t} value={t}>{BILL_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div style={{ ...styles.filterGroup, flex: 2 }}>
            <label style={styles.filterLabel}>Search</label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Voucher #, narration, party, item..."
              style={styles.filterInput}
            />
          </div>

          {activeFilterCount > 0 && (
            <button onClick={resetFilters} style={styles.resetBtn}>
              Reset Filters ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Row 2: Date + Party + Item */}
        <div className="bills-filters-row" style={styles.filterRow}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={styles.filterInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={styles.filterInput}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Party</label>
            <select
              value={partyId}
              onChange={e => setPartyId(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Parties</option>
              {partyOptions.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Item</label>
            <select
              value={itemId}
              onChange={e => setItemId(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Items</option>
              {itemOptions.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div style={styles.resultsInfo}>
        <span style={styles.resultsText}>
          {loading ? 'Loading...' : `${filteredBills.length} bill${filteredBills.length !== 1 ? 's' : ''} found`}
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>{error}</p>
          <button onClick={loadBills} style={styles.retryBtn}>Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={styles.loadingBox}>
          <p style={styles.loadingText}>Loading bills...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredBills.length === 0 && (
        <div style={styles.emptyBox}>
          <p style={styles.emptyTitle}>No bills found</p>
          <p style={styles.emptyText}>
            {activeFilterCount > 0
              ? 'Try changing your filters or date range.'
              : 'No bill transactions exist yet. Create a sale or purchase to get started.'}
          </p>
        </div>
      )}

      {/* Bills Table */}
      {!loading && !error && filteredBills.length > 0 && (
        <div className="table-wrap bills-table-wrap">
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Voucher #</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Party</th>
                <th style={styles.th} className="bills-hide-mobile">Items</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Total</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map(b => (
                <tr key={b.voucher.id} style={styles.tr}>
                  <td style={styles.td}>
                    <span style={styles.voucherNum}>{b.voucher.voucherNumber}</span>
                  </td>
                  <td style={styles.td}>{b.voucher.date}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.typeBadge,
                      backgroundColor: BILL_TYPE_COLORS[b.voucher.voucherType].bg,
                      color: BILL_TYPE_COLORS[b.voucher.voucherType].fg,
                    }}>
                      {BILL_TYPE_LABELS[b.voucher.voucherType]}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.partyName}>{b.partyName}</span>
                  </td>
                  <td style={styles.td} className="bills-hide-mobile">
                    <span style={styles.itemCount}>{b.lineCount} line{b.lineCount !== 1 ? 's' : ''}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                    {fmt(b.total)}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: STATUS_COLORS[b.voucher.status].bg,
                      color: STATUS_COLORS[b.voucher.status].fg,
                    }}>
                      {VOUCHER_STATUS_LABELS[b.voucher.status]}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actions}>
                      <button
                        onClick={() => handleOpen(b)}
                        style={styles.viewBtn}
                        title="Open in module"
                      >
                        View
                      </button>
                      {b.voucher.status === 'DRAFT' && (
                        <button
                          onClick={() => handleDelete(b.voucher.id)}
                          style={styles.deleteBtn}
                          title="Delete draft"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Responsive CSS */}
      <style>{`
        .bills-filters { display: flex; flex-direction: column; gap: 12px; }
        .bills-filters-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; }
        .bills-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .bills-hide-mobile {}

        @media (max-width: 768px) {
          .bills-filters-row { flex-direction: column; }
          .bills-filters-row > * { flex: none !important; width: 100% !important; min-width: 0 !important; }
          .bills-hide-mobile { display: none; }
          .bills-table-wrap { margin: 0 -24px; padding: 0 24px; }
        }

        @media (max-width: 480px) {
          .bills-table-wrap { margin: 0 -16px; padding: 0 16px; }
        }
      `}</style>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Styles                                                      */
/* ═══════════════════════════════════════════════════════════ */

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '24px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    cursor: 'pointer',
    fontSize: '13px',
    padding: 0,
    marginBottom: '8px',
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
    marginTop: '4px',
  },
  filterBar: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
  },
  filterRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    minWidth: '140px',
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
  },
  filterInput: {
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
  },
  filterSelect: {
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
  },
  resetBtn: {
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    alignSelf: 'flex-end',
  },
  resultsInfo: {
    marginBottom: '12px',
  },
  resultsText: {
    fontSize: '13px',
    color: '#64748b',
  },
  errorBox: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    textAlign: 'center',
  },
  errorText: {
    color: '#991b1b',
    fontSize: '14px',
    marginBottom: '8px',
  },
  retryBtn: {
    padding: '6px 16px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '48px 24px',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: '14px',
  },
  emptyBox: {
    textAlign: 'center',
    padding: '48px 24px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#94a3b8',
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
  voucherNum: {
    fontWeight: '600',
    color: '#2563eb',
  },
  typeBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  partyName: {
    fontWeight: '500',
  },
  itemCount: {
    color: '#64748b',
    fontSize: '12px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  actions: {
    display: 'flex',
    gap: '6px',
    whiteSpace: 'nowrap',
  },
  viewBtn: {
    background: 'none',
    border: '1px solid #e2e8f0',
    color: '#2563eb',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '4px',
  },
  deleteBtn: {
    background: 'none',
    border: '1px solid #fecaca',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '4px',
  },
  printBtn: {
    padding: '8px 16px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  exportBtn: {
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
  },
};
