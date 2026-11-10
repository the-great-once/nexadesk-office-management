import React, { useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  DoorOpen,
  Laptop,
  Megaphone,
  Receipt,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import type { DashboardData, Employee, NavSection } from '../types/oms';
import { api } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { Avatar, StatusBadge } from '../components/UI';

const MODE_COLORS: Record<string, { stroke: string; dot: string; label: string }> = {
  'In-Office': { stroke: '#0176D3', dot: 'bg-[#0176D3]', label: 'In-Office' },
  Hybrid: { stroke: '#8B5CF6', dot: 'bg-violet-500', label: 'Hybrid' },
  Remote: { stroke: '#10B981', dot: 'bg-emerald-500', label: 'Remote' },
  'On Leave': { stroke: '#F59E0B', dot: 'bg-amber-500', label: 'On Leave' },
};

export function Dashboard({
  data,
  activeUser,
  onNavigate,
  onRefresh,
  onQuickLeaveDecision,
  onNotify,
}: {
  data: DashboardData | null;
  activeUser: Employee | null;
  onNavigate: (section: NavSection) => void;
  onRefresh: () => void;
  onQuickLeaveDecision: (id: number, status: 'Approved' | 'Rejected') => void;
  onNotify: (msg: string, isError?: boolean) => void;
}) {
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [hoveredDept, setHoveredDept] = useState<number | null>(null);
  const [hoveredMode, setHoveredMode] = useState<string | null>(null);
  const [chatterPost, setChatterPost] = useState('');
  const [posting, setPosting] = useState(false);

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-xl bg-slate-200/80" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200/80" />
          ))}
        </div>
      </div>
    );
  }

  const { kpis } = data;
  const canApprove = activeUser?.access_level === 'Admin' || activeUser?.access_level === 'Manager';

  const visibleDepartments =
    selectedDeptId === 'all'
      ? data.departments
      : data.departments.filter((d) => String(d.id) === selectedDeptId);

  const maxBudgetOrPayroll = Math.max(
    ...visibleDepartments.flatMap((d) => [d.budget || 0, d.payroll_total || 0]),
    1
  );

  // Task funnel metrics
  const taskMap = Object.fromEntries(data.taskStatusCounts.map((t) => [t.status, t.count]));
  const totalTasks =
    (taskMap.todo ?? 0) + (taskMap.in_progress ?? 0) + (taskMap.review ?? 0) + (taskMap.done ?? 0);
  const donePct = totalTasks > 0 ? Math.round(((taskMap.done ?? 0) / totalTasks) * 100) : 0;

  // Attendance donut metrics
  const attendancePct =
    kpis.totalEmployees > 0 ? Math.round((kpis.presentToday / kpis.totalEmployees) * 100) : 0;
  const modeTotal = data.workModeCounts.reduce((sum, m) => sum + m.count, 0) || 1;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let runningOffset = 0;
  const donutSegments = data.workModeCounts.map((item) => {
    const fraction = item.count / modeTotal;
    const dash = fraction * circumference;
    const seg = {
      mode: item.mode,
      count: item.count,
      pct: Math.round(fraction * 100),
      dash,
      offset: runningOffset,
      color: MODE_COLORS[item.mode]?.stroke ?? '#64748B',
    };
    runningOffset += dash;
    return seg;
  });

  // Expense category metrics
  const maxExpenseCat = Math.max(...data.expenseByCategory.map((e) => e.total), 1);
  const totalExpenseSpend = data.expenseByCategory.reduce((s, e) => s + e.total, 0);

  async function handleChatterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chatterPost.trim()) return;
    setPosting(true);
    try {
      await api.postActivity({
        actor_id: activeUser?.id ?? null,
        actor_name: activeUser?.name ?? 'Team Member',
        action_type: 'Chatter',
        entity_type: 'Office',
        summary: chatterPost.trim(),
      });
      setChatterPost('');
      onRefresh();
      onNotify('Chatter update shared');
    } catch (err) {
      onNotify((err as Error).message, true);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Salesforce Lightning Analytics Header Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#032D60] via-[#014486] to-[#0176D3] p-5 text-white shadow-md">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-sky-100 backdrop-blur">
              <Sparkles className="h-3 w-3" />
              Lightning Executive Analytics · {formatDate(data.today)}
            </div>
            <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
              Office Operations Command Center
            </h1>
            <p className="mt-0.5 text-xs text-sky-100/90">
              Welcome back, {activeUser?.name ?? 'Leader'} · {kpis.presentToday} of {kpis.totalEmployees}{' '}
              team members checked in ({kpis.remoteToday} hybrid/remote)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur focus:outline-none"
            >
              <option value="all" className="text-slate-900">
                All Departments ({data.departments.length})
              </option>
              {data.departments.map((d) => (
                <option key={d.id} value={String(d.id)} className="text-slate-900">
                  {d.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-bold text-[#0176D3] shadow-sm hover:bg-sky-50"
            >
              <Clock className="h-3.5 w-3.5" />
              Time Clock
            </button>
          </div>
        </div>
      </div>

      {/* Executive KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => onNavigate('attendance')}
          className="sf-card group p-4 text-left transition hover:border-[#0176D3]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Attendance Rate
            </span>
            <div className="rounded-lg bg-sky-50 p-1.5 text-[#0176D3]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="tabular-nums text-2xl font-extrabold text-slate-900">{attendancePct}%</span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <TrendingUp className="h-3 w-3" />
              {kpis.presentToday}/{kpis.totalEmployees} in
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#0176D3] transition-all"
              style={{ width: `${attendancePct}%` }}
            />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('tasks')}
          className="sf-card group p-4 text-left transition hover:border-[#0176D3]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Task Pipeline
            </span>
            <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="tabular-nums text-2xl font-extrabold text-slate-900">
              {kpis.openTasks} <span className="text-sm font-medium text-slate-500">open</span>
            </span>
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
              {kpis.urgentTasks} urgent
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
            <span>Completion Rate</span>
            <span className="tabular-nums font-bold text-emerald-700">{donePct}%</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('assets')}
          className="sf-card group p-4 text-left transition hover:border-[#0176D3]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Managed Assets
            </span>
            <div className="rounded-lg bg-violet-50 p-1.5 text-violet-600">
              <Laptop className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="tabular-nums text-2xl font-extrabold text-slate-900">
              {formatCurrency(kpis.totalAssetValue)}
            </span>
            <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-[#0176D3]" />
          </div>
          <p className="mt-2.5 text-[11px] text-slate-500">
            {kpis.totalAssets} hardware & furniture units tracked
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('expenses')}
          className="sf-card group p-4 text-left transition hover:border-[#0176D3]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Approval Queue
            </span>
            <div className="rounded-lg bg-amber-50 p-1.5 text-amber-600">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="tabular-nums text-2xl font-extrabold text-slate-900">
              {formatCurrency(kpis.pendingExpenseTotal)}
            </span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              {kpis.pendingExpenseCount + kpis.pendingLeaves} items
            </span>
          </div>
          <p className="mt-2.5 text-[11px] text-slate-500">
            {kpis.pendingExpenseCount} expenses · {kpis.pendingLeaves} leave requests
          </p>
        </button>
      </div>

      {/* Analytics Row 1: Grouped Bar Chart + Attendance Donut */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="sf-card p-5 lg:col-span-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Department Budget vs. Active Payroll
              </h2>
              <p className="text-xs text-slate-500">
                Hover bars to inspect headcount & budget utilization
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#0176D3]" />
                Annual Budget
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
                Active Payroll
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {visibleDepartments.map((dept) => {
              const budgetPct = Math.round(((dept.budget || 0) / maxBudgetOrPayroll) * 100);
              const payrollPct = Math.round(((dept.payroll_total || 0) / maxBudgetOrPayroll) * 100);
              const utilization =
                dept.budget > 0 ? Math.round(((dept.payroll_total || 0) / dept.budget) * 100) : 0;
              const isHovered = hoveredDept === dept.id;

              return (
                <div
                  key={dept.id}
                  onMouseEnter={() => setHoveredDept(dept.id)}
                  onMouseLeave={() => setHoveredDept(null)}
                  className={`rounded-lg p-2.5 transition ${isHovered ? 'bg-sky-50/60' : 'bg-slate-50/40'}`}
                >
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{dept.name}</span>
                      <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                        {dept.headcount ?? 0} staff
                      </span>
                    </div>
                    <div className="tabular-nums text-[11px] text-slate-600">
                      Budget: <strong className="text-[#0176D3]">{formatCurrency(dept.budget)}</strong> ·
                      Payroll: <strong className="text-emerald-700">{formatCurrency(dept.payroll_total || 0)}</strong>{' '}
                      <span className="text-slate-400">({utilization}%)</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/70">
                      <div
                        className="h-full rounded-full bg-[#0176D3] transition-all duration-300"
                        style={{ width: `${Math.max(budgetPct, 4)}%` }}
                      />
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/70">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${Math.max(payrollPct, 4)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive SVG Donut Chart: Attendance & Work Mode */}
        <div className="sf-card flex flex-col justify-between p-5 lg:col-span-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Today's Workforce Mix</h2>
            <p className="text-xs text-slate-500">Live check-in modes across office & remote</p>
          </div>

          <div className="my-4 flex items-center justify-center">
            <div className="relative h-44 w-44">
              <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="16"
                />
                {donutSegments.map((seg) => (
                  <circle
                    key={seg.mode}
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={hoveredMode === seg.mode ? '20' : '16'}
                    strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
                    strokeDashoffset={-seg.offset}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredMode(seg.mode)}
                    onMouseLeave={() => setHoveredMode(null)}
                  />
                ))}
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="tabular-nums text-2xl font-extrabold text-slate-900">
                  {hoveredMode
                    ? `${donutSegments.find((s) => s.mode === hoveredMode)?.pct ?? 0}%`
                    : `${attendancePct}%`}
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  {hoveredMode || 'Checked In'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {donutSegments.map((seg) => (
              <div
                key={seg.mode}
                onMouseEnter={() => setHoveredMode(seg.mode)}
                onMouseLeave={() => setHoveredMode(null)}
                className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 transition ${
                  hoveredMode === seg.mode ? 'border-[#0176D3] bg-sky-50/70' : 'border-slate-100 bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className={`h-2 w-2 rounded-full ${MODE_COLORS[seg.mode]?.dot ?? 'bg-slate-400'}`} />
                  {seg.mode}
                </span>
                <span className="tabular-nums font-bold text-slate-900">{seg.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics Row 2: Task Pipeline Funnel & Expense Category Spend */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="sf-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Task Execution Pipeline</h2>
              <p className="text-xs text-slate-500">Stage distribution across active office projects</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('tasks')}
              className="text-xs font-semibold text-[#0176D3] hover:underline"
            >
              Open Kanban →
            </button>
          </div>
          <div className="space-y-3">
            {[
              { id: 'todo', label: 'To Do', color: 'bg-slate-400' },
              { id: 'in_progress', label: 'In Progress', color: 'bg-[#0176D3]' },
              { id: 'review', label: 'In Review', color: 'bg-amber-500' },
              { id: 'done', label: 'Done', color: 'bg-emerald-500' },
            ].map((stage) => {
              const count = taskMap[stage.id] ?? 0;
              const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
              return (
                <div key={stage.id} className="flex items-center gap-3 text-xs">
                  <div className="w-24 font-semibold text-slate-700">{stage.label}</div>
                  <div className="h-6 flex-1 overflow-hidden rounded-lg bg-slate-100">
                    <div
                      className={`flex h-full items-center px-2.5 text-[11px] font-bold text-white transition-all ${stage.color}`}
                      style={{ width: `${Math.max(pct, count > 0 ? 14 : 0)}%` }}
                    >
                      {count > 0 ? `${count}` : ''}
                    </div>
                  </div>
                  <div className="tabular-nums w-10 text-right font-semibold text-slate-500">{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sf-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Expense Spend by Category</h2>
              <p className="text-xs text-slate-500">
                Total approved/pending spend: {formatCurrency(totalExpenseSpend)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="text-xs font-semibold text-[#0176D3] hover:underline"
            >
              View Claims →
            </button>
          </div>
          <div className="space-y-2.5">
            {data.expenseByCategory.slice(0, 5).map((cat) => {
              const pct = Math.round((cat.total / maxExpenseCat) * 100);
              return (
                <div key={cat.category} className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-700">
                      {cat.category} <span className="text-slate-400">({cat.count})</span>
                    </span>
                    <span className="tabular-nums font-bold text-slate-900">
                      {formatCurrency(cat.total)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#0176D3] to-sky-400"
                      style={{ width: `${Math.max(pct, 6)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Analytics Row 3: Chatter Feed + Approvals + Upcoming Rooms & Notices */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Salesforce Chatter Activity Stream */}
        <div className="sf-card flex flex-col p-5 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#0176D3]" />
              <h2 className="text-sm font-bold text-slate-900">Office Chatter & Activity</h2>
            </div>
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-[#0176D3]">
              Live Feed
            </span>
          </div>

          <form onSubmit={handleChatterSubmit} className="mb-4 flex gap-2">
            <input
              type="text"
              value={chatterPost}
              onChange={(e) => setChatterPost(e.target.value)}
              placeholder="Share an update on Chatter..."
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:border-[#0176D3] focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={posting || !chatterPost.trim()}
              className="sf-btn-primary disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Post
            </button>
          </form>

          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {data.recentActivities.map((act) => (
              <div key={act.id} className="flex gap-2.5 border-b border-slate-100 pb-2.5 last:border-0">
                <Avatar name={act.actor_name} color={act.avatar_color || 'bg-[#0176D3]'} size="sm" />
                <div className="min-w-0 flex-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900">{act.actor_name}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      {act.entity_type}
                    </span>
                  </div>
                  <p className="mt-0.5 text-slate-600">{act.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Leave Approvals */}
        <div className="sf-card p-5 lg:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Approval Inbox</h2>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-xs font-semibold text-[#0176D3] hover:underline"
            >
              View All
            </button>
          </div>
          {data.pendingLeaveList.length === 0 ? (
            <div className="rounded-lg bg-slate-50 py-10 text-center text-xs text-slate-500">
              All leave requests have been actioned.
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.pendingLeaveList.map((lr) => (
                <div key={lr.id} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={lr.employee_name} color={lr.avatar_color} size="sm" />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{lr.employee_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {lr.leave_type} · {lr.days}d ({formatDate(lr.start_date)})
                        </div>
                      </div>
                    </div>
                    {!canApprove && <StatusBadge status={lr.status} />}
                  </div>
                  {canApprove && (
                    <div className="mt-2.5 flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onQuickLeaveDecision(lr.id, 'Approved')}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onQuickLeaveDecision(lr.id, 'Rejected')}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        <XCircle className="h-3 w-3" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rooms + Pinned Notices */}
        <div className="sf-card space-y-4 p-5 lg:col-span-3">
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <DoorOpen className="h-4 w-4 text-[#0176D3]" />
                <h2 className="text-sm font-bold text-slate-900">Upcoming Rooms</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('rooms')}
                className="text-xs font-semibold text-[#0176D3] hover:underline"
              >
                Book
              </button>
            </div>
            <div className="space-y-2">
              {data.upcomingBookings.slice(0, 3).map((b) => (
                <div key={b.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs">
                  <div className="truncate font-bold text-slate-900">{b.title}</div>
                  <div className="mt-0.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{b.room_name}</span>
                    <span className="tabular-nums font-semibold text-[#0176D3]">
                      {b.start_time}–{b.end_time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Megaphone className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">Pinned Notices</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('announcements')}
                className="text-xs font-semibold text-[#0176D3] hover:underline"
              >
                All
              </button>
            </div>
            <div className="space-y-2">
              {data.pinnedAnnouncements.slice(0, 2).map((ann) => (
                <div key={ann.id} className="rounded-lg border border-amber-100 bg-amber-50/50 p-2.5 text-xs">
                  <div className="font-bold text-slate-900">{ann.title}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                    <Calendar className="h-3 w-3" />
                    {ann.category}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
