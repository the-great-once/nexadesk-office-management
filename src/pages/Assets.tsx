import React, { useEffect, useState } from 'react';
import { Laptop, Plus, Search, Trash2 } from 'lucide-react';
import type { Asset, Employee } from '../types/oms';
import { api } from '../lib/api';
import { formatCurrency, formatDate, todayISO } from '../lib/format';
import { EmptyState, Modal, PageHeader, StatusBadge } from '../components/UI';

const CATEGORIES = ['Laptop', 'Monitor', 'Furniture', 'AV Equipment', 'Tablet', 'Printer', 'Networking'];

export function Assets({
  employees,
  onNotify,
  onDashboardRefresh,
}: {
  employees: Employee[];
  onNotify: (msg: string, isError?: boolean) => void;
  onDashboardRefresh: () => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    name: '',
    category: 'Laptop',
    serial_number: '',
    assigned_to: '',
    purchase_date: todayISO(),
    value: '1500',
    notes: '',
  });

  async function loadAssets() {
    try {
      const rows = await api.getAssets({ search, status: statusFilter });
      setAssets(rows);
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  useEffect(() => {
    loadAssets();
  }, [search, statusFilter]);

  const totalValue = assets.reduce((sum, a) => sum + (a.value || 0), 0);
  const assignedCount = assets.filter((a) => a.status === 'Assigned').length;
  const availableCount = assets.filter((a) => a.status === 'Available').length;

  async function handleCreateAsset(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createAsset({
        ...form,
        assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
        value: Number(form.value) || 0,
      });
      setModalOpen(false);
      setForm({
        name: '',
        category: 'Laptop',
        serial_number: '',
        assigned_to: '',
        purchase_date: todayISO(),
        value: '1500',
        notes: '',
      });
      await loadAssets();
      onDashboardRefresh();
      onNotify('Asset registered in inventory');
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  async function handleAssignChange(assetId: number, empIdStr: string) {
    try {
      await api.updateAsset(assetId, {
        assigned_to: empIdStr ? Number(empIdStr) : null,
      });
      await loadAssets();
      onDashboardRefresh();
      onNotify(empIdStr ? 'Asset assigned' : 'Asset returned to available pool');
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  async function handleStatusChange(assetId: number, status: Asset['status']) {
    try {
      await api.updateAsset(assetId, { status });
      await loadAssets();
      onDashboardRefresh();
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteAsset(id);
      await loadAssets();
      onDashboardRefresh();
      onNotify('Asset removed');
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        objectLabel="IT & Workplace Inventory"
        icon={Laptop}
        title="Office Assets & Inventory"
        subtitle="Track laptops, monitors, furniture, and shared office equipment assignments"
        highlights={[
          { label: 'Total Value', value: formatCurrency(totalValue) },
          { label: 'Tracked Units', value: assets.length },
          { label: 'Assigned', value: assignedCount },
          { label: 'Available Pool', value: availableCount },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="sf-btn-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Register Asset
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Inventory Value
          </div>
          <div className="tabular-nums mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(totalValue)}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">{assets.length} tracked items</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned</div>
          <div className="tabular-nums mt-2 text-2xl font-bold text-indigo-600">{assignedCount}</div>
          <div className="mt-0.5 text-xs text-slate-500">Checked out to team members</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Available Stock</div>
          <div className="tabular-nums mt-2 text-2xl font-bold text-emerald-600">{availableCount}</div>
          <div className="mt-0.5 text-xs text-slate-500">Ready for immediate allocation</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tag, model, serial..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
        >
          <option value="">All Statuses</option>
          <option value="Available">Available</option>
          <option value="Assigned">Assigned</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Retired">Retired</option>
        </select>
      </div>

      {assets.length === 0 ? (
        <EmptyState
          icon={Laptop}
          title="No assets found"
          description="Register office hardware or adjust your filters."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tag & Item</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{asset.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {asset.asset_tag}
                        {asset.serial_number ? ` · SN: ${asset.serial_number}` : ''} ·{' '}
                        {formatDate(asset.purchase_date)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{asset.category}</td>
                    <td className="px-4 py-3">
                      <select
                        value={asset.assigned_to ?? ''}
                        onChange={(e) => handleAssignChange(asset.id, e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                      >
                        <option value="">Unassigned (Pool)</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="tabular-nums px-4 py-3 font-semibold text-slate-800">
                      {formatCurrency(asset.value)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={asset.status} />
                        <select
                          value={asset.status}
                          onChange={(e) => handleStatusChange(asset.id, e.target.value as Asset['status'])}
                          className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-600"
                        >
                          <option value="Available">Available</option>
                          <option value="Assigned">Assigned</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Retired">Retired</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(asset.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Register Office Asset">
        <form onSubmit={handleCreateAsset} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Asset Name / Model *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder='e.g. MacBook Pro 14" M4'
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Serial Number</label>
              <input
                value={form.serial_number}
                onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Assign To</label>
              <select
                value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Available in Pool</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Purchase Value ($)</label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Purchase Date</label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Notes</label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Register Asset
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
