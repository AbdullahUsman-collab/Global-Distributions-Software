/**
 * Sales Module Page
 * Customer management and Sale Bill entry.
 *
 * Tabs: Customers, Sale Bills
 *
 * Source of Truth:
 *   - audit/05_CUSTOMER_ACCOUNTING.md (Customer entity, DEBITORS 500)
 *   - audit/10_SALES_ENGINE.md (Sale bill entry, SV accounting effect)
 *   - audit/16_CALCULATIONS.md (Tax formulas)
 *   - audit/09_PRICING_ENGINE.md (Price resolution)
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';
import {
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
  getAccounts, getLedger, getProducts, getStockLevels,
  getSales, createSaleBill, postSaleBill, deleteSaleBill,
  getSaleReturns, createSaleReturn, postSaleReturn, deleteSaleReturn,
} from '../lib/api';
import { emitDataRefresh } from '../utils/dataRefresh';
import {
  Customer,
  CreateCustomerDTO,
  UpdateCustomerDTO,
} from '../../domain/types/customer';
import {
  Product,
  StockLevel,
  calculateBillLineTax,
  BillLineTaxInput,
} from '../../domain/types/inventory';import {
  VoucherHeader,
  VoucherStatus,
  VOUCHER_STATUS_LABELS,

} from '../../domain/types/voucher';
import { AccountHead } from '../../domain/types/coa';
import { SaleBillLine, SaleBillCalculation, SaleLineTaxDetail } from '../../domain/services/SalesService';
import { BillRecord } from '../lib/billLabels';
import { SaleReturnLine, SaleReturnBillCalculation, SaleReturnLineTaxDetail } from '../../domain/services/SaleReturnService';

/* ─── Tab Definition ───────────────────────────────────────── */

type SalesTab = 'customers' | 'bills' | 'returns';

const TABS: { key: SalesTab; label: string }[] = [
  { key: 'customers', label: 'Customers' },
  { key: 'bills',     label: 'Sale Bills' },
  { key: 'returns',   label: 'Sale Returns' },
];

/* ─── Constants ────────────────────────────────────────────── */

const fmt = (n: number) => n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Numeric-input parser: '' / '-' / '1.' / garbage → 0 instead of NaN.
 * A transient NaN (e.g. gstPercent while clearing the field) once flowed through
 * calculateBillLineTax into voucher_lines.debit as Postgres numeric 'NaN'
 * (voucher #17), crashing every page that formatted the resulting null.
 */
const num = (raw: string): number => {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

const STATUS_COLORS: Record<VoucherStatus, { bg: string; fg: string }> = {
  DRAFT:  { bg: '#fef3c7', fg: '#92400e' },
  POSTED: { bg: '#dcfce7', fg: '#166534' },
};

/* ═══════════════════════════════════════════════════════════ */
/* Main Sales Component                                       */
/* ═══════════════════════════════════════════════════════════ */

export const Sales: React.FC = () => {
  const { tenant } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<SalesTab>('customers');

  return (
    <div className="page-pad" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <Link to="/dashboard" style={styles.backBtn}>← Dashboard</Link>
          <h1 style={styles.title}>Sales</h1>
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
      {tab === 'customers' && <CustomersTab tenantId={tenant.id} />}
      {tab === 'bills'     && <SaleBillsTab tenantId={tenant.id} />}
      {tab === 'returns'   && <SaleReturnsTab tenantId={tenant.id} />}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Customers Tab                                               */
/* ═══════════════════════════════════════════════════════════ */

const CustomersTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchPrefix, setSearchPrefix] = useState('');
  const [accountCodeMap, setAccountCodeMap] = useState<Map<string, string>>(new Map());
  const [balanceMap, setBalanceMap] = useState<Map<string, { outstanding: number; sales: number; returns: number; receipts: number }>>(new Map());

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const [data, accounts] = await Promise.all([
        getCustomers(),
        getAccounts(),
      ]);
      setCustomers(data);
      // Build accountHeadId → accountCode map for ledger navigation
      const map = new Map<string, string>();
      for (const a of accounts) {
        map.set(a.id, a.accountCode);
      }
      setAccountCodeMap(map);

      // Load balances from ledger entries
      const allEntries = await getLedger();
      const bMap = new Map<string, { outstanding: number; sales: number; returns: number; receipts: number }>();
      for (const c of data) {
        const acc = accounts.find(a => a.id === c.accountHeadId);
        if (!acc) continue;
        const entries = allEntries.filter(e => e.accountId === acc.accountCode);
        let sales = 0, returns = 0, receipts = 0;
        for (const e of entries) {
          if (e.voucherType === 'SV') sales += e.debit;
          else if (e.voucherType === 'SRV') returns += e.credit;
          else if (e.voucherType === 'CR') receipts += e.credit;
        }
        const outstanding = entries.reduce((s, e) => s + e.debit - e.credit, 0);
        bMap.set(c.id, { outstanding: Math.max(0, outstanding), sales, returns, receipts });
      }
      setBalanceMap(bMap);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    if (!searchPrefix) return customers;
    const lower = searchPrefix.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(lower) ||
      c.ownerName.toLowerCase().includes(lower) ||
      (c.phone?.toLowerCase() ?? '').includes(lower) ||
      (c.ntn?.toLowerCase() ?? '').includes(lower) ||
      (c.cnic?.toLowerCase() ?? '').includes(lower)
    );
  }, [customers, searchPrefix]);

  const handleCreate = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleSave = async (dto: CreateCustomerDTO | UpdateCustomerDTO) => {
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, dto as UpdateCustomerDTO);
      } else {
        await createCustomer(dto as CreateCustomerDTO);
      }
      setShowForm(false);
      setEditingCustomer(null);
      await loadCustomers();
    } catch (err) {
      console.error('Failed to save customer:', err);
      alert(err instanceof Error ? err.message : 'Failed to save customer');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this customer?')) return;
    try {
      await deleteCustomer(id);
      await loadCustomers();
    } catch (err) {
      console.error('Failed to deactivate customer:', err);
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="Search customers..."
          value={searchPrefix}
          onChange={e => setSearchPrefix(e.target.value)}
          style={styles.searchInput}
        />
        <button onClick={handleCreate} style={styles.primaryBtn}>+ New Customer</button>
      </div>

      {/* Customer Form Modal */}
      {showForm && (
        <CustomerForm
          customer={editingCustomer}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingCustomer(null); }}
        />
      )}

      {/* Customer List */}
      {loading ? (
        <p style={styles.loading}>Loading customers...</p>
      ) : filteredCustomers.length === 0 ? (
        <p style={styles.empty}>No customers found.</p>
      ) : (
        <div className="table-wrap">
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Owner</th>
                <th style={styles.th} className="sales-hide-mobile">Phone</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Sales</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Returns</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Receipts</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Outstanding</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(c => {
                const bal = balanceMap.get(c.id);
                return (
                <tr key={c.id} style={styles.tr}>
                  <td style={styles.td}>{c.name}</td>
                  <td style={styles.td}>{c.ownerName}</td>
                  <td style={styles.td} className="sales-hide-mobile">{c.phone}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                    {bal && bal.sales > 0 ? bal.sales.toLocaleString() : '—'}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                    {bal && bal.returns > 0 ? bal.returns.toLocaleString() : '—'}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                    {bal && bal.receipts > 0 ? bal.receipts.toLocaleString() : '—'}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '600' }}>
                    {bal ? bal.outstanding.toLocaleString() : '—'}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: c.isActive ? '#dcfce7' : '#fee2e2',
                      color: c.isActive ? '#166534' : '#991b1b',
                    }}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => handleEdit(c)} style={styles.linkBtn}>Edit</button>
                    <button
                      onClick={() => {
                        const code = accountCodeMap.get(c.accountHeadId);
                        if (code) navigate('/finance', { state: { tab: 'ledger', accountId: code } });
                      }}
                      style={styles.linkBtn}
                    >
                      Ledger
                    </button>
                    {c.isActive && (
                      <button onClick={() => handleDeactivate(c.id)} style={styles.dangerBtn}>Deactivate</button>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ─── Customer Form ────────────────────────────────────────── */

const CustomerForm: React.FC<{
  customer: Customer | null;
  onSave: (dto: CreateCustomerDTO | UpdateCustomerDTO) => void;
  onCancel: () => void;
}> = ({ customer, onSave, onCancel }) => {
  const [name, setName] = useState(customer?.name ?? '');
  const [address, setAddress] = useState(customer?.address ?? '');
  const [ownerName, setOwnerName] = useState(customer?.ownerName ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [stn, setStn] = useState(customer?.stn ?? '');
  const [ntn, setNtn] = useState(customer?.ntn ?? '');
  const [cnic, setCnic] = useState(customer?.cnic ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Customer name is required');
      return;
    }
    onSave({ name: name.trim(), address, ownerName, phone, stn, ntn, cnic });
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h2 style={styles.modalTitle}>{customer ? 'Edit Customer' : 'New Customer'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Customer Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} style={styles.input} required />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Owner Name</label>
              <input value={ownerName} onChange={e => setOwnerName(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Address</label>
              <input value={address} onChange={e => setAddress(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>STN</label>
              <input value={stn} onChange={e => setStn(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>NTN</label>
              <input value={ntn} onChange={e => setNtn(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>CNIC</label>
              <input value={cnic} onChange={e => setCnic(e.target.value)} style={styles.input} />
            </div>
          </div>
          <div style={styles.formActions}>
            <button type="button" onClick={onCancel} style={styles.secondaryBtn}>Cancel</button>
            <button type="submit" style={styles.primaryBtn}>{customer ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Sale Bills Tab                                              */
/* ═══════════════════════════════════════════════════════════ */

const SaleBillsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  // GET /api/sales returns enriched BillRecord[] ({ voucher, partyName, total, ... }) —
  // not flat voucher headers. Render from b.voucher.*.
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSales();
      if (data) setBills(data.sort((a, b) => (b.voucher.date || '').localeCompare(a.voucher.date || '')));
    } catch (err) {
      console.error('Failed to load bills:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { loadBills(); }, [loadBills]);

  const handlePost = async (id: string) => {
    if (!confirm('Post this sale bill? This will create GL entries and deduct stock.')) return;
    try {
      await postSaleBill(id);
      emitDataRefresh('sale-posted');
      await loadBills();
    } catch (err) {
      console.error('Failed to post bill:', err);
      alert(err instanceof Error ? err.message : 'Failed to post bill');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft bill?')) return;
    try {
      await deleteSaleBill(id);
      emitDataRefresh('sale-deleted');
      await loadBills();
    } catch (err) {
      console.error('Failed to delete bill:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete bill');
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <h2 style={styles.sectionTitle}>Sale Bills</h2>
        <button onClick={() => setShowForm(true)} style={styles.primaryBtn}>+ New Sale Bill</button>
      </div>

      {/* Bill Form Modal */}
      {showForm && (
        <SaleBillForm
          tenantId={tenantId}
          onSaved={async () => { setShowForm(false); await loadBills(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Bill List */}
      {loading ? (
        <p style={styles.loading}>Loading bills...</p>
      ) : bills.length === 0 ? (
        <p style={styles.empty}>No sale bills yet.</p>
      ) : (
        <div className="table-wrap">
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Bill #</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Narration</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map(b => (
                <tr key={b.voucher.id} style={styles.tr}>
                  <td style={styles.td}>{b.voucher.voucherNumber}</td>
                  <td style={styles.td}>{b.voucher.date}</td>
                  <td style={styles.td}>{b.voucher.narration}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: STATUS_COLORS[b.voucher.status]?.bg ?? '#f1f5f9',
                      color: STATUS_COLORS[b.voucher.status]?.fg ?? '#475569',
                    }}>
                      {VOUCHER_STATUS_LABELS[b.voucher.status]}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => navigate('/bills/' + b.voucher.id)} style={styles.linkBtn}>View</button>
                    {b.voucher.status === 'DRAFT' && (
                      <>
                        <button onClick={() => handlePost(b.voucher.id)} style={styles.linkBtn}>Post</button>
                        <button onClick={() => handleDelete(b.voucher.id)} style={styles.dangerBtn}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ─── Sale Bill Form ───────────────────────────────────────── */

const SaleBillForm: React.FC<{
  tenantId: string;
  onSaved: () => void;
  onCancel: () => void;
}> = ({ tenantId, onSaved, onCancel }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);

  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<SaleBillLine[]>([]);
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  // Load master data
  useEffect(() => {
    const load = async () => {
      const [custs, prods, lvls] = await Promise.all([
        getCustomers().then(c => c.filter((c: any) => c.isActive)),
        getProducts(),
        getStockLevels(),
      ]);
      setCustomers(custs);
      setProducts(prods.filter(p => p.isActive));
      setStockLevels(lvls);
    };
    load();
  }, [tenantId]);

  // Get product map for auto-fill
  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  // Map productId → total quantity on hand
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const sl of stockLevels) {
      map.set(sl.productId, (map.get(sl.productId) ?? 0) + sl.quantityOnHand);
    }
    return map;
  }, [stockLevels]);

  // Calculate bill
  const calculation = useMemo<SaleBillCalculation>(() => {
    const lineDetails: SaleLineTaxDetail[] = [];
    let totalCartons = 0;
    let totalPacks = 0;

    for (const line of lines) {
      const product = productMap.get(line.productId);
      const pcsPerCarton = product?.pcsPerCarton ?? 1;
      const totalPacksForLine = line.packs;

      const input: BillLineTaxInput = {
        quantity: totalPacksForLine,
        rate: line.rate,
        tradeDiscountPercent: line.tradeDiscountPercent,
        tradeOfferPercent: line.tradeOfferPercent,
        specialDiscountPercent: line.specialDiscountPercent,
        gstPercent: line.gstPercent,
        furtherTaxPercent: line.furtherTaxPercent,
        fedPercent: line.fedPercent,
        advanceTaxPercent: line.advanceTaxPercent,
      };
      const detail = calculateBillLineTax(input);
      lineDetails.push(detail);
      totalCartons += line.cartons;
      totalPacks += totalPacksForLine;
    }

    return {
      lines: lineDetails,
      totalCartons,
      totalPacks,
      totalAmount: lineDetails.reduce((s, l) => s + l.amount, 0),
      totalDiscount: lineDetails.reduce((s, l) => s + l.discountAmount, 0),
      totalToAmount: lineDetails.reduce((s, l) => s + l.toAmount, 0),
      totalGst: lineDetails.reduce((s, l) => s + l.gstAmount, 0),
      totalFurtherTax: lineDetails.reduce((s, l) => s + l.furtherTaxAmount, 0),
      totalFed: lineDetails.reduce((s, l) => s + l.fedAmount, 0),
      totalAdvanceTax: lineDetails.reduce((s, l) => s + l.advanceTaxAmount, 0),
      totalNetAmount: lineDetails.reduce((s, l) => s + l.netAmount, 0),
    };
  }, [lines, productMap]);

  // Add new empty line (for dynamic line addition)
  const addEmptyLine = () => {
    setLines(prev => [...prev, {
      productId: '',
      cartons: 0,
      packs: 0,
      rate: 0,
      purchaseRate: 0,
      retailPrice: 0,
      marginPercent: 0,
      tradeDiscountPercent: 0,
      tradeOfferPercent: 0,
      specialDiscountPercent: 0,
      minQuantity: 0,
      hsCode: '',
      gstType: 'VAT',
      gstPercent: 0,
      fedPercent: 0,
      furtherTaxPercent: 0,
      advanceTaxPercent: 0,
    }]);
  };

  // Initialize with one empty line
  useEffect(() => {
    if (lines.length === 0) addEmptyLine();
  }, []);

  // Update line
  const updateLine = (idx: number, updates: Partial<SaleBillLine>) => {
    setLines(prev => {
      const next = prev.map((l, i) => {
        if (i !== idx) return l;
        const updated = { ...l, ...updates };
        // Auto-fill ALL fields from product if product changed
        if (updates.productId) {
          const product = productMap.get(updates.productId);
          if (product) {
            updated.rate = product.saleRate;
            updated.purchaseRate = product.purchaseRate;
            updated.retailPrice = product.retailPrice;
            updated.marginPercent = product.margin;
            updated.tradeDiscountPercent = product.tradeDiscount;
            updated.tradeOfferPercent = 0;
            updated.specialDiscountPercent = 0;
            updated.minQuantity = product.minQuantity;
            updated.hsCode = product.hsCode;
            updated.gstType = product.gstType;
            updated.gstPercent = product.gstPercent;
            updated.fedPercent = product.fedPercent;
            updated.furtherTaxPercent = product.furtherTaxPercent;
            updated.advanceTaxPercent = product.advanceTaxSalePercent;
          }
        }
        // Auto-calculate packs from cartons × pcsPerCarton
        if (updates.cartons !== undefined) {
          const product = productMap.get(updated.productId);
          const pcsPerCarton = product?.pcsPerCarton ?? 1;
          updated.packs = updates.cartons * pcsPerCarton;
        }
        return updated;
      });
      // Auto-append empty line when a product is selected on the last line
      const lastLine = next[next.length - 1];
      if (lastLine && lastLine.productId !== '' && idx === next.length - 1) {
        next.push({
          productId: '', cartons: 0, packs: 0, rate: 0,
          purchaseRate: 0, retailPrice: 0, marginPercent: 0,
          tradeDiscountPercent: 0, tradeOfferPercent: 0, specialDiscountPercent: 0,
          minQuantity: 0, hsCode: '', gstType: 'VAT', gstPercent: 0,
          fedPercent: 0, furtherTaxPercent: 0, advanceTaxPercent: 0,
        });
      }
      return next;
    });
  };

  // Toggle expand/collapse for secondary fields
  const toggleExpand = (idx: number) => {
    setExpandedLines(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Save
  const handleSave = async () => {
    if (!customerId) { alert('Select a customer'); return; }
    const validLines = lines.filter(l => l.productId);
    if (validLines.length === 0) { alert('Add at least one line with a product'); return; }

    setSaving(true);
    try {
      const voucher = await createSaleBill({
        customerId,
        // warehouseId intentionally omitted — server resolves the implicit default
        date,
        narration: narration || undefined,
        lines: validLines,
      });

      // Auto-post
      await postSaleBill(voucher.id);
      onSaved();
    } catch (err: any) {
      console.error('Failed to save bill:', err);
      const msg = err?.message || (typeof err === 'string' ? err : null) || 'Failed to save bill';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modal, maxWidth: '900px' }}>
        <h2 style={styles.modalTitle}>New Sale Bill</h2>

        {/* Header Fields */}
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Customer *</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} style={styles.select}>
              <option value="">Select Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <input value={narration} onChange={e => setNarration(e.target.value)} style={styles.input} />
          </div>
        </div>

        {/* Lines */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600' }}>Bill Lines</h3>
          </div>

          {lines.every(l => !l.productId) && (
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>Select a product below to start adding items.</p>
          )}
            <div className="table-wrap sale-lines-wrap">
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}></th>
                    <th style={styles.th}>Item</th>
                    <th style={styles.th}>Ctns</th>
                    <th style={styles.th}>Pcs</th>
                    <th style={styles.th}>Rate</th>
                    <th style={styles.th}>Disc%</th>
                    <th style={styles.th}>ST%</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Tax</th>
                    <th style={styles.th}>Net</th>
                    <th style={styles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const detail = calculation.lines[idx];
                    const isExpanded = expandedLines.has(idx);
                    const hasProduct = !!line.productId;
                    return (
                      <React.Fragment key={idx}>
                        <tr style={styles.tr}>
                          <td style={{ ...styles.td, width: '32px' }}>
                            {hasProduct && (
                              <button
                                onClick={() => toggleExpand(idx)}
                                title={isExpanded ? 'Collapse details' : 'Expand details'}
                                style={{
                                  ...styles.smallBtn,
                                  padding: '2px 6px',
                                  fontSize: '11px',
                                  backgroundColor: isExpanded ? '#dbeafe' : '#f1f5f9',
                                  color: isExpanded ? '#2563eb' : '#64748b',
                                }}
                              >
                                {isExpanded ? '▼' : '▶'}
                              </button>
                            )}
                          </td>
                          <td style={styles.td}>
                            <select
                              value={line.productId}
                              onChange={e => updateLine(idx, { productId: e.target.value })}
                              style={{ ...styles.select, minWidth: '150px' }}
                            >
                              <option value="">Select Item</option>
                              {products.map(p => {
                                const qty = stockMap.get(p.id) ?? 0;
                                const oos = qty === 0;
                                return (
                                  <option key={p.id} value={p.id} style={oos ? { color: '#94a3b8' } : undefined}>
                                    {p.name}{oos ? ' (Out of Stock)' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </td>
                          <td style={styles.td}>
                            <input
                              type="number"
                              value={line.cartons}
                              onChange={e => updateLine(idx, { cartons: num(e.target.value) })}
                              style={{ ...styles.input, width: '60px' }}
                              min={0}
                            />
                          </td>
                          <td style={styles.td}>
                            <input
                              type="number"
                              value={line.packs}
                              onChange={e => updateLine(idx, { packs: num(e.target.value) })}
                              style={{ ...styles.input, width: '60px' }}
                              min={0}
                            />
                          </td>
                          <td style={styles.td}>
                            <input
                              type="number"
                              value={line.rate}
                              onChange={e => updateLine(idx, { rate: num(e.target.value) })}
                              style={{ ...styles.input, width: '80px' }}
                              min={0}
                              step={0.01}
                            />
                          </td>
                          <td style={styles.td}>
                            <input
                              type="number"
                              value={line.tradeDiscountPercent}
                              onChange={e => updateLine(idx, { tradeDiscountPercent: num(e.target.value) })}
                              style={{ ...styles.input, width: '50px' }}
                              min={0}
                              step={0.1}
                            />
                          </td>
                          <td style={styles.td}>
                            <input
                              type="number"
                              value={line.gstPercent}
                              onChange={e => updateLine(idx, { gstPercent: num(e.target.value) })}
                              style={{ ...styles.input, width: '50px' }}
                              min={0}
                              step={0.1}
                            />
                          </td>
                          <td style={styles.td}>{detail ? fmt(detail.amount) : '0.00'}</td>
                          <td style={styles.td}>{detail ? fmt(detail.gstAmount + detail.fedAmount) : '0.00'}</td>
                          <td style={styles.td}><strong>{detail ? fmt(detail.netAmount) : '0.00'}</strong></td>
                          <td style={styles.td}>
                            <button onClick={() => {
                              setLines(prev => prev.filter((_, i) => i !== idx));
                              setExpandedLines(prev => { const n = new Set(prev); n.delete(idx); return n; });
                            }} style={styles.dangerBtn}>×</button>
                          </td>
                        </tr>
                        {/* Expanded secondary fields panel */}
                        {isExpanded && hasProduct && (
                          <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                            <td colSpan={11} style={{ padding: '12px 16px', backgroundColor: '#f8fafc' }}>
                              <div className="sale-line-details">
                                <div className="sale-line-details-grid">
                                  <div style={styles.formGroup}>
                                    <label style={styles.label}>Purchase Rate</label>
                                    <input type="number" value={line.purchaseRate ?? 0}
                                      onChange={e => updateLine(idx, { purchaseRate: num(e.target.value) })}
                                      style={styles.input} min={0} step={0.01} />
                                  </div>
                                  <div style={styles.formGroup}>
                                    <label style={styles.label}>Retail Price</label>
                                    <input type="number" value={line.retailPrice ?? 0}
                                      onChange={e => updateLine(idx, { retailPrice: num(e.target.value) })}
                                      style={styles.input} min={0} step={0.01} />
                                  </div>
                                  <div style={styles.formGroup}>
                                    <label style={styles.label}>Margin %</label>
                                    <input type="number" value={line.marginPercent ?? 0}
                                      onChange={e => updateLine(idx, { marginPercent: num(e.target.value) })}
                                      style={styles.input} min={0} step={0.01} />
                                  </div>
                                  <div style={styles.formGroup}>
                                    <label style={styles.label}>Trade Offer %</label>
                                    <input type="number" value={line.tradeOfferPercent ?? 0}
                                      onChange={e => updateLine(idx, { tradeOfferPercent: num(e.target.value) })}
                                      style={styles.input} min={0} step={0.1} />
                                  </div>
                                  <div style={styles.formGroup}>
                                    <label style={styles.label}>Special Disc %</label>
                                    <input type="number" value={line.specialDiscountPercent ?? 0}
                                      onChange={e => updateLine(idx, { specialDiscountPercent: num(e.target.value) })}
                                      style={styles.input} min={0} step={0.1} />
                                  </div>
                                  <div style={styles.formGroup}>
                                    <label style={styles.label}>Min Qty</label>
                                    <input type="number" value={line.minQuantity ?? 0}
                                      onChange={e => updateLine(idx, { minQuantity: num(e.target.value) })}
                                      style={styles.input} min={0} />
                                  </div>
                                  <div style={styles.formGroup}>
                                    <label style={styles.label}>HS Code</label>
                                    <input type="text" value={line.hsCode ?? ''}
                                      onChange={e => updateLine(idx, { hsCode: e.target.value })}
                                      style={styles.input} />
                                  </div>
                                  <div style={styles.formGroup}>
                                    <label style={styles.label}>GST Type</label>
                                    <select value={line.gstType ?? 'VAT'}
                                      onChange={e => updateLine(idx, { gstType: e.target.value })}
                                      style={styles.select}>
                                      <option value="VAT">Standard VAT</option>
                                      <option value="3RD">3rd Schedule</option>
                                      <option value="8TH">8th Schedule</option>
                                    </select>
                                  </div>
                                  <div style={styles.formGroup}>
                                    <label style={styles.label}>FED %</label>
                                    <input type="number" value={line.fedPercent ?? 0}
                                      onChange={e => updateLine(idx, { fedPercent: num(e.target.value) })}
                                      style={styles.input} min={0} step={0.1} />
                                  </div>
                                  <div style={styles.formGroup}>
                                    <label style={styles.label}>Further Tax %</label>
                                    <input type="number" value={line.furtherTaxPercent ?? 0}
                                      onChange={e => updateLine(idx, { furtherTaxPercent: num(e.target.value) })}
                                      style={styles.input} min={0} step={0.1} />
                                  </div>
                                  <div style={styles.formGroup}>
                                    <label style={styles.label}>Advance Tax %</label>
                                    <input type="number" value={line.advanceTaxPercent ?? 0}
                                      onChange={e => updateLine(idx, { advanceTaxPercent: num(e.target.value) })}
                                      style={styles.input} min={0} step={0.1} />
                                  </div>
                                  <div style={styles.formGroup}>
                                    <label style={styles.label}>Cost Rate</label>
                                    <input type="number" value={productMap.get(line.productId)?.costRate ?? 0}
                                      style={{ ...styles.input, backgroundColor: '#f1f5f9', color: '#64748b' }}
                                      readOnly tabIndex={-1} />
                                  </div>
                                </div>
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

        {/* Totals */}
        {lines.length > 0 && (() => {
          const hasProduct = lines.some(l => l.productId);
          const totalTradeDiscount = lines.reduce((s, l) => s + (l.packs * l.rate * (l.tradeDiscountPercent || 0) / 100), 0);
          const totalTradeOffer = lines.reduce((s, l) => s + (l.packs * l.rate * (l.tradeOfferPercent || 0) / 100), 0);
          const totalSpecialDiscount = lines.reduce((s, l) => s + (l.packs * l.rate * (l.specialDiscountPercent || 0) / 100), 0);
          return hasProduct ? (
          <div style={styles.totalsBox}>
            <div style={styles.totalRow}>
              <span>Total Amount:</span><span>{fmt(calculation.totalAmount)}</span>
            </div>
            {totalTradeDiscount > 0 && (
              <div style={styles.totalRow}>
                <span>Trade Discount:</span><span>{fmt(totalTradeDiscount)}</span>
              </div>
            )}
            {totalTradeOffer > 0 && (
              <div style={styles.totalRow}>
                <span>Trade Offer:</span><span>{fmt(totalTradeOffer)}</span>
              </div>
            )}
            {totalSpecialDiscount > 0 && (
              <div style={styles.totalRow}>
                <span>Special Discount:</span><span>{fmt(totalSpecialDiscount)}</span>
              </div>
            )}
            {calculation.totalDiscount > 0 && (
              <div style={styles.totalRow}>
                <span>Total Discount:</span><span>{fmt(calculation.totalDiscount)}</span>
              </div>
            )}
            <div style={styles.totalRow}>
              <span>After Discount (Value Excl Tax):</span><span>{fmt(calculation.totalToAmount)}</span>
            </div>
            {calculation.totalGst > 0 && (
              <div style={styles.totalRow}>
                <span>GST:</span><span>{fmt(calculation.totalGst)}</span>
              </div>
            )}
            {calculation.totalFurtherTax > 0 && (
              <div style={styles.totalRow}>
                <span>Further Tax:</span><span>{fmt(calculation.totalFurtherTax)}</span>
              </div>
            )}
            {calculation.totalFed > 0 && (
              <div style={styles.totalRow}>
                <span>FED:</span><span>{fmt(calculation.totalFed)}</span>
              </div>
            )}
            {calculation.totalAdvanceTax > 0 && (
              <div style={styles.totalRow}>
                <span>Advance Tax:</span><span>{fmt(calculation.totalAdvanceTax)}</span>
              </div>
            )}
            <div style={{ ...styles.totalRow, fontWeight: '700', fontSize: '15px', borderTop: '2px solid #e2e8f0', paddingTop: '8px' }}>
              <span>Net Amount:</span><span>{fmt(calculation.totalNetAmount)}</span>
            </div>
          </div>
          ) : null;
        })()}

        {/* Actions */}
        <div style={styles.formActions}>
          <button type="button" onClick={onCancel} style={styles.secondaryBtn}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || lines.length === 0 || !customerId}
            style={styles.primaryBtn}
          >
            {saving ? 'Saving...' : 'Save & Post Bill'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Sale Returns Tab                                             */
/* ═══════════════════════════════════════════════════════════ */

const SaleReturnsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [returns, setReturns] = useState<VoucherHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const loadReturns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSaleReturns();
      if (data) setReturns(data.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (err) {
      console.error('Failed to load sale returns:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { loadReturns(); }, [loadReturns]);

  const handlePost = async (id: string) => {
    if (!confirm('Post this sale return? This will create GL entries and restore stock.')) return;
    try {
      await postSaleReturn(id);
      emitDataRefresh('sale-return-posted');
      await loadReturns();
    } catch (err) {
      console.error('Failed to post sale return:', err);
      alert(err instanceof Error ? err.message : 'Failed to post sale return');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft sale return?')) return;
    try {
      await deleteSaleReturn(id);
      emitDataRefresh('sale-return-deleted');
      await loadReturns();
    } catch (err) {
      console.error('Failed to delete sale return:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete sale return');
    }
  };

  return (
    <div>
      <div style={styles.toolbar}>
        <h2 style={styles.sectionTitle}>Sale Returns (SRV)</h2>
        <button onClick={() => setShowForm(true)} style={styles.primaryBtn}>+ New Sale Return</button>
      </div>

      {showForm && (
        <SaleReturnForm
          tenantId={tenantId}
          onSaved={async () => { setShowForm(false); await loadReturns(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <p style={styles.loading}>Loading returns...</p>
      ) : returns.length === 0 ? (
        <p style={styles.empty}>No sale returns yet.</p>
      ) : (
        <div className="table-wrap">
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>SRV #</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Narration</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {returns.map(r => (
                <tr key={r.id} style={styles.tr}>
                  <td style={styles.td}>{r.voucherNumber}</td>
                  <td style={styles.td}>{r.date}</td>
                  <td style={styles.td}>{r.narration}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: STATUS_COLORS[r.status]?.bg ?? '#f1f5f9',
                      color: STATUS_COLORS[r.status]?.fg ?? '#475569',
                    }}>
                      {VOUCHER_STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => navigate('/bills/' + r.id)} style={styles.linkBtn}>View</button>
                    {r.status === 'DRAFT' && (
                      <>
                        <button onClick={() => handlePost(r.id)} style={styles.linkBtn}>Post</button>
                        <button onClick={() => handleDelete(r.id)} style={styles.dangerBtn}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ─── Sale Return Form ─────────────────────────────────────── */

const SaleReturnForm: React.FC<{
  tenantId: string;
  onSaved: () => void;
  onCancel: () => void;
}> = ({ tenantId, onSaved, onCancel }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<SaleReturnLine[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [custs, prods] = await Promise.all([
        getCustomers().then(c => c.filter((c: any) => c.isActive)),
        getProducts(),
      ]);
      setCustomers(custs);
      setProducts(prods.filter(p => p.isActive));
    };
    load();
  }, [tenantId]);

  const addLine = () => {
    setLines([...lines, {
      productId: '',
      cartons: 0,
      packs: 0,
      rate: 0,
      tradeDiscountPercent: 0,
      gstPercent: 0,
      furtherTaxPercent: 0,
      fedPercent: 0,
      advanceTaxPercent: 0,
    }]);
  };

  const updateLine = (idx: number, field: keyof SaleReturnLine, value: string | number) => {
    const updated = [...lines];
    (updated[idx] as any)[field] = value;
    setLines(updated);
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!customerId) { alert('Select a customer'); return; }
    if (lines.length === 0) { alert('Add at least one line'); return; }
    for (const line of lines) {
      if (!line.productId) { alert('Select a product for all lines'); return; }
      if (line.packs <= 0) { alert('Quantity must be > 0'); return; }
    }
    setSaving(true);
    try {
      await createSaleReturn({
        customerId,
        // warehouseId intentionally omitted — server resolves the implicit default
        date,
        narration: narration || undefined,
        lines,
      });
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modal, maxWidth: '900px' }}>
        <h2 style={styles.modalTitle}>New Sale Return</h2>

        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Customer *</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} style={styles.select}>
              <option value="">-- Select Customer --</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Narration</label>
            <input value={narration} onChange={e => setNarration(e.target.value)} style={styles.input} placeholder="Optional" />
          </div>
        </div>

        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600' }}>Return Lines</h3>
            <button onClick={addLine} style={styles.secondaryBtn}>+ Add Line</button>
          </div>
          {lines.map((line, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <select value={line.productId} onChange={e => updateLine(idx, 'productId', e.target.value)} style={{ ...styles.select, flex: 2 }}>
                <option value="">-- Product --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" placeholder="Packs" value={line.packs || ''} onChange={e => updateLine(idx, 'packs', num(e.target.value))} style={{ ...styles.input, flex: 1 }} min={0} />
              <input type="number" placeholder="Rate" value={line.rate || ''} onChange={e => updateLine(idx, 'rate', num(e.target.value))} style={{ ...styles.input, flex: 1 }} min={0} step={0.01} />
              <input type="number" placeholder="GST %" value={line.gstPercent || ''} onChange={e => updateLine(idx, 'gstPercent', num(e.target.value))} style={{ ...styles.input, flex: 1 }} min={0} />
              <button onClick={() => removeLine(idx)} style={styles.dangerBtn}>✕</button>
            </div>
          ))}
        </div>

        <div style={styles.formActions}>
          <button type="button" onClick={onCancel} style={styles.secondaryBtn}>Cancel</button>
          <button type="button" onClick={handleSave} style={styles.primaryBtn} disabled={saving}>
            {saving ? 'Saving...' : 'Create Return'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Styles                                                      */
/* ═══════════════════════════════════════════════════════════ */

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '24px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '13px',
    padding: 0,
    marginBottom: '4px',
    textDecoration: 'none',
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
    margin: '4px 0 0',
  },
  tabBar: {
    display: 'flex',
    gap: '4px',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: '20px',
    overflowX: 'auto',
  },
  tab: {
    padding: '10px 16px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    color: '#2563eb',
    borderBottomColor: '#2563eb',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    gap: '12px',
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
  },
  searchInput: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '200px',
  },
  primaryBtn: {
    padding: '8px 16px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  smallBtn: {
    padding: '4px 10px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '2px 6px',
  },
  dangerBtn: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '2px 6px',
  },
  loading: {
    color: '#94a3b8',
    fontSize: '14px',
    textAlign: 'center',
    padding: '32px',
  },
  empty: {
    color: '#94a3b8',
    fontSize: '14px',
    textAlign: 'center',
    padding: '32px',
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
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '16px',
    color: '#1e293b',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#64748b',
  },
  input: {
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
  },
  select: {
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  totalsBox: {
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '13px',
  },
};
