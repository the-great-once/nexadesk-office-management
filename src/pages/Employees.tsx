import React, { useState } from 'react';
import { Building, Mail, Phone, Plus, Search, Trash2, UserPlus, Users } from 'lucide-react';
import type { Department, Employee } from '../types/oms';
import { api } from '../lib/api';
import { formatCurrency, formatDate, todayISO } from '../lib/format';
import { Avatar, EmptyState, Modal, PageHeader, StatusBadge } from '../components/UI';

export function Employees({
  employees,
  departments,
  onRefresh,
  onNotify,
}: {
  employees: Employee[];
  departments: Department[];
  onRefresh: () => void;
  onNotify: (msg: string, isError?: boolean) => void;
}) {
  const [tab, setTab] = useState<'directory' | 'departments'>('directory');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  const [empForm, setEmpForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    department_id: '',
    employment_type: 'Full-time',
    status: 'Active',
    join_date: todayISO(),
    salary: '95000',
    access_level: 'Staff' as Employee['access_level'],
  });

  const [deptForm, setDeptForm] = useState({
    name: '',
    head_name: '',
    budget: '150000',
    location: 'HQ - Floor 2',
  });

  const filtered = employees.filter((e) => {
    const matchesSearch =
      !search.trim() ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(search.toLowerCase());
    const matchesDept = !deptFilter || String(e.department_id) === deptFilter;
    return matchesSearch && matchesDept;
  });

  function openNewEmployee() {
    setEditingEmp(null);
    setEmpForm({
      name: '',
      email: '',
      phone: '',
      role: '',
      department_id: departments[0] ? String(departments[0].id) : '',
      employment_type: 'Full-time',
      status: 'Active',
      join_date: todayISO(),
      salary: '95000',
      access_level: 'Staff',
    });
    setEmpModalOpen(true);
  }

  function openEditEmployee(emp: Employee) {
    setEditingEmp(emp);
    setEmpForm({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      role: emp.role,
      department_id: emp.department_id ? String(emp.department_id) : '',
      employment_type: emp.employment_type,
      status: emp.status,
      join_date: emp.join_date,
      salary: String(emp.salary),
      access_level: emp.access_level,
    });
    setEmpModalOpen(true);
  }

  async function handleSaveEmployee(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        ...empForm,
        department_id: empForm.department_id ? Number(empForm.department_id) : null,
        salary: Number(empForm.salary) || 0,
      };
      if (editingEmp) {
        await api.updateEmployee(editingEmp.id, payload);
        onNotify(`Updated ${empForm.name}`);
      } else {
        await api.createEmployee(payload);
        onNotify(`Added ${empForm.name} to directory`);
      }
      setEmpModalOpen(false);
      onRefresh();
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  async function handleDeleteEmployee(emp: Employee) {
    try {
      await api.deleteEmployee(emp.id);
      setSelectedEmp(null);
      onNotify(`Removed ${emp.name}`);
      onRefresh();
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  async function handleCreateDept(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createDepartment({
        ...deptForm,
        budget: Number(deptForm.budget) || 0,
      });
      setDeptModalOpen(false);
      setDeptForm({ name: '', head_name: '', budget: '150000', location: 'HQ - Floor 2' });
      onNotify(`Department "${deptForm.name}" created`);
      onRefresh();
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  const totalPayroll = employees.reduce((s, e) => s + (e.salary || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        objectLabel="People & Organization"
        icon={Users}
        title="Employees & Departments"
        subtitle="Salesforce-style organization directory, roles, and department budgets"
        highlights={[
          { label: 'Total Headcount', value: employees.length },
          { label: 'Active Staff', value: employees.filter((e) => e.status === 'Active').length },
          { label: 'Departments', value: departments.length },
          { label: 'Annual Payroll', value: formatCurrency(totalPayroll) },
        ]}
        actions={
          <>
            <button
              type="button"
              onClick={() => setDeptModalOpen(true)}
              className="sf-btn-neutral"
            >
              <Building className="h-3.5 w-3.5" />
              New Department
            </button>
            <button
              type="button"
              onClick={openNewEmployee}
              className="sf-btn-primary"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Employee
            </button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setTab('directory')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              tab === 'directory' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Employee Directory ({employees.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('departments')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              tab === 'departments' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Departments ({departments.length})
          </button>
        </div>

        {tab === 'directory' && (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by name, role, ID..."
                className="rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {tab === 'directory' ? (
        filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees match your filter"
            description="Try clearing the search query or add a new team member."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Employee</th>
                    <th className="px-5 py-3.5">Role & Dept</th>
                    <th className="px-5 py-3.5">Contact</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((emp) => (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedEmp(emp)}
                      className="cursor-pointer transition hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={emp.name} color={emp.avatar_color} />
                          <div>
                            <div className="font-semibold text-slate-900">{emp.name}</div>
                            <div className="text-xs text-slate-400">
                              {emp.employee_code} · {emp.access_level}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-800">{emp.role}</div>
                        <div className="text-xs text-slate-500">{emp.department_name || 'Unassigned'}</div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">
                        <div>{emp.email}</div>
                        <div className="text-slate-400">{emp.phone || '—'}</div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600">{emp.employment_type}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={emp.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openEditEmployee(emp)}
                          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <div key={dept.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{dept.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{dept.location}</p>
                </div>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                  {dept.headcount ?? 0} staff
                </span>
              </div>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Department Lead</span>
                  <span className="font-semibold text-slate-800">{dept.head_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Annual Budget</span>
                  <span className="tabular-nums font-semibold text-slate-800">
                    {formatCurrency(dept.budget)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Payroll</span>
                  <span className="tabular-nums font-semibold text-emerald-700">
                    {formatCurrency(dept.payroll_total || 0)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(selectedEmp)}
        onClose={() => setSelectedEmp(null)}
        title="Employee Profile"
        subtitle={selectedEmp?.employee_code}
      >
        {selectedEmp && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={selectedEmp.name} color={selectedEmp.avatar_color} size="lg" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedEmp.name}</h3>
                <p className="text-sm text-slate-600">{selectedEmp.role}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <StatusBadge status={selectedEmp.status} />
                  <span className="text-xs text-slate-500">{selectedEmp.department_name}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{selectedEmp.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{selectedEmp.phone || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-slate-400">Join Date:</span>{' '}
                <span className="font-medium text-slate-800">{formatDate(selectedEmp.join_date)}</span>
              </div>
              <div>
                <span className="text-slate-400">Base Salary:</span>{' '}
                <span className="tabular-nums font-medium text-slate-800">
                  {formatCurrency(selectedEmp.salary)}/yr
                </span>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => handleDeleteEmployee(selectedEmp)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove Employee
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedEmp;
                  setSelectedEmp(null);
                  openEditEmployee(target);
                }}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Edit Details
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={empModalOpen}
        onClose={() => setEmpModalOpen(false)}
        title={editingEmp ? 'Edit Employee' : 'Add New Employee'}
      >
        <form onSubmit={handleSaveEmployee} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Full Name *</label>
              <input
                required
                value={empForm.name}
                onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Work Email *</label>
              <input
                required
                type="email"
                value={empForm.email}
                onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Job Title / Role *</label>
              <input
                required
                value={empForm.role}
                onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Department</label>
              <select
                value={empForm.department_id}
                onChange={(e) => setEmpForm({ ...empForm, department_id: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Phone</label>
              <input
                value={empForm.phone}
                onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Annual Salary ($)</label>
              <input
                type="number"
                value={empForm.salary}
                onChange={(e) => setEmpForm({ ...empForm, salary: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Employment Type</label>
              <select
                value={empForm.employment_type}
                onChange={(e) => setEmpForm({ ...empForm, employment_type: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Status</label>
              <select
                value={empForm.status}
                onChange={(e) => setEmpForm({ ...empForm, status: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option>Active</option>
                <option>On Leave</option>
                <option>Inactive</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Access Level</label>
              <select
                value={empForm.access_level}
                onChange={(e) =>
                  setEmpForm({ ...empForm, access_level: e.target.value as Employee['access_level'] })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="Staff">Staff</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Join Date</label>
              <input
                type="date"
                value={empForm.join_date}
                onChange={(e) => setEmpForm({ ...empForm, join_date: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEmpModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              {editingEmp ? 'Save Changes' : 'Create Employee'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={deptModalOpen} onClose={() => setDeptModalOpen(false)} title="Create Department">
        <form onSubmit={handleCreateDept} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Department Name *</label>
            <input
              required
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              placeholder="e.g. Marketing & Growth"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Department Head *</label>
            <input
              required
              value={deptForm.head_name}
              onChange={(e) => setDeptForm({ ...deptForm, head_name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Annual Budget ($)</label>
              <input
                type="number"
                value={deptForm.budget}
                onChange={(e) => setDeptForm({ ...deptForm, budget: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Location</label>
              <input
                value={deptForm.location}
                onChange={(e) => setDeptForm({ ...deptForm, location: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeptModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Create Department
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
