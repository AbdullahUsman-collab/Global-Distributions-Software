/**
 * Bill Detail Page
 * Shows complete detail for any bill voucher (SV, PV, SRV, PRV).
 *
 * Route: /bills/:voucherId
 *
 * Displays:
 * - Voucher header (type, #, date, status, party, narration)
 * - Line items (product, qty, rate, tax, total)
 * - Tax summary
 * - Accounting entries
 * - Inventory movements
 * - Navigation to party ledger, aging, bills list
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';
import { getBillDetail } from '../lib/api';
import {
  BillDetail,
  BillLineDetail,
  BillAccountingEntry,
  BillInventoryMovement,
} from '../../domain/services/BillDetailService';
import { BILL_TYPE_LABELS, BILL_TYPE_COLORS } from '../lib/billLabels';
import { VoucherStatus, VOUCHER_STATUS_LABELS } from '../../domain/types/voucher';
import { printWindow, generateCsv, downloadFile, generateExportFilename } from '../utils/export';

/* ─── Constants ────────────────────────────────────────────── */

const fmt = (n: number) => n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS: Record<VoucherStatus, { bg: string; fg: string }> = {
  DRAFT:  { bg: '#fef3c7', fg: '#92400e' },
  POSTED: { bg: '#dcfce7', fg: '#166534' },
};

/* ═══════════════════════════════════════════════════════════ */
/* Main BillDetail Component                                    */
/* ═══════════════════════════════════════════════════════════ */

export const BillDetailPage: React.FC = () => {
  const { voucherId } = useParams<{ voucherId: string }>();
  const { tenant } = useAuth();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<BillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!voucherId) {
      setError('No voucher ID provided');
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getBillDetail(voucherId);
        if (!result) {
          setError('Bill not found or access denied');
        } else {
          setDetail(result);
        }
      } catch (err) {
        console.error('Failed to load bill detail:', err);
        setError(err instanceof Error ? err.message : 'Failed to load bill detail');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [tenant.id, voucherId]);

  // Navigation helpers
  const navigateToLedger = () => {
    if (detail?.partyAccountCode) {
      navigate('/finance', { state: { tab: 'ledger', accountId: detail.partyAccountCode } });
    }
  };

  const navigateToAging = () => {
    navigate('/aging');
  };

  // Print handler
  const handlePrint = () => {
    printWindow();
  };

  // Export CSV handler
  const handleExportCsv = () => {
    if (!detail) return;
    const headers = ['#', 'Product', 'SKU', 'Qty', 'Rate', 'Amount', 'Tax', 'Total'];
    const rows = detail.lines.map((bl, i) => [
      i + 1,
      bl.productName || '',
      bl.productSku || '',
      bl.quantity || '',
      bl.rate ? bl.rate.toFixed(2) : '',
      bl.amount.toFixed(2),
      bl.gstAmount > 0 ? bl.gstAmount.toFixed(2) : '',
      bl.netAmount.toFixed(2),
    ]);
    // Add totals
    rows.push([]);
    rows.push(['', '', '', '', '', '', 'Subtotal', detail.taxSummary.subtotal.toFixed(2)]);
    if (detail.taxSummary.gst > 0) rows.push(['', '', '', '', '', '', 'GST', detail.taxSummary.gst.toFixed(2)]);
    if (detail.taxSummary.totalTax > 0) rows.push(['', '', '', '', '', '', 'Total Tax', detail.taxSummary.totalTax.toFixed(2)]);
    rows.push(['', '', '', '', '', '', 'Grand Total', detail.taxSummary.grandTotal.toFixed(2)]);

    const csv = generateCsv(headers, rows);
    const ref = `${detail.voucher.voucherType}-${String(detail.voucher.voucherNumber).padStart(6, '0')}`;
    const filename = generateExportFilename(
      `${BILL_TYPE_LABELS[detail.voucher.voucherType] || 'Bill'}`,
      ref,
    );
    downloadFile(csv, filename);
  };

  return (
    <div className="page-pad bill-detail-page" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <button onClick={() => navigate('/bills')} style={styles.backBtn}>← Bills List</button>
          <h1 style={styles.title}>Bill Detail</h1>
        </div>
        {detail && (
          <div style={{ display: 'flex', gap: '8px' }} className="no-print">
            <button onClick={handleExportCsv} style={styles.exportBtn}>
              Export CSV
            </button>
            <button onClick={handlePrint} style={styles.printBtn}>
              Print
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={styles.loadingBox}>
          <p style={styles.loadingText}>Loading bill detail...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>{error}</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button onClick={() => navigate('/bills')} style={styles.retryBtn}>Back to Bills</button>
            {error !== 'Bill not found or access denied' && (
              <button onClick={() => window.location.reload()} style={styles.retryBtn}>Retry</button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && !error && detail && (
        <>
          {/* Voucher Header Card */}
          <div style={styles.card}>
            <div className="bill-detail-header-grid" style={styles.headerGrid}>
              <div style={styles.headerField}>
                <span style={styles.fieldLabel}>Type</span>
                <span style={{
                  ...styles.typeBadge,
                  backgroundColor: BILL_TYPE_COLORS[detail.voucher.voucherType]?.bg ?? '#f1f5f9',
                  color: BILL_TYPE_COLORS[detail.voucher.voucherType]?.fg ?? '#475569',
                }}>
                  {BILL_TYPE_LABELS[detail.voucher.voucherType] || detail.voucher.voucherType}
                </span>
              </div>
              <div style={styles.headerField}>
                <span style={styles.fieldLabel}>Voucher #</span>
                <span style={styles.fieldValue}>{detail.voucher.voucherNumber}</span>
              </div>
              <div style={styles.headerField}>
                <span style={styles.fieldLabel}>Date</span>
                <span style={styles.fieldValue}>{detail.voucher.date}</span>
              </div>
              <div style={styles.headerField}>
                <span style={styles.fieldLabel}>Status</span>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: STATUS_COLORS[detail.voucher.status]?.bg ?? '#f1f5f9',
                  color: STATUS_COLORS[detail.voucher.status]?.fg ?? '#475569',
                }}>
                  {VOUCHER_STATUS_LABELS[detail.voucher.status]}
                </span>
              </div>
              <div style={styles.headerField}>
                <span style={styles.fieldLabel}>Party</span>
                <span style={styles.fieldValue}>{detail.partyName}</span>
              </div>
              {detail.partyAccountCode && (
                <div style={styles.headerField}>
                  <span style={styles.fieldLabel}>Account</span>
                  <span style={styles.fieldValue}>{detail.partyAccountCode}</span>
                </div>
              )}
            </div>
            {detail.voucher.narration && (
              <div style={{ marginTop: '12px' }}>
                <span style={styles.fieldLabel}>Narration</span>
                <p style={styles.narration}>{detail.voucher.narration}</p>
              </div>
            )}
            {/* Navigation links */}
            <div style={styles.navLinks}>
              {detail.partyType !== 'unknown' && (
                <button onClick={navigateToLedger} style={styles.navLinkBtn}>
                  View Ledger
                </button>
              )}
              <button onClick={navigateToAging} style={styles.navLinkBtn}>
                View Aging
              </button>
            </div>
          </div>

          {/* Line Items */}
          {detail.lines.length > 0 && (
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Line Items</h2>
              <div className="table-wrap" style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>SKU</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Qty</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Rate</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Tax</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.lines.map((bl, i) => (
                      <tr key={bl.line.id} style={styles.tr}>
                        <td style={styles.td}>{i + 1}</td>
                        <td style={styles.td}>{bl.productName || '—'}</td>
                        <td style={styles.td}>{bl.productSku || '—'}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                          {bl.quantity > 0 ? bl.quantity.toLocaleString() : '—'}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                          {bl.rate > 0 ? fmt(bl.rate) : '—'}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                          {fmt(bl.amount)}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                          {bl.gstAmount > 0 ? fmt(bl.gstAmount) : '—'}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '600' }}>
                          {fmt(bl.netAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tax Summary */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Summary</h2>
            <div style={styles.summaryGrid}>
              <SummaryLine label="Subtotal" amount={detail.taxSummary.subtotal} />
              {detail.taxSummary.gst > 0 && <SummaryLine label="GST" amount={detail.taxSummary.gst} />}
              {detail.taxSummary.furtherTax > 0 && <SummaryLine label="Further Tax" amount={detail.taxSummary.furtherTax} />}
              {detail.taxSummary.fed > 0 && <SummaryLine label="FED" amount={detail.taxSummary.fed} />}
              {detail.taxSummary.advanceTax > 0 && <SummaryLine label="Advance Tax" amount={detail.taxSummary.advanceTax} />}
              {detail.taxSummary.totalTax > 0 && (
                <div style={styles.summaryDivider} />
              )}
              {detail.taxSummary.totalTax > 0 && <SummaryLine label="Total Tax" amount={detail.taxSummary.totalTax} bold />}
              <div style={styles.summaryDivider} />
              <SummaryLine label="Grand Total" amount={detail.taxSummary.grandTotal} bold />
            </div>
          </div>

          {/* Accounting Entries */}
          {detail.accountingEntries.length > 0 && (
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Accounting Entries</h2>
              <div className="table-wrap" style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Account</th>
                      <th style={styles.th}>Description</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Debit</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.accountingEntries.map((ae, i) => (
                      <tr key={i} style={styles.tr}>
                        <td style={styles.td}>
                          <span style={styles.accountCode}>{ae.accountCode}</span>
                          <span style={styles.accountName}>{ae.accountName}</span>
                        </td>
                        <td style={styles.td}>{ae.description || '—'}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                          {ae.debit > 0 ? fmt(ae.debit) : ''}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                          {ae.credit > 0 ? fmt(ae.credit) : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={styles.totalRow}>
                      <td colSpan={2} style={styles.totalCell}>Total</td>
                      <td style={{ ...styles.totalCell, textAlign: 'right', fontFamily: 'monospace' }}>
                        {fmt(detail.accountingEntries.reduce((s, e) => s + e.debit, 0))}
                      </td>
                      <td style={{ ...styles.totalCell, textAlign: 'right', fontFamily: 'monospace' }}>
                        {fmt(detail.accountingEntries.reduce((s, e) => s + e.credit, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Inventory Movements */}
          {detail.inventoryMovements.length > 0 && (
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Inventory Movements</h2>
              <div className="table-wrap" style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>SKU</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Qty</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Unit Cost</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Total</th>
                      <th style={styles.th}>Direction</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.inventoryMovements.map((im, i) => (
                      <tr key={i} style={styles.tr}>
                        <td style={styles.td}>{im.movementType}</td>
                        <td style={styles.td}>{im.productName}</td>
                        <td style={styles.td}>{im.productSku || '—'}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                          {im.quantity.toLocaleString()}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                          {fmt(im.unitCost)}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                          {fmt(im.totalCost)}
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.directionBadge,
                            backgroundColor: im.direction === 'IN' ? '#dcfce7' : '#fef3c7',
                            color: im.direction === 'IN' ? '#166534' : '#92400e',
                          }}>
                            {im.direction === 'IN' ? 'Stock In' : 'Stock Out'}
                          </span>
                        </td>
                        <td style={styles.td}>{im.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Responsive CSS */}
      <style>{`
        .bill-detail-page { max-width: 1000px; }
        .bill-detail-header-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; }

        @media (max-width: 768px) {
          .bill-detail-header-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .bill-detail-header-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

/* ─── Sub-components ──────────────────────────────────────── */

const SummaryLine: React.FC<{ label: string; amount: number; bold?: boolean }> = ({ label, amount, bold }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    fontWeight: bold ? '700' : '400',
    fontSize: bold ? '15px' : '14px',
  }}>
    <span style={{ color: '#475569' }}>{label}</span>
    <span style={{ fontFamily: 'monospace', color: '#1e293b' }}>{fmt(amount)}</span>
  </div>
);

/* ─── Styles ──────────────────────────────────────────────── */

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    padding: '24px',
    maxWidth: '1000px',
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
  loadingBox: {
    textAlign: 'center',
    padding: '64px 24px',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: '14px',
  },
  errorBox: {
    textAlign: 'center',
    padding: '48px 24px',
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    border: '1px solid #fecaca',
  },
  errorText: {
    color: '#991b1b',
    fontSize: '14px',
    marginBottom: '12px',
  },
  retryBtn: {
    padding: '8px 16px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e2e8f0',
    marginBottom: '20px',
  },
  headerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '16px',
  },
  headerField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  fieldLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  fieldValue: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
  },
  typeBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
    width: 'fit-content',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
    width: 'fit-content',
  },
  narration: {
    fontSize: '14px',
    color: '#475569',
    marginTop: '4px',
    lineHeight: '1.5',
  },
  navLinks: {
    display: 'flex',
    gap: '8px',
    marginTop: '16px',
    flexWrap: 'wrap',
  },
  navLinkBtn: {
    padding: '6px 14px',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#2563eb',
    cursor: 'pointer',
    fontWeight: '500',
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
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '16px',
  },
  tableWrap: {
    overflowX: 'auto',
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
  accountCode: {
    fontWeight: '600',
    marginRight: '6px',
    color: '#2563eb',
    fontFamily: 'monospace',
  },
  accountName: {
    color: '#64748b',
    fontSize: '12px',
  },
  totalRow: {
    borderTop: '2px solid #e2e8f0',
  },
  totalCell: {
    padding: '10px 12px',
    fontWeight: '700',
    color: '#1e293b',
  },
  directionBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '500',
  },
  summaryGrid: {
    maxWidth: '400px',
  },
  summaryDivider: {
    borderTop: '1px solid #e2e8f0',
    margin: '4px 0',
  },
};
