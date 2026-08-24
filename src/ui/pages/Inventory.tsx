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
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <button onClick={() => navigate('/dashboard')} className="text-slate-500 text-sm cursor-pointer mb-1 p-0 bg-transparent border-none hover:text-slate-700">← Dashboard</button>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Inventory</h1>
          <p className="text-sm text-slate-500">{tenant.brandName}</p>
        </div>
      </div>

      <div className="flex overflow-x-auto whitespace-nowrap border-b border-slate-200 hide-scrollbar gap-0 mb-5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors min-h-[44px] whitespace-nowrap cursor-pointer bg-transparent ${
              tab === t.key
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

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
      <div className="flex justify-between items-center mb-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md font-semibold text-xs" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>{stats.total}</span>
            <span>Total</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md font-semibold text-xs" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>{stats.active}</span>
            <span>Active</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md font-semibold text-xs" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>{stats.inactive}</span>
            <span>Inactive</span>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 min-h-[44px]">+ New Item</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or SKU..." className="flex-1 min-w-[200px] px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6"><div className="skeleton w-full h-[400px]" /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="flex items-center px-4 py-2.5 bg-slate-50 border-b-2 border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 90px' }}>SKU</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '1' }}>Product Name</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 100px' }}>Category</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 60px' }}>Unit</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 70px' }}>Carton</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right" style={{ flex: '0 0 80px' }}>Sale</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right" style={{ flex: '0 0 80px' }}>Purchase</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 50px' }}>GST</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 50px' }}>Status</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 80px' }}>Actions</span>
              </div>
            </div>
            {filtered.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">No items found.</div>}
            {filtered.map(p => (
              <div key={p.id} className={`flex items-center px-4 py-2.5 border-b border-slate-100 text-sm hover:bg-slate-50 ${p.isActive ? '' : 'opacity-50'}`}>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[13px]" style={{ flex: '0 0 90px' }}>{p.sku}</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap font-medium" style={{ flex: '1' }}>{p.name}</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 100px' }}>
                  <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}>{p.category}</span>
                </span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px]" style={{ flex: '0 0 60px' }}>{p.unit}</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px]" style={{ flex: '0 0 70px' }}>{p.pcsPerCarton}</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right font-mono text-[13px]" style={{ flex: '0 0 80px' }}>{fmt(p.saleRate)}</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right font-mono text-[13px]" style={{ flex: '0 0 80px' }}>{fmt(p.purchaseRate)}</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px]" style={{ flex: '0 0 50px' }}>{p.gstPercent}%</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 50px' }}>
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: p.isActive ? '#22c55e' : '#ef4444' }} />
                </span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap flex gap-1" style={{ flex: '0 0 80px' }}>
                  <button onClick={() => setEditProduct(p)} className="bg-transparent border border-slate-200 rounded-md w-7 h-7 cursor-pointer text-sm text-slate-500 inline-flex items-center justify-center hover:bg-slate-50" title="Edit">✎</button>
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
  const [advanceTaxPercent, setAdvanceTaxPercent] = useState(product?.advanceTaxPercent ?? 0);
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
        advanceTaxPercent,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save product.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-[700px] max-h-[90vh] overflow-y-auto rounded-xl shadow-xl p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-slate-800 mb-4">{isEdit ? 'Edit' : 'Create'} Item</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">SKU *</label>
              <input value={sku} onChange={e => setSku(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" disabled={isEdit} placeholder="e.g. PROD-009" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Product Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" placeholder="e.g. Baby Shampoo 200ml" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Category *</label>
              <input value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" placeholder="e.g. Shampoo" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Unit</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white">
                <option value="Pcs">Pcs</option>
                <option value="Pack">Pack</option>
                <option value="Set">Set</option>
                <option value="Btl">Btl</option>
                <option value="Box">Box</option>
                <option value="Kg">Kg</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Pcs/Carton</label>
              <input type="number" min={1} value={pcsPerCarton} onChange={e => setPcsPerCarton(parseInt(e.target.value) || 1)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Sale Rate</label>
              <input type="number" min={0} step={0.01} value={saleRate} onChange={e => setSaleRate(parseFloat(e.target.value) || 0)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Purchase Rate</label>
              <input type="number" min={0} step={0.01} value={purchaseRate} onChange={e => setPurchaseRate(parseFloat(e.target.value) || 0)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Retail Price</label>
              <input type="number" min={0} step={0.01} value={retailPrice} onChange={e => setRetailPrice(parseFloat(e.target.value) || 0)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Trade Disc %</label>
              <input type="number" min={0} max={100} step={0.1} value={tradeDiscount} onChange={e => setTradeDiscount(parseFloat(e.target.value) || 0)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Trade Offer</label>
              <input value={tradeOffer} onChange={e => setTradeOffer(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" placeholder="e.g. Buy 10 Get 1" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Min Qty</label>
              <input type="number" min={0} value={minQuantity} onChange={e => setMinQuantity(parseInt(e.target.value) || 0)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">HS Code</label>
              <input value={hsCode} onChange={e => setHsCode(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" placeholder="e.g. 3305.10" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">GST Type</label>
              <select value={gstType} onChange={e => setGstType(e.target.value as 'VAT' | '3RD' | '8TH')} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white">
                <option value="VAT">Standard VAT</option>
                <option value="3RD">3rd Schedule</option>
                <option value="8TH">8th Schedule</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">GST %</label>
              <input type="number" min={0} max={100} step={0.1} value={gstPercent} onChange={e => setGstPercent(parseFloat(e.target.value) || 0)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">FED %</label>
              <input type="number" min={0} max={100} step={0.1} value={fedPercent} onChange={e => setFedPercent(parseFloat(e.target.value) || 0)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Advance Tax %</label>
              <input type="number" min={0} max={100} step={0.1} value={advanceTaxPercent} onChange={e => setAdvanceTaxPercent(parseFloat(e.target.value) || 0)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" />
            </div>
          </div>
          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2.5 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 min-h-[44px]">Cancel</button>
            {isEdit && onDeactivate && (
              <button type="button" onClick={onDeactivate} className="px-4 py-2.5 bg-white text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-50 min-h-[44px]">Deactivate</button>
            )}
            <button type="submit" className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 min-h-[44px]" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update Item' : 'Create Item'}</button>
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
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md font-semibold text-xs" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}>{stats.totalProducts}</span>
          <span>Products</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md font-semibold text-xs" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>{fmtInt(stats.totalQty)}</span>
          <span>Total Qty</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <span>Total Value: <strong style={{ color: '#1d4ed8' }}>PKR {fmt(stats.totalValue)}</strong></span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or SKU..."
          className="flex-1 min-w-[200px] px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]"
        />
        <select
          value={warehouseFilter}
          onChange={e => setWarehouseFilter(e.target.value)}
          className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white"
        >
          <option value="">All Warehouses</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
          ))}
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
              <div className="flex items-center px-4 py-2.5 bg-slate-50 border-b-2 border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 100px' }}>SKU</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '1' }}>Product Name</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 100px' }}>Category</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right" style={{ flex: '0 0 80px' }}>Qty On Hand</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right" style={{ flex: '0 0 100px' }}>Unit Cost</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right" style={{ flex: '0 0 100px' }}>Total Value</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 60px' }}>Details</span>
              </div>
            </div>
            {productAggregates.size === 0 && (
              <div className="p-10 text-center text-slate-400 text-sm">No stock records found.</div>
            )}
            {Array.from(productAggregates.entries()).map(([productId, agg]) => {
              const prod = productMap.get(productId);
              if (!prod) return null;
              return (
                <React.Fragment key={productId}>
                  <div className="flex items-center px-4 py-2.5 border-b border-slate-100 text-sm hover:bg-slate-50">
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[13px]" style={{ flex: '0 0 100px' }}>{prod.sku}</span>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap font-medium" style={{ flex: '1' }}>{prod.name}</span>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px]" style={{ flex: '0 0 100px' }}>{prod.category}</span>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right font-mono text-[13px]" style={{ flex: '0 0 80px' }}>{fmtInt(agg.totalQty)}</span>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right font-mono text-[13px]" style={{ flex: '0 0 100px' }}>
                      {agg.levels.length > 0 ? fmt(agg.levels[0].unitCost) : '—'}
                    </span>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right font-mono text-[13px] font-semibold" style={{ flex: '0 0 100px', color: '#1d4ed8' }}>
                      {fmt(agg.totalValue)}
                    </span>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 60px' }}>
                      <button
                        onClick={() => toggleExpand(productId)}
                        className="bg-transparent border-none cursor-pointer text-[10px] text-slate-500 px-1 py-0.5 hover:text-slate-700"
                      >
                        {expandedProduct === productId ? '▼' : '▶'}
                      </button>
                    </span>
                  </div>
                  {expandedProduct === productId && (
                    <div className="bg-slate-50 border-b-2 border-slate-200">
                      <div className="flex items-center px-4 py-1.5 pl-8 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 100px' }}>Warehouse</span>
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '1' }}>Location</span>
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right" style={{ flex: '0 0 80px' }}>Qty</span>
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right" style={{ flex: '0 0 100px' }}>Unit Cost</span>
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right" style={{ flex: '0 0 100px' }}>Value</span>
                      </div>
                      {agg.levels.map(l => {
                        const wh = warehouseMap.get(l.warehouseId);
                        return (
                          <div key={l.id} className="flex items-center px-4 py-1.5 pl-8 border-b border-slate-100 text-sm">
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px]" style={{ flex: '0 0 100px' }}>{wh?.code ?? '—'}</span>
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px]" style={{ flex: '1' }}>{wh?.name ?? '—'}</span>
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right font-mono text-[13px]" style={{ flex: '0 0 80px' }}>{fmtInt(l.quantityOnHand)}</span>
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right font-mono text-[13px]" style={{ flex: '0 0 100px' }}>{fmt(l.unitCost)}</span>
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right font-mono text-[13px] font-medium" style={{ flex: '0 0 100px' }}>
                              {fmt(calculateStockValue(l.quantityOnHand, l.unitCost))}
                            </span>
                          </div>
                        );
                      })}
                      {batches.length > 0 && (
                        <div className="px-4 py-2 pl-8 border-t border-slate-200">
                          <span className="text-xs font-semibold text-slate-500">Batches:</span>
                          {batches.map(b => (
                            <span key={b.id} className="ml-2 text-xs text-slate-600">
                              {b.batchNumber} ({b.quantityOnHand})
                            </span>
                          ))}
                        </div>
                      )}
                      {serials.length > 0 && (
                        <div className="px-4 py-2 pl-8 border-t border-slate-200">
                          <span className="text-xs font-semibold text-slate-500">Serials:</span>
                          {serials.map(s => (
                            <span key={s.id} className="ml-2 text-xs text-slate-600">
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
      <div className="flex justify-between items-center mb-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md font-semibold text-xs" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}>{warehouses.length}</span>
            <span>Warehouses</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md font-semibold text-xs" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>{locations.length}</span>
            <span>Locations</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            <div className="skeleton w-full h-[200px]" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="flex items-center px-4 py-2.5 bg-slate-50 border-b-2 border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 80px' }}>Code</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '1' }}>Warehouse Name</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 80px' }}>Status</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 80px' }}>Locations</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 60px' }}></span>
              </div>
            </div>
            {warehouses.length === 0 && (
              <div className="p-10 text-center text-slate-400 text-sm">No warehouses found.</div>
            )}
            {warehouses.map(wh => {
              const locs = locationsByWarehouse.get(wh.id) ?? [];
              return (
                <React.Fragment key={wh.id}>
                  <div className="flex items-center px-4 py-2.5 border-b border-slate-100 text-sm hover:bg-slate-50">
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[13px] font-semibold" style={{ flex: '0 0 80px' }}>{wh.code}</span>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap font-medium" style={{ flex: '1' }}>{wh.name}</span>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 80px' }}>
                      <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ backgroundColor: wh.isActive ? '#dcfce7' : '#fee2e2', color: wh.isActive ? '#166534' : '#991b1b' }}>
                        {wh.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </span>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-center text-[13px]" style={{ flex: '0 0 80px' }}>{locs.length}</span>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 60px' }}>
                      <button
                        onClick={() => setExpandedWh(expandedWh === wh.id ? null : wh.id)}
                        className="bg-transparent border-none cursor-pointer text-[10px] text-slate-500 px-1 py-0.5 hover:text-slate-700"
                      >
                        {expandedWh === wh.id ? '▼' : '▶'}
                      </button>
                    </span>
                  </div>
                  {expandedWh === wh.id && locs.length > 0 && (
                    <div className="bg-slate-50 border-b-2 border-slate-200">
                      <div className="flex items-center px-4 py-1.5 pl-8 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 120px' }}>Code</span>
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '1' }}>Name</span>
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 60px' }}>Rack</span>
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 60px' }}>Shelf</span>
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 60px' }}>Bin</span>
                      </div>
                      {locs.map(loc => (
                        <div key={loc.id} className="flex items-center px-4 py-1.5 pl-8 border-b border-slate-100 text-sm">
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[13px]" style={{ flex: '0 0 120px' }}>{loc.code}</span>
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px]" style={{ flex: '1' }}>{loc.name}</span>
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px]" style={{ flex: '0 0 60px' }}>{loc.rack ?? '—'}</span>
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px]" style={{ flex: '0 0 60px' }}>{loc.shelf ?? '—'}</span>
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px]" style={{ flex: '0 0 60px' }}>{loc.bin ?? '—'}</span>
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
      <div className="flex justify-between items-center mb-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md font-semibold text-xs" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>{stats.total}</span>
            <span>Total</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md font-semibold text-xs" style={{ backgroundColor: MOVEMENT_STATUS_COLORS.DRAFT.bg, color: MOVEMENT_STATUS_COLORS.DRAFT.fg }}>{stats.draft}</span>
            <span>Draft</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-md font-semibold text-xs" style={{ backgroundColor: MOVEMENT_STATUS_COLORS.POSTED.bg, color: MOVEMENT_STATUS_COLORS.POSTED.fg }}>{stats.posted}</span>
            <span>Posted</span>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 min-h-[44px]">+ New Movement</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as StockMovementType | '')} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white">
          <option value="">All Types</option>
          {(Object.keys(STOCK_MOVEMENT_TYPE_LABELS) as StockMovementType[]).map(t => (
            <option key={t} value={t}>{STOCK_MOVEMENT_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StockMovementStatus | '')} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white">
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="POSTED">Posted</option>
          <option value="CANCELLED">Cancelled</option>
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
              <div className="flex items-center px-4 py-2.5 bg-slate-50 border-b-2 border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 110px' }}>Date</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 100px' }}>Type</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '1' }}>Product</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 100px' }}>From</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 100px' }}>To</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right" style={{ flex: '0 0 80px' }}>Qty</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right" style={{ flex: '0 0 100px' }}>Unit Cost</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right" style={{ flex: '0 0 100px' }}>Total</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 80px' }}>Status</span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 100px' }}>Actions</span>
              </div>
            </div>
            {filteredMovements.length === 0 && (
              <div className="p-10 text-center text-slate-400 text-sm">No stock movements found.</div>
            )}
            {filteredMovements.map(m => {
              const prod = productMap.get(m.productId);
              const fromWh = m.fromWarehouseId ? warehouseMap.get(m.fromWarehouseId) : null;
              const toWh = m.toWarehouseId ? warehouseMap.get(m.toWarehouseId) : null;
              const typeColor = MOVEMENT_TYPE_COLORS[m.movementType];
              const statusColor = MOVEMENT_STATUS_COLORS[m.status];

              return (
                <div key={m.id} className="flex items-center px-4 py-2.5 border-b border-slate-100 text-sm hover:bg-slate-50">
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px]" style={{ flex: '0 0 110px' }}>{m.movementDate}</span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 100px' }}>
                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ backgroundColor: typeColor.bg, color: typeColor.fg }}>
                      {m.movementType}
                    </span>
                  </span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px]" style={{ flex: '1' }}>{prod?.name ?? '—'}</span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-500" style={{ flex: '0 0 100px' }}>{fromWh?.code ?? '—'}</span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-500" style={{ flex: '0 0 100px' }}>{toWh?.code ?? '—'}</span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right font-mono text-[13px]" style={{ flex: '0 0 80px' }}>{fmtInt(m.quantity)}</span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right font-mono text-[13px]" style={{ flex: '0 0 100px' }}>{fmt(m.unitCost)}</span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap text-right font-mono text-[13px] font-medium" style={{ flex: '0 0 100px' }}>{fmt(m.totalCost)}</span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap" style={{ flex: '0 0 80px' }}>
                    <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ backgroundColor: statusColor.bg, color: statusColor.fg }}>
                      {m.status}
                    </span>
                  </span>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap flex gap-1" style={{ flex: '0 0 100px' }}>
                    {m.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => handlePost(m.id)}
                          className="bg-transparent border border-green-200 rounded-md w-7 h-7 cursor-pointer text-sm inline-flex items-center justify-center hover:bg-green-50"
                          style={{ color: '#16a34a' }}
                          title="Post"
                        >✓</button>
                        <button
                          onClick={() => handleCancel(m.id)}
                          className="bg-transparent border border-red-200 rounded-md w-7 h-7 cursor-pointer text-sm inline-flex items-center justify-center hover:bg-red-50"
                          style={{ color: '#dc2626' }}
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

  const handleProductChange = (pid: string) => {
    setProductId(pid);
    const prod = products.find(p => p.id === pid);
    if (prod) setUnitCost(prod.purchaseRate);
  };

  const needsFromWarehouse = ['ISSUE', 'TRANSFER', 'ADJUSTMENT'].includes(movementType);
  const needsToWarehouse = ['GRN', 'RETURN', 'TRANSFER', 'ADJUSTMENT'].includes(movementType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-[600px] max-h-[90vh] overflow-y-auto rounded-xl shadow-xl p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-slate-800 mb-4">New Stock Movement</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Movement Type</label>
              <select value={movementType} onChange={e => setMovementType(e.target.value as StockMovementType)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white">
                {(Object.keys(STOCK_MOVEMENT_TYPE_LABELS) as StockMovementType[]).map(t => (
                  <option key={t} value={t}>{STOCK_MOVEMENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Date</label>
              <input type="date" value={movementDate} onChange={e => setMovementDate(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Product</label>
            <select value={productId} onChange={e => handleProductChange(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white">
              <option value="">Select product...</option>
              {products.filter(p => p.isActive).map(p => (
                <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
              ))}
            </select>
          </div>

          {needsFromWarehouse && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Source Warehouse</label>
              <select value={fromWarehouseId} onChange={e => setFromWarehouseId(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white">
                <option value="">Select warehouse...</option>
                {warehouses.filter(w => w.isActive).map(w => (
                  <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
                ))}
              </select>
            </div>
          )}

          {needsToWarehouse && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Destination Warehouse</label>
              <select value={toWarehouseId} onChange={e => setToWarehouseId(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px] bg-white">
                <option value="">Select warehouse...</option>
                {warehouses.filter(w => w.isActive).map(w => (
                  <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Quantity</label>
              <input
                type="number"
                min={1}
                value={quantity || ''}
                onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]"
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Unit Cost (PKR)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={unitCost || ''}
                onChange={e => setUnitCost(parseFloat(e.target.value) || 0)}
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]"
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Total Cost</label>
              <input
                type="text"
                value={`PKR ${fmt(totalCost)}`}
                className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none min-h-[44px] bg-slate-50"
                readOnly
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Narration (optional)</label>
            <input
              value={narration}
              onChange={e => setNarration(e.target.value)}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 min-h-[44px]"
              placeholder="Description..."
            />
          </div>

          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2.5 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 min-h-[44px]">Cancel</button>
            <button type="submit" className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 min-h-[44px]" disabled={saving}>
              {saving ? 'Creating...' : 'Create Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
