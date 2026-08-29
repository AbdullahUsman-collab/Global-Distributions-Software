/**
 * Inventory Module Page
 * Stock management with sub-tabs: Stock Balances, Warehouses, Stock Movements.
 *
 * Source: audit/23_DATA_MODEL.md, audit/03_MASTER_DATA.md, audit/16_CALCULATIONS.md
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/ProtectedRoute';
import { services } from '../services';
import { useRefreshOnMount } from '../utils/useRefreshOnEvent';
import {
  Product,
  Warehouse,
  WarehouseLocation,
  StockLevel,
  StockMovement,
  StockMovementType,
  StockMovementStatus,
  STOCK_MOVEMENT_TYPE_LABELS,
  STOCK_MOVEMENT_STATUS_LABELS,
  CreateProductDTO,
  UpdateProductDTO,
  calculateStockValue,
} from '../../domain/types/inventory';
import { GST_TYPE_LABELS } from '../../domain/types/settings';

/* ─── Tab Definition ───────────────────────────────────────── */

type InventoryTab = 'items' | 'stock' | 'warehouses' | 'movements';

const TABS: { key: InventoryTab; label: string }[] = [
  { key: 'items',      label: 'Item Master' },
  { key: 'stock',      label: 'Stock Balances' },
  { key: 'warehouses', label: 'Warehouses & Locations' },
  { key: 'movements',  label: 'Stock Movements' },
];

/* ─── Constants ────────────────────────────────────────────── */

const MOVEMENT_TYPE_COLORS: Record<StockMovementType, { bg: string; fg: string }> = {
  GRN:        { bg: '#dcfce7', fg: '#15803d' },
  ISSUE:      { bg: '#fee2e2', fg: '#dc2626' },
  TRANSFER:   { bg: '#dbeafe', fg: '#1d4ed8' },
  ADJUSTMENT: { bg: '#fef3c7', fg: '#b45309' },
  RETURN:     { bg: '#f3e8ff', fg: '#7c3aed' },
};

const MOVEMENT_STATUS_COLORS: Record<StockMovementStatus, { bg: string; fg: string }> = {
  DRAFT:     { bg: '#fef3c7', fg: '#92400e' },
  POSTED:    { bg: '#dcfce7', fg: '#166534' },
  CANCELLED: { bg: '#fee2e2', fg: '#991b1b' },
};

const fmt = (n: number) => n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString('en-PK');

/* ═══════════════════════════════════════════════════════════ */
/* Main Inventory Component                                   */
/* ═══════════════════════════════════════════════════════════ */

export const Inventory: React.FC = () => {
  const { tenant } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<InventoryTab>('stock');

  return (
    <div className="page-pad" style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>← Dashboard</button>
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
            style={{ ...styles.tab, ...(tab === t.key ? styles.tabActive : {}) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'items'      && <ItemsTab tenantId={tenant.id} />}
      {tab === 'stock'      && <StockBalancesTab tenantId={tenant.id} />}
      {tab === 'warehouses' && <WarehousesTab tenantId={tenant.id} />}
      {tab === 'movements'  && <MovementsTab tenantId={tenant.id} />}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/* Tab: Item Master                                            */
/* ═══════════════════════════════════════════════════════════ */

const ItemsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await services.inventoryRepository.getProducts(tenantId);
      setProducts(data);
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

  const handleCreate = async (dto: CreateProductDTO) => {
    await services.inventoryRepository.createProduct(tenantId, dto);
    setShowCreate(false);
    await load();
  };

  const handleUpdate = async (id: string, dto: UpdateProductDTO) => {
    await services.inventoryRepository.updateProduct(tenantId, id, dto);
    setEditProduct(null);
    await load();
  };

  const handleDeactivate = async (id: string) => {
    await services.inventoryRepository.deactivateProduct(tenantId, id);
    setEditProduct(null);
    await load();
  };

  return (
    <>
      <div className="section-header-responsive" style={styles.sectionHeader}>
        <div style={styles.statsBar}>
          <div style={styles.statChip}>
            <span style={{ ...styles.statDot, backgroundColor: '#f1f5f9', color: '#475569' }}>{stats.total}</span>
            <span style={styles.statLabel}>Total</span>
          </div>
          <div style={styles.statChip}>
            <span style={{ ...styles.statDot, backgroundColor: '#dcfce7', color: '#166534' }}>{stats.active}</span>
            <span style={styles.statLabel}>Active</span>
          </div>
          <div style={styles.statChip}>
            <span style={{ ...styles.statDot, backgroundColor: '#fee2e2', color: '#991b1b' }}>{stats.inactive}</span>
            <span style={styles.statLabel}>Inactive</span>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} style={styles.primaryBtn}>+ New Item</button>
      </div>

      <div className="toolbar-responsive" style={styles.toolbar}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or SKU..." style={styles.searchInput} />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={styles.filterSelect}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="table-wrap" style={styles.card}>
        {loading ? (
          <div style={{ padding: 24 }}><div className="skeleton" style={{ width: '100%', height: 400 }} /></div>
        ) : (
          <>
            <div style={{ ...styles.treeHeader, minWidth: 760 }}>
              <span style={{ ...styles.col, flex: '0 0 90px' }}>SKU</span>
              <span style={{ ...styles.col, flex: '1' }}>Product Name</span>
              <span style={{ ...styles.col, flex: '0 0 100px' }}>Category</span>
              <span style={{ ...styles.col, flex: '0 0 60px' }}>Unit</span>
              <span style={{ ...styles.col, flex: '0 0 70px' }}>Carton</span>
              <span style={{ ...styles.col, flex: '0 0 80px', textAlign: 'right' }}>Sale</span>
              <span style={{ ...styles.col, flex: '0 0 80px', textAlign: 'right' }}>Purchase</span>
              <span style={{ ...styles.col, flex: '0 0 50px' }}>GST</span>
              <span style={{ ...styles.col, flex: '0 0 50px' }}>Status</span>
              <span style={{ ...styles.col, flex: '0 0 80px' }}>Actions</span>
            </div>
            {filtered.length === 0 && <div style={styles.empty}>No items found.</div>}
            {filtered.map(p => (
              <div key={p.id} style={{ ...styles.voucherRow, minWidth: 760, opacity: p.isActive ? 1 : 0.5 }}>
                <span style={{ ...styles.col, flex: '0 0 90px', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{p.sku}</span>
                <span style={{ ...styles.col, flex: '1', fontWeight: 500 }}>{p.name}</span>
                <span style={{ ...styles.col, flex: '0 0 100px' }}>
                  <span style={{ ...styles.typeBadge, backgroundColor: '#dbeafe', color: '#1d4ed8' }}>{p.category}</span>
                </span>
                <span style={{ ...styles.col, flex: '0 0 60px', fontSize: 13 }}>{p.unit}</span>
                <span style={{ ...styles.col, flex: '0 0 70px', fontSize: 13 }}>{p.pcsPerCarton}</span>
                <span style={{ ...styles.col, flex: '0 0 80px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{fmt(p.saleRate)}</span>
                <span style={{ ...styles.col, flex: '0 0 80px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{fmt(p.purchaseRate)}</span>
                <span style={{ ...styles.col, flex: '0 0 50px', fontSize: 13 }}>{p.gstPercent}%</span>
                <span style={{ ...styles.col, flex: '0 0 50px' }}>
                  <span style={{ ...styles.statusDot, backgroundColor: p.isActive ? '#22c55e' : '#ef4444' }} />
                </span>
                <span style={{ ...styles.col, flex: '0 0 80px', gap: 4 }}>
                  <button onClick={() => setEditProduct(p)} style={styles.rowBtn} title="Edit">✎</button>
                </span>
              </div>
            ))}
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
          onClose={() => setEditProduct(null)}
          onSave={(dto) => handleUpdate(editProduct.id, dto)}
          onDeactivate={() => handleDeactivate(editProduct.id)}
        />
      )}
    </>
  );
};

/* ─── Product Create/Edit Modal ────────────────────────────── */

const ProductModal: React.FC<{
  product?: Product;
  onClose: () => void;
  onSave: (dto: CreateProductDTO) => void;
  onDeactivate?: () => void;
}> = ({ product, onClose, onSave, onDeactivate }) => {
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
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
          <div style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Trade Disc %</label>
              <input type="number" min={0} max={100} step={0.1} value={tradeDiscount} onChange={e => setTradeDiscount(parseFloat(e.target.value) || 0)} style={styles.input} />
            </div>
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
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            {isEdit && onDeactivate && (
              <button type="button" onClick={onDeactivate} style={{ ...styles.cancelBtn, color: '#dc2626', borderColor: '#fecaca' }}>Deactivate</button>
            )}
            <button type="submit" style={styles.primaryBtn} disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update Item' : 'Create Item'}</button>
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
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [serials, setSerials] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, w, s] = await Promise.all([
        services.inventoryRepository.getProducts(tenantId),
        services.inventoryRepository.getWarehouses(tenantId),
        services.inventoryRepository.getStockLevels(tenantId),
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
    if (warehouseFilter) {
      result = result.filter(l => l.warehouseId === warehouseFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l => {
        const prod = productMap.get(l.productId);
        return prod && (prod.name.toLowerCase().includes(q) || prod.sku.toLowerCase().includes(q));
      });
    }
    return result;
  }, [stockLevels, warehouseFilter, search, productMap]);

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
        services.inventoryRepository.getBatches(tenantId, productId),
        services.inventoryRepository.getSerials(tenantId, productId),
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
          <span style={{ ...styles.statDot, backgroundColor: '#dbeafe', color: '#1d4ed8' }}>{stats.totalProducts}</span>
          <span style={styles.statLabel}>Products</span>
        </div>
        <div style={styles.statChip}>
          <span style={{ ...styles.statDot, backgroundColor: '#dcfce7', color: '#15803d' }}>{fmtInt(stats.totalQty)}</span>
          <span style={styles.statLabel}>Total Qty</span>
        </div>
        <div style={styles.statChip}>
          <span style={styles.statLabel}>Total Value: <strong style={{ color: '#1d4ed8' }}>PKR {fmt(stats.totalValue)}</strong></span>
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
        <select
          value={warehouseFilter}
          onChange={e => setWarehouseFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Warehouses</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
          ))}
        </select>
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
                    <span style={{ ...styles.col, flex: '0 0 100px', textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>
                      {fmt(agg.totalValue)}
                    </span>
                    <span style={{ ...styles.col, flex: '0 0 60px' }}>
                      <button
                        onClick={() => toggleExpand(productId)}
                        style={styles.expandBtn}
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
                        <div style={{ padding: '8px 16px', borderTop: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Batches:</span>
                          {batches.map(b => (
                            <span key={b.id} style={{ marginLeft: 8, fontSize: 12, color: '#475569' }}>
                              {b.batchNumber} ({b.quantityOnHand})
                            </span>
                          ))}
                        </div>
                      )}
                      {serials.length > 0 && (
                        <div style={{ padding: '8px 16px', borderTop: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Serials:</span>
                          {serials.map(s => (
                            <span key={s.id} style={{ marginLeft: 8, fontSize: 12, color: '#475569' }}>
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
/* Tab: Warehouses & Locations                                */
/* ═══════════════════════════════════════════════════════════ */

const WarehousesTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWh, setExpandedWh] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const w = await services.inventoryRepository.getWarehouses(tenantId);
      setWarehouses(w);
      // Load locations for all warehouses
      const allLocs: WarehouseLocation[] = [];
      for (const wh of w) {
        const locs = await services.inventoryRepository.getWarehouseLocations(tenantId, wh.id);
        allLocs.push(...locs);
      }
      setLocations(allLocs);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const locationsByWarehouse = useMemo(() => {
    const m = new Map<string, WarehouseLocation[]>();
    for (const loc of locations) {
      const list = m.get(loc.warehouseId) ?? [];
      list.push(loc);
      m.set(loc.warehouseId, list);
    }
    return m;
  }, [locations]);

  return (
    <>
      <div className="section-header-responsive" style={styles.sectionHeader}>
        <div style={styles.statsBar}>
          <div style={styles.statChip}>
            <span style={{ ...styles.statDot, backgroundColor: '#dbeafe', color: '#1d4ed8' }}>{warehouses.length}</span>
            <span style={styles.statLabel}>Warehouses</span>
          </div>
          <div style={styles.statChip}>
            <span style={{ ...styles.statDot, backgroundColor: '#dcfce7', color: '#15803d' }}>{locations.length}</span>
            <span style={styles.statLabel}>Locations</span>
          </div>
        </div>
      </div>

      <div className="table-wrap" style={styles.card}>
        {loading ? (
          <div style={{ padding: 24 }}>
            <div className="skeleton" style={{ width: '100%', height: 200 }} />
          </div>
        ) : (
          <>
            <div style={{ ...styles.treeHeader, minWidth: 380 }}>
              <span style={{ ...styles.col, flex: '0 0 80px' }}>Code</span>
              <span style={{ ...styles.col, flex: '1' }}>Warehouse Name</span>
              <span style={{ ...styles.col, flex: '0 0 80px' }}>Status</span>
              <span style={{ ...styles.col, flex: '0 0 80px' }}>Locations</span>
              <span style={{ ...styles.col, flex: '0 0 60px' }}></span>
            </div>
            {warehouses.length === 0 && (
              <div style={styles.empty}>No warehouses found.</div>
            )}
            {warehouses.map(wh => {
              const locs = locationsByWarehouse.get(wh.id) ?? [];
              return (
                <React.Fragment key={wh.id}>
                  <div style={{ ...styles.voucherRow, minWidth: 380 }}>
                    <span style={{ ...styles.col, flex: '0 0 80px', fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 600 }}>{wh.code}</span>
                    <span style={{ ...styles.col, flex: '1', fontWeight: 500 }}>{wh.name}</span>
                    <span style={{ ...styles.col, flex: '0 0 80px' }}>
                      <span style={{ ...styles.typeBadge, backgroundColor: wh.isActive ? '#dcfce7' : '#fee2e2', color: wh.isActive ? '#166534' : '#991b1b' }}>
                        {wh.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </span>
                    <span style={{ ...styles.col, flex: '0 0 80px', textAlign: 'center', fontSize: 13 }}>{locs.length}</span>
                    <span style={{ ...styles.col, flex: '0 0 60px' }}>
                      <button
                        onClick={() => setExpandedWh(expandedWh === wh.id ? null : wh.id)}
                        style={styles.expandBtn}
                      >
                        {expandedWh === wh.id ? '▼' : '▶'}
                      </button>
                    </span>
                  </div>
                  {expandedWh === wh.id && locs.length > 0 && (
                    <div style={styles.linesContainer}>
                      <div style={{ ...styles.linesHeader, minWidth: 380 }}>
                        <span style={{ ...styles.col, flex: '0 0 120px' }}>Code</span>
                        <span style={{ ...styles.col, flex: '1' }}>Name</span>
                        <span style={{ ...styles.col, flex: '0 0 60px' }}>Rack</span>
                        <span style={{ ...styles.col, flex: '0 0 60px' }}>Shelf</span>
                        <span style={{ ...styles.col, flex: '0 0 60px' }}>Bin</span>
                      </div>
                      {locs.map(loc => (
                        <div key={loc.id} style={{ ...styles.lineRow, minWidth: 380 }}>
                          <span style={{ ...styles.col, flex: '0 0 120px', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>{loc.code}</span>
                          <span style={{ ...styles.col, flex: '1', fontSize: 13 }}>{loc.name}</span>
                          <span style={{ ...styles.col, flex: '0 0 60px', fontSize: 13 }}>{loc.rack ?? '—'}</span>
                          <span style={{ ...styles.col, flex: '0 0 60px', fontSize: 13 }}>{loc.shelf ?? '—'}</span>
                          <span style={{ ...styles.col, flex: '0 0 60px', fontSize: 13 }}>{loc.bin ?? '—'}</span>
                        </div>
                      ))}
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
        services.inventoryRepository.getStockMovements(tenantId),
        services.inventoryRepository.getProducts(tenantId),
        services.inventoryRepository.getWarehouses(tenantId),
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
      await services.inventoryRepository.postStockMovement(tenantId, id);
      await load();
    } catch (err: any) {
      alert(err.message || 'Failed to post movement');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this draft movement?')) return;
    try {
      await services.inventoryRepository.cancelStockMovement(tenantId, id);
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
            <span style={{ ...styles.statDot, backgroundColor: '#f1f5f9', color: '#475569' }}>{stats.total}</span>
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
        <button onClick={() => setShowCreate(true)} style={styles.primaryBtn}>+ New Movement</button>
      </div>

      {/* Filters */}
      <div className="toolbar-responsive" style={styles.toolbar}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as StockMovementType | '')} style={styles.filterSelect}>
          <option value="">All Types</option>
          {(Object.keys(STOCK_MOVEMENT_TYPE_LABELS) as StockMovementType[]).map(t => (
            <option key={t} value={t}>{STOCK_MOVEMENT_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StockMovementStatus | '')} style={styles.filterSelect}>
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
              const typeColor = MOVEMENT_TYPE_COLORS[m.movementType];
              const statusColor = MOVEMENT_STATUS_COLORS[m.status];

              return (
                <div key={m.id} style={{ ...styles.voucherRow, minWidth: 1070 }}>
                  <span style={{ ...styles.col, flex: '0 0 110px', fontSize: 13 }}>{m.movementDate}</span>
                  <span style={{ ...styles.col, flex: '0 0 100px' }}>
                    <span style={{ ...styles.typeBadge, backgroundColor: typeColor.bg, color: typeColor.fg }}>
                      {m.movementType}
                    </span>
                  </span>
                  <span style={{ ...styles.col, flex: '1', fontSize: 13 }}>{prod?.name ?? '—'}</span>
                  <span style={{ ...styles.col, flex: '0 0 100px', fontSize: 12, color: '#64748b' }}>{fromWh?.code ?? '—'}</span>
                  <span style={{ ...styles.col, flex: '0 0 100px', fontSize: 12, color: '#64748b' }}>{toWh?.code ?? '—'}</span>
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
                          style={{ ...styles.rowBtn, color: '#16a34a', borderColor: '#bbf7d0' }}
                          title="Post"
                        >✓</button>
                        <button
                          onClick={() => handleCancel(m.id)}
                          style={{ ...styles.rowBtn, color: '#dc2626', borderColor: '#fecaca' }}
                          title="Cancel"
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
          warehouses={warehouses}
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
  warehouses: Warehouse[];
  onClose: () => void;
  onCreated: () => void;
}> = ({ tenantId, products, warehouses, onClose, onCreated }) => {
  const [movementType, setMovementType] = useState<StockMovementType>('GRN');
  const [movementDate, setMovementDate] = useState(new Date().toISOString().split('T')[0]);
  const [productId, setProductId] = useState('');
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
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

    // Validate warehouse requirements
    if (['GRN', 'RETURN'].includes(movementType) && !toWarehouseId && !fromWarehouseId) {
      setError('Target warehouse is required for GRN/RETURN.'); return;
    }
    if (movementType === 'ISSUE' && !fromWarehouseId) {
      setError('Source warehouse is required for ISSUE.'); return;
    }
    if (movementType === 'TRANSFER') {
      if (!fromWarehouseId) { setError('Source warehouse is required for TRANSFER.'); return; }
      if (!toWarehouseId) { setError('Target warehouse is required for TRANSFER.'); return; }
      if (fromWarehouseId === toWarehouseId) { setError('Source and target warehouses must be different.'); return; }
    }

    setSaving(true);
    try {
      await services.inventoryRepository.createStockMovement(tenantId, {
        tenantId,
        movementType,
        movementDate,
        fromWarehouseId: fromWarehouseId || undefined,
        toWarehouseId: toWarehouseId || undefined,
        productId,
        quantity,
        unitCost,
        totalCost,
        narration: narration || undefined,
        status: 'DRAFT',
        createdBy: 'user',
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

  const needsFromWarehouse = ['ISSUE', 'TRANSFER', 'ADJUSTMENT'].includes(movementType);
  const needsToWarehouse = ['GRN', 'RETURN', 'TRANSFER', 'ADJUSTMENT'].includes(movementType);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div className="responsive-modal" style={{ ...styles.modal, maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>New Stock Movement</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="responsive-form-row" style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Movement Type</label>
              <select value={movementType} onChange={e => setMovementType(e.target.value as StockMovementType)} style={styles.select}>
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
            <select value={productId} onChange={e => handleProductChange(e.target.value)} style={styles.select}>
              <option value="">Select product...</option>
              {products.filter(p => p.isActive).map(p => (
                <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
              ))}
            </select>
          </div>

          {needsFromWarehouse && (
            <div style={styles.field}>
              <label style={styles.label}>Source Warehouse</label>
              <select value={fromWarehouseId} onChange={e => setFromWarehouseId(e.target.value)} style={styles.select}>
                <option value="">Select warehouse...</option>
                {warehouses.filter(w => w.isActive).map(w => (
                  <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
                ))}
              </select>
            </div>
          )}

          {needsToWarehouse && (
            <div style={styles.field}>
              <label style={styles.label}>Destination Warehouse</label>
              <select value={toWarehouseId} onChange={e => setToWarehouseId(e.target.value)} style={styles.select}>
                <option value="">Select warehouse...</option>
                {warehouses.filter(w => w.isActive).map(w => (
                  <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
                ))}
              </select>
            </div>
          )}

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
                style={{ ...styles.input, backgroundColor: '#f8fafc' }}
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
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" style={styles.primaryBtn} disabled={saving}>
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

  toolbar: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  searchInput: { flex: '1 1 200px', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' },
  filterSelect: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', backgroundColor: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgb(0 0 0 / 0.06)' },

  treeHeader: { display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' },
  voucherRow: { display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 14 },
  col: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  expandBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: '#64748b', padding: '2px 4px' },
  typeBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 },
  rowBtn: { background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 14, color: '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },

  primaryBtn: { padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { padding: '10px 20px', backgroundColor: '#fff', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, cursor: 'pointer' },

  empty: { padding: 40, textAlign: 'center' as const, color: '#94a3b8', fontSize: 14 },

  linesContainer: { backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
  linesHeader: { display: 'flex', padding: '6px 16px 6px 32px', borderBottom: '1px solid #e2e8f0', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' },
  lineRow: { display: 'flex', padding: '6px 16px 6px 32px', borderBottom: '1px solid #f1f5f9', fontSize: 14, alignItems: 'center' },

  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgb(0 0 0 / 0.2)' },
  modalTitle: { fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 16 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  formRow: { display: 'flex', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  label: { fontSize: 13, fontWeight: 500, color: '#374151' },
  input: { padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none' },
  select: { padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, outline: 'none', backgroundColor: '#fff' },
  error: { padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
};
