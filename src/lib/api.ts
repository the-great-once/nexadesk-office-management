import type {
  ActivityLog,
  Announcement,
  Asset,
  AttendanceRecord,
  DashboardData,
  Department,
  Employee,
  Expense,
  LeaveRequest,
  MeetingRoom,
  Project,
  RoomBooking,
  SearchResults,
  TaskItem,
} from '../types/oms';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  getDashboard: () => request<DashboardData>('/api/dashboard'),
  search: (q: string) => request<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`),
  getActivities: () => request<ActivityLog[]>('/api/activities'),
  postActivity: (payload: {
    actor_id: number | null;
    actor_name: string;
    action_type?: string;
    entity_type?: string;
    summary: string;
  }) => request<ActivityLog>('/api/activities', { method: 'POST', body: JSON.stringify(payload) }),

  getDepartments: () => request<Department[]>('/api/departments'),
  createDepartment: (payload: Partial<Department>) =>
    request<Department>('/api/departments', { method: 'POST', body: JSON.stringify(payload) }),

  getEmployees: (params?: { search?: string; department_id?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.department_id) qs.set('department_id', params.department_id);
    if (params?.status) qs.set('status', params.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<Employee[]>(`/api/employees${suffix}`);
  },
  createEmployee: (payload: Partial<Employee>) =>
    request<Employee>('/api/employees', { method: 'POST', body: JSON.stringify(payload) }),
  updateEmployee: (id: number, payload: Partial<Employee>) =>
    request<Employee>(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteEmployee: (id: number) =>
    request<{ deleted: boolean }>(`/api/employees/${id}`, { method: 'DELETE' }),

  getAttendance: (date?: string) =>
    request<AttendanceRecord[]>(`/api/attendance${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  clockAttendance: (payload: {
    employee_id: number;
    action: 'check_in' | 'check_out';
    work_mode?: string;
    notes?: string;
  }) => request<AttendanceRecord>('/api/attendance/clock', { method: 'POST', body: JSON.stringify(payload) }),

  getLeaves: (status?: string) =>
    request<LeaveRequest[]>(`/api/leaves${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  createLeave: (payload: {
    employee_id: number;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
  }) => request<LeaveRequest>('/api/leaves', { method: 'POST', body: JSON.stringify(payload) }),
  updateLeaveStatus: (id: number, status: 'Approved' | 'Rejected', reviewed_by: string) =>
    request<LeaveRequest>(`/api/leaves/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewed_by }),
    }),

  getProjects: () => request<Project[]>('/api/projects'),
  createProject: (payload: Partial<Project>) =>
    request<Project>('/api/projects', { method: 'POST', body: JSON.stringify(payload) }),

  getTasks: (params?: { project_id?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.project_id) qs.set('project_id', params.project_id);
    if (params?.status) qs.set('status', params.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<TaskItem[]>(`/api/tasks${suffix}`);
  },
  createTask: (payload: Partial<TaskItem>) =>
    request<TaskItem>('/api/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (id: number, payload: Partial<TaskItem>) =>
    request<TaskItem>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTask: (id: number) =>
    request<{ deleted: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),

  getRooms: () => request<MeetingRoom[]>('/api/rooms'),
  getBookings: (date?: string) =>
    request<RoomBooking[]>(`/api/bookings${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  createBooking: (payload: {
    room_id: number;
    employee_id: number;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    attendees: number;
  }) => request<RoomBooking>('/api/bookings', { method: 'POST', body: JSON.stringify(payload) }),
  deleteBooking: (id: number) =>
    request<{ deleted: boolean }>(`/api/bookings/${id}`, { method: 'DELETE' }),

  getAssets: (params?: { category?: string; status?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<Asset[]>(`/api/assets${suffix}`);
  },
  createAsset: (payload: Partial<Asset>) =>
    request<Asset>('/api/assets', { method: 'POST', body: JSON.stringify(payload) }),
  updateAsset: (id: number, payload: Partial<Asset>) =>
    request<Asset>(`/api/assets/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteAsset: (id: number) =>
    request<{ deleted: boolean }>(`/api/assets/${id}`, { method: 'DELETE' }),

  getExpenses: (status?: string) =>
    request<Expense[]>(`/api/expenses${status ? `?status=${encodeURIComponent(status)}` : ''}`),
  createExpense: (payload: {
    employee_id: number;
    title: string;
    category: string;
    amount: number;
    expense_date: string;
    notes?: string;
  }) => request<Expense>('/api/expenses', { method: 'POST', body: JSON.stringify(payload) }),
  updateExpenseStatus: (id: number, status: Expense['status']) =>
    request<Expense>(`/api/expenses/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  getAnnouncements: () => request<Announcement[]>('/api/announcements'),
  createAnnouncement: (payload: {
    title: string;
    content: string;
    category: string;
    author_id: number | null;
    pinned: boolean;
  }) => request<Announcement>('/api/announcements', { method: 'POST', body: JSON.stringify(payload) }),
  togglePinAnnouncement: (id: number, pinned: boolean) =>
    request<Announcement>(`/api/announcements/${id}`, { method: 'PATCH', body: JSON.stringify({ pinned }) }),
  deleteAnnouncement: (id: number) =>
    request<{ deleted: boolean }>(`/api/announcements/${id}`, { method: 'DELETE' }),
};
