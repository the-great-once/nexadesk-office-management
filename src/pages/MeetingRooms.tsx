import React, { useEffect, useState } from 'react';
import { Calendar, DoorOpen, Plus, Trash2, Users } from 'lucide-react';
import type { Employee, MeetingRoom, RoomBooking } from '../types/oms';
import { api } from '../lib/api';
import { formatDate, todayISO } from '../lib/format';
import { Modal, PageHeader, StatusBadge } from '../components/UI';

export function MeetingRooms({
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
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    room_id: '',
    employee_id: activeUser ? String(activeUser.id) : '',
    title: '',
    date: todayISO(),
    start_time: '10:00',
    end_time: '11:00',
    attendees: '4',
  });

  async function loadData(date = selectedDate) {
    try {
      const [rRows, bRows] = await Promise.all([api.getRooms(), api.getBookings(date)]);
      setRooms(rRows);
      setBookings(bRows);
      if (!form.room_id && rRows[0]) {
        setForm((f) => ({ ...f, room_id: String(rRows[0].id) }));
      }
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  function openBookingForRoom(roomId?: number) {
    setForm({
      room_id: roomId ? String(roomId) : rooms.find((r) => r.status === 'Available')?.id.toString() || '',
      employee_id: activeUser ? String(activeUser.id) : employees[0]?.id.toString() || '',
      title: '',
      date: selectedDate,
      start_time: '13:00',
      end_time: '14:00',
      attendees: '4',
    });
    setModalOpen(true);
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createBooking({
        room_id: Number(form.room_id),
        employee_id: Number(form.employee_id),
        title: form.title,
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        attendees: Number(form.attendees) || 2,
      });
      setModalOpen(false);
      setSelectedDate(form.date);
      await loadData(form.date);
      onDashboardRefresh();
      onNotify('Meeting room booked');
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  async function handleCancel(id: number) {
    try {
      await api.deleteBooking(id);
      await loadData(selectedDate);
      onDashboardRefresh();
      onNotify('Booking cancelled');
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        objectLabel="Facilities & Scheduling"
        icon={DoorOpen}
        title="Meeting Rooms & Bookings"
        subtitle="Reserve conference spaces with automatic time-overlap conflict detection"
        highlights={[
          { label: 'Total Rooms', value: rooms.length },
          { label: 'Available Rooms', value: rooms.filter((r) => r.status === 'Available').length },
          { label: 'Bookings on Date', value: bookings.length },
          { label: 'Total Capacity', value: `${rooms.reduce((s, r) => s + r.capacity, 0)} seats` },
        ]}
        actions={
          <>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            />
            <button
              type="button"
              onClick={() => openBookingForRoom()}
              className="sf-btn-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Book Room
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => {
          const roomBookings = bookings.filter((b) => b.room_id === room.id);
          return (
            <div key={room.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <DoorOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{room.name}</h3>
                      <p className="text-xs text-slate-500">
                        {room.floor} · Up to {room.capacity} people
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={room.status} />
                </div>

                <p className="mt-3 text-xs text-slate-600">{room.amenities}</p>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <span>Schedule ({formatDate(selectedDate)})</span>
                    <span>{roomBookings.length} booked</span>
                  </div>
                  {roomBookings.length === 0 ? (
                    <div className="rounded-xl bg-emerald-50/70 px-3 py-2 text-xs font-medium text-emerald-700">
                      Open all day
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {roomBookings.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-900">{b.title}</div>
                            <div className="tabular-nums text-[11px] text-slate-500">
                              {b.start_time}–{b.end_time} · {b.employee_name}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCancel(b.id)}
                            className="ml-2 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Cancel booking"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={room.status !== 'Available'}
                onClick={() => openBookingForRoom(room.id)}
                className="mt-4 w-full rounded-xl border border-indigo-200 bg-indigo-50/60 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {room.status === 'Available' ? `Reserve ${room.name}` : 'Under Maintenance'}
              </button>
            </div>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Reserve Meeting Room">
        <form onSubmit={handleBook} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Meeting Title *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Sprint Planning Sync"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Room *</label>
              <select
                required
                value={form.room_id}
                onChange={(e) => setForm({ ...form, room_id: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                {rooms
                  .filter((r) => r.status === 'Available')
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.capacity} seats)
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Organizer *</label>
              <select
                required
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
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Date *</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 py-2 pl-8 pr-2 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Start *</label>
              <input
                required
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">End *</label>
              <input
                required
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Expected Attendees</label>
            <div className="relative">
              <Users className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="number"
                min={1}
                value={form.attendees}
                onChange={(e) => setForm({ ...form, attendees: e.target.value })}
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm"
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
              Confirm Booking
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
