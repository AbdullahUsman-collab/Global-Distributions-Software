/**
 * Finance Module — Chart of Accounts, Vouchers, General Ledger
 * Interactive 4-level COA tree, voucher entry with line items, and ledger viewer.
 *
 * Source of Truth: audit/04_ACCOUNTING_ENGINE.md, audit/23_DATA_MODEL.md
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';
import { services } from '../services';
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
  VOUCHER_TYPE_LABELS,
  VOUCHER_STATUS_LABELS,
  totalDebit,
  totalCredit,
  isBalanced,
} from '../../domain/types/voucher';

/* ─── Tab Definition ───────────────────────────────────────── */

type FinanceTab = 'coa' | 'vouchers' | 'ledger';

const TABS: { key: FinanceTab; label: string }[] = [
  { key: 'coa',      label: 'Chart of Accounts' },
  { key: 'vouchers', label: 'Vouchers' },
  { key: 'ledger',   label: 'General Ledger' },
];

/* ─── Constants ────────────────────────────────────────────── */

const ACCOUNT_TYPES: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE'];
type UpdateAccountDTO = { accountName?: string; isActive?: boolean; controlCategory?: ControlCategory | null };

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
  const [tab, setTab] = useState<FinanceTab>('coa');

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <button onClick={() => navigate('/dashboard')} className="bg-transparent border-none text-slate-500 text-[13px] cursor-pointer mb-1 p-0">← Dashboard</button>
          <h1 className="text-[26px] font-bold text-slate-800 mb-1">Finance</h1>
          <p className="text-sm text-slate-500">{tenant.brandName}</p>
        </div>
      </div>

      <div className="flex overflow-x-auto whitespace-nowrap border-b-2 border-slate-200 hide-scrollbar gap-0 mb-5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 bg-transparent border-none border-b-2 text-sm font-medium cursor-pointer whitespace-nowrap transition-colors min-h-[44px] ${
              tab === t.key
                ? 'text-blue-600 border-b-blue-600'
                : 'text-slate-500 border-b-transparent hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'coa'      && <COATab tenantId={tenant.id} />}
      {tab === 'vouchers' && <VouchersTab tenantId={tenant.id} user={user.username} />}
      {tab === 'ledger'   && <LedgerTab tenantId={tenant.id} />}
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await services.coaRepository.getAccountsByTenantId(tenantId);
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

  const handleCreate = async (dto: CreateAccountHeadDTO) => {
    await services.coaRepository.createAccount(tenantId, dto);
    setShowCreate(false);
    setCreateParent(null);
    await load();
  };

  const handleUpdate = async (id: string, dto: UpdateAccountDTO) => {
    await services.coaRepository.updateAccount(tenantId, id, dto);
    setEditAccount(null);
    await load();
  };

  const handleDeactivate = async (id: string) => {
    await services.coaRepository.deactivateAccount(tenantId, id);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex flex-wrap gap-3">
          {ACCOUNT_TYPES.map(t => (
            <div key={t} className="flex items-center gap-1.5 text-[13px] text-slate-600">
              <span
                className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md font-semibold text-xs"
                style={{ backgroundColor: TYPE_BADGE_COLORS[t].bg, color: TYPE_BADGE_COLORS[t].fg }}
              >
                {stats.byType[t]}
              </span>
              <span>{ACCOUNT_TYPE_LABELS[t]}</span>
            </div>
          ))}
        </div>
        <button onClick={() => { setCreateParent(null); setShowCreate(true); }} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 min-h-[44px]">
          + New Account
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or code..." className="flex-1 min-w-[200px] px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as AccountType | '')} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white">
          <option value="">All Types</option>
          {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>)}
        </select>
        <button onClick={() => setExpanded(new Set(accounts.map(a => a.id)))} className="px-3.5 py-2 border border-slate-200 rounded-lg text-[13px] bg-white cursor-pointer text-slate-600 hover:bg-slate-50 min-h-[44px]">Expand All</button>
        <button onClick={() => setExpanded(new Set())} className="px-3.5 py-2 border border-slate-200 rounded-lg text-[13px] bg-white cursor-pointer text-slate-600 hover:bg-slate-50 min-h-[44px]">Collapse All</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <div className="skeleton w-[200px] h-5 mb-2" />
            <div className="skeleton w-full h-[300px]" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="flex items-center px-4 py-2.5 bg-slate-50 border-b-2 border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[660px]">
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_40px]"></span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_80px]">Code</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1">Account Name</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_100px]">Level</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_120px]">Type</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_70px]">Balance</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_70px]">Status</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_80px]">Actions</span>
              </div>
              {accounts.filter(a => visibleIds.has(a.id)).map(a => (
                <AccountRow
                  key={a.id}
                  account={a}
                  depth={a.level - 1}
                  expanded={expanded.has(a.id)}
                  hasChildren={(tree.children.get(a.id) ?? []).length > 0}
                  onToggle={() => toggleExpand(a.id)}
                  onEdit={() => setEditAccount(a)}
                  onAddChild={() => { setCreateParent(a); setShowCreate(true); }}
                />
              ))}
              {accounts.filter(a => visibleIds.has(a.id)).length === 0 && (
                <div className="p-10 text-center text-slate-400 text-sm">No accounts match your search.</div>
              )}
            </div>
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [v, a] = await Promise.all([
        services.voucherRepository.getVouchersByTenantId(tenantId, {
          voucherType: typeFilter || undefined,
          status: statusFilter || undefined,
        }),
        services.coaRepository.getAccountsByTenantId(tenantId),
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
    if (!confirm('Post this voucher? It will become immutable.')) return;
    await services.voucherRepository.postVoucher(tenantId, id);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft voucher?')) return;
    await services.voucherRepository.deleteVoucher(tenantId, id);
    await load();
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

  const handleUpdate = async (id: string, dto: CreateVoucherDTO) => {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-[13px] text-slate-600">
            <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md font-semibold text-xs bg-slate-100 text-slate-600">{stats.total}</span>
            <span>Total</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-slate-600">
            <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md font-semibold text-xs" style={{ backgroundColor: VOUCHER_STATUS_COLORS.DRAFT.bg, color: VOUCHER_STATUS_COLORS.DRAFT.fg }}>{stats.draft}</span>
            <span>Draft</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-slate-600">
            <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md font-semibold text-xs" style={{ backgroundColor: VOUCHER_STATUS_COLORS.POSTED.bg, color: VOUCHER_STATUS_COLORS.POSTED.fg }}>{stats.posted}</span>
            <span>Posted</span>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 min-h-[44px]">+ New Voucher</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as VoucherType | '')} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white">
          <option value="">All Types</option>
          {(Object.keys(VOUCHER_TYPE_LABELS) as VoucherType[]).map(t => (
            <option key={t} value={t}>{VOUCHER_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as VoucherStatus | '')} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white">
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="POSTED">Posted</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <div className="skeleton w-full h-[300px]" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="flex items-center px-4 py-2.5 bg-slate-50 border-b-2 border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[700px]">
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_60px]">#</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_110px]">Type</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_110px]">Date</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1">Narration</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_100px] text-right">Debit</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_100px] text-right">Credit</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_80px]">Status</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_100px]">Actions</span>
              </div>
              {vouchers.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">No vouchers found.</div>}
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
                />
              ))}
            </div>
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
}> = ({ voucher: v, tenantId, accountMap, expanded, onToggleLines, onEdit, onPost, onDelete }) => {
  const [lines, setLines] = useState<VoucherLine[]>([]);

  useEffect(() => {
    if (expanded && lines.length === 0) {
      services.voucherRepository.getVoucherLines(tenantId, v.id).then(setLines);
    }
  }, [expanded, v.id, tenantId, lines.length]);

  const typeBadge = VOUCHER_TYPE_COLORS[v.voucherType];
  const statusBadge = VOUCHER_STATUS_COLORS[v.status];
  const totalD = totalDebit(lines.length > 0 ? lines : []);
  const totalC = totalCredit(lines.length > 0 ? lines : []);

  return (
    <>
      <div className="flex items-center px-4 py-2.5 border-b border-slate-100 text-sm hover:bg-slate-50">
        <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_60px] font-mono text-[13px]">
          <button onClick={onToggleLines} className="bg-transparent border-none cursor-pointer text-[10px] text-slate-500 px-1 py-0.5">{expanded ? '▼' : '▶'}</button>
          {v.voucherNumber}
        </span>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_110px]">
          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ backgroundColor: typeBadge.bg, color: typeBadge.fg }}>
            {v.voucherType}
          </span>
        </span>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_110px] text-[13px]">{v.date}</span>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1">{v.narration}</span>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_100px] text-right font-mono text-[13px]">
          {lines.length > 0 ? fmt(totalD) : '—'}
        </span>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_100px] text-right font-mono text-[13px]">
          {lines.length > 0 ? fmt(totalC) : '—'}
        </span>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_80px]">
          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ backgroundColor: statusBadge.bg, color: statusBadge.fg }}>
            {v.status}
          </span>
        </span>
        <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_100px] gap-1">
          {v.status === 'DRAFT' && (
            <>
              <button onClick={onEdit} className="bg-transparent border border-slate-200 rounded-md w-7 h-7 cursor-pointer text-sm text-slate-500 inline-flex items-center justify-center" title="Edit">✎</button>
              <button onClick={onPost} className="bg-transparent border border-green-200 rounded-md w-7 h-7 cursor-pointer text-sm text-green-600 inline-flex items-center justify-center" title="Post">✓</button>
              <button onClick={onDelete} className="bg-transparent border border-red-200 rounded-md w-7 h-7 cursor-pointer text-sm text-red-600 inline-flex items-center justify-center" title="Delete">✕</button>
            </>
          )}
        </span>
      </div>
      {expanded && lines.length > 0 && (
        <div className="bg-slate-50 border-b-2 border-slate-200">
          <div className="flex px-4 py-1.5 pl-8 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_40px]">Ln</span>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_80px]">Acct</span>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1">Description</span>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_100px] text-right">Debit</span>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_100px] text-right">Credit</span>
          </div>
          {lines.map((l, i) => {
            const acct = accountMap.get(l.accountId);
            return (
              <div key={l.id} className="flex px-4 py-1.5 pl-8 border-b border-slate-100 text-sm items-center">
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_40px] text-xs text-slate-400">{i + 1}</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_80px] font-mono text-[13px]">{l.accountId}</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1 text-[13px]">
                  {l.description}
                  {acct && <span className="text-slate-400 ml-2">({acct.accountName})</span>}
                </span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_100px] text-right font-mono text-[13px]" style={{ color: l.debit > 0 ? '#1d4ed8' : '#94a3b8' }}>
                  {l.debit > 0 ? fmt(l.debit) : ''}
                </span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_100px] text-right font-mono text-[13px]" style={{ color: l.credit > 0 ? '#be185d' : '#94a3b8' }}>
                  {l.credit > 0 ? fmt(l.credit) : ''}
                </span>
              </div>
            );
          })}
          <div className="flex px-4 py-2 pl-8 border-t-2 border-slate-200 bg-slate-50 text-[13px]">
            <span className="flex-[0_0_120px]"></span>
            <span className="flex-1 text-xs font-semibold text-slate-600">Totals</span>
            <span className="flex-[0_0_100px] text-right font-mono font-semibold text-blue-700">{fmt(totalD)}</span>
            <span className="flex-[0_0_100px] text-right font-mono font-semibold text-pink-700">{fmt(totalC)}</span>
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
  const [lines, setLines] = useState<{ accountId: string; description: string; debit: number; credit: number }[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');

  useEffect(() => {
    if (isEdit && voucher) {
      services.voucherRepository.getVoucherLines(tenantId, voucher.id).then(raw => {
        setLines(raw.map(l => ({ accountId: l.accountId, description: l.description, debit: l.debit, credit: l.credit })));
        setLoading(false);
      });
    }
  }, [isEdit, voucher, tenantId]);

  const filteredAccounts = useMemo(() => {
    if (!accountSearch) return postingAccounts.slice(0, 10);
    const q = accountSearch.toLowerCase();
    return postingAccounts.filter(a =>
      a.accountCode.includes(q) || a.accountName.toLowerCase().includes(q)
    ).slice(0, 15);
  }, [postingAccounts, accountSearch]);

  const addLine = () => {
    setLines(prev => [...prev, { accountId: '', description: '', debit: 0, credit: 0 }]);
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
    if (!balanced) { setError(`Voucher does not balance. Debit: ${fmt(dTotal)} / Credit: ${fmt(cTotal)} / Difference: ${fmt(Math.abs(dTotal - cTotal))}`); return; }
    const invalid = lines.find(l => !l.accountId);
    if (invalid) { setError('All lines must have an account selected.'); return; }
    setSaving(true);
    try {
      await onSave({ voucherType: vType, date, narration, lines });
    } catch (err: any) {
      setError(err.message || 'Failed to save voucher.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40" onClick={onClose}>
        <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl p-6" onClick={e => e.stopPropagation()}>
          <div className="p-10 text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-[800px] max-h-[90vh] overflow-y-auto rounded-xl shadow-xl p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-slate-800 mb-1">{isEdit ? 'Edit' : 'New'} Voucher</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-gray-700">Voucher Type</label>
              <select value={vType} onChange={e => setVType(e.target.value as VoucherType)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white" disabled={isEdit}>
                {(Object.keys(VOUCHER_TYPE_LABELS) as VoucherType[]).map(t => (
                  <option key={t} value={t}>{VOUCHER_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-gray-700">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-gray-700">Narration</label>
            <input value={narration} onChange={e => setNarration(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" placeholder="Header narration..." />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[13px] font-medium text-gray-700">Line Items</label>
              <button type="button" onClick={addLine} className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs bg-white cursor-pointer text-slate-600 hover:bg-slate-50 min-h-[44px]">+ Add Line</button>
            </div>

            {lines.length === 0 && (
              <div className="p-5 text-center text-slate-400 text-sm">No lines added. Click "+ Add Line" to start.</div>
            )}

            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-center mb-1.5">
                <div className="flex-[0_0_180px]">
                  <AccountSelect
                    accounts={postingAccounts}
                    value={line.accountId}
                    onChange={accountId => updateLine(idx, 'accountId', accountId)}
                    search={accountSearch}
                    onSearchChange={setAccountSearch}
                    filtered={filteredAccounts}
                  />
                </div>
                <div className="flex-1">
                  <input
                    value={line.description}
                    onChange={e => updateLine(idx, 'description', e.target.value)}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]"
                    placeholder="Description..."
                  />
                </div>
                <div className="flex-[0_0_110px]">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={line.debit || ''}
                    onChange={e => updateLine(idx, 'debit', parseFloat(e.target.value) || 0)}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] text-right"
                    style={{ color: line.debit > 0 ? '#1d4ed8' : undefined }}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex-[0_0_110px]">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={line.credit || ''}
                    onChange={e => updateLine(idx, 'credit', parseFloat(e.target.value) || 0)}
                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] text-right"
                    style={{ color: line.credit > 0 ? '#be185d' : undefined }}
                    placeholder="0.00"
                  />
                </div>
                <button type="button" onClick={() => removeLine(idx)} className="bg-transparent border border-red-200 rounded-md w-8 h-8 cursor-pointer text-sm text-red-600 inline-flex items-center justify-center flex-[0_0_32px]">✕</button>
              </div>
            ))}

            {lines.length > 0 && (
              <div className="flex px-4 py-2 border-t-2 border-slate-200 bg-slate-50 text-[13px]">
                <span className="flex-1"></span>
                <span className="flex-[0_0_110px] text-right font-semibold text-blue-700">{fmt(dTotal)}</span>
                <span className="flex-[0_0_110px] text-right font-semibold text-pink-700">{fmt(cTotal)}</span>
                <span className="flex-[0_0_32px]"></span>
              </div>
            )}

            {lines.length > 0 && (
              <div
                className={`text-[13px] text-slate-500 bg-slate-50 px-3.5 py-2.5 rounded-lg border mt-2 ${
                  balanced ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                {balanced
                  ? `Balanced ✓ — Debit: ${fmt(dTotal)} = Credit: ${fmt(cTotal)}`
                  : `NOT BALANCED ✕ — Debit: ${fmt(dTotal)} / Credit: ${fmt(cTotal)} / Diff: ${fmt(Math.abs(dTotal - cTotal))}`
                }
              </div>
            )}
          </div>

          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2.5 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 min-h-[44px]">Cancel</button>
            <button type="submit" className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 min-h-[44px]" disabled={saving || (lines.length > 0 && !balanced)}>
              {saving ? 'Saving...' : isEdit ? 'Update Voucher' : 'Create Voucher'}
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
    <div className="relative">
      <input
        value={open ? search : (selected ? `${selected.accountCode} — ${selected.accountName}` : '')}
        onChange={e => { onSearchChange(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); onSearchChange(''); }}
        className="px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] w-full"
        placeholder="Search account..."
      />
      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-[200px] overflow-auto">
          {filtered.map(a => (
            <div
              key={a.id}
              className={`px-3 py-2 text-[13px] cursor-pointer border-b border-slate-100 hover:bg-slate-50 ${a.accountCode === value ? 'bg-blue-50' : ''}`}
              onClick={() => { onChange(a.accountCode); setOpen(false); onSearchChange(''); }}
            >
              <span className="font-mono text-xs text-slate-500 mr-2">{a.accountCode}</span>
              {a.accountName}
            </div>
          ))}
          {filtered.length === 0 && <div className="px-3 py-2 text-[13px] text-slate-400">No accounts found</div>}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Tab: General Ledger                                        */
/* ═══════════════════════════════════════════════════════════ */

const LedgerTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [accounts, setAccounts] = useState<AccountHead[]>([]);
  const [accountFilter, setAccountFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ledgerEntries, setLedgerEntries] = useState<(LedgerEntry & { balance: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const postingAccounts = useMemo(() => accounts.filter(a => a.isPosting), [accounts]);

  useEffect(() => {
    services.coaRepository.getAccountsByTenantId(tenantId).then(setAccounts);
  }, [tenantId]);

  const loadLedger = async () => {
    if (!accountFilter) return;
    setLoading(true);
    try {
      const entries = await services.voucherRepository.getLedgerForAccount(tenantId, accountFilter, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
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
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select
          value={accountFilter}
          onChange={e => { setAccountFilter(e.target.value); setLoaded(false); setLedgerEntries([]); }}
          className="flex-1 min-w-[250px] px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white"
        >
          <option value="">Select an account...</option>
          {postingAccounts.map(a => (
            <option key={a.id} value={a.accountCode}>{a.accountCode} — {a.accountName}</option>
          ))}
        </select>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" placeholder="Start date" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" placeholder="End date" />
        <button onClick={loadLedger} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 min-h-[44px]" disabled={!accountFilter || loading}>
          {loading ? 'Loading...' : 'Load Ledger'}
        </button>
      </div>

      {selectedAccount && loaded && (
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-1.5 text-[13px] text-slate-600">
            <span>Account: {selectedAccount.accountCode} — {selectedAccount.accountName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-slate-600">
            <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md font-semibold text-xs bg-blue-100 text-blue-700">{ledgerEntries.length}</span>
            <span>Entries</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-slate-600">
            <span>Total Dr: <strong className="text-blue-700">{fmt(stats.totalDebit)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-slate-600">
            <span>Total Cr: <strong className="text-pink-700">{fmt(stats.totalCredit)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-slate-600">
            <span>
              Balance: <strong style={{ color: stats.lastBalance >= 0 ? '#1d4ed8' : '#be185d' }}>
                {fmt(Math.abs(stats.lastBalance))} {stats.lastBalance >= 0 ? 'Dr' : 'Cr'}
              </strong>
            </span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {!loaded ? (
          <div className="p-10 text-center text-slate-400 text-sm">Select an account and click "Load Ledger" to view entries.</div>
        ) : loading ? (
          <div className="p-6"><div className="skeleton w-full h-[300px]" /></div>
        ) : ledgerEntries.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">No ledger entries found for the selected criteria.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="flex items-center px-4 py-2.5 bg-slate-50 border-b-2 border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[620px]">
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_110px]">Date</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_60px]">V#</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_50px]">Type</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1">Narration</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_100px] text-right">Debit</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_100px] text-right">Credit</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_100px] text-right">Balance</span>
              </div>
              {ledgerEntries.map(e => (
                <div key={e.id} className="flex items-center px-4 py-2.5 border-b border-slate-100 text-sm hover:bg-slate-50">
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_110px] text-[13px]">{e.entryDate}</span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_60px] font-mono text-[13px]">{e.voucherNumber}</span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_50px]">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ backgroundColor: VOUCHER_TYPE_COLORS[e.voucherType].bg, color: VOUCHER_TYPE_COLORS[e.voucherType].fg }}>
                      {e.voucherType}
                    </span>
                  </span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1 text-[13px]">{e.narration}</span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_100px] text-right font-mono text-[13px]" style={{ color: e.debit > 0 ? '#1d4ed8' : '#cbd5e1' }}>
                    {e.debit > 0 ? fmt(e.debit) : ''}
                  </span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_100px] text-right font-mono text-[13px]" style={{ color: e.credit > 0 ? '#be185d' : '#cbd5e1' }}>
                    {e.credit > 0 ? fmt(e.credit) : ''}
                  </span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_100px] text-right font-mono text-[13px] font-semibold" style={{ color: e.balance >= 0 ? '#1e293b' : '#be185d' }}>
                    {fmt(Math.abs(e.balance))} {e.balance >= 0 ? 'Dr' : 'Cr'}
                  </span>
                </div>
              ))}
            </div>
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
  onToggle: () => void;
  onEdit: () => void;
  onAddChild: () => void;
}> = ({ account: a, depth, expanded, hasChildren, onToggle, onEdit, onAddChild }) => {
  const badge = TYPE_BADGE_COLORS[a.accountType];
  return (
    <div className={`flex items-center px-4 py-2.5 border-b border-slate-100 text-sm hover:bg-slate-50 ${a.isActive ? '' : 'opacity-50'}`}>
      <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_40px]" style={{ paddingLeft: depth * 20 }}>
        {hasChildren ? (
          <button onClick={onToggle} className="bg-transparent border-none cursor-pointer text-[10px] text-slate-500 px-1 py-0.5">{expanded ? '▼' : '▶'}</button>
        ) : (
          <span className="text-slate-300 text-[10px]">•</span>
        )}
      </span>
      <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_80px] font-mono text-[13px] text-slate-600">{a.accountCode}</span>
      <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1" style={{ fontWeight: a.level <= 2 ? 600 : 400, color: LEVEL_COLORS[a.level] }}>
        {a.accountName}
      </span>
      <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_100px] text-xs">L{a.level} {a.isPosting ? 'Post' : 'Summ'}</span>
      <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_120px]">
        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ backgroundColor: badge.bg, color: badge.fg }}>
          {ACCOUNT_TYPE_LABELS[a.accountType]}
        </span>
      </span>
      <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_70px] font-medium" style={{ color: a.normalBalance === 'DEBIT' ? '#1d4ed8' : '#be185d' }}>
        {a.normalBalance}
      </span>
      <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_70px]">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: a.isActive ? '#22c55e' : '#ef4444' }} />
      </span>
      <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-[0_0_80px] gap-1">
        <button onClick={onEdit} className="bg-transparent border border-slate-200 rounded-md w-7 h-7 cursor-pointer text-sm text-slate-500 inline-flex items-center justify-center" title="Edit">✎</button>
        {a.level < 4 && <button onClick={onAddChild} className="bg-transparent border border-slate-200 rounded-md w-7 h-7 cursor-pointer text-sm text-slate-500 inline-flex items-center justify-center" title="Add child">+</button>}
      </span>
    </div>
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
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Create Account — Level {level}</h2>
        {parent && <p className="text-[13px] text-slate-500 mb-5">Parent: {parent.accountCode} {parent.accountName}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-gray-700">Account Code (5 digits)</label>
              <input value={code} onChange={e => setCode(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" maxLength={5} placeholder="e.g. 11101" autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-gray-700">Account Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" placeholder="e.g. Cash in Hand" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-gray-700">Account Type</label>
              <select value={accountType} onChange={e => setAccountType(e.target.value as AccountType)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white">
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-gray-700">Control Category (optional)</label>
              <select value={controlCategory} onChange={e => setControlCategory(e.target.value as ControlCategory | '')} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white">
                <option value="">None</option>
                {(Object.entries(CONTROL_CATEGORY_LABELS) as [ControlCategory, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[13px] text-slate-500 bg-slate-50 px-3.5 py-2.5 rounded-lg border border-slate-200">
            This will be a <strong>{level < 4 ? 'Summary' : 'Posting'}</strong> account. Normal balance: <strong>{deriveNormalBalanceLabel(accountType)}</strong>
          </p>
          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2.5 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 min-h-[44px]">Cancel</button>
            <button type="submit" className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 min-h-[44px]" disabled={saving}>{saving ? 'Creating...' : 'Create Account'}</button>
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
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(account.id, {
      accountName: name.trim() || account.accountName,
      isActive,
      controlCategory: controlCategory || null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Edit Account</h2>
        <p className="text-[13px] text-slate-500 mb-5">{account.accountCode} — Level {account.level} — {ACCOUNT_TYPE_LABELS[account.accountType]}</p>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-gray-700">Account Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-gray-700">Control Category</label>
            <select value={controlCategory} onChange={e => setControlCategory(e.target.value as ControlCategory | '')} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white">
              <option value="">None</option>
              {(Object.entries(CONTROL_CATEGORY_LABELS) as [ControlCategory, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-gray-700">Status</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsActive(!isActive)} className="relative w-11 h-6 rounded-full border-none cursor-pointer p-0 transition-colors" style={{ backgroundColor: isActive ? '#22c55e' : '#cbd5e1' }}>
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform" style={{ transform: isActive ? 'translateX(20px)' : 'translateX(2px)' }} />
              </button>
              <span className="text-sm text-slate-600">{isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2.5 mt-2">
            <button onClick={onClose} className="px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 min-h-[44px]">Cancel</button>
            <button onClick={() => onDeactivate(account.id)} className="px-4 py-2.5 bg-white text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50 min-h-[44px]" disabled={saving}>Deactivate</button>
            <button onClick={handleSave} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 min-h-[44px]" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
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
