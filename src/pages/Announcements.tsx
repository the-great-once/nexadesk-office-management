import React, { useEffect, useState } from 'react';
import { Megaphone, Pin, Plus, Trash2 } from 'lucide-react';
import type { Announcement, Employee } from '../types/oms';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import { Avatar, EmptyState, Modal, PageHeader } from '../components/UI';

const NOTICE_CATEGORIES = ['Company Event', 'HR Policy', 'IT & Facilities', 'Finance', 'General'];

export function Announcements({
  activeUser,
  onNotify,
  onDashboardRefresh,
}: {
  activeUser: Employee | null;
  onNotify: (msg: string, isError?: boolean) => void;
  onDashboardRefresh: () => void;
}) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'General',
    pinned: false,
  });

  async function loadAll() {
    try {
      const rows = await api.getAnnouncements();
      setItems(rows);
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createAnnouncement({
        ...form,
        author_id: activeUser?.id ?? null,
      });
      setModalOpen(false);
      setForm({ title: '', content: '', category: 'General', pinned: false });
      await loadAll();
      onDashboardRefresh();
      onNotify('Announcement published');
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  async function handleTogglePin(item: Announcement) {
    try {
      await api.togglePinAnnouncement(item.id, item.pinned === 0);
      await loadAll();
      onDashboardRefresh();
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteAnnouncement(id);
      await loadAll();
      onDashboardRefresh();
      onNotify('Announcement removed');
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        objectLabel="Internal Communications"
        icon={Megaphone}
        title="Chatter & Office Announcements"
        subtitle="Share company updates, HR policies, and facility notices across all departments"
        highlights={[
          { label: 'Total Notices', value: items.length },
          { label: 'Pinned to Home', value: items.filter((i) => i.pinned === 1).length },
        ]}
        actions={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="sf-btn-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Post Announcement
          </button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No announcements posted yet"
          description="Publish a notice to keep your team informed."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border bg-white p-5 shadow-xs transition ${
                item.pinned ? 'border-indigo-200 ring-1 ring-indigo-500/10' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                    {item.category}
                  </span>
                  {item.pinned === 1 && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                      <Pin className="h-3 w-3" />
                      Pinned
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleTogglePin(item)}
                    title={item.pinned ? 'Unpin' : 'Pin notice'}
                    className={`rounded-lg p-1.5 transition ${
                      item.pinned
                        ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                    }`}
                  >
                    <Pin className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <h3 className="mt-3 text-base font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {item.content}
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  {item.author_name && (
                    <>
                      <Avatar name={item.author_name} color={item.avatar_color} size="sm" />
                      <span className="font-medium text-slate-700">{item.author_name}</span>
                    </>
                  )}
                </div>
                <span>{formatDate(item.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Publish Announcement">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Title *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {NOTICE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Message *</label>
            <textarea
              required
              rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Pin this announcement to the Dashboard
          </label>
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
              Publish
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
