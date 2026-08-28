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
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';
import { services } from '../services';
import {
  Supplier,
  CreateSupplierDTO,
  UpdateSupplierDTO,
} from '../../domain/types/supplier';
import {
  Product,
  Warehouse,
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

const STATUS_COLORS: Record<VoucherStatus, { bg: string; fg: string }> = {
  DRAFT:  { bg: '#fef3c7', fg: '#92400e' },
  POSTED: { bg: '#dcfce7', fg: '#166534' },
};

/* ═══════════════════════════════════════════════════════════ */
/* Main Purchases Component                                     */
/* ═══════════════════════════════════════════════════════════ */

export const Purchases: React.FC = () => {
  const { tenant } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<PurchasesTab>('suppliers');

  return (
    <div className="page-pad" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>← Dashboard</button>
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchPrefix, setSearchPrefix] = useState('');

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await services.supplierRepository.getSuppliers(tenantId);
      setSuppliers(data);
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
        await services.supplierRepository.update(editingSupplier.id, dto as UpdateSupplierDTO, tenantId);
      } else {
        await services.supplierRepository.create(dto as CreateSupplierDTO, tenantId);
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
      await services.supplierRepository.deactivate(id, tenantId);
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
        <button onClick={handleCreate} style={styles.primaryBtn}>+ New Supplier</button>
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
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>City</th>
                <th style={styles.th}>Payment Terms</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map(s => (
                <tr key={s.id} style={styles.tr}>
                  <td style={styles.td}>{s.name}</td>
                  <td style={styles.td}>{s.contactPerson ?? '—'}</td>
                  <td style={styles.td}>{s.phone ?? '—'}</td>
                  <td style={styles.td}>{s.city ?? '—'}</td>
                  <td style={styles.td}>{s.paymentTerms ?? '—'}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: s.isActive ? '#dcfce7' : '#fee2e2',
                      color: s.isActive ? '#166534' : '#991b1b',
                    }}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => handleEdit(s)} style={styles.linkBtn}>Edit</button>
                    {s.isActive && (
                      <button onClick={() => handleDeactivate(s.id)} style={styles.dangerBtn}>Deactivate</button>
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
    <div style={styles.modalOverlay}>
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
                onChange={e => setCreditLimit(Number(e.target.value))}
                style={styles.input}
                min={0}
              />
            </div>
          </div>
          <div style={styles.formActions}>
            <button type="button" onClick={onCancel} style={styles.secondaryBtn}>Cancel</button>
            <button type="submit" style={styles.primaryBtn}>{supplier ? 'Update' : 'Create'}</button>
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
  const [bills, setBills] = useState<VoucherHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const data = await services.purchaseService.getPurchaseBills(tenantId);
      setBills(data.sort((a, b) => b.date.localeCompare(a.date)));
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
      await services.purchaseService.postPurchaseBill(tenantId, id);
      await loadBills();
    } catch (err) {
      console.error('Failed to post bill:', err);
      alert(err instanceof Error ? err.message : 'Failed to post bill');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft bill?')) return;
    try {
      await services.purchaseService.deletePurchaseBill(tenantId, id);
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
        <button onClick={() => setShowForm(true)} style={styles.primaryBtn}>+ New Purchase Bill</button>
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
                <tr key={b.id} style={styles.tr}>
                  <td style={styles.td}>{b.voucherNumber}</td>
                  <td style={styles.td}>{b.date}</td>
                  <td style={styles.td}>{b.narration}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: STATUS_COLORS[b.status].bg,
                      color: STATUS_COLORS[b.status].fg,
                    }}>
                      {VOUCHER_STATUS_LABELS[b.status]}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {b.status === 'DRAFT' && (
                      <>
                        <button onClick={() => handlePost(b.id)} style={styles.linkBtn}>Post</button>
                        <button onClick={() => handleDelete(b.id)} style={styles.dangerBtn}>Delete</button>
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<PurchaseBillLine[]>([]);
  const [saving, setSaving] = useState(false);

  // Load master data
  useEffect(() => {
    const load = async () => {
      const [supps, prods, whs] = await Promise.all([
        services.supplierRepository.getSuppliers(tenantId),
        services.inventoryRepository.getProducts(tenantId),
        services.inventoryRepository.getWarehouses(tenantId),
      ]);
      setSuppliers(supps);
      setProducts(prods.filter(p => p.isActive));
      setWarehouses(whs.filter(w => w.isActive));
      if (whs.length > 0) setWarehouseId(whs[0].id);
    };
    load();
  }, [tenantId]);

  // Get product map for auto-fill
  const productMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

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

  // Add new line
  const addLine = () => {
    setLines(prev => [...prev, {
      productId: products[0]?.id ?? '',
      cartons: 0,
      packs: 0,
      rate: products[0]?.purchaseRate ?? 0,
      tradeDiscountPercent: products[0]?.tradeDiscount ?? 0,
      gstPercent: products[0]?.gstPercent ?? 0,
      furtherTaxPercent: 0,
      fedPercent: products[0]?.fedPercent ?? 0,
      advanceTaxPercent: products[0]?.advanceTaxPurchasePercent ?? 0,
    }]);
  };

  // Update line
  const updateLine = (idx: number, updates: Partial<PurchaseBillLine>) => {
    setLines(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, ...updates };
      // Auto-fill from product if product changed
      if (updates.productId) {
        const product = productMap.get(updates.productId);
        if (product) {
          updated.rate = product.purchaseRate;
          updated.tradeDiscountPercent = product.tradeDiscount;
          updated.gstPercent = product.gstPercent;
          updated.fedPercent = product.fedPercent;
          updated.advanceTaxPercent = product.advanceTaxPurchasePercent;
        }
      }
      return updated;
    }));
  };

  // Remove line
  const removeLine = (idx: number) => {
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  // Save
  const handleSave = async () => {
    if (!supplierId) { alert('Select a supplier'); return; }
    if (lines.length === 0) { alert('Add at least one line'); return; }
    if (!warehouseId) { alert('Select a warehouse'); return; }

    setSaving(true);
    try {
      const voucher = await services.purchaseService.createPurchaseBill(tenantId, {
        supplierId,
        warehouseId,
        date,
        narration: narration || undefined,
        lines,
      }, 'admin');

      // Auto-post
      await services.purchaseService.postPurchaseBill(tenantId, voucher.id);
      onSaved();
    } catch (err) {
      console.error('Failed to save bill:', err);
      alert(err instanceof Error ? err.message : 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modal, maxWidth: '900px' }}>
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
            <label style={styles.label}>Warehouse *</label>
            <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} style={styles.select}>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
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
            <button onClick={addLine} style={styles.smallBtn}>+ Add Line</button>
          </div>

          {lines.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>No lines added. Click "+ Add Line" to start.</p>
          ) : (
            <div className="table-wrap">
              <table style={styles.table}>
                <thead>
                  <tr>
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
                    return (
                      <tr key={idx} style={styles.tr}>
                        <td style={styles.td}>
                          <select
                            value={line.productId}
                            onChange={e => updateLine(idx, { productId: e.target.value })}
                            style={{ ...styles.select, minWidth: '150px' }}
                          >
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={styles.td}>
                          <input
                            type="number"
                            value={line.cartons}
                            onChange={e => updateLine(idx, { cartons: Number(e.target.value) })}
                            style={{ ...styles.input, width: '60px' }}
                            min={0}
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            type="number"
                            value={line.packs}
                            onChange={e => updateLine(idx, { packs: Number(e.target.value) })}
                            style={{ ...styles.input, width: '60px' }}
                            min={0}
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            type="number"
                            value={line.rate}
                            onChange={e => updateLine(idx, { rate: Number(e.target.value) })}
                            style={{ ...styles.input, width: '80px' }}
                            min={0}
                            step={0.01}
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            type="number"
                            value={line.tradeDiscountPercent}
                            onChange={e => updateLine(idx, { tradeDiscountPercent: Number(e.target.value) })}
                            style={{ ...styles.input, width: '50px' }}
                            min={0}
                            step={0.1}
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            type="number"
                            value={line.gstPercent}
                            onChange={e => updateLine(idx, { gstPercent: Number(e.target.value) })}
                            style={{ ...styles.input, width: '50px' }}
                            min={0}
                            step={0.1}
                          />
                        </td>
                        <td style={styles.td}>{detail ? fmt(detail.amount) : '0.00'}</td>
                        <td style={styles.td}>{detail ? fmt(detail.gstAmount + detail.fedAmount) : '0.00'}</td>
                        <td style={styles.td}><strong>{detail ? fmt(detail.netAmount) : '0.00'}</strong></td>
                        <td style={styles.td}>
                          <button onClick={() => removeLine(idx)} style={styles.dangerBtn}>×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Totals */}
        {lines.length > 0 && (
          <div style={styles.totalsBox}>
            <div style={styles.totalRow}>
              <span>Total Amount:</span><span>{fmt(calculation.totalAmount)}</span>
            </div>
            <div style={styles.totalRow}>
              <span>Discount:</span><span>{fmt(calculation.totalDiscount)}</span>
            </div>
            <div style={styles.totalRow}>
              <span>After Discount (To.Amt):</span><span>{fmt(calculation.totalToAmount)}</span>
            </div>
            <div style={styles.totalRow}>
              <span>GST:</span><span>{fmt(calculation.totalGst)}</span>
            </div>
            <div style={styles.totalRow}>
              <span>FED:</span><span>{fmt(calculation.totalFed)}</span>
            </div>
            <div style={{ ...styles.totalRow, fontWeight: '700', fontSize: '15px', borderTop: '2px solid #e2e8f0', paddingTop: '8px' }}>
              <span>Net Amount:</span><span>{fmt(calculation.totalNetAmount)}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={styles.formActions}>
          <button type="button" onClick={onCancel} style={styles.secondaryBtn}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || lines.length === 0 || !supplierId}
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
/* Purchase Returns Tab                                         */
/* ═══════════════════════════════════════════════════════════ */

const PurchaseReturnsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [returns, setReturns] = useState<VoucherHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadReturns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await services.purchaseReturnService.getPurchaseReturns(tenantId);
      setReturns(data.sort((a, b) => b.date.localeCompare(a.date)));
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
      await services.purchaseReturnService.postPurchaseReturn(tenantId, id);
      await loadReturns();
    } catch (err) {
      console.error('Failed to post purchase return:', err);
      alert(err instanceof Error ? err.message : 'Failed to post purchase return');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft purchase return?')) return;
    try {
      await services.purchaseReturnService.deletePurchaseReturn(tenantId, id);
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
        <button onClick={() => setShowForm(true)} style={styles.primaryBtn}>+ New Purchase Return</button>
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
                <tr key={r.id} style={styles.tr}>
                  <td style={styles.td}>{r.voucherNumber}</td>
                  <td style={styles.td}>{r.date}</td>
                  <td style={styles.td}>{r.narration}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: STATUS_COLORS[r.status].bg,
                      color: STATUS_COLORS[r.status].fg,
                    }}>
                      {VOUCHER_STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td style={styles.td}>
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

/* ─── Purchase Return Form ─────────────────────────────────── */

const PurchaseReturnForm: React.FC<{
  tenantId: string;
  onSaved: () => void;
  onCancel: () => void;
}> = ({ tenantId, onSaved, onCancel }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState('');
  const [lines, setLines] = useState<PurchaseReturnLine[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [sups, prods, whs] = await Promise.all([
        services.supplierRepository.getSuppliers(tenantId),
        services.inventoryRepository.getProducts(tenantId),
        services.inventoryRepository.getWarehouses(tenantId),
      ]);
      setSuppliers(sups);
      setProducts(prods.filter(p => p.isActive));
      setWarehouses(whs.filter(w => w.isActive));
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
    if (!warehouseId) { alert('Select a warehouse'); return; }
    if (lines.length === 0) { alert('Add at least one line'); return; }
    for (const line of lines) {
      if (!line.productId) { alert('Select a product for all lines'); return; }
      if (line.packs <= 0) { alert('Quantity must be > 0'); return; }
    }
    setSaving(true);
    try {
      await services.purchaseReturnService.createPurchaseReturn(tenantId, {
        supplierId,
        warehouseId,
        date,
        narration: narration || undefined,
        lines,
      }, 'admin');
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
            <label style={styles.label}>Warehouse *</label>
            <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} style={styles.select}>
              <option value="">-- Select Warehouse --</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
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
              <input type="number" placeholder="Packs" value={line.packs || ''} onChange={e => updateLine(idx, 'packs', Number(e.target.value))} style={{ ...styles.input, flex: 1 }} min={0} />
              <input type="number" placeholder="Rate" value={line.rate || ''} onChange={e => updateLine(idx, 'rate', Number(e.target.value))} style={{ ...styles.input, flex: 1 }} min={0} step={0.01} />
              <input type="number" placeholder="GST %" value={line.gstPercent || ''} onChange={e => updateLine(idx, 'gstPercent', Number(e.target.value))} style={{ ...styles.input, flex: 1 }} min={0} />
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
