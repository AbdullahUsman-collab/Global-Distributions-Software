/**
 * Aging Report Page
 * Customer and Supplier aging with FIFO payment allocation.
 *
 * Source of Truth:
 *   - audit/37_COMPLETE_LEGACY_REMAINING_PARITY_DISCOVERY.md
 *   - audit/40_STEP21_AGING_REPORT_IMPLEMENTATION_REPORT.md
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';
import { services } from '../services';
import {
  AgingReportService,
  AgingMode,
  AgingReportDTO,
  AgingRow,
  AgingBuckets,
} from '../../domain/services/AgingReportService';
import { Customer } from '../../domain/types/customer';
import { Supplier } from '../../domain/types/supplier';

/* ─── Constants ────────────────────────────────────────────── */

const fmt = (n: number) => n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const BUCKET_LABELS: Record<keyof AgingBuckets, string> = {
  current: 'Current',
  d1_30: '1–30 Days',
  d31_60: '31–60 Days',
  d61_90: '61–90 Days',
  d91_120: '91–120 Days',
  d120plus: '120+ Days',
};

const BUCKET_KEYS: (keyof AgingBuckets)[] = ['current', 'd1_30', 'd31_60', 'd61_90', 'd91_120', 'd120plus'];

/* ═══════════════════════════════════════════════════════════ */
/* Main AgingReport Component                                   */
/* ═══════════════════════════════════════════════════════════ */

export const AgingReport: React.FC = () => {
  const { tenant } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<AgingMode>('customer');
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [partyId, setPartyId] = useState('');
  const [search, setSearch] = useState('');
  const [report, setReport] = useState<AgingReportDTO | null>(null);
  const [loading, setLoading] = useState(false);

  // Lookup data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Service instance
  const agingService = useMemo(() => new AgingReportService(
    services.voucherRepository,
    services.coaRepository,
    services.customerRepository,
    services.supplierRepository,
  ), []);

  // Load lookup data
  useEffect(() => {
    const load = async () => {
      const [custs, sups] = await Promise.all([
        services.customerRepository.getCustomersByTenantId(tenant.id),
        services.supplierRepository.getSuppliers(tenant.id),
      ]);
      setCustomers(custs);
      setSuppliers(sups);
    };
    load();
  }, [tenant.id]);

  // Generate report
  const generateReport = useCallback(async () => {
    setLoading(true);
    try {
      const result = await agingService.generateReport(
        tenant.id,
        mode,
        asOfDate,
        partyId || undefined,
      );
      setReport(result);
    } catch (err) {
      console.error('Failed to generate aging report:', err);
      alert(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }, [tenant.id, mode, asOfDate, partyId, agingService]);

  // Auto-generate on mount and when filters change
  useEffect(() => { generateReport(); }, [generateReport]);

  // Party options based on mode
  const partyOptions = useMemo(() => {
    if (mode === 'customer') {
      return customers.map(c => ({ id: c.id, label: c.name }));
    }
    return suppliers.map(s => ({ id: s.id, label: s.name }));
  }, [mode, customers, suppliers]);

  // Filtered rows based on search
  const filteredRows = useMemo(() => {
    if (!report) return [];
    if (!search.trim()) return report.rows;
    const q = search.trim().toLowerCase();
    return report.rows.filter(r =>
      r.partyName.toLowerCase().includes(q) ||
      r.accountCode.toLowerCase().includes(q)
    );
  }, [report, search]);

  // Recalculate totals for filtered rows
  const filteredTotals = useMemo(() => {
    const totals: AgingBuckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_120: 0, d120plus: 0 };
    for (const row of filteredRows) {
      totals.current += row.aging.current;
      totals.d1_30 += row.aging.d1_30;
      totals.d31_60 += row.aging.d31_60;
      totals.d61_90 += row.aging.d61_90;
      totals.d91_120 += row.aging.d91_120;
      totals.d120plus += row.aging.d120plus;
    }
    return totals;
  }, [filteredRows]);

  const filteredGrandTotal = filteredTotals.current + filteredTotals.d1_30 + filteredTotals.d31_60 +
    filteredTotals.d61_90 + filteredTotals.d91_120 + filteredTotals.d120plus;

  // Navigate to ledger for a party
  const handleLedgerNav = useCallback((accountCode: string) => {
    navigate('/finance', { state: { tab: 'ledger', accountId: accountCode } });
  }, [navigate]);

  // Print
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="page-pad aging-page" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>← Dashboard</button>
          <h1 style={styles.title}>Aging Report</h1>
          <p style={styles.subtitle}>{tenant.brandName} — Accounts receivable / payable aging</p>
        </div>
        <button onClick={handlePrint} style={styles.printBtn} className="aging-hide-print">
          Print
        </button>
      </div>

      {/* Filters */}
      <div className="aging-filters aging-hide-print" style={styles.filterBar}>
        <div className="aging-filters-row" style={styles.filterRow}>
          {/* Mode Toggle */}
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Mode</label>
            <div style={styles.modeToggle}>
              <button
                onClick={() => { setMode('customer'); setPartyId(''); }}
                style={{
                  ...styles.modeBtn,
                  ...(mode === 'customer' ? styles.modeBtnActive : {}),
                }}
              >
                Customer
              </button>
              <button
                onClick={() => { setMode('supplier'); setPartyId(''); }}
                style={{
                  ...styles.modeBtn,
                  ...(mode === 'supplier' ? styles.modeBtnActive : {}),
                }}
              >
                Supplier
              </button>
            </div>
          </div>

          {/* As Of Date */}
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>As Of Date</label>
            <input
              type="date"
              value={asOfDate}
              onChange={e => setAsOfDate(e.target.value)}
              style={styles.filterInput}
            />
          </div>

          {/* Party Filter */}
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>{mode === 'customer' ? 'Customer' : 'Supplier'}</label>
            <select
              value={partyId}
              onChange={e => setPartyId(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All {mode === 'customer' ? 'Customers' : 'Suppliers'}</option>
              {partyOptions.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div style={{ ...styles.filterGroup, flex: 2 }}>
            <label style={styles.filterLabel}>Search</label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name or account #..."
              style={styles.filterInput}
            />
          </div>
        </div>
      </div>

      {/* Summary Totals */}
      {report && (
        <div className="aging-summary" style={styles.summaryBar}>
          {BUCKET_KEYS.map(key => (
            <div key={key} style={styles.summaryChip}>
              <span style={styles.chipLabel}>{BUCKET_LABELS[key]}</span>
              <span style={styles.chipValue}>{fmt(filteredTotals[key])}</span>
            </div>
          ))}
          <div style={{ ...styles.summaryChip, backgroundColor: '#eff6ff' }}>
            <span style={{ ...styles.chipLabel, fontWeight: '700' }}>Total</span>
            <span style={{ ...styles.chipValue, color: '#1e40af', fontWeight: '700' }}>{fmt(filteredGrandTotal)}</span>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={styles.loadingBox}>
          <p style={styles.loadingText}>Calculating aging...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && report && filteredRows.length === 0 && (
        <div style={styles.emptyBox}>
          <p style={styles.emptyTitle}>No outstanding balances</p>
          <p style={styles.emptyText}>
            {search ? 'Try changing your search.' : `No ${mode} accounts have outstanding balances as of ${asOfDate}.`}
          </p>
        </div>
      )}

      {/* Aging Table */}
      {!loading && report && filteredRows.length > 0 && (
        <div className="table-wrap aging-table-wrap">
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{mode === 'customer' ? 'Customer' : 'Supplier'}</th>
                <th style={styles.th} className="aging-hide-mobile">Account #</th>
                {BUCKET_KEYS.map(key => (
                  <th key={key} style={{ ...styles.th, textAlign: 'right' }} className={key === 'current' ? '' : 'aging-hide-mobile'}>
                    {BUCKET_LABELS[key]}
                  </th>
                ))}
                <th style={{ ...styles.th, textAlign: 'right' }}>Total</th>
                <th style={styles.th} className="aging-hide-print">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => (
                <tr key={row.partyId} style={styles.tr}>
                  <td style={styles.td}>
                    <span style={styles.partyName}>{row.partyName}</span>
                  </td>
                  <td style={styles.td} className="aging-hide-mobile">
                    <span style={styles.accountCode}>{row.accountCode}</span>
                  </td>
                  {BUCKET_KEYS.map(key => (
                    <td key={key} style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }} className={key === 'current' ? '' : 'aging-hide-mobile'}>
                      {row.aging[key] > 0.005 ? fmt(row.aging[key]) : '—'}
                    </td>
                  ))}
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '600' }}>
                    {fmt(row.totalOutstanding)}
                  </td>
                  <td style={styles.td} className="aging-hide-print">
                    <button
                      onClick={() => handleLedgerNav(row.accountCode)}
                      style={styles.ledgerBtn}
                      title="View in Ledger"
                    >
                      Ledger
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals Row */}
            <tfoot>
              <tr style={styles.totalRow}>
                <td style={styles.totalTd}><strong>Total</strong></td>
                <td style={styles.totalTd} className="aging-hide-mobile"></td>
                {BUCKET_KEYS.map(key => (
                  <td key={key} style={{ ...styles.totalTd, textAlign: 'right', fontFamily: 'monospace' }} className={key === 'current' ? '' : 'aging-hide-mobile'}>
                    <strong>{fmt(filteredTotals[key])}</strong>
                  </td>
                ))}
                <td style={{ ...styles.totalTd, textAlign: 'right', fontFamily: 'monospace' }}>
                  <strong>{fmt(filteredGrandTotal)}</strong>
                </td>
                <td style={styles.totalTd} className="aging-hide-print"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Report Footer (for print) */}
      <div className="aging-print-footer" style={styles.printFooter}>
        <p>Generated: {new Date().toLocaleString()}</p>
        <p>As Of: {asOfDate} | Mode: {mode === 'customer' ? 'Customer Aging' : 'Supplier Aging'}</p>
      </div>

      {/* Responsive + Print CSS */}
      <style>{`
        .aging-filters { display: flex; flex-direction: column; gap: 12px; }
        .aging-filters-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; }
        .aging-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .aging-hide-mobile {}
        .aging-hide-print {}
        .aging-print-footer { display: none; }

        @media (max-width: 768px) {
          .aging-filters-row { flex-direction: column; }
          .aging-filters-row > * { flex: none !important; width: 100% !important; min-width: 0 !important; }
          .aging-hide-mobile { display: none; }
          .aging-table-wrap { margin: 0 -24px; padding: 0 24px; }
          .aging-summary { flex-wrap: wrap; }
        }

        @media (max-width: 480px) {
          .aging-table-wrap { margin: 0 -16px; padding: 0 16px; }
        }

        @media print {
          .aging-hide-print { display: none !important; }
          .aging-page { padding: 0 !important; max-width: none !important; }
          .aging-table-wrap { overflow: visible !important; margin: 0 !important; padding: 0 !important; }
          .aging-hide-mobile { display: table-cell !important; }
          .aging-print-footer { display: block !important; margin-top: 24px; font-size: 12px; color: #64748b; }
          .aging-summary { flex-wrap: wrap; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  printBtn: {
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
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
  modeToggle: {
    display: 'flex',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  modeBtn: {
    padding: '8px 16px',
    border: 'none',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  modeBtnActive: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
  },
  summaryBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  summaryChip: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '8px 12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    minWidth: '100px',
  },
  chipLabel: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  chipValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'monospace',
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
  partyName: {
    fontWeight: '500',
  },
  accountCode: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#64748b',
  },
  ledgerBtn: {
    background: 'none',
    border: '1px solid #e2e8f0',
    color: '#2563eb',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '4px',
  },
  totalRow: {
    backgroundColor: '#f8fafc',
  },
  totalTd: {
    padding: '10px 12px',
    borderTop: '2px solid #e2e8f0',
    fontSize: '13px',
  },
  printFooter: {
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
    fontSize: '12px',
    color: '#64748b',
  },
};
