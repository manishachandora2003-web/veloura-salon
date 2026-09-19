import React, { useState } from 'react';
import {
  Package as PackageIcon,
  AlertTriangle,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  IndianRupee,
  Layers,
  Truck,
  X,
  History,
} from 'lucide-react';
import { InventoryProduct, InventoryMovement, Supplier } from '../types.ts';
import { formatCurrency } from '../lib/currency.ts';
import { api } from '../services/api.ts';

interface InventoryViewProps {
  products: InventoryProduct[];
  suppliers: Supplier[];
  onRefreshData: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  suppliers,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'movements' | 'suppliers'>('products');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);

  // Movement Form
  const [movementQty, setMovementQty] = useState<number>(1);
  const [movementType, setMovementType] = useState<string>('STOCK_IN');
  const [movementReason, setMovementReason] = useState<string>('Restock / Purchase');
  const [movementSubmitting, setMovementSubmitting] = useState(false);

  // Add Product Form
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Hair Care');
  const [unit, setUnit] = useState('Bottle');
  const [currentStock, setCurrentStock] = useState(10);
  const [minimumStock, setMinimumStock] = useState(5);
  const [costPrice, setCostPrice] = useState(500);
  const [sellingPrice, setSellingPrice] = useState(850);
  const [supplierId, setSupplierId] = useState<number | undefined>();
  const [submittingProduct, setSubmittingProduct] = useState(false);

  // Movements state
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Filtered Products
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockItems = products.filter((p) => p.currentStock <= p.minimumStock);

  // Fetch movements when opening movements tab
  React.useEffect(() => {
    if (activeTab === 'movements') {
      setLoadingMovements(true);
      api
        .getInventoryMovements()
        .then(setMovements)
        .catch(console.error)
        .finally(() => setLoadingMovements(false));
    }
  }, [activeTab]);

  const handleOpenMovement = (prod: InventoryProduct, defaultType: string = 'STOCK_IN') => {
    setSelectedProduct(prod);
    setMovementType(defaultType);
    setMovementQty(1);
    setMovementReason(defaultType === 'STOCK_IN' ? 'Stock Received / Purchase' : 'Used for Salon Service');
    setShowMovementModal(true);
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || movementQty <= 0) return;

    setMovementSubmitting(true);
    try {
      await api.recordStockMovement(selectedProduct.id, {
        quantity: Number(movementQty),
        type: movementType,
        reason: movementReason || undefined,
        performedBy: 'Salon Manager',
      });
      setShowMovementModal(false);
      onRefreshData();
    } catch (e: any) {
      alert(e.message || 'Error recording stock movement');
    } finally {
      setMovementSubmitting(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmittingProduct(true);
    try {
      await api.createInventoryProduct({
        name: name.trim(),
        sku: sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
        category,
        unit,
        currentStock: Number(currentStock),
        minimumStock: Number(minimumStock),
        costPrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        supplierId: supplierId ? Number(supplierId) : undefined,
      });

      setName('');
      setSku('');
      setShowAddModal(false);
      onRefreshData();
    } catch (e: any) {
      alert(e.message || 'Error creating product');
    } finally {
      setSubmittingProduct(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner if Low Stock Exists */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Low Stock Warning:</strong> {lowStockItems.length} product(s) have fallen below their minimum
              reorder threshold ({lowStockItems.map((p) => p.name).join(', ')}).
            </span>
          </div>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex space-x-2">
          <button
            id="inv-tab-products"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'products'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Product Stock ({products.length})
          </button>
          <button
            id="inv-tab-movements"
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'movements'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Stock Movement History
          </button>
          <button
            id="inv-tab-suppliers"
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'suppliers'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Suppliers ({suppliers.length})
          </button>
        </div>

        {activeTab === 'products' && (
          <button
            id="inv-add-product-btn"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5"
          >
            <Plus className="h-4 w-4 text-amber-400" />
            <span>Add Inventory Item</span>
          </button>
        )}
      </div>

      {activeTab === 'products' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden p-4 space-y-4">
          <div className="relative w-full sm:w-80">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
            <input
              id="inv-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by SKU, name or category..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs placeholder-slate-400"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50">
                  <th className="py-3 px-3">Product Name</th>
                  <th className="py-3 px-3">SKU</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Stock Level</th>
                  <th className="py-3 px-3">Min Alert</th>
                  <th className="py-3 px-3">Cost Price</th>
                  <th className="py-3 px-3">Selling Price</th>
                  <th className="py-3 px-3 text-right">Quick Stock Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const isLow = p.currentStock <= p.minimumStock;
                  return (
                    <tr key={p.id} id={`inv-row-${p.id}`} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-400">Unit: {p.unit}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">{p.sku}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-extrabold px-2 py-0.5 rounded-full text-xs ${
                            isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {p.currentStock} {p.unit}s
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{p.minimumStock}</td>
                      <td className="py-3 px-3 text-slate-600">{formatCurrency(p.costPrice)}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{formatCurrency(p.sellingPrice)}</td>
                      <td className="py-3 px-3 text-right space-x-1.5">
                        <button
                          id={`inv-stock-in-${p.id}`}
                          onClick={() => handleOpenMovement(p, 'STOCK_IN')}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded text-[11px]"
                          title="Restock In"
                        >
                          + In
                        </button>
                        <button
                          id={`inv-stock-out-${p.id}`}
                          onClick={() => handleOpenMovement(p, 'STOCK_OUT')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[11px]"
                          title="Usage / Out"
                        >
                          - Out
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden p-4">
          <h3 className="font-bold text-slate-900 text-sm mb-3">Inventory Audit Log (Real Stock Movements)</h3>
          {loadingMovements ? (
            <div className="py-8 text-center text-slate-400">Loading audit history...</div>
          ) : movements.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No stock movements recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Quantity</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{m.createdAt}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{m.productName}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.type === 'STOCK_IN'
                              ? 'bg-emerald-50 text-emerald-700'
                              : m.type === 'STOCK_OUT'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-extrabold">{m.quantity}</td>
                      <td className="py-2.5 px-3 text-slate-600">{m.reason || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-400">{m.performedBy || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
              <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
              <p className="text-slate-500">Contact: {s.contactPerson}</p>
              <p className="text-slate-500 font-mono">Phone: {s.phone}</p>
              {s.email && <p className="text-slate-400">Email: {s.email}</p>}
              {s.gstNumber && <p className="text-slate-400 font-mono">GST: {s.gstNumber}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Stock Movement Modal */}
      {showMovementModal && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 relative">
            <button
              onClick={() => setShowMovementModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base mb-1">Stock Adjustment</h3>
            <p className="text-xs text-slate-500 mb-4">{selectedProduct.name} (Current: {selectedProduct.currentStock} {selectedProduct.unit}s)</p>

            <form onSubmit={handleSaveMovement} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Movement Type</label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="STOCK_IN">Stock In (Purchase / Restock)</option>
                  <option value="STOCK_OUT">Stock Out (Used in Service / Sold)</option>
                  <option value="DAMAGE">Damaged / Expired / Wastage</option>
                  <option value="ADJUSTMENT">Audit Count Correction</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Quantity ({selectedProduct.unit}s)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={movementQty}
                  onChange={(e) => setMovementQty(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason / Reference</label>
                <input
                  type="text"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="e.g. Invoice #203, Used for Keratin treatment"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={movementSubmitting}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-xs"
                >
                  {movementSubmitting ? 'Recording...' : 'Record Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-bold text-slate-900 text-base mb-1">Add Inventory Product</h3>
            <p className="text-xs text-slate-500 mb-4">Register new salon product into stock tracking</p>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. L'Oreal Serie Expert Shampoo 500ml"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">SKU / Code</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. LOR-SHP-500"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Hair Care">Hair Care</option>
                    <option value="Skin Care">Skin Care</option>
                    <option value="Color & Bleach">Color & Bleach</option>
                    <option value="Wax & Strips">Wax & Strips</option>
                    <option value="Spa Oils">Spa Oils</option>
                    <option value="Disposables">Disposables</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Min Alert</label>
                  <input
                    type="number"
                    min="1"
                    value={minimumStock}
                    onChange={(e) => setMinimumStock(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Bottle/Tub"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProduct}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-xs"
                >
                  {submittingProduct ? 'Saving...' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
