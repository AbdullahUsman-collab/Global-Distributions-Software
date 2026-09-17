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
import {  BILL_TYPE_LABELS,
 } from '../lib/billLabels';
import { VoucherStatus, VOUCHER_STATUS_LABELS } from '../../domain/types/voucher';
import { printWindow, generateCsv, downloadFile, generateExportFilename } from '../utils/export';

/* ─── Constants ────────────────────────────────────────────── */

const fmt = (n: number) => n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS: Record<VoucherStatus, { bg: string; fg: string }> = {
  DRAFT:  { bg: 'var(--tx-draft-bg)', fg: 'var(--tx-draft-fg)' },
  POSTED: { bg: 'var(--tx-posted-bg)', fg: 'var(--tx-posted-fg)' },
};

/** UI-bound token map mirroring domain BILL_TYPE_COLORS identity (presentation only). */
const TYPE_TOKENS: Record<string, { bg: string; fg: string }> = {
  SV:  { bg: 'var(--tx-type-sv-bg)',  fg: 'var(--tx-type-sv-fg)' },
  PV:  { bg: 'var(--tx-type-pv-bg)',  fg: 'var(--tx-type-pv-fg)' },
  SRV: { bg: 'var(--tx-type-srv-bg)', fg: 'var(--tx-type-srv-fg)' },
  PRV: { bg: 'var(--tx-type-prv-bg)', fg: 'var(--tx-type-prv-fg)' },
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
  const [showAccounting, setShowAccounting] = useState(false);
  const [showMovements, setShowMovements] = useState(false);
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());

  // Line Items shows only actual product lines. The accounting engine also posts
  // GL aggregate lines (inventory debit, input tax, COGS pairs) without product
  // metadata — those belong in Accounting Entries below, not as dash-rows here.
  const productLines = detail ? detail.lines.filter(bl => bl.line.productId) : [];
  const hasOverrideColumns = productLines.some(bl =>
    bl.line.tradeDiscountPercent != null || bl.line.furtherTaxPercent != null || bl.line.fedPercent != null
  );

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

  const toggleLineExpand = (idx: number) => {
    setExpandedLines(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // Print handler
  const handlePrint = () => {
    printWindow();
  };

  // Export CSV handler
  const handleExportCsv = () => {
    if (!detail) return;
    const headers = ['#', 'Product', 'SKU', 'Qty', 'Rate', 'Amount', 'Margin %', 'Retail Price', 'Trade Disc %', 'Trade Offer %', 'Special Disc %', 'GST Type', 'HS Code', 'Min Qty', 'GST', 'FED', 'Further Tax', 'Adv Tax', 'Total'];
    const rows = productLines.map((bl, i) => [
      i + 1,
      bl.productName || '',
      bl.productSku || '',
      bl.quantity || '',
      bl.rate ? bl.rate.toFixed(2) : '',
      bl.amount.toFixed(2),
      bl.marginPercent > 0 ? `${bl.marginPercent}%` : '',
      (bl.line.retailPrice ?? 0) > 0 ? (bl.line.retailPrice ?? 0).toFixed(2) : '',
      (bl.line.tradeDiscountPercent ?? 0) > 0 ? `${bl.line.tradeDiscountPercent}%` : '',
      (bl.line.tradeOfferPercent ?? 0) > 0 ? `${bl.line.tradeOfferPercent}%` : '',
      (bl.line.specialDiscountPercent ?? 0) > 0 ? `${bl.line.specialDiscountPercent}%` : '',
      bl.line.gstType || '',
      bl.line.hsCode || '',
      (bl.line.minQuantity ?? 0) > 0 ? String(bl.line.minQuantity) : '',
      bl.gstAmount > 0 ? bl.gstAmount.toFixed(2) : '',
      bl.fedAmount > 0 ? bl.fedAmount.toFixed(2) : '',
      bl.furtherTaxAmount > 0 ? bl.furtherTaxAmount.toFixed(2) : '',
      bl.advanceTaxAmount > 0 ? bl.advanceTaxAmount.toFixed(2) : '',
      bl.netAmount.toFixed(2),
    ]);
    // Add totals
    rows.push([]);
    const pad = Array(7).fill(''); // align label+value under columns 7..18
    rows.push([...pad, 'Subtotal (Value Excl Tax)', detail.taxSummary.subtotal.toFixed(2)]);
    if (detail.taxSummary.totalTradeDiscount > 0) rows.push([...pad, 'Trade Discount', detail.taxSummary.totalTradeDiscount.toFixed(2)]);
    if (detail.taxSummary.totalTradeOffer > 0) rows.push([...pad, 'Trade Offer', detail.taxSummary.totalTradeOffer.toFixed(2)]);
    if (detail.taxSummary.totalSpecialDiscount > 0) rows.push([...pad, 'Special Discount', detail.taxSummary.totalSpecialDiscount.toFixed(2)]);
    if (detail.taxSummary.totalDiscount > 0) rows.push([...pad, 'Total Discount', detail.taxSummary.totalDiscount.toFixed(2)]);
    if (detail.taxSummary.gst > 0) rows.push([...pad, 'GST', detail.taxSummary.gst.toFixed(2)]);
    if (detail.taxSummary.furtherTax > 0) rows.push([...pad, 'Further Tax', detail.taxSummary.furtherTax.toFixed(2)]);
    if (detail.taxSummary.fed > 0) rows.push([...pad, 'FED', detail.taxSummary.fed.toFixed(2)]);
    if (detail.taxSummary.advanceTax > 0) rows.push([...pad, 'Advance Tax', detail.taxSummary.advanceTax.toFixed(2)]);
    if (detail.taxSummary.totalTax > 0) rows.push([...pad, 'Total Tax', detail.taxSummary.totalTax.toFixed(2)]);
    rows.push([...pad, 'Grand Total', detail.taxSummary.grandTotal.toFixed(2)]);

    const csv = generateCsv(headers, rows);
    const ref = `${detail.voucher.voucherType}-${String(detail.voucher.voucherNumber).padStart(6, '0')}`;
    const filename = generateExportFilename(
      `${BILL_TYPE_LABELS[detail.voucher.voucherType] || 'Bill'}`,
      ref,
    );
    downloadFile(csv, filename);
  };

  return (
    <div className="page-pad tx-page bill-detail-page" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <button onClick={() => navigate('/bills')} className="tx-btn tx-btn-link" style={styles.backBtn}>← Bills List</button>
          <h1 style={styles.title}>Bill Detail</h1>
        </div>
        {detail && (
          <div style={{ display: 'flex', gap: '8px' }} className="no-print">
            <button onClick={handleExportCsv} className="tx-btn tx-btn-secondary" style={styles.exportBtn}>
              Export CSV
            </button>
            <button onClick={handlePrint} className="tx-btn tx-btn-primary" style={styles.printBtn}>
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
            <button onClick={() => navigate('/bills')}                        className="tx-btn" style={styles.retryBtn}>Back to Bills</button>
            {error !== 'Bill not found or access denied' && (
              <button onClick={() => window.location.reload()}                        className="tx-btn" style={styles.retryBtn}>Retry</button>
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
                  backgroundColor: TYPE_TOKENS[detail.voucher.voucherType]?.bg ?? 'var(--tx-neutral-bg)',
                  color: TYPE_TOKENS[detail.voucher.voucherType]?.fg ?? 'var(--tx-neutral-fg)',
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
                  backgroundColor: STATUS_COLORS[detail.voucher.status]?.bg ?? 'var(--tx-neutral-bg)',
                  color: STATUS_COLORS[detail.voucher.status]?.fg ?? 'var(--tx-neutral-fg)',
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
                <button onClick={navigateToLedger} className="tx-btn" style={styles.navLinkBtn}>
                  View Ledger
                </button>
              )}
              <button onClick={navigateToAging} className="tx-btn" style={styles.navLinkBtn}>
                View Aging
              </button>
            </div>
          </div>

          {/* Line Items */}
          {productLines.length > 0 && (
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Line Items</h2>
              <div className="table-wrap" style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: '32px' }}></th>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>SKU</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Qty</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Rate</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Margin %</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Tax</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productLines.map((bl, i) => {
                      const isExpanded = expandedLines.has(i);
                      const hasDetails = (bl.line.retailPrice ?? 0) > 0 || (bl.line.minQuantity ?? 0) > 0
                        || bl.line.hsCode || bl.line.gstType
                        || (bl.line.tradeOfferPercent ?? 0) > 0 || (bl.line.specialDiscountPercent ?? 0) > 0
                        || (bl.line.fedPercent ?? 0) > 0 || (bl.line.furtherTaxPercent ?? 0) > 0
                        || (bl.line.advanceTaxPercent ?? 0) > 0;
                      return (
                        <React.Fragment key={bl.line.id}>
                          <tr style={styles.tr}>
                            <td style={{ ...styles.td, width: '32px' }}>
                              {hasDetails && (
                                <button
                                  onClick={() => toggleLineExpand(i)}
                                  title={isExpanded ? 'Collapse details' : 'Expand details'}
                                  style={{
                                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
                                    fontSize: '11px', borderRadius: '4px',
                                    backgroundColor: isExpanded ? 'var(--tx-draft-bg, #dbeafe)' : 'var(--surface-3, #f1f5f9)',
                                    color: isExpanded ? 'var(--accent, #2563eb)' : 'var(--text-muted, #64748b)',
                                  }}
                                >
                                  {isExpanded ? '▼' : '▶'}
                                </button>
                              )}
                            </td>
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
                              {bl.marginPercent > 0 ? `${bl.marginPercent}%` : '—'}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                              {bl.gstAmount > 0 ? fmt(bl.gstAmount) : '—'}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '600' }}>
                              {fmt(bl.netAmount)}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={10} style={{ padding: '12px 16px', backgroundColor: 'var(--surface-2, #f8fafc)', borderBottom: '2px solid var(--border)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                                  {[
                                    { label: 'Retail Price', value: (bl.line.retailPrice ?? 0) > 0 ? fmt(bl.line.retailPrice!) : '—' },
                                    { label: 'Trade Disc %', value: (bl.line.tradeDiscountPercent ?? 0) > 0 ? `${bl.line.tradeDiscountPercent}%` : '—' },
                                    { label: 'Trade Offer %', value: (bl.line.tradeOfferPercent ?? 0) > 0 ? `${bl.line.tradeOfferPercent}%` : '—' },
                                    { label: 'Special Disc %', value: (bl.line.specialDiscountPercent ?? 0) > 0 ? `${bl.line.specialDiscountPercent}%` : '—' },
                                    { label: 'Min Qty', value: (bl.line.minQuantity ?? 0) > 0 ? String(bl.line.minQuantity) : '—' },
                                    { label: 'HS Code', value: bl.line.hsCode || '—' },
                                    { label: 'GST Type', value: bl.line.gstType || '—' },
                                    { label: 'GST %', value: (bl.line.stRate ?? 0) > 0 ? `${bl.line.stRate}%` : '—' },
                                    { label: 'FED %', value: (bl.line.fedPercent ?? 0) > 0 ? `${bl.line.fedPercent}%` : '—' },
                                    { label: 'Further Tax %', value: (bl.line.furtherTaxPercent ?? 0) > 0 ? `${bl.line.furtherTaxPercent}%` : '—' },
                                    { label: 'Adv Tax %', value: (bl.line.advanceTaxPercent ?? 0) > 0 ? `${bl.line.advanceTaxPercent}%` : '—' },
                                  ].filter(f => f.value !== '—').map(f => (
                                    <div key={f.label}>
                                      <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>{f.label}</span>
                                      <p style={{ margin: '2px 0 0', fontSize: '13px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{f.value}</p>
                                    </div>
                                  ))}
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
            </div>
          )}

          {/* Tax Summary */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Summary</h2>
            <div style={styles.summaryGrid}>
              <SummaryLine label="Subtotal (Value Excl Tax)" amount={detail.taxSummary.subtotal} />
              {!hasOverrideColumns && detail.taxSummary.totalDiscount === 0 && detail.taxSummary.totalTax === 0 && (
                <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '13px', fontStyle: 'italic', margin: '4px 0 8px' }}>
                  Detailed tax/discount breakdown not available for this bill.
                </p>
              )}
              {detail.taxSummary.totalTradeDiscount > 0 && <SummaryLine label="Trade Discount" amount={detail.taxSummary.totalTradeDiscount} />}
              {detail.taxSummary.totalTradeOffer > 0 && <SummaryLine label="Trade Offer" amount={detail.taxSummary.totalTradeOffer} />}
              {detail.taxSummary.totalSpecialDiscount > 0 && <SummaryLine label="Special Discount" amount={detail.taxSummary.totalSpecialDiscount} />}
              {detail.taxSummary.totalDiscount > 0 && (
                <>
                  <div style={styles.summaryDivider} />
                  <SummaryLine label="Total Discount" amount={detail.taxSummary.totalDiscount} bold />
                </>
              )}
              <div style={styles.summaryDivider} />
              {detail.taxSummary.gst > 0 && <SummaryLine label="GST" amount={detail.taxSummary.gst} />}
              {detail.taxSummary.furtherTax > 0 && <SummaryLine label="Further Tax" amount={detail.taxSummary.furtherTax} />}
              {detail.taxSummary.fed > 0 && <SummaryLine label="FED" amount={detail.taxSummary.fed} />}
              {detail.taxSummary.advanceTax > 0 && <SummaryLine label="Advance Tax" amount={detail.taxSummary.advanceTax} />}
              {detail.taxSummary.totalTax > 0 && (
                <>
                  <div style={styles.summaryDivider} />
                  <SummaryLine label="Total Tax" amount={detail.taxSummary.totalTax} bold />
                </>
              )}
              <div style={styles.summaryDivider} />
              <SummaryLine label="Grand Total" amount={detail.taxSummary.grandTotal} bold />
            </div>
          </div>

          {/* Accounting Entries — collapsed by default (internal/admin reference) */}
          {detail.accountingEntries.length > 0 && (
            <div style={styles.card}>
              <button
                onClick={() => setShowAccounting(!showAccounting)}                  className="tx-btn"
                  style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                }}
              >
                <h2 style={{ ...styles.sectionTitle, margin: 0, flex: 1 }}>
                  {showAccounting ? '▼' : '▶'} Accounting Entries (Internal)
                </h2>
              </button>
              {showAccounting && (
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
                      <tr key={i} className="tx-tr" style={styles.tr}>
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
              )}
            </div>
          )}

          {/* Inventory Movements — collapsed by default */}
          {detail.inventoryMovements.length > 0 && (
            <div style={styles.card}>
              <button
                onClick={() => setShowMovements(!showMovements)}                  className="tx-btn"
                  style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                }}
              >
                <h2 style={{ ...styles.sectionTitle, margin: 0, flex: 1 }}>
                  {showMovements ? '▼' : '▶'} Inventory Movements
                </h2>
              </button>
              {showMovements && (
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
                      <tr key={i} className="tx-tr" style={styles.tr}>
                        <td style={styles.td}>{im.movementType}</td>
                        <td style={styles.td}>{im.productName}</td>
                        <td style={styles.td}>{im.productSku || '—'}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                          {((im.quantity ?? 0) as number).toLocaleString()}
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
                            backgroundColor: im.direction === 'IN' ? 'var(--tx-dir-in-bg)' : 'var(--tx-dir-out-bg)',
                            color: im.direction === 'IN' ? 'var(--tx-dir-in-fg)' : 'var(--tx-dir-out-fg)',
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
              )}
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
    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{fmt(amount)}</span>
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
    color: 'var(--accent)',
    cursor: 'pointer',
    fontSize: '13px',
    padding: 0,
    marginBottom: '8px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
  },
  loadingBox: {
    textAlign: 'center',
    padding: '64px 24px',
  },
  loadingText: {
    color: 'var(--text-disabled)',
    fontSize: '14px',
  },
  errorBox: {
    textAlign: 'center',
    padding: '48px 24px',
    backgroundColor: 'var(--tx-tint-red)',
    borderRadius: '12px',
    border: '1px solid var(--tx-tint-red-border)',
  },
  errorText: {
    color: 'var(--danger-fg)',
    fontSize: '14px',
    marginBottom: '12px',
  },
  retryBtn: {
    padding: '8px 16px',
    backgroundColor: 'var(--danger)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  card: {
    backgroundColor: 'var(--surface)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid var(--border)',
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
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  fieldValue: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
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
    color: 'var(--text-secondary)',
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
    backgroundColor: 'var(--surface-3)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '13px',
    color: 'var(--accent)',
    cursor: 'pointer',
    fontWeight: '500',
  },
  printBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  exportBtn: {
    padding: '8px 16px',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
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
    borderBottom: '2px solid var(--border)',
    color: 'var(--text-muted)',
    fontWeight: '600',
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--dash-table-row-border)',
  },
  td: {
    padding: '10px 12px',
    color: 'var(--text-primary)',
    verticalAlign: 'middle',
  },
  accountCode: {
    fontWeight: '600',
    marginRight: '6px',
    color: 'var(--accent)',
    fontFamily: 'monospace',
  },
  accountName: {
    color: 'var(--text-muted)',
    fontSize: '12px',
  },
  totalRow: {
    borderTop: '2px solid var(--border)',
  },
  totalCell: {
    padding: '10px 12px',
    fontWeight: '700',
    color: 'var(--text-primary)',
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
    borderTop: '1px solid var(--border)',
    margin: '4px 0',
  },
};
