/**
 * Purchases Module Page
 * Supplier management and Purchase Bill entry.
 *
 * Tabs: Suppliers, Purchase Bills
 *
 * Source of Truth:
 *   - audit/06_SUPPLIER_ACCOUNTING.md (Supplier entity, PAYABLE 8000)
 *   - audit/11_PURCHASE_ENGINE.md (Purchase bill entry, PV accounting effect)
 *   - audit/16_CALCULATIONS.md (Tax formulas)
 *   - audit/07_INVENTORY_ENGINE.md (GRN movement)
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';
import {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  getAccounts, getLedger, getProducts, getStockLevels,
  getPurchases, createPurchaseBill, postPurchaseBill, deletePurchaseBill,
  getPurchaseReturns, createPurchaseReturn, postPurchaseReturn, deletePurchaseReturn,
} from '../lib/api';
import { emitDataRefresh } from '../utils/dataRefresh';
import {
  Supplier,
  CreateSupplierDTO,
  UpdateSupplierDTO,
} from '../../domain/types/supplier';
import {
  Product,
  StockLevel,
  calculateBillLineTax,
  BillLineTaxInput,
} from '../../domain/types/inventory';
import {
  VoucherHeader,
  VoucherStatus,
  VOUCHER_STATUS_LABELS,
} from '../../domain/types/voucher';
import { PurchaseBillLine, PurchaseBillCalculation, PurchaseLineTaxDetail } from '../../domain/services/PurchaseService';
import { BillRecord } from '../lib/billLabels';
import { PurchaseReturnLine, PurchaseReturnBillCalculation, PurchaseReturnLineTaxDetail } from '../../domain/services/PurchaseReturnService';

/* ─── Tab Definition ───────────────────────────────────────── */

type PurchasesTab = 'suppliers' | 'bills' | 'returns';

const TABS: { key: PurchasesTab; label: string }[] = [
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'bills',     label: 'Purchase Bills' },
  { key: 'returns',   label: 'Purchase Returns' },
];

/* ─── Constants ────────────────────────────────────────────── */

const fmt = (n: number) => n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * NaN-safe numeric parser — returns 0 for empty string, NaN, or
 * Infinity. Mirrors Sales.tsx num() to prevent the NaN-poisoning
 * class of bugs (voucher #17, production outage 2026-09-16).
 */
const num = (raw: string): number => {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

const STATUS_COLORS: Record<VoucherStatus, { bg: string; fg: string }> = {
  DRAFT:  { bg: 'var(--tx-draft-bg)', fg: 'var(--tx-draft-fg)' },
  POSTED: { bg: 'var(--tx-posted-bg)', fg: 'var(--tx-posted-fg)' },
};

/* ═══════════════════════════════════════════════════════════ */
/* Main Purchases Component                                     */
/* ═══════════════════════════════════════════════════════════ */

export const Purchases: React.FC = () => {
  const { tenant, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<PurchasesTab>('suppliers');

  return (
    <div className="page-pad tx-page" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <Link to="/dashboard" style={styles.backBtn}>← Dashboard</Link>
          <h1 style={styles.title}>Purchases</h1>
          <p style={styles.subtitle}>{tenant.brandName}</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar-scroll" style={styles.tabBar}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`tx-tab${tab === t.key ? ' tx-tab-active' : ''}`}
            aria-pressed={tab === t.key}
            style={{ ...styles.tab, ...(tab === t.key ? styles.tabActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'suppliers' && <SuppliersTab tenantId={tenant.id} />}
      {tab === 'bills'     && <PurchaseBillsTab tenantId={tenant.id} />}
      {tab === 'returns'   && <PurchaseReturnsTab tenantId={tenant.id} />}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Suppliers Tab                                                */
/* ═══════════════════════════════════════════════════════════ */

const SuppliersTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchPrefix, setSearchPrefix] = useState('');
  const [accountCodeMap, setAccountCodeMap] = useState<Map<string, string>>(new Map());
  const [balanceMap, setBalanceMap] = useState<Map<string, { outstanding: number; purchases: number; returns: number; payments: number }>>(new Map());

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const [data, accounts] = await Promise.all([
        getSuppliers(),
        getAccounts(),
      ]);
      setSuppliers(data);
      // Build accountHeadId → accountCode map for ledger navigation
      const map = new Map<string, string>();
      for (const a of accounts) {
        map.set(a.id, a.accountCode);
      }
      setAccountCodeMap(map);

      // Load balances from ledger entries
      const allEntries = await getLedger();
      const bMap = new Map<string, { outstanding: number; purchases: number; returns: number; payments: number }>();
      for (const s of data) {
        const acc = accounts.find(a => a.id === s.accountHeadId);
        if (!acc) continue;
        const entries = allEntries.filter(e => e.accountId === acc.accountCode);
        let purchases = 0, returns = 0, payments = 0;
        for (const e of entries) {
          if (e.voucherType === 'PV') purchases += e.credit;
          else if (e.voucherType === 'PRV') returns += e.debit;
          else if (e.voucherType === 'CP') payments += e.debit;
        }
        const outstanding = entries.reduce((s, e) => s + e.credit - e.debit, 0);
        bMap.set(s.id, { outstanding: Math.max(0, outstanding), purchases, returns, payments });
      }
      setBalanceMap(bMap);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const filteredSuppliers = useMemo(() => {
    if (!searchPrefix) return suppliers;
    const lower = searchPrefix.toLowerCase();
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(lower) ||
      (s.contactPerson?.toLowerCase().includes(lower) ?? false) ||
      (s.phone?.includes(lower) ?? false) ||
      (s.city?.toLowerCase().includes(lower) ?? false)
    );
  }, [suppliers, searchPrefix]);

  const handleCreate = () => {
    setEditingSupplier(null);
    setShowForm(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setShowForm(true);
  };

  const handleSave = async (dto: CreateSupplierDTO | UpdateSupplierDTO) => {
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, dto);
      } else {
        await createSupplier(dto);
      }
      setShowForm(false);
      setEditingSupplier(null);
      await loadSuppliers();
    } catch (err) {
      console.error('Failed to save supplier:', err);
      alert(err instanceof Error ? err.message : 'Failed to save supplier');
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this supplier?')) return;
    try {
      await deleteSupplier(id);
      await loadSuppliers();
    } catch (err) {
      console.error('Failed to deactivate supplier:', err);
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <input
          type="text"
          placeholder="Search suppliers..."
          value={searchPrefix}
          onChange={e => setSearchPrefix(e.target.value)}
          style={styles.searchInput}
        />
        <button onClick={handleCreate} className="tx-btn tx-btn-primary" style={styles.primaryBtn}>+ New Supplier</button>
      </div>

      {/* Supplier Form Modal */}
      {showForm && (
        <SupplierForm
          supplier={editingSupplier}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingSupplier(null); }}
        />
      )}

      {/* Supplier List */}
      {loading ? (
        <p style={styles.loading}>Loading suppliers...</p>
      ) : filteredSuppliers.length === 0 ? (
        <p style={styles.empty}>No suppliers found.</p>
      ) : (
        <div className="table-wrap">
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Contact</th>
                <th style={styles.th} className="purchases-hide-mobile">Phone</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Purchases</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Returns</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Payments</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Outstanding</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map(s => {
                const bal = balanceMap.get(s.id);
                return (
                <tr key={s.id} className="tx-tr" style={styles.tr}>
                  <td style={styles.td}>{s.name}</td>
                  <td style={styles.td}>{s.contactPerson ?? '—'}</td>
                  <td style={styles.td} className="purchases-hide-mobile">{s.phone ?? '—'}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                    {bal && bal.purchases > 0 ? bal.purchases.toLocaleString() : '—'}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                    {bal && bal.returns > 0 ? bal.returns.toLocaleString() : '—'}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>
                    {bal && bal.payments > 0 ? bal.payments.toLocaleString() : '—'}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: '600' }}>
                    {bal ? bal.outstanding.toLocaleString() : '—'}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: s.isActive ? 'var(--tx-active-bg)' : 'var(--tx-inactive-bg)',
                      color: s.isActive ? 'var(--tx-active-fg)' : 'var(--tx-inactive-fg)',
                    }}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => handleEdit(s)} className="tx-btn tx-btn-link" style={styles.linkBtn}>Edit</button>
                    <button
                      onClick={() => {
                        const code = accountCodeMap.get(s.accountHeadId);
                        if (code) navigate('/finance', { state: { tab: 'ledger', accountId: code } });
                      }}
                      className="tx-btn tx-btn-link" style={styles.linkBtn}
                    >
                      Ledger
                    </button>
                    {s.isActive && (
                      <button onClick={() => handleDeactivate(s.id)} className="tx-btn tx-btn-danger" style={styles.dangerBtn}>Deactivate</button>
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

/* ─── Supplier Form ────────────────────────────────────────── */

const SupplierForm: React.FC<{
  supplier: Supplier | null;
  onSave: (dto: CreateSupplierDTO | UpdateSupplierDTO) => void;
  onCancel: () => void;
}> = ({ supplier, onSave, onCancel }) => {
  const [name, setName] = useState(supplier?.name ?? '');
  const [contactPerson, setContactPerson] = useState(supplier?.contactPerson ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [email, setEmail] = useState(supplier?.email ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [city, setCity] = useState(supplier?.city ?? '');
  const [taxRegistrationNumber, setTaxRegistrationNumber] = useState(supplier?.taxRegistrationNumber ?? '');
  const [paymentTerms, setPaymentTerms] = useState(supplier?.paymentTerms ?? '');
  const [creditLimit, setCreditLimit] = useState(supplier?.creditLimit ?? 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Supplier name is required');
      return;
    }
    onSave({
      name: name.trim(),
      contactPerson,
      phone,
      email,
      address,
      city,
      taxRegistrationNumber,
      paymentTerms,
      creditLimit,
    });
  };

  return (
    <div className="tx-modal-overlay" style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h2 style={styles.modalTitle}>{supplier ? 'Edit Supplier' : 'New Supplier'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Supplier Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} style={styles.input} required />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Contact Person</label>
              <input value={contactPerson} onChange={e => setContactPerson(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Address</label>
              <input value={address} onChange={e => setAddress(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>City</label>
              <input value={city} onChange={e => setCity(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tax Registration No.</label>
              <input value={taxRegistrationNumber} onChange={e => setTaxRegistrationNumber(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Payment Terms</label>
              <input value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} style={styles.input} placeholder="e.g. Net 30" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Credit Limit</label>
              <input
                type="number"
                value={creditLimit}
                onChange={e => setCreditLimit(num(e.target.value))}
                style={styles.input}
                min={0}
              />
            </div>
          </div>
          <div style={styles.formActions}>
            <button type="button" onClick={onCancel} className="tx-btn tx-btn-secondary" style={styles.secondaryBtn}>Cancel</button>
            <button type="submit" className="tx-btn tx-btn-primary" style={styles.primaryBtn}>{supplier ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Purchase Bills Tab                                           */
/* ═══════════════════════════════════════════════════════════ */

const PurchaseBillsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  // GET /api/purchases returns enriched BillRecord[] ({ voucher, partyName, total, ... }) —
  // not flat voucher headers. Render from b.voucher.*.
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPurchases();
      if (data) setBills(data.sort((a, b) => (b.voucher.date || '').localeCompare(a.voucher.date || '')));
    } catch (err) {
      console.error('Failed to load bills:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { loadBills(); }, [loadBills]);

  const handlePost = async (id: string) => {
    if (!confirm('Post this purchase bill? This will create GL entries and add stock.')) return;
    try {
      await postPurchaseBill(id);
      emitDataRefresh('purchase-posted');
      await loadBills();
    } catch (err) {
      console.error('Failed to post bill:', err);
      alert(err instanceof Error ? err.message : 'Failed to post bill');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft bill?')) return;
    try {
      await deletePurchaseBill(id);
      emitDataRefresh('purchase-deleted');
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
        <h2 style={styles.sectionTitle}>Purchase Bills</h2>
        <button onClick={() => setShowForm(true)} className="tx-btn tx-btn-primary" style={styles.primaryBtn}>+ New Purchase Bill</button>
      </div>

      {/* Bill Form Modal */}
      {showForm && (
        <PurchaseBillForm
          tenantId={tenantId}
          onSaved={async () => { setShowForm(false); await loadBills(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Bill List */}
      {loading ? (
        <p style={styles.loading}>Loading bills...</p>
      ) : bills.length === 0 ? (
        <p style={styles.empty}>No purchase bills yet.</p>
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
                <tr key={b.voucher.id} className="tx-tr" style={styles.tr}>
                  <td style={styles.td}>{b.voucher.voucherNumber}</td>
                  <td style={styles.td}>{b.voucher.date}</td>
                  <td style={styles.td}>{b.voucher.narration}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: STATUS_COLORS[b.voucher.status]?.bg ?? 'var(--tx-neutral-bg)',
                      color: STATUS_COLORS[b.voucher.status]?.fg ?? 'var(--tx-neutral-fg)',
                    }}>
                      {VOUCHER_STATUS_LABELS[b.voucher.status]}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => navigate('/bills/' + b.voucher.id)} className="tx-btn tx-btn-link" style={styles.linkBtn}>View</button>
                    {b.voucher.status === 'DRAFT' && (
                      <>
                        <button onClick={() => handlePost(b.voucher.id)} className="tx-btn tx-btn-link" style={styles.linkBtn}>Post</button>
                        <button onClick={() => handleDelete(b.voucher.id)} className="tx-btn tx-btn-danger" style={styles.dangerBtn}>Delete</button>
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

/* ─── Purchase Bill Form ───────────────────────────────────── */

const PurchaseBillForm: React.FC<{
  tenantId: string;
  onSaved: () => void;
  onCancel: () => void;
}> = ({ tenantId, onSaved, onCancel }) => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);

  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<PurchaseBillLine[]>([]);
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  // Load master data
  useEffect(() => {
    const load = async () => {
      const [supps, prods, lvls] = await Promise.all([
        getSuppliers(),
        getProducts(),
        getStockLevels(),
      ]);
      setSuppliers(supps);
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
  const calculation = useMemo<PurchaseBillCalculation>(() => {
    const lineDetails: PurchaseLineTaxDetail[] = [];
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

  // Toggle expand/collapse for a line
  const toggleExpand = (idx: number) => {
    setExpandedLines(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // Update line — auto-fill from product on product change
  const updateLine = (idx: number, updates: Partial<PurchaseBillLine>) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, ...updates };
      // Auto-fill all fields from product master when product changes
      if (updates.productId) {
        const product = productMap.get(updates.productId);
        if (product) {
          updated.rate = product.purchaseRate;
          updated.retailPrice = product.retailPrice;
          updated.marginPercent = product.retailPrice > 0
            ? ((product.retailPrice - product.purchaseRate) / product.retailPrice) * 100
            : 0;
          updated.tradeDiscountPercent = product.tradeDiscount;
          updated.tradeOfferPercent = 0;
          updated.specialDiscountPercent = 0;
          updated.gstPercent = product.gstPercent;
          updated.furtherTaxPercent = product.furtherTaxPercent;
          updated.fedPercent = product.fedPercent;
          updated.advanceTaxPercent = product.advanceTaxPurchasePercent;
          updated.minQuantity = product.minQuantity;
          updated.hsCode = product.hsCode;
          updated.gstType = product.gstType;
        }
      }
      // Auto-calculate packs from cartons × pcsPerCarton
      if (updates.cartons !== undefined) {
        const product = productMap.get(updated.productId);
        const pcsPerCarton = product?.pcsPerCarton ?? 1;
        updated.packs = updates.cartons * pcsPerCarton;
      }
      return updated;
    }));
  };

  // Save — filter empty lines before submission
  const handleSave = async () => {
    if (!supplierId) { alert('Select a supplier'); return; }
    const validLines = lines.filter(l => l.productId && (l.cartons > 0 || l.packs > 0));
    if (validLines.length === 0) { alert('Add at least one item'); return; }

    setSaving(true);
    try {
      const voucher = await createPurchaseBill({
        supplierId,
        date,
        narration: narration || undefined,
        lines: validLines,
      });

      // Auto-post
      await postPurchaseBill(voucher.id);
      onSaved();
    } catch (err: any) {
      console.error('Failed to save bill:', err);
      const msg = err?.message || (typeof err === 'string' ? err : null) || 'Failed to save bill';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  // Ensure at least one empty trailing line exists
  useEffect(() => {
    if (lines.length === 0 || lines[lines.length - 1].productId !== '') {
      setLines(prev => [...prev, {
        productId: '',
        cartons: 0,
        packs: 0,
        rate: 0,
        retailPrice: 0,
        marginPercent: 0,
        tradeDiscountPercent: 0,
        tradeOfferPercent: 0,
        specialDiscountPercent: 0,
        gstPercent: 0,
        furtherTaxPercent: 0,
        fedPercent: 0,
        advanceTaxPercent: 0,
        minQuantity: 0,
        hsCode: '',
        gstType: undefined,
      }]);
    }
  }, [lines]);

  return (
    <div className="tx-modal-overlay" style={styles.modalOverlay}>
      <div style={{ ...styles.modal, maxWidth: '1100px' }}>
        <h2 style={styles.modalTitle}>New Purchase Bill</h2>

        {/* Header Fields */}
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Supplier *</label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)} style={styles.select}>
              <option value="">Select Supplier</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
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
            <p style={{ color: 'var(--text-disabled)', fontSize: '13px', marginBottom: '8px' }}>Select a product below to start adding items.</p>
          )}
          <div className="table-wrap purchase-lines-wrap">
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '32px' }}></th>
                  <th style={styles.th}>Item</th>
                  <th style={styles.th}>Ctns</th>
                  <th style={styles.th}>Pcs</th>
                  <th style={styles.th}>Rate</th>
                  <th style={styles.th}>Disc%</th>
                  <th style={styles.th}>ST%</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Tax</th>
                  <th style={styles.th}>Net</th>
                  <th style={{ ...styles.th, width: '32px' }}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const detail = calculation.lines[idx];
                  const hasProduct = !!line.productId;
                  const isExpanded = expandedLines.has(idx);
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
                                backgroundColor: isExpanded ? 'var(--accent-soft)' : 'var(--surface-2)',
                                color: isExpanded ? 'var(--accent)' : 'var(--text-muted)',
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
                                <option key={p.id} value={p.id} style={oos ? { color: 'var(--text-muted)' } : undefined}>
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
                        <td style={{ ...styles.td, width: '32px' }}>
                          {hasProduct && (
                            <button onClick={() => setLines(prev => prev.filter((_, i) => i !== idx))} className="tx-btn tx-btn-danger" style={{ ...styles.dangerBtn, padding: '2px 6px' }}>×</button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={11} style={{ padding: '12px 16px', backgroundColor: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Purchase Rate</label>
                                <input type="number" value={line.rate} onChange={e => updateLine(idx, { rate: num(e.target.value) })} style={{ ...styles.input, width: '100%' }} min={0} step={0.01} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Retail Price</label>
                                <input type="number" value={line.retailPrice ?? 0} onChange={e => updateLine(idx, { retailPrice: num(e.target.value) })} style={{ ...styles.input, width: '100%' }} min={0} step={0.01} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Margin %</label>
                                <input type="number" value={(() => { const rp = line.retailPrice ?? 0; const r = line.rate; return rp > 0 ? Number((((rp - r) / rp) * 100).toFixed(1)) : 0; })()} readOnly style={{ ...styles.input, width: '100%', backgroundColor: 'var(--border)', cursor: 'default' }} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Trade Disc %</label>
                                <input type="number" value={line.tradeDiscountPercent} onChange={e => updateLine(idx, { tradeDiscountPercent: num(e.target.value) })} style={{ ...styles.input, width: '100%' }} min={0} step={0.1} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Trade Offer %</label>
                                <input type="number" value={line.tradeOfferPercent ?? 0} onChange={e => updateLine(idx, { tradeOfferPercent: num(e.target.value) })} style={{ ...styles.input, width: '100%' }} min={0} step={0.1} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Special Disc %</label>
                                <input type="number" value={line.specialDiscountPercent ?? 0} onChange={e => updateLine(idx, { specialDiscountPercent: num(e.target.value) })} style={{ ...styles.input, width: '100%' }} min={0} step={0.1} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Min Qty</label>
                                <input type="number" value={line.minQuantity ?? 0} onChange={e => updateLine(idx, { minQuantity: num(e.target.value) })} style={{ ...styles.input, width: '100%' }} min={0} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>HS Code</label>
                                <input value={line.hsCode ?? ''} onChange={e => updateLine(idx, { hsCode: e.target.value })} style={{ ...styles.input, width: '100%' }} placeholder="e.g. 3305.10" />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>GST Type</label>
                                <select value={line.gstType ?? ''} onChange={e => updateLine(idx, { gstType: e.target.value as any })} style={{ ...styles.input, width: '100%' }}>
                                  <option value="">Standard VAT</option>
                                  <option value="VAT">VAT</option>
                                  <option value="3RD">3rd Schedule</option>
                                  <option value="8TH">8th Schedule</option>
                                </select>
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>GST %</label>
                                <input type="number" value={line.gstPercent} onChange={e => updateLine(idx, { gstPercent: num(e.target.value) })} style={{ ...styles.input, width: '100%' }} min={0} step={0.1} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>FED %</label>
                                <input type="number" value={line.fedPercent} onChange={e => updateLine(idx, { fedPercent: num(e.target.value) })} style={{ ...styles.input, width: '100%' }} min={0} step={0.1} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Further Tax %</label>
                                <input type="number" value={line.furtherTaxPercent} onChange={e => updateLine(idx, { furtherTaxPercent: num(e.target.value) })} style={{ ...styles.input, width: '100%' }} min={0} step={0.1} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Adv Tax (Purchase) %</label>
                                <input type="number" value={line.advanceTaxPercent} onChange={e => updateLine(idx, { advanceTaxPercent: num(e.target.value) })} style={{ ...styles.input, width: '100%' }} min={0} step={0.1} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>Cost Rate</label>
                                <input type="number" value={line.rate} readOnly style={{ ...styles.input, width: '100%', backgroundColor: 'var(--border)', cursor: 'default' }} />
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

        {/* Totals — full breakdown, only non-zero rows */}
        {lines.some(l => l.productId) && (() => {
          const hasProduct = lines.some(l => l.productId);
          const totalTradeDiscount = lines.reduce((s, l) => s + ((l.packs * l.rate * (l.tradeDiscountPercent || 0)) / 100), 0);
          const totalTradeOffer = lines.reduce((s, l) => s + ((l.packs * l.rate * (l.tradeOfferPercent || 0)) / 100), 0);
          const totalSpecialDiscount = lines.reduce((s, l) => s + ((l.packs * l.rate * (l.specialDiscountPercent || 0)) / 100), 0);
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
              <div style={{ ...styles.totalRow, fontWeight: '700', fontSize: '15px', borderTop: '2px solid var(--border)', paddingTop: '8px' }}>
                <span>Net Amount:</span><span>{fmt(calculation.totalNetAmount)}</span>
              </div>
            </div>
          ) : null;
        })()}

        {/* Actions */}
        <div style={styles.formActions}>
          <button type="button" onClick={onCancel} className="tx-btn tx-btn-secondary" style={styles.secondaryBtn}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !supplierId || lines.filter(l => l.productId && (l.cartons > 0 || l.packs > 0)).length === 0}
            className="tx-btn tx-btn-primary" style={styles.primaryBtn}
          >
            {saving ? 'Saving...' : 'Save & Post Bill'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Purchase Returns Tab                                         */
/* ═══════════════════════════════════════════════════════════ */

const PurchaseReturnsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [returns, setReturns] = useState<VoucherHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const loadReturns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPurchaseReturns();
      if (data) setReturns(data.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (err) {
      console.error('Failed to load purchase returns:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { loadReturns(); }, [loadReturns]);

  const handlePost = async (id: string) => {
    if (!confirm('Post this purchase return? This will create GL entries and deduct stock.')) return;
    try {
      await postPurchaseReturn(id);
      emitDataRefresh('purchase-return-posted');
      await loadReturns();
    } catch (err) {
      console.error('Failed to post purchase return:', err);
      alert(err instanceof Error ? err.message : 'Failed to post purchase return');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft purchase return?')) return;
    try {
      await deletePurchaseReturn(id);
      emitDataRefresh('purchase-return-deleted');
      await loadReturns();
    } catch (err) {
      console.error('Failed to delete purchase return:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete purchase return');
    }
  };

  return (
    <div>
      <div style={styles.toolbar}>
        <h2 style={styles.sectionTitle}>Purchase Returns (PRV)</h2>
        <button onClick={() => setShowForm(true)} className="tx-btn tx-btn-primary" style={styles.primaryBtn}>+ New Purchase Return</button>
      </div>

      {showForm && (
        <PurchaseReturnForm
          tenantId={tenantId}
          onSaved={async () => { setShowForm(false); await loadReturns(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <p style={styles.loading}>Loading returns...</p>
      ) : returns.length === 0 ? (
        <p style={styles.empty}>No purchase returns yet.</p>
      ) : (
        <div className="table-wrap">
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>PRV #</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Narration</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {returns.map(r => (
                <tr key={r.id} className="tx-tr" style={styles.tr}>
                  <td style={styles.td}>{r.voucherNumber}</td>
                  <td style={styles.td}>{r.date}</td>
                  <td style={styles.td}>{r.narration}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: STATUS_COLORS[r.status]?.bg ?? 'var(--tx-neutral-bg)',
                      color: STATUS_COLORS[r.status]?.fg ?? 'var(--tx-neutral-fg)',
                    }}>
                      {VOUCHER_STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => navigate('/bills/' + r.id)} className="tx-btn tx-btn-link" style={styles.linkBtn}>View</button>
                    {r.status === 'DRAFT' && (
                      <>
                        <button onClick={() => handlePost(r.id)} className="tx-btn tx-btn-link" style={styles.linkBtn}>Post</button>
                        <button onClick={() => handleDelete(r.id)} className="tx-btn tx-btn-danger" style={styles.dangerBtn}>Delete</button>
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

/* ─── Purchase Return Form ─────────────────────────────────── */

const PurchaseReturnForm: React.FC<{
  tenantId: string;
  onSaved: () => void;
  onCancel: () => void;
}> = ({ tenantId, onSaved, onCancel }) => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<PurchaseReturnLine[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [sups, prods] = await Promise.all([
        getSuppliers(),
        getProducts(),
      ]);
      setSuppliers(sups);
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

  const updateLine = (idx: number, field: keyof PurchaseReturnLine, value: string | number) => {
    const updated = [...lines];
    (updated[idx] as any)[field] = value;
    setLines(updated);
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!supplierId) { alert('Select a supplier'); return; }
    if (lines.length === 0) { alert('Add at least one line'); return; }
    for (const line of lines) {
      if (!line.productId) { alert('Select a product for all lines'); return; }
      if (line.packs <= 0) { alert('Quantity must be > 0'); return; }
    }
    setSaving(true);
    try {
      await createPurchaseReturn({
        supplierId,
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
    <div className="tx-modal-overlay" style={styles.modalOverlay}>
      <div style={{ ...styles.modal, maxWidth: '900px' }}>
        <h2 style={styles.modalTitle}>New Purchase Return</h2>

        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Supplier *</label>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)} style={styles.select}>
              <option value="">-- Select Supplier --</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
            <button onClick={addLine} className="tx-btn tx-btn-secondary" style={styles.secondaryBtn}>+ Add Line</button>
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
              <button onClick={() => removeLine(idx)} className="tx-btn tx-btn-danger" style={styles.dangerBtn}>✕</button>
            </div>
          ))}
        </div>

        <div style={styles.formActions}>
          <button type="button" onClick={onCancel} className="tx-btn tx-btn-secondary" style={styles.secondaryBtn}>Cancel</button>
          <button type="button" onClick={handleSave} className="tx-btn tx-btn-primary" style={styles.primaryBtn} disabled={saving}>
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
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '13px',
    padding: 0,
    marginBottom: '4px',
    textDecoration: 'none',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    margin: '4px 0 0',
  },
  tabBar: {
    display: 'flex',
    gap: '4px',
    borderBottom: '1px solid var(--border)',
    marginBottom: '20px',
    overflowX: 'auto',
  },
  tab: {
    padding: '10px 16px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-muted)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    color: 'var(--accent)',
    borderBottomColor: 'var(--accent)',
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
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '200px',
    backgroundColor: 'var(--surface)',
    color: 'var(--text-primary)',
  },
  primaryBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '8px 16px',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  smallBtn: {
    padding: '4px 10px',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '2px 6px',
  },
  dangerBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '2px 6px',
  },
  loading: {
    color: 'var(--text-disabled)',
    fontSize: '14px',
    textAlign: 'center',
    padding: '32px',
  },
  empty: {
    color: 'var(--text-disabled)',
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: 'var(--surface-raised)',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-lg)',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '16px',
    color: 'var(--text-primary)',
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
    color: 'var(--text-muted)',
  },
  input: {
    padding: '8px 10px',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'var(--surface)',
    color: 'var(--text-primary)',
  },
  select: {
    padding: '8px 10px',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'var(--surface)',
    color: 'var(--text-primary)',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border)',
  },
  totalsBox: {
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: 'var(--surface-2)',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    fontSize: '13px',
  },
};
