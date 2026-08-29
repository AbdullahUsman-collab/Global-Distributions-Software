/**
 * Dashboard Page
 * Operational overview with real ERP data.
 *
 * Features:
 * - KPI cards (Sales, Purchases, Receivables, Payables, Inventory, Cash)
 * - Period filter (Today, Week, Month, Quarter, Year, Custom)
 * - Recent transactions
 * - Receivables/Payables aging summary
 * - Quick actions
 *
 * All data sourced from existing services — no duplicate accounting logic.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';
import { services } from '../services';
import {
  DashboardService,
  DashboardPeriod,
  DashboardData,
  KpiCard,
  AgingSummary,
  RecentTransaction,
} from '../../domain/services/DashboardService';
import { VoucherType } from '../../domain/types/voucher';

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

const TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  SV: { bg: '#dbeafe', fg: '#1d4ed8' },
  PV: { bg: '#dcfce7', fg: '#166534' },
  SRV: { bg: '#fef3c7', fg: '#92400e' },
  PRV: { bg: '#fce7f3', fg: '#9d174d' },
  CR: { bg: '#d1fae5', fg: '#065f46' },
  CP: { bg: '#fee2e2', fg: '#991b1b' },
  JV: { bg: '#f3e8ff', fg: '#6b21a8' },
};

const TYPE_LABELS: Record<string, string> = {
  SV: 'Sale',
  PV: 'Purchase',
  SRV: 'Sale Return',
  PRV: 'Purchase Return',
  CR: 'Receipt',
  CP: 'Payment',
  JV: 'Journal',
};

/* ═══════════════════════════════════════════════════════════ */
/* Main Dashboard Component                                    */
/* ═══════════════════════════════════════════════════════════ */

export const Dashboard: React.FC = () => {
  const { user, tenant } = useAuth();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dashboardService = useMemo(() => services.dashboardService, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dashboardService.getDashboardData(
        tenant.id,
        period,
        customStart || undefined,
        customEnd || undefined,
      );
      setData(result);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [tenant.id, period, customStart, customEnd, dashboardService]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="page-pad dashboard-page" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          <p style={styles.subtitle}>{tenant.brandName} — {user.displayName}</p>
        </div>
      </div>

      {/* Period Filter */}
      <div className="dashboard-period-bar" style={styles.periodBar}>
        <div className="dashboard-period-tabs" style={styles.periodTabs}>
          {PERIOD_OPTIONS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                ...styles.periodTab,
                ...(period === p.key ? styles.periodTabActive : {}),
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="dashboard-custom-range" style={styles.customRange}>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              style={styles.dateInput}
            />
            <span style={styles.dateSep}>to</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              style={styles.dateInput}
            />
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div style={styles.loadingBox}>
          <p style={styles.loadingText}>Loading dashboard data...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>{error}</p>
          <button onClick={loadData} style={styles.retryBtn}>Retry</button>
        </div>
      )}

      {/* Dashboard Content */}
      {!loading && !error && data && (
        <>
          {/* KPI Cards */}
          <div className="dashboard-kpi-grid" style={styles.kpiGrid}>
            <KpiCardComponent
              card={data.sales}
              iconBg="#dbeafe"
              iconColor="#2563eb"
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
              iconBg="#dcfce7"
              iconColor="#16a34a"
              onClick={() => navigate('/bills')}
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2L3 7v11h14V7l-7-5zM6 9.13v7.74h2V9.13L10 6.27l2 2.86v7.74h2V9.13L10 5.27 6 9.13z" clipRule="evenodd" />
                </svg>
              }
            />
            <KpiCardComponent
              card={{ label: 'Receivables', amount: data.receivables.grandTotal, count: 0 }}
              iconBg="#fef3c7"
              iconColor="#d97706"
              onClick={() => navigate('/aging')}
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8.433 7.418c.155-.103.346-.199.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.068.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
              }
            />
            <KpiCardComponent
              card={{ label: 'Payables', amount: data.payables.grandTotal, count: 0 }}
              iconBg="#fce7f3"
              iconColor="#be185d"
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
                amount: data.inventory.totalStockValue,
                count: data.inventory.totalProducts,
                secondary: data.inventory.totalStockQty,
              }}
              iconBg="#f0fdf4"
              iconColor="#15803d"
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
                amount: data.cashPosition.totalBalance,
                count: data.cashPosition.accountCount,
              }}
              iconBg="#ede9fe"
              iconColor="#7c3aed"
              onClick={() => navigate('/cash-book')}
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              }
            />
          </div>

          {/* Sales vs Purchases + Aging Summary Row */}
          <div className="dashboard-two-col" style={styles.twoCol}>
            {/* Sales vs Purchases */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Sales vs Purchases</h2>
              <div style={styles.svPurchaseGrid}>
                <SummaryRow label="Sales" amount={data.sales.amount} count={data.sales.count} color="#1d4ed8" />
                <SummaryRow label="Purchases" amount={data.purchases.amount} count={data.purchases.count} color="#166534" />
                <SummaryRow label="Sale Returns" amount={data.saleReturns.amount} count={data.saleReturns.count} color="#92400e" />
                <SummaryRow label="Purchase Returns" amount={data.purchaseReturns.amount} count={data.purchaseReturns.count} color="#9d174d" />
              </div>
            </div>

            {/* Aging Summary */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Aging Summary</h2>
              <AgingSummaryCompact
                receivables={data.receivables}
                payables={data.payables}
                onNavigate={() => navigate('/aging')}
              />
            </div>
          </div>

          {/* Recent Transactions + Quick Actions Row */}
          <div className="dashboard-two-col" style={styles.twoCol}>
            {/* Recent Transactions */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Recent Transactions</h2>
                <button onClick={() => navigate('/bills')} style={styles.viewAllBtn}>
                  View All
                </button>
              </div>
              {data.recentTransactions.length === 0 ? (
                <p style={styles.emptyText}>No transactions in this period.</p>
              ) : (
                <div className="table-wrap" style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Type</th>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Party</th>
                        <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentTransactions.map(t => {
                        const colors = TYPE_COLORS[t.voucherType] || { bg: '#f1f5f9', fg: '#475569' };
                        return (
                          <tr key={t.id} style={styles.tr}>
                            <td style={styles.td}>
                              <span style={{ ...styles.typeBadge, backgroundColor: colors.bg, color: colors.fg }}>
                                {TYPE_LABELS[t.voucherType] || t.voucherType}
                              </span>
                            </td>
                            <td style={styles.td}>{t.date}</td>
                            <td style={styles.td}>{t.partyName || '—'}</td>
                            <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                              {fmtCurrency(t.total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Quick Actions</h2>
              <div style={styles.actionsGrid}>
                <QuickAction label="New Sale" path="/sales" color="#dbeafe" iconColor="#2563eb"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/sales')}
                />
                <QuickAction label="New Purchase" path="/purchases" color="#dcfce7" iconColor="#16a34a"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/purchases')}
                />
                <QuickAction label="Sale Return" path="/sales" color="#fef3c7" iconColor="#92400e"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/sales')}
                />
                <QuickAction label="Purchase Return" path="/purchases" color="#fce7f3" iconColor="#9d174d"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/purchases')}
                />
                <QuickAction label="Receipt" path="/customer-receipts" color="#d1fae5" iconColor="#065f46"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/customer-receipts')}
                />
                <QuickAction label="Cash Book" path="/cash-book" color="#ede9fe" iconColor="#7c3aed"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/cash-book')}
                />
                <QuickAction label="Journal" path="/finance" color="#f3e8ff" iconColor="#6b21a8"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/finance')}
                />
                <QuickAction label="View Bills" path="/bills" color="#f1f5f9" iconColor="#475569"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/bills')}
                />
                <QuickAction label="Aging Report" path="/aging" color="#fef3c7" iconColor="#92400e"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/aging')}
                />
                <QuickAction label="Finance" path="/finance" color="#dbeafe" iconColor="#2563eb"
                  icon={<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>}
                  onClick={() => navigate('/finance')}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Responsive CSS */}
      <style>{`
        .dashboard-page { max-width: 1400px; }
        .dashboard-period-bar { display: flex; flex-direction: column; gap: 12px; }
        .dashboard-period-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
        .dashboard-custom-range { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .dashboard-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
        .dashboard-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }

        @media (max-width: 1024px) {
          .dashboard-two-col { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .dashboard-kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .dashboard-period-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; flex-wrap: nowrap; }
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

const KpiCardComponent: React.FC<{
  card: KpiCard;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ card, iconBg, iconColor, icon, onClick }) => (
  <button onClick={onClick} style={styles.kpiCard}>
    <div style={{ ...styles.kpiIcon, backgroundColor: iconBg, color: iconColor }}>
      {icon}
    </div>
    <div style={styles.kpiContent}>
      <span style={styles.kpiLabel}>{card.label}</span>
      <span style={styles.kpiAmount}>{fmtCurrency(card.amount)}</span>
      <span style={styles.kpiMeta}>
        {card.count > 0 && `${card.count} transactions`}
        {card.secondary !== undefined && card.secondary > 0 && ` · ${fmt(card.secondary)} units`}
      </span>
    </div>
  </button>
);

const SummaryRow: React.FC<{
  label: string;
  amount: number;
  count: number;
  color: string;
}> = ({ label, amount, count, color }) => (
  <div style={styles.summaryRow}>
    <div style={styles.summaryLeft}>
      <span style={{ ...styles.summaryDot, backgroundColor: color }} />
      <span style={styles.summaryLabel}>{label}</span>
    </div>
    <div style={styles.summaryRight}>
      <span style={styles.summaryAmount}>{fmtCurrency(amount)}</span>
      {count > 0 && <span style={styles.summaryCount}>{count}</span>}
    </div>
  </div>
);

const AgingSummaryCompact: React.FC<{
  receivables: AgingSummary;
  payables: AgingSummary;
  onNavigate: () => void;
}> = ({ receivables, payables, onNavigate }) => (
  <div style={styles.agingContainer}>
    <div style={styles.agingSection}>
      <h3 style={styles.agingTitle}>Receivables</h3>
      <AgingBar summary={receivables} color="#2563eb" />
    </div>
    <div style={styles.agingSection}>
      <h3 style={styles.agingTitle}>Payables</h3>
      <AgingBar summary={payables} color="#be185d" />
    </div>
    <button onClick={onNavigate} style={styles.agingLink}>
      View Full Aging Report →
    </button>
  </div>
);

const AgingBar: React.FC<{
  summary: AgingSummary;
  color: string;
}> = ({ summary, color }) => {
  const total = summary.grandTotal;
  if (total === 0) return <p style={styles.emptyText}>No outstanding balances</p>;

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
      <div style={styles.agingBarOuter}>
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
      <div style={styles.agingChips}>
        {segments.map(seg => (
          <span key={seg.label} style={styles.agingChip}>
            {seg.label}: {fmtCurrency(seg.value)}
          </span>
        ))}
      </div>
    </>
  );
};

const QuickAction: React.FC<{
  label: string;
  path: string;
  color: string;
  iconColor: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ label, color, iconColor, icon, onClick }) => (
  <button onClick={onClick} style={styles.actionBtn}>
    <div style={{ ...styles.actionIcon, backgroundColor: color, color: iconColor }}>
      {icon}
    </div>
    <span style={styles.actionLabel}>{label}</span>
  </button>
);

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
  periodBar: {
    marginBottom: '24px',
  },
  periodTabs: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
  },
  periodTab: {
    padding: '6px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  periodTabActive: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    borderColor: '#2563eb',
  },
  customRange: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  dateInput: {
    padding: '6px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
  },
  dateSep: {
    color: '#94a3b8',
    fontSize: '13px',
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
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  kpiCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    font: 'inherit',
  },
  kpiIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kpiContent: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  kpiLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  kpiAmount: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'monospace',
    lineHeight: '1.2',
  },
  kpiMeta: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '24px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #e2e8f0',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '16px',
  },
  viewAllBtn: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
    padding: 0,
    marginBottom: '16px',
  },
  svPurchaseGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  summaryLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  summaryDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  summaryLabel: {
    fontSize: '13px',
    color: '#475569',
  },
  summaryRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  summaryAmount: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'monospace',
  },
  summaryCount: {
    fontSize: '11px',
    color: '#94a3b8',
    backgroundColor: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: '10px',
  },
  agingContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  agingSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  agingTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
    margin: 0,
  },
  agingBarOuter: {
    display: 'flex',
    height: '8px',
    borderRadius: '4px',
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
  },
  agingChips: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  agingChip: {
    fontSize: '11px',
    color: '#64748b',
    backgroundColor: '#f8fafc',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid #e2e8f0',
  },
  agingLink: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
    padding: 0,
    textAlign: 'left',
  },
  emptyText: {
    fontSize: '13px',
    color: '#94a3b8',
    textAlign: 'center',
    padding: '16px 0',
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
    padding: '8px 10px',
    borderBottom: '1px solid #e2e8f0',
    color: '#64748b',
    fontWeight: '600',
    fontSize: '11px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '8px 10px',
    color: '#1e293b',
    whiteSpace: 'nowrap',
  },
  typeBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '500',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    font: 'inherit',
    textAlign: 'left',
    fontSize: '13px',
    color: '#475569',
  },
  actionIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionLabel: {
    fontWeight: '500',
  },
};
