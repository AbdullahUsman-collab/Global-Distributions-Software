/**
 * Finance Module — Chart of Accounts, Vouchers, General Ledger
 * Interactive 4-level COA tree, voucher entry with line items, and ledger viewer.
 *
 * Source of Truth: audit/04_ACCOUNTING_ENGINE.md, audit/23_DATA_MODEL.md
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';
import { services } from '../services';
import { getAccounts, createAccount, updateAccount, deleteAccount, getAccountLedger, getProducts } from '../lib/api';
import {
  AccountHead,
  AccountType,
  AccountLevel,
  ControlCategory,
  CreateAccountHeadDTO,
  ACCOUNT_TYPE_LABELS,
  CONTROL_CATEGORY_LABELS,
} from '../../domain/types/coa';
import {
  VoucherHeader,
  VoucherLine,
  VoucherType,
  VoucherStatus,
  LedgerEntry,
  CreateVoucherDTO,
  UpdateVoucherDTO,
  VOUCHER_TYPE_LABELS,
  VOUCHER_STATUS_LABELS,
  totalDebit,
  totalCredit,
  isBalanced,
} from '../../domain/types/voucher';
import { printWindow, generateCsv, downloadFile, generateExportFilename } from '../utils/export';
import {
  Product,
  calculateBillLineTax,
  calculateCOGS,
  calculateGrossProfit,
  BillLineTaxInput,
  BillLineTaxResult,
} from '../../domain/types/inventory';
import { FinancialReportsView } from '../components/finance/FinancialReportsView';

/* ─── Tab Definition ───────────────────────────────────────── */

type FinanceTab = 'coa' | 'vouchers' | 'ledger' | 'reports';

const TABS: { key: FinanceTab; label: string }[] = [
  { key: 'coa',      label: 'Chart of Accounts' },
  { key: 'vouchers', label: 'Vouchers' },
  { key: 'ledger',   label: 'General Ledger' },
  { key: 'reports',  label: 'Reports' },
];

/* ─── Constants ────────────────────────────────────────────── */

const ACCOUNT_TYPES: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE'];
type UpdateAccountDTO = {
  accountName?: string; isActive?: boolean; controlCategory?: ControlCategory | null;
  address?: string; ownerName?: string; phone?: string; stn?: string; ntn?: string; cnic?: string;
};

const LEVEL_COLORS: Record<AccountLevel, string> = { 1: '#1e293b', 2: '#334155', 3: '#475569', 4: '#64748b' };
const TYPE_BADGE_COLORS: Record<AccountType, { bg: string; fg: string }> = {
  ASSET:     { bg: '#dbeafe', fg: '#1d4ed8' },
  LIABILITY: { bg: '#fce7f3', fg: '#be185d' },
  EQUITY:    { bg: '#f3e8ff', fg: '#7c3aed' },
  REVENUE:   { bg: '#dcfce7', fg: '#15803d' },
  COGS:      { bg: '#fef3c7', fg: '#b45309' },
  EXPENSE:   { bg: '#fee2e2', fg: '#dc2626' },
};

const VOUCHER_TYPE_COLORS: Record<VoucherType, { bg: string; fg: string }> = {
  JV:  { bg: '#e0e7ff', fg: '#4338ca' },
  CV:  { bg: '#fef3c7', fg: '#b45309' },
  CP:  { bg: '#fce7f3', fg: '#be185d' },
  CR:  { bg: '#dcfce7', fg: '#15803d' },
  PV:  { bg: '#e0e7ff', fg: '#4338ca' },
  SV:  { bg: '#dbeafe', fg: '#1d4ed8' },
  SRV: { bg: '#fee2e2', fg: '#991b1b' },
  PRV: { bg: '#fef3c7', fg: '#b45309' },
  CPV: { bg: '#fce7f3', fg: '#be185d' },
  CRV: { bg: '#dcfce7', fg: '#15803d' },
  BPV: { bg: '#fef3c7', fg: '#b45309' },
  BRV: { bg: '#dbeafe', fg: '#1d4ed8' },
};

const VOUCHER_STATUS_COLORS: Record<VoucherStatus, { bg: string; fg: string }> = {
  DRAFT:  { bg: '#fef3c7', fg: '#92400e' },
  POSTED: { bg: '#dcfce7', fg: '#166534' },
};

const fmt = (n: number) => n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ═══════════════════════════════════════════════════════════ */
/* Main Finance Component                                     */
/* ═══════════════════════════════════════════════════════════ */

export const Finance: React.FC = () => {
  const { tenant, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { tab?: FinanceTab; accountId?: string } | null;
  const [tab, setTab] = useState<FinanceTab>(state?.tab ?? 'coa');

  return (
    <div className="page-pad finance-page" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>← Dashboard</button>
          <h1 style={styles.title}>Finance</h1>
          <p style={styles.subtitle}>{tenant.brandName}</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar-scroll" style={styles.tabBar}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{ ...styles.tab, ...(tab === t.key ? styles.tabActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'coa'      && <COATab tenantId={tenant.id} />}
      {tab === 'vouchers' && <VouchersTab tenantId={tenant.id} user={user.username} />}
      {tab === 'ledger'   && <LedgerTab tenantId={tenant.id} initialAccountId={state?.accountId} />}
      {tab === 'reports'  && <FinancialReportsView tenantId={tenant.id} />}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Tab: Chart of Accounts                                     */
/* ═══════════════════════════════════════════════════════════ */

const COATab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [accounts, setAccounts] = useState<AccountHead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AccountType | ''>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [editAccount, setEditAccount] = useState<AccountHead | null>(null);
  const [createParent, setCreateParent] = useState<AccountHead | null>(null);
  const [metaExpanded, setMetaExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAccounts();
      setAccounts(data);
      setExpanded(new Set(data.filter(a => a.level === 1).map(a => a.id)));
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const tree = useMemo(() => {
    const byId = new Map(accounts.map(a => [a.id, a]));
    const children = new Map<string | null, AccountHead[]>();
    for (const a of accounts) {
      const list = children.get(a.parentId) ?? [];
      list.push(a);
      children.set(a.parentId, list);
    }
    for (const list of children.values()) {
      list.sort((x, y) => x.accountCode.localeCompare(y.accountCode));
    }
    return { byId, children };
  }, [accounts]);

  const visibleIds = useMemo(() => {
    const result = new Set<string>();
    const q = search.toLowerCase().trim();

    function matches(a: AccountHead): boolean {
      const matchesSearch = !q || a.accountName.toLowerCase().includes(q) || a.accountCode.includes(q);
      const matchesType = !typeFilter || a.accountType === typeFilter;
      return matchesSearch && matchesType;
    }

    if (!q && !typeFilter) {
      for (const a of accounts) {
        let current: AccountHead | null = a;
        let visible = true;
        while (current?.parentId) {
          if (!expanded.has(current.parentId)) { visible = false; break; }
          current = tree.byId.get(current.parentId) ?? null;
        }
        if (visible) result.add(a.id);
      }
      return result;
    }

    for (const a of accounts) {
      if (matches(a)) {
        result.add(a.id);
        let cur: AccountHead | null = a;
        while (cur?.parentId) {
          result.add(cur.parentId);
          cur = tree.byId.get(cur.parentId) ?? null;
        }
      }
    }
    return result;
  }, [accounts, search, typeFilter, expanded, tree]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleMeta = (id: string) => {
    setMetaExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCreate = async (dto: CreateAccountHeadDTO) => {
    await createAccount(dto);
    setShowCreate(false);
    setCreateParent(null);
    await load();
  };

  const handleUpdate = async (id: string, dto: UpdateAccountDTO) => {
    await updateAccount(id, dto);
    setEditAccount(null);
    await load();
  };

  const handleDeactivate = async (id: string) => {
    await deleteAccount(id);
    setEditAccount(null);
    await load();
  };

  const stats = useMemo(() => {
    const byType: Record<AccountType, number> = { ASSET: 0, LIABILITY: 0, EQUITY: 0, REVENUE: 0, COGS: 0, EXPENSE: 0 };
    let posting = 0;
    for (const a of accounts) { byType[a.accountType]++; if (a.isPosting) posting++; }
    return { byType, total: accounts.length, posting };
  }, [accounts]);

  return (
    <>
      <div className="section-header-responsive" style={styles.sectionHeader}>
        <div style={styles.statsBar}>
          {ACCOUNT_TYPES.map(t => (
            <div key={t} style={styles.statChip}>
              <span style={{ ...styles.statDot, backgroundColor: TYPE_BADGE_COLORS[t].bg, color: TYPE_BADGE_COLORS[t].fg }}>
                {stats.byType[t]}
              </span>
              <span style={styles.statLabel}>{ACCOUNT_TYPE_LABELS[t]}</span>
            </div>
          ))}
        </div>
        <button onClick={() => { setCreateParent(null); setShowCreate(true); }} style={styles.primaryBtn}>
          + New Account
        </button>
      </div>

      <div className="toolbar-responsive" style={styles.toolbar}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or code..." style={styles.searchInput} />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as AccountType | '')} style={styles.filterSelect}>
          <option value="">All Types</option>
          {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>)}
        </select>
        <button onClick={() => setExpanded(new Set(accounts.map(a => a.id)))} style={styles.toolBtn}>Expand All</button>
        <button onClick={() => setExpanded(new Set())} style={styles.toolBtn}>Collapse All</button>
      </div>

      <div className="table-wrap" style={styles.card}>
        {loading ? (
          <div style={{ padding: 24 }}>
            <div className="skeleton" style={{ width: 200, height: 20, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '100%', height: 300 }} />
          </div>
        ) : (
          <>
            <div style={styles.treeHeader}>
              <span style={{ ...styles.col, flex: '0 0 40px' }}></span>
              <span style={{ ...styles.col, flex: '0 0 80px' }}>Code</span>
              <span style={{ ...styles.col, flex: '1' }}>Account Name</span>
              <span style={{ ...styles.col, flex: '0 0 100px' }}>Level</span>
              <span style={{ ...styles.col, flex: '0 0 120px' }}>Type</span>
              <span style={{ ...styles.col, flex: '0 0 70px' }}>Balance</span>
              <span style={{ ...styles.col, flex: '0 0 70px' }}>Status</span>
              <span style={{ ...styles.col, flex: '0 0 80px' }}>Actions</span>
            </div>
            {accounts.filter(a => visibleIds.has(a.id)).map(a => (
              <AccountRow
                key={a.id}
                account={a}
                depth={a.level - 1}
                expanded={expanded.has(a.id)}
                hasChildren={(tree.children.get(a.id) ?? []).length > 0}
                metaExpanded={metaExpanded.has(a.id)}
                onToggle={() => toggleExpand(a.id)}
                onToggleMeta={() => toggleMeta(a.id)}
                onEdit={() => setEditAccount(a)}
                onAddChild={() => { setCreateParent(a); setShowCreate(true); }}
              />
            ))}
            {accounts.filter(a => visibleIds.has(a.id)).length === 0 && (
              <div style={styles.empty}>No accounts match your search.</div>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <CreateAccountModal
          parent={createParent}
          allAccounts={accounts}
          onClose={() => { setShowCreate(false); setCreateParent(null); }}
          onCreate={handleCreate}
        />
      )}
      {editAccount && (
        <EditAccountModal
          account={editAccount}
          onClose={() => setEditAccount(null)}
          onSave={handleUpdate}
          onDeactivate={handleDeactivate}
        />
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Tab: Vouchers                                              */
/* ═══════════════════════════════════════════════════════════ */

const VouchersTab: React.FC<{ tenantId: string; user: string }> = ({ tenantId, user }) => {
  const [vouchers, setVouchers] = useState<VoucherHeader[]>([]);
  const [accounts, setAccounts] = useState<AccountHead[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<VoucherType | ''>('');
  const [statusFilter, setStatusFilter] = useState<VoucherStatus | ''>('');
  const [showCreate, setShowCreate] = useState(false);
  const [editVoucher, setEditVoucher] = useState<VoucherHeader | null>(null);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [v, a] = await Promise.all([
        services.voucherRepository.getVouchersByTenantId(tenantId, {
          voucherType: typeFilter || undefined,
          status: statusFilter || undefined,
        }),
        getAccounts(),
      ]);
      setVouchers(v.sort((a, b) => b.voucherNumber - a.voucherNumber));
      setAccounts(a);
    } finally {
      setLoading(false);
    }
  }, [tenantId, typeFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const accountMap = useMemo(() => {
    const m = new Map<string, AccountHead>();
    for (const a of accounts) m.set(a.accountCode, a);
    return m;
  }, [accounts]);

  const postingAccounts = useMemo(() => accounts.filter(a => a.isPosting), [accounts]);

  const handlePost = async (id: string) => {
    if (!confirm('Post this voucher? It will become immutable and cannot be edited or deleted.')) return;
    try {
      await services.voucherRepository.postVoucher(tenantId, id);
      await load();
    } catch (err: any) {
      alert(err.message || 'Failed to post voucher. Ensure the voucher is balanced (Debit = Credit).');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft voucher? This cannot be undone.')) return;
    try {
      await services.voucherRepository.deleteVoucher(tenantId, id);
      await load();
    } catch (err) {
      console.error('Failed to delete voucher:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete voucher');
    }
  };

  const toggleLines = (id: string) => {
    setExpandedLines(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCreate = async (dto: CreateVoucherDTO) => {
    await services.voucherRepository.createVoucher(tenantId, dto, user);
    setShowCreate(false);
    await load();
  };

  const handleUpdate = async (id: string, dto: UpdateVoucherDTO) => {
    await services.voucherRepository.updateVoucher(tenantId, id, dto);
    setEditVoucher(null);
    await load();
  };

  const stats = useMemo(() => {
    let draft = 0, posted = 0;
    for (const v of vouchers) {
      if (v.status === 'DRAFT') draft++; else posted++;
    }
    return { total: vouchers.length, draft, posted };
  }, [vouchers]);

  return (
    <>
      <div className="section-header-responsive" style={styles.sectionHeader}>
        <div style={styles.statsBar}>
          <div style={styles.statChip}>
            <span style={{ ...styles.statDot, backgroundColor: '#f1f5f9', color: '#475569' }}>{stats.total}</span>
            <span style={styles.statLabel}>Total</span>
          </div>
          <div style={styles.statChip}>
            <span style={{ ...styles.statDot, backgroundColor: VOUCHER_STATUS_COLORS.DRAFT.bg, color: VOUCHER_STATUS_COLORS.DRAFT.fg }}>{stats.draft}</span>
            <span style={styles.statLabel}>Draft</span>
          </div>
          <div style={styles.statChip}>
            <span style={{ ...styles.statDot, backgroundColor: VOUCHER_STATUS_COLORS.POSTED.bg, color: VOUCHER_STATUS_COLORS.POSTED.fg }}>{stats.posted}</span>
            <span style={styles.statLabel}>Posted</span>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} style={styles.primaryBtn}>+ New Journal Voucher</button>
      </div>

      <div className="toolbar-responsive" style={styles.toolbar}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as VoucherType | '')} style={styles.filterSelect}>
          <option value="">All Types</option>
          {(Object.keys(VOUCHER_TYPE_LABELS) as VoucherType[]).map(t => (
            <option key={t} value={t}>{VOUCHER_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as VoucherStatus | '')} style={styles.filterSelect}>
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="POSTED">Posted</option>
        </select>
      </div>

      <div className="table-wrap" style={styles.card}>
        {loading ? (
          <div style={{ padding: 24 }}>
            <div className="skeleton" style={{ width: '100%', height: 300 }} />
          </div>
        ) : (
          <>
            <div style={styles.treeHeader}>
              <span style={{ ...styles.col, flex: '0 0 60px' }}>#</span>
              <span style={{ ...styles.col, flex: '0 0 110px' }}>Type</span>
              <span style={{ ...styles.col, flex: '0 0 110px' }}>Date</span>
              <span style={{ ...styles.col, flex: '1' }}>Narration</span>
              <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Debit</span>
              <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Credit</span>
              <span style={{ ...styles.col, flex: '0 0 80px' }}>Status</span>
              <span style={{ ...styles.col, flex: '0 0 120px' }}>Actions</span>
            </div>
            {vouchers.length === 0 && <div style={styles.empty}>No vouchers found.</div>}
            {vouchers.map(v => (
              <VoucherRow
                key={v.id}
                voucher={v}
                tenantId={tenantId}
                accountMap={accountMap}
                expanded={expandedLines.has(v.id)}
                onToggleLines={() => toggleLines(v.id)}
                onEdit={() => setEditVoucher(v)}
                onPost={() => handlePost(v.id)}
                onDelete={() => handleDelete(v.id)}
                onNavigate={(id) => navigate('/bills/' + id)}
              />
            ))}
          </>
        )}
      </div>

      {showCreate && (
        <VoucherModal
          tenantId={tenantId}
          postingAccounts={postingAccounts}
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}
      {editVoucher && (
        <VoucherModal
          tenantId={tenantId}
          postingAccounts={postingAccounts}
          voucher={editVoucher}
          onClose={() => setEditVoucher(null)}
          onSave={(dto) => handleUpdate(editVoucher.id, dto)}
        />
      )}
    </>
  );
};

/* ─── Voucher Row ──────────────────────────────────────────── */

const VoucherRow: React.FC<{
  voucher: VoucherHeader;
  tenantId: string;
  accountMap: Map<string, AccountHead>;
  expanded: boolean;
  onToggleLines: () => void;
  onEdit: () => void;
  onPost: () => void;
  onDelete: () => void;
  onNavigate: (id: string) => void;
}> = ({ voucher: v, tenantId, accountMap, expanded, onToggleLines, onEdit, onPost, onDelete, onNavigate }) => {
  const [lines, setLines] = useState<VoucherLine[]>([]);

  useEffect(() => {
    if (expanded && lines.length === 0) {
      services.voucherRepository.getVoucherLines(tenantId, v.id).then(raw => setLines(raw ?? []));
    }
  }, [expanded, v.id, tenantId, lines.length]);

  const typeBadge = VOUCHER_TYPE_COLORS[v.voucherType] ?? { bg: '#f1f5f9', fg: '#475569' };
  const statusBadge = VOUCHER_STATUS_COLORS[v.status] ?? { bg: '#f1f5f9', fg: '#475569' };
  const totalD = totalDebit(lines.length > 0 ? lines : []);
  const totalC = totalCredit(lines.length > 0 ? lines : []);

  return (
    <>
      <div style={styles.voucherRow}>
        <span style={{ ...styles.col, flex: '0 0 60px', fontFamily: 'ui-monospace, monospace' }}>
          <button onClick={onToggleLines} style={styles.expandBtn}>{expanded ? '▼' : '▶'}</button>
          <button onClick={() => onNavigate(v.id)} style={{ ...styles.linkBtn, padding: 0, fontSize: 13 }}>{v.voucherNumber}</button>
        </span>
        <span style={{ ...styles.col, flex: '0 0 110px' }}>
          <span style={{ ...styles.typeBadge, backgroundColor: typeBadge.bg, color: typeBadge.fg }}>
            {v.voucherType}
          </span>
        </span>
        <span style={{ ...styles.col, flex: '0 0 110px', fontSize: 13 }}>{v.date}</span>
        <span style={{ ...styles.col, flex: '1' }}>{v.narration}</span>
        <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
          {lines.length > 0 ? fmt(totalD) : '—'}
        </span>
        <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
          {lines.length > 0 ? fmt(totalC) : '—'}
        </span>
        <span style={{ ...styles.col, flex: '0 0 80px' }}>
          <span style={{ ...styles.typeBadge, backgroundColor: statusBadge.bg, color: statusBadge.fg }}>
            {v.status}
          </span>
        </span>
        <span style={{ ...styles.col, flex: '0 0 120px', gap: 4 }}>
          {v.status === 'DRAFT' && (
            <>
              <button onClick={onEdit} style={styles.rowBtn} title="Edit Draft">✎</button>
              <button onClick={onPost} style={{ ...styles.rowBtn, color: '#16a34a', borderColor: '#bbf7d0' }} title="Post Voucher (requires balanced)">✓</button>
              <button onClick={onDelete} style={{ ...styles.rowBtn, color: '#dc2626', borderColor: '#fecaca' }} title="Delete Draft">✕</button>
            </>
          )}
          {v.status === 'POSTED' && (
            <span style={{ fontSize: 11, color: '#166534', fontStyle: 'italic' }}>Posted</span>
          )}
        </span>
      </div>
      {expanded && lines.length > 0 && (
        <div style={styles.linesContainer}>
            <div style={styles.linesHeader}>
            <span style={{ ...styles.col, flex: '0 0 40px' }}>Ln</span>
            <span style={{ ...styles.col, flex: '0 0 80px' }}>Acct</span>
            <span style={{ ...styles.col, flex: '1' }}>Description</span>
            {v.voucherType === 'SV' || v.voucherType === 'SRV' || v.voucherType === 'PRV' ? (
              <>
                <span style={{ ...styles.col, flex: '0 0 60px', textAlign: 'right' }}>Qty</span>
                <span style={{ ...styles.col, flex: '0 0 70px' }}>Branch</span>
              </>
            ) : null}
            <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Debit</span>
            <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Credit</span>
          </div>
          {lines.map((l, i) => {
            const acct = accountMap.get(l.accountId);
            const contraAcct = l.contraAccountId ? accountMap.get(l.contraAccountId) : null;
            return (
              <div key={l.id} style={styles.lineRow}>
                <span style={{ ...styles.col, flex: '0 0 40px', fontSize: 12, color: '#94a3b8' }}>{i + 1}</span>
                <span style={{ ...styles.col, flex: '0 0 80px', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{l.accountId}</span>
                <span style={{ ...styles.col, flex: '1', fontSize: 13 }}>
                  {l.description}
                  {acct && <span style={{ color: '#94a3b8', marginLeft: 8 }}>({acct.accountName})</span>}
                  {contraAcct && <span style={{ color: '#94a3b8', marginLeft: 4, fontSize: 11 }}>↔ {l.contraAccountId} {contraAcct.accountName}</span>}
                </span>
                {v.voucherType === 'SV' || v.voucherType === 'SRV' || v.voucherType === 'PRV' ? (
                  <>
                    <span style={{ ...styles.col, flex: '0 0 60px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{l.quantity ?? ''}</span>
                    <span style={{ ...styles.col, flex: '0 0 70px', fontSize: 12, color: '#94a3b8' }}>{l.branch ?? ''}</span>
                  </>
                ) : null}
                <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: l.debit > 0 ? '#1d4ed8' : '#94a3b8' }}>
                  {l.debit > 0 ? fmt(l.debit) : ''}
                </span>
                <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: l.credit > 0 ? '#be185d' : '#94a3b8' }}>
                  {l.credit > 0 ? fmt(l.credit) : ''}
                </span>
              </div>
            );
          })}
          <div style={styles.linesFooter}>
            <span style={{ flex: '0 0 120px' }}></span>
            <span style={{ flex: '1', fontSize: 12, fontWeight: 600, color: '#475569' }}>Totals</span>
            <span style={{ flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: '#1d4ed8' }}>{fmt(totalD)}</span>
            <span style={{ flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: '#be185d' }}>{fmt(totalC)}</span>
          </div>
        </div>
      )}
    </>
  );
};

/* ─── Voucher Create/Edit Modal ────────────────────────────── */

const VoucherModal: React.FC<{
  tenantId: string;
  postingAccounts: AccountHead[];
  voucher?: VoucherHeader;
  onClose: () => void;
  onSave: (dto: CreateVoucherDTO) => void;
}> = ({ tenantId, postingAccounts, voucher, onClose, onSave }) => {
  const isEdit = !!voucher;
  const [vType, setVType] = useState<VoucherType>(voucher?.voucherType ?? 'JV');
  const [date, setDate] = useState(voucher?.date ?? new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState(voucher?.narration ?? '');
  type VoucherLineInput = {
    accountId: string; description: string; debit: number; credit: number;
    contraAccountId?: string; quantity?: number; productId?: string; branch?: string;
    stInvNo?: string; stRate?: number; stAmount?: number; amtExclStd?: number;
  };
  const [lines, setLines] = useState<VoucherLineInput[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [taxResults, setTaxResults] = useState<Record<number, BillLineTaxResult & { cogs: number; grossProfit: number }>>({});
  const isProductType = vType === 'SV' || vType === 'SRV' || vType === 'PRV';

  // Load existing lines for edit mode + products
  useEffect(() => {
    if (isEdit && voucher) {
      services.voucherRepository.getVoucherLines(tenantId, voucher.id).then(raw => {
        setLines((raw ?? []).map(l => ({
          accountId: l.accountId, description: l.description, debit: l.debit, credit: l.credit,
          contraAccountId: l.contraAccountId, quantity: l.quantity, productId: l.productId, branch: l.branch,
          stInvNo: l.stInvNo, stRate: l.stRate, stAmount: l.stAmount, amtExclStd: l.amtExclStd,
        })));
        setLoading(false);
      });
    }
    getProducts().then(setProducts);
  }, [isEdit, voucher, tenantId]);

  // Filtered accounts for search dropdown
  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return postingAccounts.slice(0, 10);
    const q = accountSearch.toLowerCase();
    return postingAccounts.filter(a =>
      a.accountCode.includes(q) || a.accountName.toLowerCase().includes(q)
    ).slice(0, 15);
  }, [postingAccounts, accountSearch]);

  const addLine = () => {
    setLines(prev => [...prev, { accountId: '', description: '', debit: 0, credit: 0, contraAccountId: '', quantity: 0, productId: '', branch: '', stInvNo: '', stRate: 0, stAmount: 0, amtExclStd: 0 }]);
  };

  const updateLine = (idx: number, field: string, value: string | number) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const removeLine = (idx: number) => {
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  const dTotal = totalDebit(lines);
  const cTotal = totalCredit(lines);
  const balanced = isBalanced(lines);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (lines.length < 2) { setError('At least 2 lines are required.'); return; }
    const invalid = lines.find(l => !l.accountId);
    if (invalid) { setError('All lines must have an account selected.'); return; }
    setSaving(true);
    try {
      await onSave({
        voucherType: vType, date, narration,
        lines: lines.map(l => ({
          accountId: l.accountId, description: l.description, debit: l.debit, credit: l.credit,
          contraAccountId: l.contraAccountId || undefined,
          quantity: l.quantity || undefined,
          productId: l.productId || undefined,
          branch: l.branch || undefined,
          stInvNo: l.stInvNo || undefined,
          stRate: l.stRate || undefined,
          stAmount: l.stAmount || undefined,
          amtExclStd: l.amtExclStd || undefined,
        })),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save voucher.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={e => e.stopPropagation()}>
          <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div className="responsive-modal" style={{ ...styles.modal, maxWidth: 800 }} onClick={e => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>{isEdit ? 'Edit Draft' : 'New Journal Voucher'}</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="responsive-form-row" style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Voucher Type</label>
              <select value={vType} onChange={e => setVType(e.target.value as VoucherType)} style={styles.select} disabled={isEdit}>
                {(['JV', 'CV', 'PV', 'CP', 'CR'] as VoucherType[]).map(t => (
                  <option key={t} value={t}>{VOUCHER_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={styles.input} />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Narration</label>
            <input value={narration} onChange={e => setNarration(e.target.value)} style={styles.input} placeholder="Header narration..." />
          </div>

          {/* Lines */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={styles.label}>Line Items</label>
              <button type="button" onClick={addLine} style={{ ...styles.toolBtn, fontSize: 12 }}>+ Add Line</button>
            </div>

            {lines.length === 0 && (
              <div style={{ ...styles.empty, padding: 20 }}>No lines added. Click "+ Add Line" to start.</div>
            )}

            {lines.map((line, idx) => (
              <div key={idx} style={{ ...styles.lineItemRow, flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
                  <div style={{ flex: '0 0 180px' }}>
                    <AccountSelect
                      accounts={postingAccounts}
                      value={line.accountId}
                      onChange={accountId => updateLine(idx, 'accountId', accountId)}
                      search={accountSearch}
                      onSearchChange={setAccountSearch}
                      filtered={filteredAccounts}
                    />
                  </div>
                  <div style={{ flex: '1' }}>
                    <input
                      value={line.description}
                      onChange={e => updateLine(idx, 'description', e.target.value)}
                      style={styles.input}
                      placeholder="Description..."
                    />
                  </div>
                  <div style={{ flex: '0 0 110px' }}>
                    <input
                      type="number" min={0} step={0.01}
                      value={line.debit || ''}
                      onChange={e => updateLine(idx, 'debit', parseFloat(e.target.value) || 0)}
                      style={{ ...styles.input, textAlign: 'right', color: line.debit > 0 ? '#1d4ed8' : undefined }}
                      placeholder="0.00"
                    />
                  </div>
                  <div style={{ flex: '0 0 110px' }}>
                    <input
                      type="number" min={0} step={0.01}
                      value={line.credit || ''}
                      onChange={e => updateLine(idx, 'credit', parseFloat(e.target.value) || 0)}
                      style={{ ...styles.input, textAlign: 'right', color: line.credit > 0 ? '#be185d' : undefined }}
                      placeholder="0.00"
                    />
                  </div>
                  <button type="button" onClick={() => removeLine(idx)} style={{ ...styles.rowBtn, color: '#dc2626', borderColor: '#fecaca', flex: '0 0 32px' }}>✕</button>
                </div>
                {/* Extended fields row: contraAccountId for all types; productId/quantity/branch for SV/SRV/PRV */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%', paddingLeft: 4 }}>
                  <div style={{ flex: '0 0 180px' }}>
                    <label style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2, display: 'block' }}>Contra Account</label>
                    <AccountSelect
                      accounts={postingAccounts}
                      value={line.contraAccountId || ''}
                      onChange={v => updateLine(idx, 'contraAccountId', v)}
                      search={accountSearch}
                      onSearchChange={setAccountSearch}
                      filtered={filteredAccounts}
                    />
                  </div>
                  {isProductType && (
                    <>
                      <div style={{ flex: '0 0 160px' }}>
                        <label style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2, display: 'block' }}>Product</label>
                        <select value={line.productId || ''} onChange={e => {
                          const pid = e.target.value;
                          updateLine(idx, 'productId', pid);
                          const prod = products.find(p => p.id === pid);
                          if (prod) updateLine(idx, 'description', prod.name);
                        }} style={{ ...styles.select, fontSize: 12, padding: '4px 6px' }}>
                          <option value="">— Select —</option>
                          {products.filter(p => p.isActive).map(p => (
                            <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: '0 0 80px' }}>
                        <label style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2, display: 'block' }}>Qty</label>
                        <input type="number" min={0} step={1}
                          value={line.quantity || ''}
                          onChange={e => updateLine(idx, 'quantity', parseInt(e.target.value) || 0)}
                          style={{ ...styles.input, fontSize: 12, padding: '4px 6px', textAlign: 'right' }}
                          placeholder="0"
                        />
                      </div>
                      <div style={{ flex: '0 0 80px' }}>
                        <label style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2, display: 'block' }}>Branch</label>
                        <input value={line.branch || ''}
                          onChange={e => updateLine(idx, 'branch', e.target.value)}
                          style={{ ...styles.input, fontSize: 12, padding: '4px 6px' }}
                          placeholder="WH-01"
                        />
                      </div>
                    </>
                  )}
                  {line.productId && (
                    <div style={{ flex: '0 0 70px', alignSelf: 'flex-end' }}>
                      <button type="button" onClick={() => {
                        const prod = products.find(p => p.id === line.productId);
                        if (!prod || !line.quantity) return;
                        const input: BillLineTaxInput = {
                          quantity: line.quantity,
                          rate: vType === 'PRV' ? prod.purchaseRate : prod.saleRate,
                          tradeDiscountPercent: prod.tradeDiscount,
                          gstPercent: prod.gstPercent,
                          furtherTaxPercent: 0,
                          fedPercent: prod.fedPercent,
                          advanceTaxPercent: vType === 'PRV' ? prod.advanceTaxPurchasePercent : prod.advanceTaxSalePercent,
                        };
                        const result = calculateBillLineTax(input);
                        const cogs = calculateCOGS(line.quantity, prod.purchaseRate);
                        const grossProfit = calculateGrossProfit(result.netAmount, cogs);
                        setTaxResults(prev => ({ ...prev, [idx]: { ...result, cogs, grossProfit } }));
                        updateLine(idx, 'stRate', prod.gstPercent);
                        updateLine(idx, 'stAmount', result.gstAmount);
                        updateLine(idx, 'amtExclStd', result.toAmount);
                        if (vType === 'SV' || vType === 'SRV') {
                          updateLine(idx, 'credit', result.netAmount);
                          updateLine(idx, 'debit', 0);
                        } else {
                          updateLine(idx, 'debit', result.netAmount);
                          updateLine(idx, 'credit', 0);
                        }
                      }} style={{ ...styles.toolBtn, fontSize: 10, padding: '3px 6px', color: '#2563eb' }} title="Calculate tax and fill amount">
                        Tax
                      </button>
                    </div>
                  )}
                </div>
                {/* Tax breakdown display */}
                {taxResults[idx] && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: '#64758b', paddingLeft: 4, paddingBottom: 4 }}>
                    <span>Amt: {fmt(taxResults[idx].amount)}</span>
                    <span>Disc: {fmt(taxResults[idx].discountAmount)}</span>
                    <span>Sub: {fmt(taxResults[idx].toAmount)}</span>
                    <span>GST: {fmt(taxResults[idx].gstAmount)}</span>
                    <span>FED: {fmt(taxResults[idx].fedAmount)}</span>
                    <span>Adv: {fmt(taxResults[idx].advanceTaxAmount)}</span>
                    <span>F.Tax: {fmt(taxResults[idx].furtherTaxAmount)}</span>
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>Net: {fmt(taxResults[idx].netAmount)}</span>
                    {isProductType && (
                      <>
                        <span style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 8 }}>COGS: {fmt(taxResults[idx].cogs)}</span>
                        <span style={{ fontWeight: 600, color: taxResults[idx].grossProfit >= 0 ? '#15803d' : '#dc2626' }}>
                          Profit: {fmt(taxResults[idx].grossProfit)}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}

            {lines.length > 0 && (
              <div style={styles.linesFooter}>
                <span style={{ flex: '1' }}></span>
                <span style={{ flex: '0 0 110px', textAlign: 'right', fontWeight: 600, color: '#1d4ed8' }}>{fmt(dTotal)}</span>
                <span style={{ flex: '0 0 110px', textAlign: 'right', fontWeight: 600, color: '#be185d' }}>{fmt(cTotal)}</span>
                <span style={{ flex: '0 0 32px' }}></span>
              </div>
            )}

            {lines.length > 0 && (
              <div style={{ ...styles.infoNote, marginTop: 8, borderColor: balanced ? '#bbf7d0' : '#fecaca', backgroundColor: balanced ? '#f0fdf4' : '#fef2f2' }}>
                {balanced
                  ? `Balanced — Debit: ${fmt(dTotal)} = Credit: ${fmt(cTotal)}`
                  : `Not Balanced — Debit: ${fmt(dTotal)} / Credit: ${fmt(cTotal)} / Diff: ${fmt(Math.abs(dTotal - cTotal))} (add ${dTotal < cTotal ? 'debit' : 'credit'} lines to balance)`
                }
              </div>
            )}
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" style={styles.primaryBtn} disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save Draft Changes' : 'Save Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Account Select (search dropdown) ─────────────────────── */

const AccountSelect: React.FC<{
  accounts: AccountHead[];
  value: string;
  onChange: (accountId: string) => void;
  search: string;
  onSearchChange: (s: string) => void;
  filtered: AccountHead[];
}> = ({ accounts, value, onChange, search, onSearchChange, filtered }) => {
  const [open, setOpen] = useState(false);
  const selected = accounts.find(a => a.accountCode === value);

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={open ? search : (selected ? `${selected.accountCode} — ${selected.accountName}` : '')}
        onChange={e => { onSearchChange(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); onSearchChange(''); }}
        style={{ ...styles.input, fontSize: 13 }}
        placeholder="Search account..."
      />
      {open && (
        <div style={styles.dropdown}>
          {filtered.map(a => (
            <div
              key={a.id}
              style={{ ...styles.dropdownItem, backgroundColor: a.accountCode === value ? '#eff6ff' : undefined }}
              onClick={() => { onChange(a.accountCode); setOpen(false); onSearchChange(''); }}
            >
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: '#64748b', marginRight: 8 }}>{a.accountCode}</span>
              {a.accountName}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ ...styles.dropdownItem, color: '#94a3b8' }}>No accounts found</div>}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Tab: General Ledger                                        */
/* ═══════════════════════════════════════════════════════════ */

const LedgerTab: React.FC<{ tenantId: string; initialAccountId?: string }> = ({ tenantId, initialAccountId }) => {
  const [accounts, setAccounts] = useState<AccountHead[]>([]);
  const [accountFilter, setAccountFilter] = useState(initialAccountId ?? '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ledgerEntries, setLedgerEntries] = useState<(LedgerEntry & { balance: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();

  const postingAccounts = useMemo(() => accounts.filter(a => a.isPosting), [accounts]);

  useEffect(() => {
    getAccounts().then(setAccounts);
  }, [tenantId]);

  // Auto-load ledger when initialAccountId is provided and accounts are loaded
  useEffect(() => {
    if (initialAccountId && accounts.length > 0 && !loaded) {
      setAccountFilter(initialAccountId);
      // Auto-load after a tick to ensure state is set
      const timer = setTimeout(() => {
        loadLedgerForAccount(initialAccountId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialAccountId, accounts]);

  const loadLedgerForAccount = async (accountCode: string) => {
    if (!accountCode) return;
    setLoading(true);
    try {
      const entries = await getAccountLedger(accountCode);
      setLedgerEntries(entries);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const loadLedger = async () => {
    if (!accountFilter) return;
    setLoading(true);
    try {
      const entries = await getAccountLedger(accountFilter, startDate || undefined, endDate || undefined);
      setLedgerEntries(entries);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const selectedAccount = accounts.find(a => a.accountCode === accountFilter);

  const stats = useMemo(() => {
    if (ledgerEntries.length === 0) return { totalDebit: 0, totalCredit: 0, lastBalance: 0 };
    const totalD = ledgerEntries.reduce((s, e) => s + e.debit, 0);
    const totalC = ledgerEntries.reduce((s, e) => s + e.credit, 0);
    return { totalDebit: totalD, totalCredit: totalC, lastBalance: ledgerEntries[ledgerEntries.length - 1].balance };
  }, [ledgerEntries]);

  return (
    <>
      <div className="toolbar-responsive" style={styles.toolbar}>
        <select
          value={accountFilter}
          onChange={e => { setAccountFilter(e.target.value); setLoaded(false); setLedgerEntries([]); }}
          style={{ ...styles.filterSelect, flex: '1 1 250px' }}
        >
          <option value="">Select an account...</option>
          {postingAccounts.map(a => (
            <option key={a.id} value={a.accountCode}>{a.accountCode} — {a.accountName}</option>
          ))}
        </select>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={styles.input} placeholder="Start date" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={styles.input} placeholder="End date" />
        <button onClick={loadLedger} style={styles.primaryBtn} disabled={!accountFilter || loading}>
          {loading ? 'Loading...' : 'Load Ledger'}
        </button>
        {loaded && ledgerEntries.length > 0 && (
          <>
            <button onClick={() => {
              const headers = ['Date', 'Voucher #', 'Type', 'Narration', 'Debit', 'Credit', 'Balance'];
              const rows = ledgerEntries.map(e => [
                e.entryDate,
                e.voucherNumber,
                e.voucherType,
                e.narration,
                e.debit > 0 ? e.debit.toFixed(2) : '',
                e.credit > 0 ? e.credit.toFixed(2) : '',
                e.balance.toFixed(2),
              ]);
              const csv = generateCsv(headers, rows);
              const filename = generateExportFilename('General-Ledger', accountFilter);
              downloadFile(csv, filename);
            }} style={{ ...styles.primaryBtn, backgroundColor: '#ffffff', color: '#475569', border: '1px solid #e2e8f0' }}>
              Export CSV
            </button>
            <button onClick={printWindow} style={{ ...styles.primaryBtn, backgroundColor: '#2563eb' }}>
              Print
            </button>
          </>
        )}
      </div>

      {selectedAccount && loaded && (
        <div className="stats-bar-responsive" style={styles.statsBar}>
          <div style={styles.statChip}>
            <span style={styles.statLabel}>Account: {selectedAccount.accountCode} — {selectedAccount.accountName}</span>
          </div>
          <div style={styles.statChip}>
            <span style={{ ...styles.statDot, backgroundColor: '#dbeafe', color: '#1d4ed8' }}>{ledgerEntries.length}</span>
            <span style={styles.statLabel}>Entries</span>
          </div>
          <div style={styles.statChip}>
            <span style={styles.statLabel}>Total Dr: <strong style={{ color: '#1d4ed8' }}>{fmt(stats.totalDebit)}</strong></span>
          </div>
          <div style={styles.statChip}>
            <span style={styles.statLabel}>Total Cr: <strong style={{ color: '#be185d' }}>{fmt(stats.totalCredit)}</strong></span>
          </div>
          <div style={styles.statChip}>
            <span style={styles.statLabel}>
              Balance: <strong style={{ color: stats.lastBalance >= 0 ? '#1d4ed8' : '#be185d' }}>
                {fmt(Math.abs(stats.lastBalance))} {stats.lastBalance >= 0 ? 'Dr' : 'Cr'}
              </strong>
            </span>
          </div>
        </div>
      )}

      <div className="table-wrap" style={styles.card}>
        {!loaded ? (
          <div style={styles.empty}>Select an account and click "Load Ledger" to view entries.</div>
        ) : loading ? (
          <div style={{ padding: 24 }}><div className="skeleton" style={{ width: '100%', height: 300 }} /></div>
        ) : ledgerEntries.length === 0 ? (
          <div style={styles.empty}>No ledger entries found for the selected criteria.</div>
        ) : (
          <>
            <div style={styles.treeHeader}>
              <span style={{ ...styles.col, flex: '0 0 110px' }}>Date</span>
              <span style={{ ...styles.col, flex: '0 0 60px' }}>V#</span>
              <span style={{ ...styles.col, flex: '0 0 50px' }}>Type</span>
              <span style={{ ...styles.col, flex: '1' }}>Narration</span>
              <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Debit</span>
              <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Credit</span>
              <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Balance</span>
            </div>
            {ledgerEntries.map(e => (
              <div key={e.id} style={styles.voucherRow}>
                <span style={{ ...styles.col, flex: '0 0 110px', fontSize: 13 }}>{e.entryDate}</span>
                <span style={{ ...styles.col, flex: '0 0 60px', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
                  <button onClick={() => navigate('/bills/' + e.voucherId)} style={{ ...styles.linkBtn, padding: 0, fontSize: 13 }}>{e.voucherNumber}</button>
                </span>
                <span style={{ ...styles.col, flex: '0 0 50px' }}>
                  <span style={{ ...styles.typeBadge, backgroundColor: (VOUCHER_TYPE_COLORS[e.voucherType] ?? { bg: '#f1f5f9', fg: '#475569' }).bg, color: (VOUCHER_TYPE_COLORS[e.voucherType] ?? { bg: '#f1f5f9', fg: '#475569' }).fg, fontSize: 10 }}>
                    {e.voucherType}
                  </span>
                </span>
                <span style={{ ...styles.col, flex: '1', fontSize: 13 }}>{e.narration}</span>
                <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: e.debit > 0 ? '#1d4ed8' : '#cbd5e1' }}>
                  {e.debit > 0 ? fmt(e.debit) : ''}
                </span>
                <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: e.credit > 0 ? '#be185d' : '#cbd5e1' }}>
                  {e.credit > 0 ? fmt(e.credit) : ''}
                </span>
                <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 600, color: e.balance >= 0 ? '#1e293b' : '#be185d' }}>
                  {fmt(Math.abs(e.balance))} {e.balance >= 0 ? 'Dr' : 'Cr'}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* COA Sub-Components (Account Row, Create/Edit Modals)       */
/* ═══════════════════════════════════════════════════════════ */

const AccountRow: React.FC<{
  account: AccountHead;
  depth: number;
  expanded: boolean;
  hasChildren: boolean;
  metaExpanded: boolean;
  onToggle: () => void;
  onToggleMeta: () => void;
  onEdit: () => void;
  onAddChild: () => void;
}> = ({ account: a, depth, expanded, hasChildren, metaExpanded, onToggle, onToggleMeta, onEdit, onAddChild }) => {
  const badge = TYPE_BADGE_COLORS[a.accountType];
  const hasMetadata = !!(a.address || a.ownerName || a.phone || a.stn || a.ntn || a.cnic);
  return (
    <>
    <div style={{ ...styles.row, opacity: a.isActive ? 1 : 0.5 }}>
      <span style={{ ...styles.col, flex: '0 0 40px', paddingLeft: depth * 20 }}>
        {hasChildren ? (
          <button onClick={onToggle} style={styles.expandBtn}>{expanded ? '▼' : '▶'}</button>
        ) : hasMetadata ? (
          <button onClick={onToggleMeta} style={{ ...styles.expandBtn, color: metaExpanded ? '#2563eb' : undefined }}>{metaExpanded ? '▼' : '▶'}</button>
        ) : (
          <span style={styles.leafDot}>•</span>
        )}
      </span>
      <span style={{ ...styles.col, ...styles.codeCell, flex: '0 0 80px' }}>{a.accountCode}</span>
      <span style={{ ...styles.col, flex: '1', fontWeight: a.level <= 2 ? 600 : 400, color: LEVEL_COLORS[a.level] }}>
        {a.accountName}
      </span>
      <span style={{ ...styles.col, flex: '0 0 100px', fontSize: 12 }}>L{a.level} {a.isPosting ? 'Post' : 'Summ'}</span>
      <span style={{ ...styles.col, flex: '0 0 120px' }}>
        <span style={{ ...styles.typeBadge, backgroundColor: badge.bg, color: badge.fg }}>
          {ACCOUNT_TYPE_LABELS[a.accountType]}
        </span>
      </span>
      <span style={{ ...styles.col, flex: '0 0 70px', fontWeight: 500, color: a.normalBalance === 'DEBIT' ? '#1d4ed8' : '#be185d' }}>
        {a.normalBalance}
      </span>
      <span style={{ ...styles.col, flex: '0 0 70px' }}>
        <span style={{ ...styles.statusDot, backgroundColor: a.isActive ? '#22c55e' : '#ef4444' }} />
      </span>
      <span style={{ ...styles.col, flex: '0 0 80px', gap: 4 }}>
        <button onClick={onEdit} style={styles.rowBtn} title="Edit">✎</button>
        {a.level < 4 && <button onClick={onAddChild} style={styles.rowBtn} title="Add child">+</button>}
      </span>
    </div>
    {metaExpanded && hasMetadata && (
      <div style={{ padding: '6px 16px 6px ' + (depth * 20 + 56) + 'px', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9', fontSize: 12, display: 'flex', gap: 12, flexWrap: 'wrap', color: '#64758b' }}>
        {a.address && <span><strong>Address:</strong> {a.address}</span>}
        {a.ownerName && <span><strong>Owner:</strong> {a.ownerName}</span>}
        {a.phone && <span><strong>Phone:</strong> {a.phone}</span>}
        {a.stn && <span><strong>STN:</strong> {a.stn}</span>}
        {a.ntn && <span><strong>NTN:</strong> {a.ntn}</span>}
        {a.cnic && <span><strong>CNIC:</strong> {a.cnic}</span>}
      </div>
    )}
    </>
  );
};

const CreateAccountModal: React.FC<{
  parent: AccountHead | null;
  allAccounts: AccountHead[];
  onClose: () => void;
  onCreate: (dto: CreateAccountHeadDTO) => void;
}> = ({ parent, allAccounts, onClose, onCreate }) => {
  const level: AccountLevel = parent ? (parent.level + 1) as AccountLevel : 1;
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('ASSET');
  const [controlCategory, setControlCategory] = useState<ControlCategory | ''>('');
  const [address, setAddress] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [stn, setStn] = useState('');
  const [ntn, setNtn] = useState('');
  const [cnic, setCnic] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!code.trim() || !name.trim()) { setError('Code and Name are required.'); return; }
    if (!/^\d{5}$/.test(code)) { setError('Code must be exactly 5 digits.'); return; }
    setSaving(true);
    try {
      await onCreate({
        accountCode: code,
        accountName: name.trim(),
        parentId: parent?.id ?? null,
        level,
        accountType,
        controlCategory: controlCategory || undefined,
        address: address || undefined,
        ownerName: ownerName || undefined,
        phone: phone || undefined,
        stn: stn || undefined,
        ntn: ntn || undefined,
        cnic: cnic || undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div className="responsive-modal" style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Create Account — Level {level}</h2>
        {parent && <p style={styles.modalParent}>Parent: {parent.accountCode} {parent.accountName}</p>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="responsive-form-row" style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Account Code (5 digits)</label>
              <input value={code} onChange={e => setCode(e.target.value)} style={styles.input} maxLength={5} placeholder="e.g. 11101" autoFocus />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Account Name</label>
              <input value={name} onChange={e => setName(e.target.value)} style={styles.input} placeholder="e.g. Cash in Hand" />
            </div>
          </div>
          <div className="responsive-form-row" style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Account Type</label>
              <select value={accountType} onChange={e => setAccountType(e.target.value as AccountType)} style={styles.select}>
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Control Category (optional)</label>
              <select value={controlCategory} onChange={e => setControlCategory(e.target.value as ControlCategory | '')} style={styles.select}>
                <option value="">None</option>
                {(Object.entries(CONTROL_CATEGORY_LABELS) as [ControlCategory, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <p style={{ ...styles.infoNote, marginBottom: 12 }}>
            This will be a <strong>{level < 4 ? 'Summary' : 'Posting'}</strong> account. Normal balance: <strong>{deriveNormalBalanceLabel(accountType)}</strong>
          </p>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginBottom: 8 }}>
            <label style={{ ...styles.label, fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Account Metadata</label>
          </div>
          <div className="responsive-form-row" style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Address</label>
              <textarea value={address} onChange={e => setAddress(e.target.value)} style={{ ...styles.textarea, minHeight: 48 }} rows={2} placeholder="Physical address..." />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Owner / Contact Name</label>
              <input value={ownerName} onChange={e => setOwnerName(e.target.value)} style={styles.input} placeholder="Contact person..." />
            </div>
          </div>
          <div className="responsive-form-row" style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} style={styles.input} placeholder="Phone number..." />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>STN (Sales Tax No.)</label>
              <input value={stn} onChange={e => setStn(e.target.value)} style={styles.input} placeholder="STN..." />
            </div>
          </div>
          <div className="responsive-form-row" style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>NTN (National Tax No.)</label>
              <input value={ntn} onChange={e => setNtn(e.target.value)} style={styles.input} placeholder="NTN..." />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>CNIC</label>
              <input value={cnic} onChange={e => setCnic(e.target.value)} style={styles.input} placeholder="CNIC..." />
            </div>
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" style={styles.primaryBtn} disabled={saving}>{saving ? 'Creating...' : 'Create Account'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditAccountModal: React.FC<{
  account: AccountHead;
  onClose: () => void;
  onSave: (id: string, dto: UpdateAccountDTO) => void;
  onDeactivate: (id: string) => void;
}> = ({ account, onClose, onSave, onDeactivate }) => {
  const [name, setName] = useState(account.accountName);
  const [isActive, setIsActive] = useState(account.isActive);
  const [controlCategory, setControlCategory] = useState<ControlCategory | ''>(account.controlCategory ?? '');
  const [address, setAddress] = useState(account.address ?? '');
  const [ownerName, setOwnerName] = useState(account.ownerName ?? '');
  const [phone, setPhone] = useState(account.phone ?? '');
  const [stn, setStn] = useState(account.stn ?? '');
  const [ntn, setNtn] = useState(account.ntn ?? '');
  const [cnic, setCnic] = useState(account.cnic ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(account.id, {
      accountName: name.trim() || account.accountName,
      isActive,
      controlCategory: controlCategory || null,
      address: address || undefined,
      ownerName: ownerName || undefined,
      phone: phone || undefined,
      stn: stn || undefined,
      ntn: ntn || undefined,
      cnic: cnic || undefined,
    });
    setSaving(false);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div className="responsive-modal" style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>Edit Account</h2>
        <p style={styles.modalParent}>{account.accountCode} — Level {account.level} — {ACCOUNT_TYPE_LABELS[account.accountType]}</p>
        <div style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Account Name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Control Category</label>
            <select value={controlCategory} onChange={e => setControlCategory(e.target.value as ControlCategory | '')} style={styles.select}>
              <option value="">None</option>
              {(Object.entries(CONTROL_CATEGORY_LABELS) as [ControlCategory, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Status</label>
            <div style={styles.toggleRow}>
              <button onClick={() => setIsActive(!isActive)} style={{ ...styles.toggle, backgroundColor: isActive ? '#22c55e' : '#cbd5e1' }}>
                <span style={{ ...styles.toggleKnob, transform: isActive ? 'translateX(20px)' : 'translateX(2px)' }} />
              </button>
              <span style={{ fontSize: 14, color: '#475569' }}>{isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginBottom: 8, marginTop: 4 }}>
            <label style={{ ...styles.label, fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Account Metadata</label>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Address</label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} style={{ ...styles.textarea, minHeight: 48 }} rows={2} placeholder="Physical address..." />
          </div>
          <div className="responsive-form-row" style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Owner / Contact Name</label>
              <input value={ownerName} onChange={e => setOwnerName(e.target.value)} style={styles.input} placeholder="Contact person..." />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} style={styles.input} placeholder="Phone number..." />
            </div>
          </div>
          <div className="responsive-form-row" style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>STN (Sales Tax No.)</label>
              <input value={stn} onChange={e => setStn(e.target.value)} style={styles.input} placeholder="STN..." />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>NTN (National Tax No.)</label>
              <input value={ntn} onChange={e => setNtn(e.target.value)} style={styles.input} placeholder="NTN..." />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>CNIC</label>
            <input value={cnic} onChange={e => setCnic(e.target.value)} style={styles.input} placeholder="CNIC..." />
          </div>
          <div style={styles.modalActions}>
            <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button onClick={() => onDeactivate(account.id)} style={styles.dangerBtn} disabled={saving}>Deactivate</button>
            <button onClick={handleSave} style={styles.primaryBtn} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Helpers ──────────────────────────────────────────────── */

function deriveNormalBalanceLabel(type: AccountType): string {
  return (type === 'ASSET' || type === 'COGS' || type === 'EXPENSE') ? 'DEBIT' : 'CREDIT';
}

/* ─── Styles ───────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 32, maxWidth: 1200, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  backBtn: { background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', marginBottom: 4, padding: 0 },
  title: { fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b' },

  tabBar: { display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', marginBottom: 20 },
  tab: { padding: '10px 20px', background: 'none', border: 'none', borderBottom: '2px solid transparent', fontSize: 14, fontWeight: 500, color: '#64748b', cursor: 'pointer', marginBottom: -2 },
  tabActive: { color: '#2563eb', borderBottomColor: '#2563eb' },

  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statsBar: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  statChip: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' },
  statDot: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, fontWeight: 600, fontSize: 12 },
  statLabel: {},

  toolbar: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  searchInput: { flex: '1 1 200px', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' },
  filterSelect: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', backgroundColor: '#fff' },
  toolBtn: { padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer', color: '#475569' },

  card: { backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgb(0 0 0 / 0.06)' },

  treeHeader: { display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 800 },
  row: { display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 14, transition: 'background 0.1s', minWidth: 800 },
  col: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  codeCell: { fontFamily: 'ui-monospace, monospace', fontSize: 13, color: '#475569' },

  expandBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#64748b', padding: '2px 4px' },
  leafDot: { color: '#cbd5e1', fontSize: 10 },
  typeBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 },
  statusDot: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%' },
  rowBtn: { background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 14, color: '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },

  primaryBtn: { padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { padding: '10px 20px', backgroundColor: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
  dangerBtn: { padding: '10px 20px', backgroundColor: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' },

  empty: { padding: 40, textAlign: 'center' as const, color: '#94a3b8', fontSize: 14 },

  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgb(0 0 0 / 0.2)' },
  modalTitle: { fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 4 },
  modalParent: { fontSize: 13, color: '#64748b', marginBottom: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  formRow: { display: 'flex', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  label: { fontSize: 13, fontWeight: 500, color: '#374151' },
  input: { padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' },
  select: { padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', backgroundColor: '#fff' },
  infoNote: { fontSize: 13, color: '#64748b', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' },
  error: { padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },

  toggleRow: { display: 'flex', alignItems: 'center', gap: 12 },
  toggle: { width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', padding: 0, transition: 'background-color 0.2s' },
  toggleKnob: { position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff', boxShadow: '0 1px 3px rgb(0 0 0 / 0.2)', transition: 'transform 0.2s' },

  voucherRow: { display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 14, minWidth: 800 },
  linesContainer: { backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
  linesHeader: { display: 'flex', padding: '6px 16px 6px 32px', borderBottom: '1px solid #e2e8f0', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' },
  lineRow: { display: 'flex', padding: '6px 16px 6px 32px', borderBottom: '1px solid #f1f5f9', fontSize: 14, alignItems: 'center' },
  linesFooter: { display: 'flex', padding: '8px 16px 8px 32px', borderTop: '2px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: 13 },

  lineItemRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', zIndex: 10, maxHeight: 200, overflow: 'auto' },
  dropdownItem: { padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' },
  textarea: { padding: '10px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', backgroundColor: '#fff', color: '#1e293b', resize: 'vertical', fontFamily: 'inherit' },
};
