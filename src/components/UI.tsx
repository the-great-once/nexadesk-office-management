import React from 'react';
import { Check, X } from 'lucide-react';
import { getInitials, statusBadgeClass } from '../lib/format';

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusBadgeClass(status)}`}
    >
      {status}
    </span>
  );
}

export function Avatar({
  name,
  color = 'bg-[#0176D3]',
  size = 'md',
}: {
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: 'h-7 w-7 text-[11px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-12 w-12 text-base',
  };
  return (
    <div
      className={`${sizes[size]} ${color} inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-xs`}
    >
      {getInitials(name || '?')}
    </div>
  );
}

/**
 * Salesforce Lightning Object Highlights Header
 */
export function PageHeader({
  title,
  subtitle,
  objectLabel = 'Workspace Object',
  icon: Icon,
  highlights,
  actions,
}: {
  title: string;
  subtitle: string;
  objectLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  highlights?: { label: string; value: string | number }[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-5 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs">
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0176D3] text-white shadow-sm">
            {Icon ? <Icon className="h-5 w-5" /> : <span className="text-sm font-bold">{title[0]}</span>}
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {objectLabel}
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{title}</h1>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {highlights && highlights.length > 0 && (
        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 bg-slate-50/70 px-5 py-3 sm:grid-cols-4">
          {highlights.map((item) => (
            <div key={item.label}>
              <div className="text-[11px] font-medium text-slate-500">{item.label}</div>
              <div className="tabular-nums mt-0.5 text-sm font-bold text-slate-900">{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Salesforce Lightning Path Bar (Chevron Stage Indicator)
 */
export function StagePath({
  stages,
  currentStage,
  onSelectStage,
}: {
  stages: { id: string; label: string }[];
  currentStage: string;
  onSelectStage?: (id: string) => void;
}) {
  const currentIndex = stages.findIndex((s) => s.id === currentStage);

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
      {stages.map((stage, idx) => {
        const isDone = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        return (
          <button
            key={stage.id}
            type="button"
            disabled={!onSelectStage}
            onClick={() => onSelectStage?.(stage.id)}
            className={`flex flex-1 min-w-[110px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              isCurrent
                ? 'bg-[#032D60] text-white shadow-xs'
                : isDone
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            {isDone && <Check className="h-3.5 w-3.5 text-emerald-600" />}
            <span>{stage.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xs">
      <div
        className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl`}
      >
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50/60 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-[#0176D3]">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
