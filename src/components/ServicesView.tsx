import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Plus,
  Clock,
  IndianRupee,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';
import { Service, ServiceCategory } from '../types.ts';
import { formatCurrency } from '../lib/currency.ts';
import { api } from '../services/api.ts';

interface ServicesViewProps {
  services: Service[];
  categories: ServiceCategory[];
  onRefreshData: () => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  categories,
  onRefreshData,
}) => {
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [categoryName, setCategoryName] = useState('HAIR');
  const [price, setPrice] = useState<number>(300);
  const [duration, setDuration] = useState<number>(30);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filtered services
  const filtered = services.filter((s) => {
    const matchesCat = selectedCat === 'ALL' || s.categoryName === selectedCat;
    const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleOpenAdd = () => {
    setEditingService(null);
    setName('');
    setCategoryName('HAIR');
    setPrice(300);
    setDuration(30);
    setDescription('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (svc: Service) => {
    setEditingService(svc);
    setName(svc.name);
    setCategoryName(svc.categoryName);
    setPrice(svc.price);
    setDuration(svc.duration);
    setDescription(svc.description || '');
    setShowAddModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      if (editingService) {
        await api.updateService(editingService.id, {
          name: name.trim(),
          categoryName,
          price: Number(price),
          duration: Number(duration),
          description: description.trim() || undefined,
        });
      } else {
        await api.createService({
          name: name.trim(),
          categoryName,
          price: Number(price),
          duration: Number(duration),
          description: description.trim() || undefined,
        });
      }
      setShowAddModal(false);
      onRefreshData();
    } catch (e: any) {
      alert(e.message || 'Error saving service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this service?')) {
      try {
        await api.deleteService(id);
        onRefreshData();
      } catch (e: any) {
        alert(e.message || 'Error deleting service');
      }
    }
  };

  const handleToggleActive = async (svc: Service) => {
    try {
      await api.updateService(svc.id, { isActive: !svc.isActive });
      onRefreshData();
    } catch (e: any) {
      alert(e.message || 'Error updating status');
    }
  };

  const categoryList: string[] = ['ALL', ...Array.from(new Set(services.map((s) => s.categoryName))) as string[]];

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
            <input
              id="services-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services (e.g. Keratin, Facial)..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline whitespace-nowrap">
            {services.length} Total Services
          </span>
        </div>

        <button
          id="services-add-new-btn"
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5"
        >
          <Plus className="h-4 w-4 text-amber-400" />
          <span>Add Custom Service</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categoryList.map((cat) => (
          <button
            key={cat}
            id={`services-filter-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            onClick={() => setSelectedCat(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCat === cat
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat} {cat !== 'ALL' && `(${services.filter((s) => s.categoryName === cat).length})`}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div
            key={s.id}
            id={`service-card-${s.id}`}
            className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 p-4 transition-all shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  {s.categoryName}
                </span>
                <span className="text-xs text-slate-400 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {s.duration} mins
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-sm">{s.name}</h3>
              {s.description && (
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{s.description}</p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-medium">Standard Price</span>
                <div className="text-base font-extrabold text-slate-900">{formatCurrency(s.price)}</div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  id={`service-edit-${s.id}`}
                  onClick={() => handleOpenEdit(s)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                  title="Edit Service"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  id={`service-toggle-${s.id}`}
                  onClick={() => handleToggleActive(s)}
                  className={`p-1.5 rounded ${s.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-100'}`}
                  title={s.isActive ? 'Active' : 'Inactive'}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
                <button
                  id={`service-delete-${s.id}`}
                  onClick={() => handleDelete(s.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                  title="Delete Service"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
            <button
              id="service-modal-close"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {editingService ? 'Edit Service' : 'Add New Service'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">Manage salon catalog offering and pricing</p>

            <form onSubmit={handleSaveService} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Service Name *</label>
                <input
                  id="service-form-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Coconut Oil Hair Spa"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Category *</label>
                <select
                  id="service-form-category"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="HAIR">HAIR</option>
                  <option value="FACIAL & SKIN">FACIAL & SKIN</option>
                  <option value="WAXING">WAXING</option>
                  <option value="THREADING">THREADING</option>
                  <option value="MANICURE / PEDICURE">MANICURE / PEDICURE</option>
                  <option value="MAKEUP">MAKEUP</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Price (₹ INR) *</label>
                  <input
                    id="service-form-price"
                    type="number"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Duration (Mins) *</label>
                  <input
                    id="service-form-duration"
                    type="number"
                    min="5"
                    step="5"
                    required
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  id="service-form-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details of procedure, products used, and benefits..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  id="service-form-save-btn"
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-xs transition-colors"
                >
                  {submitting ? 'Saving...' : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
