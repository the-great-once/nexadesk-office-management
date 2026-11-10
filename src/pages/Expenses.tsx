import React, { useEffect, useState } from 'react';
import { CheckCircle2, DollarSign, Plus, Receipt, XCircle } from 'lucide-react';
import type { Employee, Expense } from '../types/oms';
import { api } from '../lib/api';
import { formatCurrency, formatDate, todayISO } from '../lib/format';
import { EmptyState, Modal, PageHeader, StatusBadge } from '../components/UI';

const EXPENSE_CATEGORIES = [
  'Travel & Lodging',
  'Meals & Entertainment',
  'Software',
  'Office Supplies',
  'Equipment',
  'Client Success',
  'Research',
];

export function Expenses({
  employees,
  activeUser,
  onNotify,
  onDashboardRefresh,
}: {
  employees: Employee[];
  activeUser: Employee | null;
  onNotify: (msg: string, isError?: boolean) => void;
  onDashboardRefresh: () => void;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    employee_id: activeUser ? String(activeUser.id) : '',
    title: '',
    category: 'Office Supplies',
    amount: '',
    expense_date: todayISO(),
    notes: '',
  });

  const canReview = activeUser?.access_level === 'Admin' || activeUser?.access_level === 'Manager';

  async function loadExpenses() {
    try {
      const rows = await api.getExpenses(statusFilter);
      setExpenses(rows);
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  useEffect(() => {
    loadExpenses();
  }, [statusFilter]);

  const pendingTotal = expenses
    .filter((e) => e.status === 'Pending')
    .reduce((sum, e) => sum + e.amount, 0);
  const approvedTotal = expenses
    .filter((e) => e.status === 'Approved')
    .reduce((sum, e) => sum + e.amount, 0);
  const reimbursedTotal = expenses
    .filter((e) => e.status === 'Reimbursed')
    .reduce((sum, e) => sum + e.amount, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createExpense({
        employee_id: Number(form.employee_id || activeUser?.id),
        title: form.title,
        category: form.category,
        amount: Number(form.amount),
        expense_date: form.expense_date,
        notes: form.notes,
      });
      setModalOpen(false);
      setForm({
        employee_id: activeUser ? String(activeUser.id) : '',
        title: '',
        category: 'Office Supplies',
        amount: '',
        expense_date: todayISO(),
        notes: '',
      });
      await loadExpenses();
      onDashboardRefresh();
      onNotify('Expense claim submitted');
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  async function handleStatus(id: number, status: Expense['status']) {
    try {
      await api.updateExpenseStatus(id, status);
      await loadExpenses();
      onDashboardRefresh();
      onNotify(`Expense marked as ${status}`);
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        objectLabel="Finance & Reimbursements"
        icon={Receipt}
        title="Expenses & Reimbursements"
        subtitle="Submit operational expense claims and manage finance approvals"
        highlights={[
          { label: 'Pending Review', value: formatCurrency(pendingTotal) },
          { label: 'Approved Payout', value: formatCurrency(approvedTotal) },
          { label: 'Reimbursed', value: formatCurrency(reimbursedTotal) },
          { label: 'Total Claims', value: expenses.length },
        ]}
        actions={
          <button
            type="button"
            onClick={() => {
              setForm((f) => ({
                ...f,
                employee_id: activeUser ? String(activeUser.id) : f.employee_id,
              }));
              setModalOpen(true);
            }}
            className="sf-btn-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Submit Expense
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            Pending Review
          </div>
          <div className="tabular-nums mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(pendingTotal)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Approved (Awaiting Payout)
          </div>
          <div className="tabular-nums mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(approvedTotal)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-sky-600">
            Reimbursed Total
          </div>
          <div className="tabular-nums mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(reimbursedTotal)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs">
          {['', 'Pending', 'Approved', 'Reimbursed', 'Rejected'].map((st) => (
            <button
              key={st || 'all'}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                statusFilter === st ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st || 'All'}
            </button>
          ))}
        </div>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expense claims found"
          description="Submit a new expense claim or clear the status filter."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Claim</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  {canReview && <th className="px-4 py-3 text-right">Workflow</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{ex.title}</div>
                      {ex.notes && <div className="text-[11px] text-slate-400">{ex.notes}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{ex.employee_name}</div>
                      <div className="text-[11px] text-slate-400">{ex.department_name}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ex.category}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(ex.expense_date)}</td>
                    <td className="tabular-nums px-4 py-3 font-bold text-slate-900">
                      {formatCurrency(ex.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ex.status} />
                    </td>
                    {canReview && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {ex.status === 'Pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStatus(ex.id, 'Approved')}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatus(ex.id, 'Rejected')}
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                              >
                                <XCircle className="h-3 w-3" />
                                Reject
                              </button>
                            </>
                          )}
                          {ex.status === 'Approved' && (
                            <button
                              type="button"
                              onClick={() => handleStatus(ex.id, 'Reimbursed')}
                              className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
                            >
                              <DollarSign className="h-3 w-3" />
                              Mark Reimbursed
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Submit Expense Claim">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Employee</label>
            <select
              value={form.employee_id}
              onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Expense Title *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Client Dinner / Monitor Cable"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Amount ($) *</label>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Expense Date</label>
            <input
              type="date"
              value={form.expense_date}
              onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Notes / Receipt Reference</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
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
              Submit Claim
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
