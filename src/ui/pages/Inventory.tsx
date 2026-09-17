/**
 * Inventory Module Page
 * Stock management with sub-tabs: Stock Balances, Warehouses, Stock Movements.
 *
 * Source: audit/23_DATA_MODEL.md, audit/03_MASTER_DATA.md, audit/16_CALCULATIONS.md
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';
import { getProducts, getWarehouses, getStockLevels, createProduct, updateProduct, deleteProduct, getProductBatches, getProductSerials, getStockMovements, createStockMovement, postStockMovement, cancelStockMovement, getStockBalanceWithActivity, setOpeningStock } from '../lib/api';
import { useRefreshOnMount } from '../utils/useRefreshOnEvent';
import {
  Product,
  Warehouse,
  StockLevel,
  StockMovement,
  StockMovementType,
  StockMovementStatus,
  STOCK_MOVEMENT_TYPE_LABELS,
  STOCK_MOVEMENT_STATUS_LABELS,
  CreateProductDTO,
  UpdateProductDTO,
  calculateStockValue,
  StockBWAReport,
  StockBWARow,
} from '../../domain/types/inventory';
import { GST_TYPE_LABELS } from '../../domain/types/settings';

/* ─── Tab Definition ───────────────────────────────────────── */

type InventoryTab = 'items' | 'stock' | 'movements' | 'activity';

const TABS: { key: InventoryTab; label: string }[] = [
  { key: 'items',      label: 'Item Master' },
  { key: 'stock',      label: 'Stock Balances' },
  { key: 'activity',   label: 'Stock BWA' },
  { key: 'movements',  label: 'Stock Movements' },
];

/* ─── Constants ────────────────────────────────────────────── */

const MOVEMENT_TYPE_COLORS: Record<StockMovementType, { bg: string; fg: string }> = {
  GRN:        { bg: 'var(--imt-grn-bg)', fg: 'var(--imt-grn-fg)' },
  ISSUE:      { bg: 'var(--imt-issue-bg)', fg: 'var(--imt-issue-fg)' },
  TRANSFER:   { bg: 'var(--imt-transfer-bg)', fg: 'var(--imt-transfer-fg)' },
  ADJUSTMENT: { bg: 'var(--imt-adjustment-bg)', fg: 'var(--imt-adjustment-fg)' },
  RETURN:     { bg: 'var(--imt-return-bg)', fg: 'var(--imt-return-fg)' },
  OPENING:    { bg: 'var(--imt-opening-bg)', fg: 'var(--imt-opening-fg)' },
};

const MOVEMENT_STATUS_COLORS: Record<StockMovementStatus, { bg: string; fg: string }> = {
  DRAFT:     { bg: 'var(--warning-soft)', fg: 'var(--warning-fg)' },
  POSTED:    { bg: 'var(--success-soft)', fg: 'var(--success-fg)' },
  CANCELLED: { bg: 'var(--danger-soft)', fg: 'var(--danger-fg)' },
};

const fmt = (n: number) => n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString('en-PK');

/* ═══════════════════════════════════════════════════════════ */
/* Main Inventory Component                                   */
/* ═══════════════════════════════════════════════════════════ */

export const Inventory: React.FC = () => {
  const { tenant } = useAuth();
  const [tab, setTab] = useState<InventoryTab>('stock');

  return (
    <div className="page-pad inv-page" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <Link to="/dashboard" style={styles.backBtn}>← Dashboard</Link>
          <h1 style={styles.title}>Inventory</h1>
          <p style={styles.subtitle}>{tenant.brandName}</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar-scroll" style={styles.tabBar}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inv-tab${tab === t.key ? ' inv-tab-active' : ''}`}
            style={{ ...styles.tab, ...(tab === t.key ? styles.tabActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'items'      && <ItemsTab tenantId={tenant.id} />}
      {tab === 'stock'      && <StockBalancesTab tenantId={tenant.id} />}
      {tab === 'activity'   && <StockBWATab tenantId={tenant.id} />}
      {tab === 'movements'  && <MovementsTab tenantId={tenant.id} />}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Tab: Item Master                                            */
/* ═══════════════════════════════════════════════════════════ */

const ItemsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, levels] = await Promise.all([getProducts(), getStockLevels()]);
      setProducts(prods);
      setStockLevels(levels);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !categoryFilter || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const stats = useMemo(() => {
    const active = products.filter(p => p.isActive).length;
    const inactive = products.filter(p => !p.isActive).length;
    return { total: products.length, active, inactive };
  }, [products]);

  // Map productId → total quantity on hand across all warehouses
  const stockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const sl of stockLevels) {
      map.set(sl.productId, (map.get(sl.productId) ?? 0) + sl.quantityOnHand);
    }
    return map;
  }, [stockLevels]);

  const handleCreate = async (dto: CreateProductDTO) => {
    await createProduct(dto);
    setShowCreate(false);
    await load();
  };

  const handleUpdate = async (id: string, dto: UpdateProductDTO) => {
    await updateProduct(id, dto);
    setEditProduct(null);
    await load();
  };

  const handleDeactivate = async (id: string) => {
    await deleteProduct(id);
    setEditProduct(null);
    await load();
  };

  return (
    <>
      <div className="section-header-responsive" style={styles.sectionHeader}>
        <div style={styles.statsBar}>
          <div style={styles.statChip}>
            <span style={{ ...styles.statDot, backgroundColor: 'var(--neutral-soft)', color: 'var(--neutral-fg)' }}>{stats.total}</span>
            <span style={styles.statLabel}>Total</span>
          </div>
          <div style={styles.statChip}>
            <span style={{ ...styles.statDot, backgroundColor: 'var(--success-soft)', color: 'var(--success-fg)' }}>{stats.active}</span>
            <span style={styles.statLabel}>Active</span>
          </div>
          <div style={styles.statChip}>
            <span style={{ ...styles.statDot, backgroundColor: 'var(--danger-soft)', color: 'var(--danger-fg)' }}>{stats.inactive}</span>
            <span style={styles.statLabel}>Inactive</span>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="inv-btn-primary" style={styles.primaryBtn}>+ New Item</button>
      </div>

      <div className="toolbar-responsive" style={styles.toolbar}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or SKU..." className="inv-input" style={styles.searchInput} />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="inv-select" style={styles.filterSelect}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="table-wrap" style={styles.card}>
        {loading ? (
          <div style={{ padding: 24 }}><div className="skeleton" style={{ width: '100%', height: 400 }} /></div>
        ) : (
          <>
            <div style={{ ...styles.treeHeader, minWidth: 840 }}>
              <span style={{ ...styles.col, flex: '0 0 90px' }}>SKU</span>
              <span style={{ ...styles.col, flex: '1' }}>Product Name</span>
              <span style={{ ...styles.col, flex: '0 0 100px' }}>Category</span>
              <span style={{ ...styles.col, flex: '0 0 60px' }}>Unit</span>
              <span style={{ ...styles.col, flex: '0 0 70px' }}>Carton</span>
              <span style={{ ...styles.col, flex: '0 0 80px', textAlign: 'right' }}>Sale</span>
              <span style={{ ...styles.col, flex: '0 0 80px', textAlign: 'right' }}>Purchase</span>
              <span style={{ ...styles.col, flex: '0 0 60px', textAlign: 'right' }}>Stock</span>
              <span style={{ ...styles.col, flex: '0 0 50px' }}>GST</span>
              <span style={{ ...styles.col, flex: '0 0 50px' }}>Status</span>
              <span style={{ ...styles.col, flex: '0 0 80px' }}>Actions</span>
            </div>
            {filtered.length === 0 && <div style={styles.empty}>No items found.</div>}
            {filtered.map(p => {
              const qty = stockMap.get(p.id) ?? 0;
              const outOfStock = qty === 0;
              return (
              <div key={p.id} style={{ ...styles.voucherRow, minWidth: 840, opacity: p.isActive ? 1 : 0.5 }}>
                <span style={{ ...styles.col, flex: '0 0 90px', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{p.sku}</span>
                <span style={{ ...styles.col, flex: '1', fontWeight: 500 }}>{p.name}</span>
                <span style={{ ...styles.col, flex: '0 0 100px' }}>
                  <span style={{ ...styles.typeBadge, backgroundColor: 'var(--inv-cat-bg)', color: 'var(--inv-cat-fg)' }}>{p.category}</span>
                </span>
                <span style={{ ...styles.col, flex: '0 0 60px', fontSize: 13 }}>{p.unit}</span>
                <span style={{ ...styles.col, flex: '0 0 70px', fontSize: 13 }}>{p.pcsPerCarton}</span>
                <span style={{ ...styles.col, flex: '0 0 80px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{fmt(p.saleRate)}</span>
                <span style={{ ...styles.col, flex: '0 0 80px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{fmt(p.purchaseRate)}</span>
                <span style={{ ...styles.col, flex: '0 0 60px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
                  {outOfStock ? (
                    <span style={{ color: '#dc2626', fontSize: 11, fontWeight: 600 }}>0</span>
                  ) : (
                    qty.toLocaleString()
                  )}
                </span>
                <span style={{ ...styles.col, flex: '0 0 50px', fontSize: 13 }}>{p.gstPercent}%</span>
                <span style={{ ...styles.col, flex: '0 0 50px' }}>
                  {outOfStock ? (
                    <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 600, backgroundColor: '#fef2f2', color: '#dc2626', whiteSpace: 'nowrap' }}>Out of Stock</span>
                  ) : (
                    <span style={{ ...styles.statusDot, backgroundColor: p.isActive ? 'var(--success)' : 'var(--danger)' }} />
                  )}
                </span>
                <span style={{ ...styles.col, flex: '0 0 80px', gap: 4 }}>
                  <button onClick={() => setEditProduct(p)} className="inv-row-btn" style={styles.rowBtn} title="Edit" aria-label={`Edit ${p.name}`}>✎</button>
                </span>
              </div>
              );
            })}
          </>
        )}
      </div>

      {showCreate && (
        <ProductModal
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}
      {editProduct && (
        <ProductModal
          product={editProduct}
          currentStock={stockMap.get(editProduct.id) ?? 0}
          onClose={() => setEditProduct(null)}
          onSave={(dto) => handleUpdate(editProduct.id, dto)}
          onDeactivate={() => handleDeactivate(editProduct.id)}
          onUpdateStock={async (qty) => {
            await setOpeningStock([{ productId: editProduct.id, quantity: qty }]);
            await load();
          }}
        />
      )}
    </>
  );
};

/* ─── Product Create/Edit Modal ────────────────────────────── */

const ProductModal: React.FC<{
  product?: Product;
  currentStock?: number;
  onClose: () => void;
  onSave: (dto: CreateProductDTO) => void;
  onDeactivate?: () => void;
  onUpdateStock?: (newQty: number) => Promise<void>;
}> = ({ product, currentStock, onClose, onSave, onDeactivate, onUpdateStock }) => {
  const isEdit = !!product;
  const [sku, setSku] = useState(product?.sku ?? '');
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [unit, setUnit] = useState(product?.unit ?? 'Pcs');
  const [pcsPerCarton, setPcsPerCarton] = useState(product?.pcsPerCarton ?? 1);
  const [saleRate, setSaleRate] = useState(product?.saleRate ?? 0);
  const [purchaseRate, setPurchaseRate] = useState(product?.purchaseRate ?? 0);
  const [retailPrice, setRetailPrice] = useState(product?.retailPrice ?? 0);
  const [tradeDiscount, setTradeDiscount] = useState(product?.tradeDiscount ?? 0);
  const [tradeOffer, setTradeOffer] = useState(product?.tradeOffer ?? '');
  const [minQuantity, setMinQuantity] = useState(product?.minQuantity ?? 0);
  const [hsCode, setHsCode] = useState(product?.hsCode ?? '');
  const [gstType, setGstType] = useState<'VAT' | '3RD' | '8TH'>(product?.gstType ?? 'VAT');
  const [gstPercent, setGstPercent] = useState(product?.gstPercent ?? 17);
  const [fedPercent, setFedPercent] = useState(product?.fedPercent ?? 0);
  const [advanceTaxSalePercent, setAdvanceTaxSalePercent] = useState(product?.advanceTaxSalePercent ?? 0);
  const [advanceTaxPurchasePercent, setAdvanceTaxPurchasePercent] = useState(product?.advanceTaxPurchasePercent ?? 0);
  const [furtherTaxPercent, setFurtherTaxPercent] = useState(product?.furtherTaxPercent ?? 0);
  const [margin, setMargin] = useState(product?.margin ?? 0.072);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [stockQty, setStockQty] = useState(currentStock ?? 0);
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError] = useState('');

  // Computed costRate for display
  const computedCostRate = (retailPrice || 0) - (purchaseRate || 0) * margin;
  // NOTE (pre-existing): this formula matches the legacy ERP's margin-derived cost
  // rate. Displayed read-only; not modified in this UI-only step.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!sku.trim() || !name.trim() || !category.trim()) {
      setError('SKU, Name, and Category are required.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        sku: sku.trim(),
        name: name.trim(),
        category: category.trim(),
        unit,
        pcsPerCarton,
        saleRate,
        purchaseRate,
        retailPrice,
        tradeDiscount,
        tradeOffer,
        minQuantity,
        hsCode,
        gstType: gstType as any,
        gstPercent,
        fedPercent,
        advanceTaxSalePercent,
        advanceTaxPurchasePercent,
        furtherTaxPercent,
        margin,
        costRate: computedCostRate,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save product.');
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div className="responsive-modal" style={{ ...styles.modal, maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>{isEdit ? 'Edit' : 'Create'} Item</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="responsive-form-row" style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>SKU *</label>
              <input value={sku} onChange={e => setSku(e.target.value)} style={styles.input} disabled={isEdit} placeholder="e.g. PROD-009" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Product Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} style={styles.input} placeholder="e.g. Baby Shampoo 200ml" />
            </div>
          </div>
          <div className="responsive-form-row" style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Category *</label>
              <input value={category} onChange={e => setCategory(e.target.value)} style={styles.input} placeholder="e.g. Shampoo" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Unit</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} style={styles.select}>
                <option value="Pcs">Pcs</option>
                <option value="Pack">Pack</option>
                <option value="Set">Set</option>
                <option value="Btl">Btl</option>
                <option value="Box">Box</option>
                <option value="Kg">Kg</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Pcs/Carton</label>
              <input type="number" min={1} value={pcsPerCarton} onChange={e => setPcsPerCarton(parseInt(e.target.value) || 1)} style={styles.input} />
            </div>
          </div>
          <div className="responsive-form-row" style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Sale Rate</label>
              <input type="number" min={0} step={0.01} value={saleRate} onChange={e => setSaleRate(parseFloat(e.target.value) || 0)} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Purchase Rate</label>
              <input type="number" min={0} step={0.01} value={purchaseRate} onChange={e => setPurchaseRate(parseFloat(e.target.value) || 0)} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Retail Price</label>
              <input type="number" min={0} step={0.01} value={retailPrice} onChange={e => setRetailPrice(parseFloat(e.target.value) || 0)} style={styles.input} />
            </div>
          </div>
          <div className="responsive-form-row" style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Margin %</label>
              <input type="number" min={0} max={100} step={0.001} value={margin} onChange={e => setMargin(parseFloat(e.target.value) || 0)} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Cost Rate (auto)</label>
              <input type="number" value={computedCostRate.toFixed(2)} style={{ ...styles.input, backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)' }} readOnly />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Trade Disc %</label>
              <input type="number" min={0} max={100} step={0.1} value={tradeDiscount} onChange={e => setTradeDiscount(parseFloat(e.target.value) || 0)} style={styles.input} />
            </div>
          </div>
          <div className="responsive-form-row" style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Trade Offer</label>
              <input value={tradeOffer} onChange={e => setTradeOffer(e.target.value)} style={styles.input} placeholder="e.g. Buy 10 Get 1" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Min Qty</label>
              <input type="number" min={0} value={minQuantity} onChange={e => setMinQuantity(parseInt(e.target.value) || 0)} style={styles.input} />
            </div>
          </div>
          <div className="responsive-form-row" style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>HS Code</label>
              <input value={hsCode} onChange={e => setHsCode(e.target.value)} style={styles.input} placeholder="e.g. 3305.10" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>GST Type</label>
              <select value={gstType} onChange={e => setGstType(e.target.value as 'VAT' | '3RD' | '8TH')} style={styles.select}>
                <option value="VAT">Standard VAT</option>
                <option value="3RD">3rd Schedule</option>
                <option value="8TH">8th Schedule</option>
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>GST %</label>
              <input type="number" min={0} max={100} step={0.1} value={gstPercent} onChange={e => setGstPercent(parseFloat(e.target.value) || 0)} style={styles.input} />
            </div>
          </div>
          <div className="responsive-form-row" style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>FED %</label>
              <input type="number" min={0} max={100} step={0.1} value={fedPercent} onChange={e => setFedPercent(parseFloat(e.target.value) || 0)} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Adv Tax (Sale) %</label>
              <input type="number" min={0} max={100} step={0.1} value={advanceTaxSalePercent} onChange={e => setAdvanceTaxSalePercent(parseFloat(e.target.value) || 0)} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Adv Tax (Purchase) %</label>
              <input type="number" min={0} max={100} step={0.1} value={advanceTaxPurchasePercent} onChange={e => setAdvanceTaxPurchasePercent(parseFloat(e.target.value) || 0)} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Further Tax %</label>
              <input type="number" min={0} max={100} step={0.1} value={furtherTaxPercent} onChange={e => setFurtherTaxPercent(parseFloat(e.target.value) || 0)} style={styles.input} />
            </div>
          </div>
          {isEdit && onUpdateStock && (
            <div style={{ ...styles.formRow, backgroundColor: '#f8fafc', padding: '12px', borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ ...styles.field, marginBottom: 0, minWidth: 120 }}>
                  <label style={styles.label}>Current Stock</label>
                  <input type="number" value={stockQty} readOnly style={{ ...styles.input, backgroundColor: '#e2e8f0', fontWeight: 600, cursor: 'default' }} />
                </div>
                <div style={{ ...styles.field, marginBottom: 0, minWidth: 120 }}>
                  <label style={styles.label}>New Quantity</label>
                  <input type="number" min={0} step={1} defaultValue={currentStock ?? 0} id="stock-update-qty" style={styles.input} />
                </div>
                <button
                  type="button"
                  disabled={stockSaving}
                  onClick={async () => {
                    const input = document.getElementById('stock-update-qty') as HTMLInputElement;
                    const newQty = parseInt(input?.value ?? '0', 10);
                    if (isNaN(newQty) || newQty < 0) {
                      setStockError('Quantity must be a non-negative number.');
                      return;
                    }
                    setStockError('');
                    setStockSaving(true);
                    try {
                      await onUpdateStock(newQty);
                      setStockQty(newQty);
                    } catch (err: any) {
                      setStockError(err?.message || err?.error || 'Failed to update stock.');
                    } finally {
                      setStockSaving(false);
                    }
                  }}
                  style={{ ...styles.primaryBtn, alignSelf: 'flex-end', height: 36 }}
                >
                  {stockSaving ? 'Saving...' : 'Update Stock'}
                </button>
              </div>
              {stockError && <div style={{ ...styles.error, marginTop: 6 }}>{stockError}</div>}
            </div>
          )}
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} className="inv-btn-tool" style={styles.cancelBtn}>Cancel</button>
            {isEdit && onDeactivate && (
              <button type="button" onClick={onDeactivate} style={{ ...styles.cancelBtn, color: 'var(--danger)', borderColor: 'var(--danger-soft)' }}>Deactivate</button>
            )}
            <button type="submit" className="inv-btn-primary" style={styles.primaryBtn} disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update Item' : 'Create Item'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Tab: Stock Balances                                        */
/* ═══════════════════════════════════════════════════════════ */

const StockBalancesTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // Warehouse filter select hidden — spec gap: warehouse master has no verified legacy source.
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [serials, setSerials] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, w, s] = await Promise.all([
        getProducts(),
        getWarehouses(),
        getStockLevels(),
      ]);
      setProducts(p);
      setWarehouses(w);
      setStockLevels(s);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  // Refresh stock levels when sales/purchases/returns are posted
  useRefreshOnMount(load, [
    'sale-posted', 'sale-deleted',
    'purchase-posted', 'purchase-deleted',
    'sale-return-posted', 'sale-return-deleted',
    'purchase-return-posted', 'purchase-return-deleted',
  ]);

  // Lookup maps
  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const warehouseMap = useMemo(() => {
    const m = new Map<string, Warehouse>();
    for (const w of warehouses) m.set(w.id, w);
    return m;
  }, [warehouses]);

  // Filtered stock levels
  const filteredLevels = useMemo(() => {
    let result = stockLevels;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l => {
        const prod = productMap.get(l.productId);
        return prod && (prod.name.toLowerCase().includes(q) || prod.sku.toLowerCase().includes(q));
      });
    }
    return result;
  }, [stockLevels, search, productMap]);

  // Aggregate by product
  const productAggregates = useMemo(() => {
    const agg = new Map<string, { totalQty: number; totalValue: number; levels: StockLevel[] }>();
    for (const l of filteredLevels) {
      const existing = agg.get(l.productId) ?? { totalQty: 0, totalValue: 0, levels: [] };
      existing.totalQty += l.quantityOnHand;
      existing.totalValue += calculateStockValue(l.quantityOnHand, l.unitCost);
      existing.levels.push(l);
      agg.set(l.productId, existing);
    }
    return agg;
  }, [filteredLevels]);

  // Stats
  const stats = useMemo(() => {
    let totalProducts = 0;
    let totalQty = 0;
    let totalValue = 0;
    for (const [, agg] of productAggregates) {
      totalProducts++;
      totalQty += agg.totalQty;
      totalValue += agg.totalValue;
    }
    return { totalProducts, totalQty, totalValue };
  }, [productAggregates]);

  const toggleExpand = async (productId: string) => {
    if (expandedProduct === productId) {
      setExpandedProduct(null);
      setBatches([]);
      setSerials([]);
    } else {
      setExpandedProduct(productId);
      const [b, s] = await Promise.all([
        getProductBatches(productId),
        getProductSerials(productId),
      ]);
      setBatches(b);
      setSerials(s);
    }
  };

  return (
    <>
      {/* Stats */}
      <div style={styles.statsBar}>
        <div style={styles.statChip}>
          <span style={{ ...styles.statDot, backgroundColor: 'var(--info-soft)', color: 'var(--info-fg)' }}>{stats.totalProducts}</span>
          <span style={styles.statLabel}>Products</span>
        </div>
        <div style={styles.statChip}>
          <span style={{ ...styles.statDot, backgroundColor: 'var(--success-soft)', color: 'var(--success-fg)' }}>{fmtInt(stats.totalQty)}</span>
          <span style={styles.statLabel}>Total Qty</span>
        </div>
        <div style={styles.statChip}>
          <span style={styles.statLabel}>Total Value: <strong style={{ color: 'var(--accent-strong)' }}>PKR {fmt(stats.totalValue)}</strong></span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar-responsive" style={styles.toolbar}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or SKU..."
          style={styles.searchInput}
        />
        {/* Warehouse filter hidden — spec gap: no verified legacy warehouse master */}
      </div>

      {/* Stock Table */}
      <div className="table-wrap" style={styles.card}>
        {loading ? (
          <div style={{ padding: 24 }}>
            <div className="skeleton" style={{ width: '100%', height: 300 }} />
          </div>
        ) : (
          <>
            <div style={{ ...styles.treeHeader, minWidth: 640 }}>
              <span style={{ ...styles.col, flex: '0 0 100px' }}>SKU</span>
              <span style={{ ...styles.col, flex: '1' }}>Product Name</span>
              <span style={{ ...styles.col, flex: '0 0 100px' }}>Category</span>
              <span style={{ ...styles.col, flex: '0 0 80px', textAlign: 'right' }}>Qty On Hand</span>
              <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Unit Cost</span>
              <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Total Value</span>
              <span style={{ ...styles.col, flex: '0 0 60px' }}>Details</span>
            </div>
            {productAggregates.size === 0 && (
              <div style={styles.empty}>No stock records found.</div>
            )}
            {Array.from(productAggregates.entries()).map(([productId, agg]) => {
              const prod = productMap.get(productId);
              if (!prod) return null;
              return (
                <React.Fragment key={productId}>
                  <div style={{ ...styles.voucherRow, minWidth: 640 }}>
                    <span style={{ ...styles.col, flex: '0 0 100px', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{prod.sku}</span>
                    <span style={{ ...styles.col, flex: '1', fontWeight: 500 }}>{prod.name}</span>
                    <span style={{ ...styles.col, flex: '0 0 100px', fontSize: 13 }}>{prod.category}</span>
                    <span style={{ ...styles.col, flex: '0 0 80px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{fmtInt(agg.totalQty)}</span>
                    <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
                      {agg.levels.length > 0 ? fmt(agg.levels[0].unitCost) : '—'}
                    </span>
                    <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 600, color: 'var(--accent-strong)' }}>
                      {fmt(agg.totalValue)}
                    </span>
                    <span style={{ ...styles.col, flex: '0 0 60px' }}>
                      <button
                        onClick={() => toggleExpand(productId)}
                        className="inv-expand"
                        style={styles.expandBtn}
                        aria-label={expandedProduct === productId ? 'Collapse details' : 'Expand details'}
                        aria-expanded={expandedProduct === productId}
                      >
                        {expandedProduct === productId ? '▼' : '▶'}
                      </button>
                    </span>
                  </div>
                  {/* Expanded details per warehouse */}
                  {expandedProduct === productId && (
                    <div style={styles.linesContainer}>
                      <div style={{ ...styles.linesHeader, minWidth: 640 }}>
                        <span style={{ ...styles.col, flex: '0 0 100px' }}>Warehouse</span>
                        <span style={{ ...styles.col, flex: '1' }}>Location</span>
                        <span style={{ ...styles.col, flex: '0 0 80px', textAlign: 'right' }}>Qty</span>
                        <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Unit Cost</span>
                        <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Value</span>
                      </div>
                      {agg.levels.map(l => {
                        const wh = warehouseMap.get(l.warehouseId);
                        return (
                          <div key={l.id} style={{ ...styles.lineRow, minWidth: 640 }}>
                            <span style={{ ...styles.col, flex: '0 0 100px', fontSize: 13 }}>{wh?.code ?? '—'}</span>
                            <span style={{ ...styles.col, flex: '1', fontSize: 13 }}>{wh?.name ?? '—'}</span>
                            <span style={{ ...styles.col, flex: '0 0 80px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{fmtInt(l.quantityOnHand)}</span>
                            <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{fmt(l.unitCost)}</span>
                            <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 500 }}>
                              {fmt(calculateStockValue(l.quantityOnHand, l.unitCost))}
                            </span>
                          </div>
                        );
                      })}
                      {batches.length > 0 && (
                        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Batches:</span>
                          {batches.map(b => (
                            <span key={b.id} style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                              {b.batchNumber} ({b.quantityOnHand})
                            </span>
                          ))}
                        </div>
                      )}
                      {serials.length > 0 && (
                        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Serials:</span>
                          {serials.map(s => (
                            <span key={s.id} style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                              {s.serialNumber} ({s.status})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </>
        )}
      </div>
    </>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Warehouses & Locations tab removed — SPECIFICATION GAP:     */
/* no verified legacy source (audit). Warehouse master data    */
/* exists only as an internal dependency of stock posting.     */
/* ═══════════════════════════════════════════════════════════ */

const WarehousesTab_REMOVED = null;

/* ═══════════════════════════════════════════════════════════ */
/* Tab: Stock Balance With Activity                            */
/* ═══════════════════════════════════════════════════════════ */

const StockBWATab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [report, setReport] = useState<StockBWAReport | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [productFilter, setProductFilter] = useState('');

  const loadProducts = useCallback(async () => {
    const p = await getProducts();
    setProducts(p);
  }, [tenantId]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const generate = useCallback(async () => {
    if (!startDate || !endDate || startDate > endDate) return;
    setLoading(true);
    try {
      const result = await getStockBalanceWithActivity(startDate, endDate, productFilter || undefined);
      setReport(result);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, productFilter]);

  const exportCsv = useCallback(async () => {
    if (!report) return;
    const headers = ['SKU', 'Product', 'Unit', 'Opening', 'GRN', 'Issue', 'Return', 'Adjustment', 'Transfer In', 'Transfer Out', 'Closing'];
    const rows = report.rows.map(r => [
      r.productCode, r.productName, r.unit,
      r.openingQty, r.grnQty, r.issueQty, r.returnQty,
      r.adjustmentQty, r.transferInQty, r.transferOutQty, r.closingQty,
    ]);
    const totalRow = ['TOTAL', '', '',
      report.totalOpeningQty, report.totalGrnQty, report.totalIssueQty,
      report.totalReturnQty, report.totalAdjustmentQty,
      report.totalTransferInQty, report.totalTransferOutQty, report.totalClosingQty,
    ];
    rows.push(totalRow);
    const { generateCsv, downloadFile, generateExportFilename } = await import('../utils/export');
    const csv = generateCsv(headers, rows);
    downloadFile(csv, generateExportFilename('Stock-BWA', `${startDate}_to_${endDate}`));
  }, [report, startDate, endDate]);

  const fmtInt = (n: number) => n.toLocaleString('en-PK');

  return (
    <>
      {/* Filters */}
      <div style={styles.toolbar}>
        <div style={styles.filterGroup}>
          <label style={styles.label}>From</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={styles.input} />
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.label}>To</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={styles.input} />
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.label}>Product</label>
          <select value={productFilter} onChange={e => setProductFilter(e.target.value)} style={styles.select}>
            <option value="">All Products</option>
            {products.filter(p => p.isActive).map(p => (
              <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
            ))}
          </select>
        </div>
        <button onClick={generate} className="inv-btn-primary" style={styles.primaryBtn} disabled={loading || !startDate || !endDate || startDate > endDate}>
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
        {report && (
          <button onClick={exportCsv} className="inv-btn-tool" style={styles.cancelBtn}>Export CSV</button>
        )}
      </div>

      {/* Report */}
      <div className="table-wrap" style={styles.card}>
        {!report ? (
          <div style={styles.empty}>Select date range and click "Generate Report" to view stock balance with activity.</div>
        ) : report.rows.length === 0 ? (
          <div style={styles.empty}>No stock movements found for the selected period.</div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ ...styles.treeHeader, minWidth: 1060 }}>
              <span style={styles.statChip}>
                <span style={{ ...styles.statDot, backgroundColor: 'var(--info-soft)', color: 'var(--info-fg)' }}>{report.rows.length}</span>
                <span style={styles.statLabel}>Products</span>
              </span>
              <span style={styles.statChip}>
                <span style={styles.statLabel}>Opening: <strong style={{ color: 'var(--inv-open)' }}>{fmtInt(report.totalOpeningQty)}</strong></span>
              </span>
              <span style={styles.statChip}>
                <span style={styles.statLabel}>Closing: <strong style={{ color: 'var(--inv-grn)' }}>{fmtInt(report.totalClosingQty)}</strong></span>
              </span>
            </div>

            {/* Table Header */}
            <div style={{ ...styles.treeHeader, minWidth: 1060 }}>
              <span style={{ ...styles.col, flex: '0 0 80px' }}>SKU</span>
              <span style={{ ...styles.col, flex: '1' }}>Product</span>
              <span style={{ ...styles.col, flex: '0 0 50px' }}>Unit</span>
              <span style={{ ...styles.col, flex: '0 0 70px', textAlign: 'right' }}>Opening</span>
              <span style={{ ...styles.col, flex: '0 0 60px', textAlign: 'right' }}>GRN</span>
              <span style={{ ...styles.col, flex: '0 0 60px', textAlign: 'right' }}>Issue</span>
              <span style={{ ...styles.col, flex: '0 0 60px', textAlign: 'right' }}>Return</span>
              <span style={{ ...styles.col, flex: '0 0 70px', textAlign: 'right' }}>Adjust</span>
              <span style={{ ...styles.col, flex: '0 0 70px', textAlign: 'right' }}>Trf In</span>
              <span style={{ ...styles.col, flex: '0 0 70px', textAlign: 'right' }}>Trf Out</span>
              <span style={{ ...styles.col, flex: '0 0 70px', textAlign: 'right' }}>Closing</span>
            </div>

            {/* Table Rows */}
            {report.rows.map(r => (
              <div key={r.productId} style={{ ...styles.voucherRow, minWidth: 1060 }}>
                <span style={{ ...styles.col, flex: '0 0 80px', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{r.productCode}</span>
                <span style={{ ...styles.col, flex: '1' }}>{r.productName}</span>
                <span style={{ ...styles.col, flex: '0 0 50px', fontSize: 12, color: 'var(--text-muted)' }}>{r.unit}</span>
                <span style={{ ...styles.col, flex: '0 0 70px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: r.openingQty > 0 ? 'var(--inv-open)' : 'var(--fin-num-muted)' }}>{r.openingQty > 0 ? fmtInt(r.openingQty) : ''}</span>
                <span style={{ ...styles.col, flex: '0 0 60px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: r.grnQty > 0 ? 'var(--inv-grn)' : 'var(--fin-num-muted)' }}>{r.grnQty > 0 ? fmtInt(r.grnQty) : ''}</span>
                <span style={{ ...styles.col, flex: '0 0 60px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: r.issueQty > 0 ? 'var(--inv-issue)' : 'var(--fin-num-muted)' }}>{r.issueQty > 0 ? fmtInt(r.issueQty) : ''}</span>
                <span style={{ ...styles.col, flex: '0 0 60px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: r.returnQty > 0 ? 'var(--inv-return)' : 'var(--fin-num-muted)' }}>{r.returnQty > 0 ? fmtInt(r.returnQty) : ''}</span>
                <span style={{ ...styles.col, flex: '0 0 70px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: r.adjustmentQty !== 0 ? 'var(--inv-adjust)' : 'var(--fin-num-muted)' }}>{r.adjustmentQty !== 0 ? fmtInt(r.adjustmentQty) : ''}</span>
                <span style={{ ...styles.col, flex: '0 0 70px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: r.transferInQty > 0 ? 'var(--inv-trf-in)' : 'var(--fin-num-muted)' }}>{r.transferInQty > 0 ? fmtInt(r.transferInQty) : ''}</span>
                <span style={{ ...styles.col, flex: '0 0 70px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: r.transferOutQty > 0 ? 'var(--inv-trf-out)' : 'var(--fin-num-muted)' }}>{r.transferOutQty > 0 ? fmtInt(r.transferOutQty) : ''}</span>
                <span style={{ ...styles.col, flex: '0 0 70px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 600, color: 'var(--inv-closing)' }}>{fmtInt(r.closingQty)}</span>
              </div>
            ))}

            {/* Totals */}
            <div style={{ ...styles.linesFooter, minWidth: 1060, borderTop: '2px solid var(--border)' }}>
              <span style={{ flex: '0 0 80px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13 }}>Total</span>
              <span style={{ flex: '1' }}></span>
              <span style={{ flex: '0 0 50px' }}></span>
              <span style={{ flex: '0 0 70px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--inv-open)', fontSize: 13 }}>{fmtInt(report.totalOpeningQty)}</span>
              <span style={{ flex: '0 0 60px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--inv-grn)', fontSize: 13 }}>{fmtInt(report.totalGrnQty)}</span>
              <span style={{ flex: '0 0 60px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--inv-issue)', fontSize: 13 }}>{fmtInt(report.totalIssueQty)}</span>
              <span style={{ flex: '0 0 60px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--inv-return)', fontSize: 13 }}>{fmtInt(report.totalReturnQty)}</span>
              <span style={{ flex: '0 0 70px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--inv-adjust)', fontSize: 13 }}>{fmtInt(report.totalAdjustmentQty)}</span>
              <span style={{ flex: '0 0 70px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--inv-trf-in)', fontSize: 13 }}>{fmtInt(report.totalTransferInQty)}</span>
              <span style={{ flex: '0 0 70px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--inv-trf-out)', fontSize: 13 }}>{fmtInt(report.totalTransferOutQty)}</span>
              <span style={{ flex: '0 0 70px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: 'var(--inv-closing)', fontSize: 13 }}>{fmtInt(report.totalClosingQty)}</span>
            </div>
          </>
        )}
      </div>
    </>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Tab: Stock Movements                                       */
/* ═══════════════════════════════════════════════════════════ */

const MovementsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<StockMovementType | ''>('');
  const [statusFilter, setStatusFilter] = useState<StockMovementStatus | ''>('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, p, w] = await Promise.all([
        getStockMovements(),
        getProducts(),
        getWarehouses(),
      ]);
      setMovements(m);
      setProducts(p);
      setWarehouses(w);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const warehouseMap = useMemo(() => {
    const m = new Map<string, Warehouse>();
    for (const w of warehouses) m.set(w.id, w);
    return m;
  }, [warehouses]);

  const filteredMovements = useMemo(() => {
    let result = movements;
    if (typeFilter) result = result.filter(m => m.movementType === typeFilter);
    if (statusFilter) result = result.filter(m => m.status === statusFilter);
    return result;
  }, [movements, typeFilter, statusFilter]);

  const handlePost = async (id: string) => {
    if (!confirm('Post this stock movement? Stock levels will be updated.')) return;
    try {
      await postStockMovement(id);
      await load();
    } catch (err: any) {
      alert(err.message || 'Failed to post movement');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this draft movement?')) return;
    try {
      await cancelStockMovement(id);
      await load();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel movement');
    }
  };

  const stats = useMemo(() => {
    let draft = 0, posted = 0, cancelled = 0;
    for (const m of movements) {
      if (m.status === 'DRAFT') draft++;
      else if (m.status === 'POSTED') posted++;
      else cancelled++;
    }
    return { total: movements.length, draft, posted, cancelled };
  }, [movements]);

  return (
    <>
      {/* Stats */}
      <div className="section-header-responsive" style={styles.sectionHeader}>
        <div style={styles.statsBar}>
          <div style={styles.statChip}>
            <span style={{ ...styles.statDot, backgroundColor: 'var(--neutral-soft)', color: 'var(--neutral-fg)' }}>{stats.total}</span>
            <span style={styles.statLabel}>Total</span>
          </div>
          <div style={styles.statChip}>
            <span style={{ ...styles.statDot, backgroundColor: MOVEMENT_STATUS_COLORS.DRAFT.bg, color: MOVEMENT_STATUS_COLORS.DRAFT.fg }}>{stats.draft}</span>
            <span style={styles.statLabel}>Draft</span>
          </div>
          <div style={styles.statChip}>
            <span style={{ ...styles.statDot, backgroundColor: MOVEMENT_STATUS_COLORS.POSTED.bg, color: MOVEMENT_STATUS_COLORS.POSTED.fg }}>{stats.posted}</span>
            <span style={styles.statLabel}>Posted</span>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="inv-btn-primary" style={styles.primaryBtn}>+ New Movement</button>
      </div>

      {/* Filters */}
      <div className="toolbar-responsive" style={styles.toolbar}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as StockMovementType | '')} className="inv-select" style={styles.filterSelect}>
          <option value="">All Types</option>
          {(Object.keys(STOCK_MOVEMENT_TYPE_LABELS) as StockMovementType[]).map(t => (
            <option key={t} value={t}>{STOCK_MOVEMENT_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StockMovementStatus | '')} className="inv-select" style={styles.filterSelect}>
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="POSTED">Posted</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Movements Table */}
      <div className="table-wrap" style={styles.card}>
        {loading ? (
          <div style={{ padding: 24 }}>
            <div className="skeleton" style={{ width: '100%', height: 300 }} />
          </div>
        ) : (
          <>
            <div style={{ ...styles.treeHeader, minWidth: 1070 }}>
              <span style={{ ...styles.col, flex: '0 0 110px' }}>Date</span>
              <span style={{ ...styles.col, flex: '0 0 100px' }}>Type</span>
              <span style={{ ...styles.col, flex: '1' }}>Product</span>
              <span style={{ ...styles.col, flex: '0 0 100px' }}>From</span>
              <span style={{ ...styles.col, flex: '0 0 100px' }}>To</span>
              <span style={{ ...styles.col, flex: '0 0 80px', textAlign: 'right' }}>Qty</span>
              <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Unit Cost</span>
              <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right' }}>Total</span>
              <span style={{ ...styles.col, flex: '0 0 80px' }}>Status</span>
              <span style={{ ...styles.col, flex: '0 0 100px' }}>Actions</span>
            </div>
            {filteredMovements.length === 0 && (
              <div style={styles.empty}>No stock movements found.</div>
            )}
            {filteredMovements.map(m => {
              const prod = productMap.get(m.productId);
              const fromWh = m.fromWarehouseId ? warehouseMap.get(m.fromWarehouseId) : null;
              const toWh = m.toWarehouseId ? warehouseMap.get(m.toWarehouseId) : null;
              const typeColor = MOVEMENT_TYPE_COLORS[m.movementType] ?? { bg: 'var(--neutral-soft)', fg: 'var(--neutral-fg)' };
              const statusColor = MOVEMENT_STATUS_COLORS[m.status] ?? { bg: 'var(--neutral-soft)', fg: 'var(--neutral-fg)' };

              return (
                <div key={m.id} style={{ ...styles.voucherRow, minWidth: 1070 }}>
                  <span style={{ ...styles.col, flex: '0 0 110px', fontSize: 13 }}>{m.movementDate}</span>
                  <span style={{ ...styles.col, flex: '0 0 100px' }}>
                    <span style={{ ...styles.typeBadge, backgroundColor: typeColor.bg, color: typeColor.fg }}>
                      {m.movementType}
                    </span>
                  </span>
                  <span style={{ ...styles.col, flex: '1', fontSize: 13 }}>{prod?.name ?? '—'}</span>                          <span style={{ ...styles.col, flex: '0 0 100px', fontSize: 12, color: 'var(--text-muted)' }}>{fromWh?.code ?? '—'}</span>                          <span style={{ ...styles.col, flex: '0 0 100px', fontSize: 12, color: 'var(--text-muted)' }}>{toWh?.code ?? '—'}</span>
                  <span style={{ ...styles.col, flex: '0 0 80px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{fmtInt(m.quantity)}</span>
                  <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{fmt(m.unitCost)}</span>
                  <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 500 }}>{fmt(m.totalCost)}</span>
                  <span style={{ ...styles.col, flex: '0 0 80px' }}>
                    <span style={{ ...styles.typeBadge, backgroundColor: statusColor.bg, color: statusColor.fg }}>
                      {m.status}
                    </span>
                  </span>
                  <span style={{ ...styles.col, flex: '0 0 100px', gap: 4 }}>
                    {m.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => handlePost(m.id)}
                          className="inv-row-btn"
                          style={{ ...styles.rowBtn, color: 'var(--success)', borderColor: 'var(--success-soft)' }}
                          title="Post"
                          aria-label={`Post movement ${m.id}`}
                        >✓</button>
                        <button
                          onClick={() => handleCancel(m.id)}
                          className="inv-row-btn inv-row-btn--danger"
                          style={{ ...styles.rowBtn, color: 'var(--danger)', borderColor: 'var(--danger-soft)' }}
                          title="Cancel"
                          aria-label={`Cancel movement ${m.id}`}
                        >✕</button>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Create Movement Modal */}
      {showCreate && (
        <CreateMovementModal
          tenantId={tenantId}
          products={products}
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await load(); }}
        />
      )}
    </>
  );
};

/* ─── Create Movement Modal ────────────────────────────────── */

const CreateMovementModal: React.FC<{
  tenantId: string;
  products: Product[];
  onClose: () => void;
  onCreated: () => void;
}> = ({ tenantId, products, onClose, onCreated }) => {
  const [movementType, setMovementType] = useState<StockMovementType>('GRN');
  const [movementDate, setMovementDate] = useState(new Date().toISOString().split('T')[0]);
  const [productId, setProductId] = useState('');
  // Warehouse selection UI hidden (spec gap) — server resolves the implicit default.
  const [quantity, setQuantity] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [narration, setNarration] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const totalCost = quantity * unitCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!productId) { setError('Product is required.'); return; }
    if (quantity <= 0) { setError('Quantity must be greater than 0.'); return; }
    if (unitCost < 0) { setError('Unit cost cannot be negative.'); return; }

    setSaving(true);
    try {
      await createStockMovement({
        movementType,
        movementDate,
        // from/to warehouseIds intentionally omitted — server resolves the implicit
        // default per movement type (TRANSFER with <2 warehouses is rejected there).
        productId,
        quantity,
        unitCost,
        totalCost,
        narration: narration || undefined,
      });
      onCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create movement');
      setSaving(false);
    }
  };

  // Auto-fill unit cost from product purchase rate
  const handleProductChange = (pid: string) => {
    setProductId(pid);
    const prod = products.find(p => p.id === pid);
    if (prod) setUnitCost(prod.purchaseRate);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div className="responsive-modal" style={{ ...styles.modal, maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>New Stock Movement</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="responsive-form-row" style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Movement Type</label>
              <select value={movementType} onChange={e => setMovementType(e.target.value as StockMovementType)} className="inv-select" style={styles.select}>
                {(Object.keys(STOCK_MOVEMENT_TYPE_LABELS) as StockMovementType[]).map(t => (
                  <option key={t} value={t}>{STOCK_MOVEMENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Date</label>
              <input type="date" value={movementDate} onChange={e => setMovementDate(e.target.value)} style={styles.input} />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Product</label>
            <select value={productId} onChange={e => handleProductChange(e.target.value)} className="inv-select" style={styles.select}>
              <option value="">Select product...</option>
              {products.filter(p => p.isActive).map(p => (
                <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
              ))}
            </select>
          </div>

          {/* Source/Destination warehouse selects hidden — spec gap; server defaults them */}

          <div className="responsive-form-row" style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Quantity</label>
              <input
                type="number"
                min={1}
                value={quantity || ''}
                onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                style={styles.input}
                placeholder="0"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Unit Cost (PKR)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={unitCost || ''}
                onChange={e => setUnitCost(parseFloat(e.target.value) || 0)}
                style={styles.input}
                placeholder="0.00"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Total Cost</label>
              <input
                type="text"
                value={`PKR ${fmt(totalCost)}`}
                style={{ ...styles.input, backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                readOnly
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Narration (optional)</label>
            <input
              value={narration}
              onChange={e => setNarration(e.target.value)}
              style={styles.input}
              placeholder="Description..."
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} className="inv-btn-tool" style={styles.cancelBtn}>Cancel</button>
            <button type="submit" className="inv-btn-primary" style={styles.primaryBtn} disabled={saving}>
              {saving ? 'Creating...' : 'Create Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Styles ───────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  page: { padding: 32, maxWidth: 1200, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  backBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', marginBottom: 4, padding: 0, textDecoration: 'none' },
  title: { fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'var(--text-muted)' },

  tabBar: { display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', marginBottom: 20 },
  tab: { padding: '10px 20px', background: 'none', border: 'none', borderBottom: '2px solid transparent', fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer', marginBottom: -2 },
  tabActive: { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },

  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statsBar: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  statChip: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' },
  statDot: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, fontWeight: 600, fontSize: 12 },

  toolbar: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  searchInput: { flex: '1 1 200px', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)' },
  filterSelect: { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' },

  card: { backgroundColor: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },

  treeHeader: { display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface-2)', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  voucherRow: { display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: 14 },
  col: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  expandBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--text-muted)', padding: '2px 4px' },
  typeBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 },
  rowBtn: { background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },

  primaryBtn: { padding: '10px 20px', backgroundColor: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { padding: '10px 20px', backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, cursor: 'pointer' },

  empty: { padding: 40, textAlign: 'center' as const, color: 'var(--text-disabled)', fontSize: 14 },

  linesContainer: { backgroundColor: 'var(--surface-2)', borderBottom: '2px solid var(--border)' },
  linesHeader: { display: 'flex', padding: '6px 16px 6px 32px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  lineRow: { display: 'flex', padding: '6px 16px 6px 32px', borderBottom: '1px solid var(--border-subtle)', fontSize: 14, alignItems: 'center' },

  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { backgroundColor: 'var(--surface)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-lg)' },
  modalTitle: { fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  formRow: { display: 'flex', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  label: { fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' },
  input: { padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', background: 'var(--surface)', color: 'var(--text-primary)' },
  select: { padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' },
  error: { padding: '10px 14px', backgroundColor: 'var(--tint-bad)', border: '1px solid var(--tint-bad-border)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
};
