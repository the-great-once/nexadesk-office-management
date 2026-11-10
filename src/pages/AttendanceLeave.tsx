import React, { useEffect, useState } from 'react';
import { CalendarPlus, CheckCircle2, Clock, LogIn, LogOut, XCircle } from 'lucide-react';
import type { AttendanceRecord, Employee, LeaveRequest } from '../types/oms';
import { api } from '../lib/api';
import { formatDate, todayISO } from '../lib/format';
import { Avatar, Modal, PageHeader, StatusBadge } from '../components/UI';

export function AttendanceLeave({
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
  const [date, setDate] = useState(todayISO());
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveFilter, setLeaveFilter] = useState('');
  const [workMode, setWorkMode] = useState('In-Office');
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  const [leaveForm, setLeaveForm] = useState({
    employee_id: activeUser ? String(activeUser.id) : '',
    leave_type: 'Annual Leave',
    start_date: todayISO(),
    end_date: todayISO(),
    reason: '',
  });

  useEffect(() => {
    if (activeUser && !leaveForm.employee_id) {
      setLeaveForm((f) => ({ ...f, employee_id: String(activeUser.id) }));
    }
  }, [activeUser, leaveForm.employee_id]);

  async function loadAttendance(targetDate = date) {
    try {
      const rows = await api.getAttendance(targetDate);
      setAttendance(rows);
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  async function loadLeaves(status = leaveFilter) {
    try {
      const rows = await api.getLeaves(status);
      setLeaves(rows);
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  useEffect(() => {
    loadAttendance(date);
  }, [date]);

  useEffect(() => {
    loadLeaves(leaveFilter);
  }, [leaveFilter]);

  const activeUserRecord = activeUser
    ? attendance.find((a) => a.employee_id === activeUser.id && a.date === todayISO())
    : undefined;

  const canApprove = activeUser?.access_level === 'Admin' || activeUser?.access_level === 'Manager';

  async function handleClock(action: 'check_in' | 'check_out') {
    if (!activeUser) return;
    try {
      await api.clockAttendance({
        employee_id: activeUser.id,
        action,
        work_mode: workMode,
      });
      setDate(todayISO());
      await loadAttendance(todayISO());
      onDashboardRefresh();
      onNotify(action === 'check_in' ? `Clocked in (${workMode})` : 'Clocked out for today');
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  async function handleCreateLeave(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createLeave({
        employee_id: Number(leaveForm.employee_id || activeUser?.id),
        leave_type: leaveForm.leave_type,
        start_date: leaveForm.start_date,
        end_date: leaveForm.end_date,
        reason: leaveForm.reason,
      });
      setLeaveModalOpen(false);
      setLeaveForm({
        employee_id: activeUser ? String(activeUser.id) : '',
        leave_type: 'Annual Leave',
        start_date: todayISO(),
        end_date: todayISO(),
        reason: '',
      });
      await loadLeaves();
      onDashboardRefresh();
      onNotify('Leave request submitted');
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  async function handleLeaveDecision(id: number, status: 'Approved' | 'Rejected') {
    try {
      await api.updateLeaveStatus(id, status, activeUser?.name || 'Manager');
      await loadLeaves();
      onDashboardRefresh();
      onNotify(`Leave request ${status.toLowerCase()}`);
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        objectLabel="Workforce Timekeeping"
        icon={Clock}
        title="Attendance & Leave Management"
        subtitle="Track daily check-ins, work mode distribution, and employee time-off requests"
        highlights={[
          { label: 'Records Shown', value: attendance.length },
          { label: 'In-Office', value: attendance.filter((a) => a.work_mode === 'In-Office').length },
          { label: 'Pending Leaves', value: leaves.filter((l) => l.status === 'Pending').length },
          { label: 'Approved Leaves', value: leaves.filter((l) => l.status === 'Approved').length },
        ]}
        actions={
          <button
            type="button"
            onClick={() => {
              setLeaveForm((f) => ({
                ...f,
                employee_id: activeUser ? String(activeUser.id) : f.employee_id,
              }));
              setLeaveModalOpen(true);
            }}
            className="sf-btn-primary"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Request Leave
          </button>
        }
      />

      {activeUser && (
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#0176D3]/30 bg-gradient-to-r from-[#032D60] to-[#0176D3] p-5 text-white shadow-md sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <Avatar name={activeUser.name} color={activeUser.avatar_color} size="lg" />
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-indigo-200">
                Daily Time Clock · {formatDate(todayISO())}
              </div>
              <div className="text-lg font-bold">{activeUser.name}</div>
              <div className="text-xs text-slate-300">
                {activeUserRecord?.check_in
                  ? `Checked in at ${activeUserRecord.check_in} (${activeUserRecord.work_mode})${
                      activeUserRecord.check_out ? ` · Out at ${activeUserRecord.check_out}` : ''
                    }`
                  : 'Not checked in yet today'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value)}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white backdrop-blur focus:outline-none"
            >
              <option value="In-Office" className="text-slate-900">
                In-Office
              </option>
              <option value="Hybrid" className="text-slate-900">
                Hybrid
              </option>
              <option value="Remote" className="text-slate-900">
                Remote
              </option>
            </select>
            <button
              type="button"
              onClick={() => handleClock('check_in')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-600"
            >
              <LogIn className="h-4 w-4" />
              Clock In
            </button>
            <button
              type="button"
              onClick={() => handleClock('check_out')}
              disabled={!activeUserRecord?.check_in}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <LogOut className="h-4 w-4" />
              Clock Out
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" />
              <h2 className="text-base font-semibold text-slate-900">Daily Attendance Log</h2>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Employee</th>
                  <th className="px-3 py-2.5">Mode</th>
                  <th className="px-3 py-2.5">In</th>
                  <th className="px-3 py-2.5">Out</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No attendance logs recorded for {formatDate(date)}.
                    </td>
                  </tr>
                ) : (
                  attendance.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={row.employee_name} color={row.avatar_color} size="sm" />
                          <div>
                            <div className="font-semibold text-slate-900">{row.employee_name}</div>
                            <div className="text-[11px] text-slate-400">{row.department_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{row.work_mode}</td>
                      <td className="tabular-nums px-3 py-3 font-medium text-slate-800">
                        {row.check_in || '—'}
                      </td>
                      <td className="tabular-nums px-3 py-3 text-slate-600">{row.check_out || '—'}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">Leave Requests</h2>
            <select
              value={leaveFilter}
              onChange={(e) => setLeaveFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="space-y-3">
            {leaves.length === 0 ? (
              <div className="rounded-xl bg-slate-50 py-8 text-center text-xs text-slate-500">
                No leave requests found.
              </div>
            ) : (
              leaves.map((lr) => (
                <div key={lr.id} className="rounded-xl border border-slate-100 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={lr.employee_name} color={lr.avatar_color} size="sm" />
                      <div>
                        <div className="text-xs font-semibold text-slate-900">{lr.employee_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {lr.leave_type} · {lr.days}d ({formatDate(lr.start_date)}
                          {lr.end_date !== lr.start_date ? ` → ${formatDate(lr.end_date)}` : ''})
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={lr.status} />
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{lr.reason}</p>
                  {lr.status === 'Pending' && canApprove && (
                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5">
                      <button
                        type="button"
                        onClick={() => handleLeaveDecision(lr.id, 'Approved')}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLeaveDecision(lr.id, 'Rejected')}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal open={leaveModalOpen} onClose={() => setLeaveModalOpen(false)} title="Submit Leave Request">
        <form onSubmit={handleCreateLeave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Employee</label>
            <select
              value={leaveForm.employee_id}
              onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Leave Type</label>
            <select
              value={leaveForm.leave_type}
              onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option>Annual Leave</option>
              <option>Sick Leave</option>
              <option>Personal Leave</option>
              <option>Training Leave</option>
              <option>Parental Leave</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Start Date *</label>
              <input
                required
                type="date"
                value={leaveForm.start_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">End Date *</label>
              <input
                required
                type="date"
                value={leaveForm.end_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Reason *</label>
            <textarea
              required
              rows={3}
              value={leaveForm.reason}
              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              placeholder="Briefly describe the reason for leave..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setLeaveModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
