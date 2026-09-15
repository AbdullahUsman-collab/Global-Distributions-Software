/**
 * Financial Reports View
 * Trial Balance, Profit & Loss, and Balance Sheet reports.
 *
 * READ-ONLY — no voucher creation, modification, posting, or deletion.
 *
 * Source of Truth:
 *   - audit/20_FINANCIAL_STATEMENTS.md
 *   - audit/04_ACCOUNTING_ENGINE.md
 *   - audit/16_CALCULATIONS.md
 */

import React, { useState, useCallback } from 'react';
import { getTrialBalance, getProfitAndLoss, getBalanceSheet } from '../../lib/api';
import {
  ReportFilterDTO,
  TrialBalanceRowDTO,
  TrialBalanceReportDTO,
  ProfitAndLossRowDTO,
  ProfitAndLossReportDTO,
  BalanceSheetRowDTO,
  BalanceSheetReportDTO,
} from '../../../domain/types/reports';

/* ─── Report Tab ────────────────────────────────────────── */

type ReportTab = 'trialBalance' | 'pnl' | 'balanceSheet';

const REPORT_TABS: { key: ReportTab; label: string }[] = [
  { key: 'trialBalance', label: 'Trial Balance' },
  { key: 'pnl', label: 'Profit & Loss' },
  { key: 'balanceSheet', label: 'Balance Sheet' },
];

/* ─── Helpers ───────────────────────────────────────────── */

const fmt = (n: number) => n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ─── Main Component ────────────────────────────────────── */

export const FinancialReportsView: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [reportTab, setReportTab] = useState<ReportTab>('trialBalance');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showZeroBalance, setShowZeroBalance] = useState(false);

  const filter: ReportFilterDTO = {
    tenantId,
    startDate: startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    endDate: endDate || new Date().toISOString().slice(0, 10),
    showZeroBalance,
  };

  return (
    <>
      {/* Filters */}
      <div className="toolbar-responsive" style={styles.toolbar}>
        <div style={styles.filterGroup}>
          <label style={styles.label}>From</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.label}>To</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            style={styles.input}
          />
        </div>
        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={showZeroBalance}
            onChange={e => setShowZeroBalance(e.target.checked)}
            style={styles.checkbox}
          />
          Show Zero Balances
        </label>
      </div>

      {/* Report Sub-Tabs */}
      <div className="tab-bar-scroll" style={styles.subTabBar}>
        {REPORT_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setReportTab(t.key)}
            className={`fin-tab ${reportTab === t.key ? 'fin-tab-active' : ''}`}
            aria-pressed={reportTab === t.key}
            style={{ ...styles.subTab, ...(reportTab === t.key ? styles.subTabActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Report Content */}
      {reportTab === 'trialBalance' && <TrialBalanceReport filter={filter} />}
      {reportTab === 'pnl' && <ProfitAndLossReport filter={filter} />}
      {reportTab === 'balanceSheet' && <BalanceSheetReport filter={filter} />}
    </>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Trial Balance Report                                        */
/* ═══════════════════════════════════════════════════════════ */

const TrialBalanceReport: React.FC<{ filter: ReportFilterDTO }> = ({ filter }) => {
  const [report, setReport] = useState<TrialBalanceReportDTO | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTrialBalance({ startDate: filter.startDate, endDate: filter.endDate, showZeroBalance: filter.showZeroBalance });
      setReport(result);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  return (
    <>
      <div className="section-header-responsive" style={styles.sectionHeader}>
        <div style={styles.statsBar}>
          {report && (
            <>
              <div style={styles.statChip}>
                <span style={{ ...styles.statDot, backgroundColor: 'var(--tone-asset-bg)', color: 'var(--fin-debit)' }}>
                  {report.rows.length}
                </span>
                <span style={styles.statLabel}>Accounts</span>
              </div>
              <div style={styles.statChip}>
                <span style={styles.statLabel}>
                  Dr Total: <strong style={{ color: 'var(--fin-debit)' }}>{fmt(report.totalClosingDebit)}</strong>
                </span>
              </div>
              <div style={styles.statChip}>
                <span style={styles.statLabel}>
                  Cr Total: <strong style={{ color: 'var(--fin-credit)' }}>{fmt(report.totalClosingCredit)}</strong>
                </span>
              </div>
              <div style={styles.statChip}>
                <span style={{
                  ...styles.statDot,
                  backgroundColor: report.isBalanced ? 'var(--st-posted-bg)' : 'var(--danger-soft)',
                  color: report.isBalanced ? 'var(--st-posted-fg)' : 'var(--danger-fg)',
                }}>
                  {report.isBalanced ? 'Balanced' : 'Unbalanced'}
                </span>
              </div>
            </>
          )}
        </div>
        <button onClick={generate} className="fin-btn-primary" style={styles.primaryBtn} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Trial Balance'}
        </button>
      </div>

      <div className="table-wrap" style={styles.card}>
        {!report ? (
          <div style={styles.empty}>Click "Generate Trial Balance" to produce the report.</div>
        ) : report.rows.length === 0 ? (
          <div style={styles.empty}>No accounts found for the selected period.</div>
        ) : (
          <>
            <div style={{ ...styles.treeHeader, minWidth: 860 }}>
              <span style={{ ...styles.col, flex: '0 0 80px' }}>Code</span>
              <span style={{ ...styles.col, flex: '1' }}>Account Name</span>
              <span style={{ ...styles.col, flex: '0 0 60px' }}>Type</span>
              <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Opening Dr</span>
              <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Opening Cr</span>
              <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Period Dr</span>
              <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Period Cr</span>
              <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Closing Dr</span>
              <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Closing Cr</span>
            </div>
            {report.rows.map(row => (
              <div key={row.accountId} style={{ ...styles.voucherRow, minWidth: 860 }}>
                <span style={{ ...styles.col, flex: '0 0 80px', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
                  {row.accountCode}
                </span>
                <span style={{ ...styles.col, flex: '1', paddingLeft: (row.level - 1) * 16 }}>
                  {row.accountName}
                </span>
                <span style={{ ...styles.col, flex: '0 0 60px', fontSize: 12, color: 'var(--text-muted)' }}>
                  {row.accountType}
                </span>
                <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: row.openingDebit > 0 ? 'var(--fin-debit)' : 'var(--fin-num-muted)' }}>
                  {row.openingDebit > 0 ? fmt(row.openingDebit) : ''}
                </span>
                <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: row.openingCredit > 0 ? 'var(--fin-credit)' : 'var(--fin-num-muted)' }}>
                  {row.openingCredit > 0 ? fmt(row.openingCredit) : ''}
                </span>
                <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: row.periodDebit > 0 ? 'var(--fin-debit)' : 'var(--fin-num-muted)' }}>
                  {row.periodDebit > 0 ? fmt(row.periodDebit) : ''}
                </span>
                <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: row.periodCredit > 0 ? 'var(--fin-credit)' : 'var(--fin-num-muted)' }}>
                  {row.periodCredit > 0 ? fmt(row.periodCredit) : ''}
                </span>
                <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 600, color: row.closingDebit > 0 ? 'var(--fin-debit)' : 'var(--fin-num-muted)' }}>
                  {row.closingDebit > 0 ? fmt(row.closingDebit) : ''}
                </span>
                <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 600, color: row.closingCredit > 0 ? 'var(--fin-credit)' : 'var(--fin-num-muted)' }}>
                  {row.closingCredit > 0 ? fmt(row.closingCredit) : ''}
                </span>
              </div>
            ))}
            {/* Totals */}
            <div style={{ ...styles.linesFooter, minWidth: 860, borderTop: '2px solid var(--border)' }}>
              <span style={{ flex: '0 0 80px', fontWeight: 600, color: 'var(--text-secondary)' }}>Total</span>
              <span style={{ flex: '1' }}></span>
              <span style={{ flex: '0 0 60px' }}></span>
              <span style={{ flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--fin-debit)' }}>{fmt(report.totalOpeningDebit)}</span>
              <span style={{ flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--fin-credit)' }}>{fmt(report.totalOpeningCredit)}</span>
              <span style={{ flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--fin-debit)' }}>{fmt(report.totalPeriodDebit)}</span>
              <span style={{ flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--fin-credit)' }}>{fmt(report.totalPeriodCredit)}</span>
              <span style={{ flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--fin-debit)' }}>{fmt(report.totalClosingDebit)}</span>
              <span style={{ flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--fin-credit)' }}>{fmt(report.totalClosingCredit)}</span>
            </div>
          </>
        )}
      </div>
    </>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Profit & Loss Report                                        */
/* ═══════════════════════════════════════════════════════════ */

const ProfitAndLossReport: React.FC<{ filter: ReportFilterDTO }> = ({ filter }) => {
  const [report, setReport] = useState<ProfitAndLossReportDTO | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getProfitAndLoss({ startDate: filter.startDate, endDate: filter.endDate, showZeroBalance: filter.showZeroBalance });
      setReport(result);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  return (
    <>
      <div className="section-header-responsive" style={styles.sectionHeader}>
        <div style={styles.statsBar}>
          {report && (
            <>
              <div style={styles.statChip}>
                <span style={styles.statLabel}>
                  Revenue: <strong style={{ color: 'var(--fin-revenue)' }}>{fmt(report.totalRevenue)}</strong>
                </span>
              </div>
              <div style={styles.statChip}>
                <span style={styles.statLabel}>
                  COGS: <strong style={{ color: 'var(--fin-cogs)' }}>{fmt(report.totalCOGS)}</strong>
                </span>
              </div>
              <div style={styles.statChip}>
                <span style={styles.statLabel}>
                  Gross Profit: <strong style={{ color: report.grossProfit >= 0 ? 'var(--fin-revenue)' : 'var(--fin-expense)' }}>{fmt(report.grossProfit)}</strong>
                </span>
              </div>
              <div style={styles.statChip}>
                <span style={styles.statLabel}>
                  Expenses: <strong style={{ color: 'var(--fin-expense)' }}>{fmt(report.totalExpenses)}</strong>
                </span>
              </div>
              <div style={styles.statChip}>
                <span style={{ ...styles.statDot, backgroundColor: report.netProfit >= 0 ? 'var(--st-posted-bg)' : 'var(--danger-soft)', color: report.netProfit >= 0 ? 'var(--st-posted-fg)' : 'var(--danger-fg)' }}>
                  Net: {fmt(report.netProfit)}
                </span>
              </div>
            </>
          )}
        </div>
        <button onClick={generate} className="fin-btn-primary" style={styles.primaryBtn} disabled={loading}>
          {loading ? 'Generating...' : 'Generate P&L'}
        </button>
      </div>

      <div className="table-wrap" style={styles.card}>
        {!report ? (
          <div style={styles.empty}>Click "Generate P&L" to produce the report.</div>
        ) : (
          <>
            {/* Revenue */}
            <SectionHeader title="Revenue" color="var(--fin-revenue)" />
            {report.revenueRows.length === 0 ? (
              <div style={{ ...styles.empty, padding: 20 }}>No revenue entries.</div>
            ) : (
              report.revenueRows.map(row => (
                <PnLRow key={row.accountId} row={row} indent={0} />
              ))
            )}
            <SubTotalRow label="Total Revenue" amount={report.totalRevenue} color="var(--fin-revenue)" />

            {/* COGS */}
            <SectionHeader title="Cost of Goods Sold" color="var(--fin-cogs)" />
            {report.cogsRows.length === 0 ? (
              <div style={{ ...styles.empty, padding: 20 }}>No COGS entries.</div>
            ) : (
              report.cogsRows.map(row => (
                <PnLRow key={row.accountId} row={row} indent={0} />
              ))
            )}
            <SubTotalRow label="Total COGS" amount={report.totalCOGS} color="var(--fin-cogs)" />

            {/* Gross Profit */}
            <div style={{ ...styles.grossProfitRow }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>Gross Profit</span>
              <span style={{ fontWeight: 700, fontFamily: 'ui-monospace, monospace', fontSize: 14, color: report.grossProfit >= 0 ? 'var(--fin-revenue)' : 'var(--fin-expense)' }}>
                {fmt(report.grossProfit)}
              </span>
            </div>

            {/* Expenses */}
            <SectionHeader title="Operating Expenses" color="var(--fin-expense)" />
            {report.expenseRows.length === 0 ? (
              <div style={{ ...styles.empty, padding: 20 }}>No expense entries.</div>
            ) : (
              report.expenseRows.map(row => (
                <PnLRow key={row.accountId} row={row} indent={0} />
              ))
            )}
            <SubTotalRow label="Total Expenses" amount={report.totalExpenses} color="var(--fin-expense)" />

            {/* Net Profit */}
            <div style={{ ...styles.netProfitRow, backgroundColor: report.netProfit >= 0 ? 'var(--tint-ok)' : 'var(--tint-bad)', borderColor: report.netProfit >= 0 ? 'var(--tint-ok-border)' : 'var(--tint-bad-border)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 15 }}>Net Profit / (Loss)</span>
              <span style={{ fontWeight: 700, fontFamily: 'ui-monospace, monospace', fontSize: 15, color: report.netProfit >= 0 ? 'var(--fin-revenue)' : 'var(--fin-expense)' }}>
                {fmt(report.netProfit)}
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
};

/* ─── P&L Sub-Components ──────────────────────────────────── */

const SectionHeader: React.FC<{ title: string; color: string }> = ({ title, color }) => (
  <div style={{ padding: '10px 16px', backgroundColor: 'var(--surface-2)', borderBottom: '2px solid var(--border)', fontSize: 13, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
    {title}
  </div>
);

const PnLRow: React.FC<{ row: ProfitAndLossRowDTO; indent: number }> = ({ row, indent }) => (
  <div className="fin-hover" style={{ ...styles.voucherRow, paddingLeft: 16 + indent * 20 }}>
    <span style={{ flex: '0 0 80px', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: 'var(--text-muted)' }}>
      {row.accountCode}
    </span>
    <span style={{ flex: '1', fontSize: 13 }}>{row.accountName}</span>
    <span style={{ flex: '0 0 120px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
      {fmt(row.amount)}
    </span>
  </div>
);

const SubTotalRow: React.FC<{ label: string; amount: number; color: string }> = ({ label, amount, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface-2)', fontSize: 13, fontWeight: 600 }}>
    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ fontFamily: 'ui-monospace, monospace', color }}>{fmt(amount)}</span>
  </div>
);

/* ═══════════════════════════════════════════════════════════ */
/* Balance Sheet Report                                        */
/* ═══════════════════════════════════════════════════════════ */

const BalanceSheetReport: React.FC<{ filter: ReportFilterDTO }> = ({ filter }) => {
  const [report, setReport] = useState<BalanceSheetReportDTO | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getBalanceSheet({ startDate: filter.startDate, endDate: filter.endDate, showZeroBalance: filter.showZeroBalance });
      setReport(result);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  return (
    <>
      <div className="section-header-responsive" style={styles.sectionHeader}>
        <div style={styles.statsBar}>
          {report && (
            <>
              <div style={styles.statChip}>
                <span style={styles.statLabel}>
                  Assets: <strong style={{ color: 'var(--fin-asset)' }}>{fmt(report.totalAssets)}</strong>
                </span>
              </div>
              <div style={styles.statChip}>
                <span style={styles.statLabel}>
                  Liabilities: <strong style={{ color: 'var(--fin-liability)' }}>{fmt(report.totalLiabilities)}</strong>
                </span>
              </div>
              <div style={styles.statChip}>
                <span style={styles.statLabel}>
                  Equity: <strong style={{ color: 'var(--fin-equity)' }}>{fmt(report.totalEquity)}</strong>
                </span>
              </div>
              <div style={styles.statChip}>
                <span style={{ ...styles.statDot, backgroundColor: report.isBalanced ? 'var(--st-posted-bg)' : 'var(--danger-soft)', color: report.isBalanced ? 'var(--st-posted-fg)' : 'var(--danger-fg)' }}>
                  {report.isBalanced ? 'Balanced' : 'Unbalanced'}
                </span>
              </div>
            </>
          )}
        </div>
        <button onClick={generate} className="fin-btn-primary" style={styles.primaryBtn} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Balance Sheet'}
        </button>
      </div>

      <div className="table-wrap" style={styles.card}>
        {!report ? (
          <div style={styles.empty}>Click "Generate Balance Sheet" to produce the report.</div>
        ) : (
          <>
            {/* Assets */}
            <SectionHeader title="Assets" color="var(--fin-asset)" />
            {report.assetRows.length === 0 ? (
              <div style={{ ...styles.empty, padding: 20 }}>No asset entries.</div>
            ) : (
              report.assetRows.map(row => (
                <BSRow key={row.accountId} row={row} indent={0} />
              ))
            )}
            <SubTotalRow label="Total Assets" amount={report.totalAssets} color="var(--fin-asset)" />

            {/* Liabilities */}
            <SectionHeader title="Liabilities" color="var(--fin-liability)" />
            {report.liabilityRows.length === 0 ? (
              <div style={{ ...styles.empty, padding: 20 }}>No liability entries.</div>
            ) : (
              report.liabilityRows.map(row => (
                <BSRow key={row.accountId} row={row} indent={0} />
              ))
            )}
            <SubTotalRow label="Total Liabilities" amount={report.totalLiabilities} color="var(--fin-liability)" />

            {/* Equity */}
            <SectionHeader title="Equity" color="var(--fin-equity)" />
            {report.equityRows.length === 0 ? (
              <div style={{ ...styles.empty, padding: 20 }}>No equity entries.</div>
            ) : (
              report.equityRows.map(row => (
                <BSRow key={row.accountId} row={row} indent={0} />
              ))
            )}
            <SubTotalRow label="Total Equity" amount={report.totalEquity} color="var(--fin-equity)" />

            {/* Summary */}
            <div style={{ ...styles.netProfitRow, backgroundColor: report.isBalanced ? 'var(--tint-ok)' : 'var(--tint-bad)', borderColor: report.isBalanced ? 'var(--tint-ok-border)' : 'var(--tint-bad-border)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>Liabilities + Equity</span>
              <span style={{ fontWeight: 700, fontFamily: 'ui-monospace, monospace', fontSize: 14, color: 'var(--text-primary)' }}>
                {fmt(report.totalLiabilities + report.totalEquity)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
              {report.isBalanced
                ? '✓ Balance Sheet is balanced (Assets = Liabilities + Equity)'
                : '✕ Balance Sheet is NOT balanced — please review ledger entries'}
            </div>
          </>
        )}
      </div>
    </>
  );
};

/* ─── Balance Sheet Sub-Components ────────────────────────── */

const BSRow: React.FC<{ row: BalanceSheetRowDTO; indent: number }> = ({ row, indent }) => (
  <div className="fin-hover" style={{ ...styles.voucherRow, paddingLeft: 16 + indent * 20 }}>
    <span style={{ flex: '0 0 80px', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: 'var(--text-muted)' }}>
      {row.accountCode}
    </span>
    <span style={{ flex: '1', fontSize: 13 }}>{row.accountName}</span>
    <span style={{ flex: '0 0 120px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
      {fmt(row.amount)}
    </span>
  </div>
);

/* ─── Styles ────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  toolbar: { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' },
  input: { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, outline: 'none', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' },
  checkbox: { width: 16, height: 16, accentColor: 'var(--accent)' },

  subTabBar: { display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', marginBottom: 16 },
  subTab: { padding: '8px 16px', background: 'none', border: 'none', borderBottom: '2px solid transparent', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer', marginBottom: -2 },
  subTabActive: { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },

  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statsBar: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  statChip: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' },
  statDot: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '2px 8px', borderRadius: 6, fontWeight: 600, fontSize: 12 },
  statLabel: {},

  primaryBtn: { padding: '10px 20px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },

  card: { backgroundColor: 'var(--dash-card)', borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  treeHeader: { display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '2px solid var(--border)', backgroundColor: 'var(--dash-table-head-bg)', fontSize: 12, fontWeight: 600, color: 'var(--dash-table-head-fg)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  row: { display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid var(--dash-table-row-border)', fontSize: 14, transition: 'background 0.1s' },
  col: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  voucherRow: { display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid var(--dash-table-row-border)', fontSize: 14 },
  linesFooter: { display: 'flex', padding: '8px 16px', borderTop: '2px solid var(--border)', backgroundColor: 'var(--surface-2)', fontSize: 13 },

  empty: { padding: 40, textAlign: 'center' as const, color: 'var(--text-disabled)', fontSize: 14 },

  grossProfitRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '2px solid var(--border)', backgroundColor: 'var(--tint-ok)', borderBottom: '2px solid var(--border)' },
  netProfitRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '2px solid var(--border)', borderBottom: '1px solid var(--border)' },
};
