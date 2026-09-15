/**
 * Dashboard Page — Step 88A UI modernization
 * Operational overview with real ERP data.
 *
 * Step 88A notes (UI-only modernization):
 * - Same data source (getDashboard → DashboardService), same period logic,
 *   same navigation targets, same refresh events — behavior is unchanged.
 * - Presentation now consumes the design-token system (src/ui/styles/theme.css)
 *   so the page supports light/dark mode and brand-derived accent colors.
 * - Tables adapt to stacked cards on narrow screens; type/status colors keep the
 *   same semantics (status chips now also surface the existing `status` field).
 * - No business values, calculations, queries, or tenant handling were changed.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';
import { getDashboard } from '../lib/api';
import { useRefreshOnMount } from '../utils/useRefreshOnEvent';
import {
  DashboardPeriod,
  DashboardData,
  KpiCard,
  AgingSummary,
  RecentTransaction,
} from '../../domain/services/DashboardService';

/* ─── Constants ────────────────────────────────────────────── */

const fmt = (n: number) => n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtCurrency = (n: number) => n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const PERIOD_OPTIONS: { key: DashboardPeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
];

/** Voucher-type badge colors: light mode keeps the original palette; dark mode
 *  uses the equivalent token set for readability. */
const TYPE_STYLES: Record<string, { light: { bg: string; fg: string }; dark: { bg: string; fg: string }; className: string }> = {
  SV:  { light: { bg: '#dbeafe', fg: '#1d4ed8' }, dark: { bg: '#172b4a', fg: '#93c5fd' }, className: 'type-badge--sv' },
  PV:  { light: { bg: '#dcfce7', fg: '#166534' }, dark: { bg: '#052e16', fg: '#4ade80' }, className: 'type-badge--pv' },
  SRV: { light: { bg: '#fef3c7', fg: '#92400e' }, dark: { bg: '#451a03', fg: '#fbbf24' }, className: 'type-badge--srv' },
  PRV: { light: { bg: '#fce7f3', fg: '#9d174d' }, dark: { bg: '#500724', fg: '#f9a8d4' }, className: 'type-badge--prv' },
  CR:  { light: { bg: '#d1fae5', fg: '#065f46' }, dark: { bg: '#06281c', fg: '#6ee7b7' }, className: 'type-badge--cr' },
  CP:  { light: { bg: '#fee2e2', fg: '#991b1b' }, dark: { bg: '#450a0a', fg: '#fca5a5' }, className: 'type-badge--cp' },
  JV:  { light: { bg: '#f3e8ff', fg: '#6b21a8' }, dark: { bg: '#3b1d54', fg: '#d8b4fe' }, className: 'type-badge--jv' },
};
const TYPE_FALLBACK = { light: { bg: '#f1f5f9', fg: '#475569' }, dark: { bg: '#273549', fg: '#cbd5e1' }, className: 'type-badge--other' };

const TYPE_LABELS: Record<string, string> = {
  SV: 'Sale',
  PV: 'Purchase',
  SRV: 'Sale Return',
  PRV: 'Purchase Return',
  CR: 'Receipt',
  CP: 'Payment',
  JV: 'Journal',
};

const STATUS_STYLES: Record<string, string> = {
  POSTED: 'status-chip--posted',
  DRAFT: 'status-chip--draft',
  CANCELLED: 'status-chip--cancelled',
};

/* ═══════════════════════════════════════════════════════════ */
/* Main Dashboard Component                                    */
/* ═══════════════════════════════════════════════════════════ */

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const Dashboard: React.FC = () => {
  const { user, tenant } = useAuth();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDashboard(period, customStart || undefined, customEnd || undefined);
      setData(result);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd]);

  useEffect(() => { loadData(); }, [loadData]);

  // Refresh Dashboard when any transaction is posted/deleted in other modules
  useRefreshOnMount(loadData, [
    'sale-posted', 'sale-deleted',
    'purchase-posted', 'purchase-deleted',
    'sale-return-posted', 'sale-return-deleted',
    'purchase-return-posted', 'purchase-return-deleted',
    'receipt-posted', 'receipt-deleted',
    'payment-posted', 'payment-deleted',
  ]);

  const today = new Date();
  const todayLabel = today.toLocaleDateString('en-PK', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const periodLabel = PERIOD_OPTIONS.find(p => p.key === period)?.label ?? 'Custom';

  return (
    <div className="page-pad dashboard-page">
      {/* Welcome / brand area */}
      <div className="dash-welcome">
        <div className="dash-welcome-main">
          <div className="dash-welcome-brandmark" style={{ backgroundColor: tenant.primaryColor }} aria-hidden="true">
            {tenant.brandName.charAt(0)}
          </div>
          <div className="dash-welcome-text">
            <h1 className="dash-welcome-title">
              {greetingForHour(today.getHours())}, {user.displayName}
            </h1>
            <p className="dash-welcome-subtitle">
              <span className="dash-welcome-brand" style={{ color: tenant.primaryColor }}>
                {tenant.brandName}
              </span>
              <span className="dash-welcome-sep" aria-hidden="true">·</span>
              <span>{todayLabel}</span>
            </p>
          </div>
        </div>
        {!loading && !error && data && (
          <span className="dash-period-chip" title="Currently viewing data for this period">
            {periodLabel}
            {period === 'custom' && customStart && customEnd ? `: ${customStart} → ${customEnd}` : ''}
          </span>
        )}
      </div>

      {/* Period Filter */}
      <div className="dashboard-period-bar dash-filter-bar">
        <div className="dashboard-period-tabs dash-period-tabs" role="radiogroup" aria-label="Dashboard period">
          {PERIOD_OPTIONS.map(p => (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={period === p.key}
              onClick={() => setPeriod(p.key)}
              className={`dash-period-tab ${period === p.key ? 'dash-period-tab--active' : ''}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="dashboard-custom-range dash-custom-range">
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="dash-date-input"
              aria-label="Custom range start date"
            />
            <span className="dash-date-sep" aria-hidden="true">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="dash-date-input"
              aria-label="Custom range end date"
            />
          </div>
        )}
      </div>

      {/* Loading State — skeleton layout */}
      {loading && (
        <div className="dash-skeletons" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading dashboard data…</span>
          <div className="dashboard-kpi-grid dash-kpi-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="dash-card dash-kpi-card dash-kpi-card--static">
                <div className="skeleton dash-skel-icon" />
                <div className="dash-skel-lines">
                  <div className="skeleton dash-skel-line dash-skel-line--sm" />
                  <div className="skeleton dash-skel-line dash-skel-line--lg" />
                  <div className="skeleton dash-skel-line dash-skel-line--sm" />
                </div>
              </div>
            ))}
          </div>
          <div className="dashboard-two-col dash-two-col">
            <div className="dash-card">
              <div className="skeleton dash-skel-line dash-skel-line--md" />
              <div className="dash-skel-rows">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton dash-skel-line dash-skel-line--row" />
                ))}
              </div>
            </div>
            <div className="dash-card">
              <div className="skeleton dash-skel-line dash-skel-line--md" />
              <div className="dash-skel-rows">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton dash-skel-line dash-skel-line--row" />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="dash-error" role="alert">
          <svg className="dash-error-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8a1 1 0 011 1v4a1 1 0 11-2 0V9a1 1 0 011-1zm0 8a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
          </svg>
          <p className="dash-error-text">{error}</p>
          <button type="button" onClick={loadData} className="dash-retry-btn">Retry</button>
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && !error && data && (
        <>
          {/* KPI Cards */}
          <div className="dashboard-kpi-grid dash-kpi-grid">
            <KpiCardComponent
              card={data.sales}
              tone="sales"
              onClick={() => navigate('/bills')}
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
              }
            />
            <KpiCardComponent
              card={data.purchases}
              tone="purchases"
              onClick={() => navigate('/bills')}
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2L3 7v11h14V7l-7-5zM6 9.13v7.74h2V9.13L10 6.27l2 2.86v7.74h2V9.13L10 5.27 6 9.13z" clipRule="evenodd" />
                </svg>
              }
            />
            <KpiCardComponent
              card={{ label: 'Receivables', amount: (data.receivables ?? {}).grandTotal ?? 0, count: 0 }}
              tone="receivables"
              onClick={() => navigate('/aging')}
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8.433 7.418c.155-.103.346-.199.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.068.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              }
            />
            <KpiCardComponent
              card={{ label: 'Payables', amount: (data.payables ?? {}).grandTotal ?? 0, count: 0 }}
              tone="payables"
              onClick={() => navigate('/aging')}
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
              }
            />
            <KpiCardComponent
              card={{
                label: 'Inventory',
                amount: (data.inventory ?? {}).totalStockValue ?? 0,
                count: (data.inventory ?? {}).totalProducts ?? 0,
                secondary: (data.inventory ?? {}).totalStockQty ?? 0,
              }}
              tone="inventory"
              onClick={() => navigate('/inventory')}
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2L3 7v11h14V7l-7-5zM6 9.13v7.74h2V9.13L10 6.27l2 2.86v7.74h2V9.13L10 5.27 6 9.13z" clipRule="evenodd" />
                </svg>
              }
            />
            <KpiCardComponent
              card={{
                label: 'Cash Position',
                amount: (data.cashPosition ?? {}).totalBalance ?? 0,
                count: (data.cashPosition ?? {}).accountCount ?? 0,
              }}
              tone="cash"
              onClick={() => navigate('/cash-book')}
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              }
            />
          </div>

          {/* Sales vs Purchases + Aging Summary Row */}
          <div className="dashboard-two-col dash-two-col">
            {/* Sales vs Purchases */}
            <section className="dash-card">
              <h2 className="dash-card-title">Sales vs Purchases</h2>
              <div className="dash-summary-list">
                <SummaryRow label="Sales" amount={(data.sales ?? {}).amount ?? 0} count={(data.sales ?? {}).count ?? 0} color="#1d4ed8" />
                <SummaryRow label="Purchases" amount={(data.purchases ?? {}).amount ?? 0} count={(data.purchases ?? {}).count ?? 0} color="#166534" />
                <SummaryRow label="Sale Returns" amount={(data.saleReturns ?? {}).amount ?? 0} count={(data.saleReturns ?? {}).count ?? 0} color="#92400e" />
                <SummaryRow label="Purchase Returns" amount={(data.purchaseReturns ?? {}).amount ?? 0} count={(data.purchaseReturns ?? {}).count ?? 0} color="#9d174d" />
              </div>
            </section>

            {/* Aging Summary */}
            <section className="dash-card">
              <h2 className="dash-card-title">Aging Summary</h2>
              <AgingSummaryCompact
                receivables={data.receivables}
                payables={data.payables}
                onNavigate={() => navigate('/aging')}
              />
            </section>
          </div>

          {/* Recent Transactions + Quick Actions Row */}
          <div className="dashboard-two-col dash-two-col">
            {/* Recent Transactions */}
            <section className="dash-card">
              <div className="dash-card-header">
                <h2 className="dash-card-title dash-card-title--flush">Recent Transactions</h2>
                <button type="button" onClick={() => navigate('/bills')} className="dash-view-all-btn">
                  View All
                </button>
              </div>
              {data.recentTransactions.length === 0 ? (
                <div className="dash-empty">
                  <svg width="28" height="28" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  <p>No transactions in this period.</p>
                </div>
              ) : (
                <>
                  {/* Desktop / tablet table */}
                  <div className="table-wrap dash-table-wrap">
                    <table className="dash-table">
                      <thead>
                        <tr>
                          <th style={thStyle}>Type</th>
                          <th style={thStyle}>Date</th>
                          <th style={thStyle}>Party</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentTransactions.map(t => (
                          <tr
                            key={t.id}
                            className="dash-tr"
                            tabIndex={0}
                            onClick={() => navigate(`/bills/${t.id}`)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/bills/${t.id}`); } }}
                            aria-label={`Open ${TYPE_LABELS[t.voucherType] || t.voucherType} ${t.voucherNumber}`}
                          >
                            <td style={tdStyle}>
                              <TypeBadge voucherType={t.voucherType} />
                            </td>
                            <td style={tdStyle}>{t.date}</td>
                            <td style={tdStyle}>{t.partyName || '—'}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                              {fmtCurrency(t.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile stacked transaction cards */}
                  <div className="dash-tx-cards">
                    {data.recentTransactions.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        className="dash-tx-card"
                        onClick={() => navigate(`/bills/${t.id}`)}
                      >
                        <div className="dash-tx-card-top">
                          <TypeBadge voucherType={t.voucherType} />
                          <StatusChip status={t.status} />
                        </div>
                        <div className="dash-tx-card-mid">
                          <span className="dash-tx-card-party">{t.partyName || '—'}</span>
                          <span className="dash-tx-card-amount">{fmtCurrency(t.total)}</span>
                        </div>
                        <div className="dash-tx-card-date">{t.date}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* Quick Actions */}
            <section className="dash-card">
              <h2 className="dash-card-title">Quick Actions</h2>
              <div className="dash-actions-grid">
                <QuickAction label="New Sale" tone="sales"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/sales')}
                />
                <QuickAction label="New Purchase" tone="purchases"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/purchases')}
                />
                <QuickAction label="Sale Return" tone="returns"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/sales')}
                />
                <QuickAction label="Purchase Return" tone="prv"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/purchases')}
                />
                <QuickAction label="Receipt" tone="receipt"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/customer-receipts')}
                />
                <QuickAction label="Cash Book" tone="cash"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/cash-book')}
                />
                <QuickAction label="Journal" tone="journal"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/finance')}
                />
                <QuickAction label="View Bills" tone="neutral"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/bills')}
                />
                <QuickAction label="Aging Report" tone="aging"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/aging')}
                />
                <QuickAction label="Finance" tone="sales"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/finance')}
                />
              </div>
            </section>
          </div>
        </>
      )}

      {/* Responsive CSS (scoped to dashboard classes) */}
      <style>{`
        .dashboard-page { max-width: 1400px; margin: 0 auto; padding-top: 8px; }
        .dashboard-period-bar { display: flex; flex-direction: column; gap: 12px; }
        .dashboard-period-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
        .dashboard-custom-range { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .dashboard-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; }
        .dashboard-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }

        @media (max-width: 1024px) {
          .dashboard-two-col { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .dashboard-kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .dashboard-period-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; flex-wrap: nowrap; }
          .dashboard-two-col { gap: 16px; }
        }
        @media (max-width: 480px) {
          .dashboard-kpi-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Sub-components                                              */
/* ═══════════════════════════════════════════════════════════ */

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  color: 'var(--dash-table-head-fg)',
  backgroundColor: 'var(--dash-table-head-bg)',
  fontWeight: 600,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
  padding: '10px 14px',
};

const tdStyle: React.CSSProperties = {
  padding: '11px 14px',
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--dash-table-row-border)',
};

const KPI_TONES: Record<string, { iconBgLight: string; iconFg: string; iconBgDark: string; iconFgDark: string }> = {
  sales:       { iconBgLight: '#dbeafe', iconFg: '#2563eb', iconBgDark: '#172b4a', iconFgDark: '#93c5fd' },
  purchases:   { iconBgLight: '#dcfce7', iconFg: '#16a34a', iconBgDark: '#052e16', iconFgDark: '#4ade80' },
  receivables: { iconBgLight: '#fef3c7', iconFg: '#d97706', iconBgDark: '#451a03', iconFgDark: '#fbbf24' },
  payables:    { iconBgLight: '#fce7f3', iconFg: '#be185d', iconBgDark: '#500724', iconFgDark: '#f9a8d4' },
  inventory:   { iconBgLight: '#f0fdf4', iconFg: '#15803d', iconBgDark: '#06281c', iconFgDark: '#6ee7b7' },
  cash:        { iconBgLight: '#ede9fe', iconFg: '#7c3aed', iconBgDark: '#3b1d54', iconFgDark: '#d8b4fe' },
};

const KpiCardComponent: React.FC<{
  card: KpiCard;
  tone: keyof typeof KPI_TONES;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ card, tone, icon, onClick }) => {
  return (
    <button type="button" onClick={onClick} className="dash-card dash-kpi-card" aria-label={`${card.label}: ${fmtCurrency(card.amount)} — view details`}>
      <div className={`dash-kpi-icon dash-tone-${tone}`}>{icon}</div>
      <div className="dash-kpi-content">
        <span className="dash-kpi-label">{card.label}</span>
        <span className="dash-kpi-amount">{fmtCurrency(card.amount)}</span>
        <span className="dash-kpi-meta">
          {card.count > 0 && `${card.count} transactions`}
          {card.secondary !== undefined && card.secondary > 0 && ` · ${fmt(card.secondary)} units`}
        </span>
      </div>
      <span className="dash-kpi-arrow" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 010-1.06z" clipRule="evenodd" />
        </svg>
      </span>
    </button>
  );
};

const TypeBadge: React.FC<{ voucherType: string }> = ({ voucherType }) => {
  const t = TYPE_STYLES[voucherType] || TYPE_FALLBACK;
  return (
    <span className={`dash-type-badge ${t.className}`}>
      {TYPE_LABELS[voucherType] || voucherType}
    </span>
  );
};

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  if (!status) return null;
  return <span className={`dash-status-chip ${STATUS_STYLES[status] || 'status-chip--other'}`}>{status}</span>;
};

const SummaryRow: React.FC<{
  label: string;
  amount: number;
  count: number;
  color: string;
}> = ({ label, amount, count, color }) => (
  <div className="dash-summary-row">
    <div className="dash-summary-left">
      <span className="dash-summary-dot" style={{ backgroundColor: color }} aria-hidden="true" />
      <span className="dash-summary-label">{label}</span>
    </div>
    <div className="dash-summary-right">
      <span className="dash-summary-amount">{fmtCurrency(amount)}</span>
      {count > 0 && <span className="dash-summary-count">{count}</span>}
    </div>
  </div>
);

const AgingSummaryCompact: React.FC<{
  receivables: AgingSummary;
  payables: AgingSummary;
  onNavigate: () => void;
}> = ({ receivables, payables, onNavigate }) => (
  <div className="dash-aging">
    <div className="dash-aging-section">
      <h3 className="dash-aging-title">Receivables</h3>
      <AgingBar summary={receivables} color="#2563eb" />
    </div>
    <div className="dash-aging-section">
      <h3 className="dash-aging-title">Payables</h3>
      <AgingBar summary={payables} color="#be185d" />
    </div>
    <button type="button" onClick={onNavigate} className="dash-aging-link">
      View Full Aging Report
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 010-1.06z" clipRule="evenodd" />
      </svg>
    </button>
  </div>
);

const AgingBar: React.FC<{
  summary: AgingSummary;
  color: string;
}> = ({ summary, color }) => {
  const total = summary.grandTotal;
  if (total === 0) return <p className="dash-empty-text">No outstanding balances</p>;

  const segments = [
    { label: 'Current', value: summary.current },
    { label: '1–30', value: summary.d1_30 },
    { label: '31–60', value: summary.d31_60 },
    { label: '61–90', value: summary.d61_90 },
    { label: '91–120', value: summary.d91_120 },
    { label: '120+', value: summary.d120plus },
  ].filter(s => s.value > 0);

  return (
    <>
      <div className="dash-aging-bar" role="img" aria-label={`Aging: ${segments.map(s => `${s.label} ${fmtCurrency(s.value)}`).join(', ')}`}>
        {segments.map((seg, i) => {
          const width = (seg.value / total) * 100;
          const opacity = 1 - (i * 0.12);
          return (
            <div
              key={seg.label}
              title={`${seg.label}: ${fmtCurrency(seg.value)}`}
              style={{
                width: `${width}%`,
                backgroundColor: color,
                opacity,
                minWidth: width > 0 ? '4px' : '0',
              }}
            />
          );
        })}
      </div>
      <div className="dash-aging-chips">
        {segments.map(seg => (
          <span key={seg.label} className="dash-aging-chip">
            {seg.label}: {fmtCurrency(seg.value)}
          </span>
        ))}
      </div>
    </>
  );
};

const ACTION_TONES: Record<string, { bg: string; fg: string; bgDark: string; fgDark: string }> = {
  sales:     { bg: '#dbeafe', fg: '#2563eb', bgDark: '#172b4a', fgDark: '#93c5fd' },
  purchases: { bg: '#dcfce7', fg: '#16a34a', bgDark: '#052e16', fgDark: '#4ade80' },
  returns:   { bg: '#fef3c7', fg: '#92400e', bgDark: '#451a03', fgDark: '#fbbf24' },
  prv:       { bg: '#fce7f3', fg: '#9d174d', bgDark: '#500724', fgDark: '#f9a8d4' },
  receipt:   { bg: '#d1fae5', fg: '#065f46', bgDark: '#06281c', fgDark: '#6ee7b7' },
  cash:      { bg: '#ede9fe', fg: '#7c3aed', bgDark: '#3b1d54', fgDark: '#d8b4fe' },
  journal:   { bg: '#f3e8ff', fg: '#6b21a8', bgDark: '#3b1d54', fgDark: '#d8b4fe' },
  neutral:   { bg: '#f1f5f9', fg: '#475569', bgDark: '#273549', fgDark: '#cbd5e1' },
  aging:     { bg: '#fef3c7', fg: '#92400e', bgDark: '#451a03', fgDark: '#fbbf24' },
};

const QuickAction: React.FC<{
  label: string;
  tone: keyof typeof ACTION_TONES;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ label, tone, icon, onClick }) => (
  <button type="button" onClick={onClick} className="dash-action-btn">
    <span className={`dash-action-icon dash-tone-${tone}`}>
      {icon}
    </span>
    <span className="dash-action-label">{label}</span>
  </button>
);
