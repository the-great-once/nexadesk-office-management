export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount || 0);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const clean = dateStr.slice(0, 10);
  const d = new Date(clean + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function todayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const STATUS_BADGE_MAP: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Present: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Reimbursed: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  Available: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Confirmed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Assigned: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  Pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Late: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  'On Leave': 'bg-sky-50 text-sky-700 ring-sky-600/20',
  Maintenance: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Rejected: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  Inactive: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  Retired: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  Urgent: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  High: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Medium: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  Low: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

export function statusBadgeClass(status: string): string {
  return (
    STATUS_BADGE_MAP[status] ||
    'bg-slate-100 text-slate-700 ring-slate-500/20'
  );
}
