export type NavSection =
  | 'dashboard'
  | 'employees'
  | 'attendance'
  | 'tasks'
  | 'rooms'
  | 'assets'
  | 'expenses'
  | 'announcements';

export interface Department {
  id: number;
  name: string;
  head_name: string;
  budget: number;
  location: string;
  headcount?: number;
  payroll_total?: number;
}

export interface Employee {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department_id: number | null;
  department_name?: string | null;
  employment_type: string;
  status: string;
  join_date: string;
  salary: number;
  avatar_color: string;
  access_level: 'Admin' | 'Manager' | 'Staff';
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  role: string;
  avatar_color: string;
  department_name?: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  work_mode: string;
  notes: string;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  role: string;
  avatar_color: string;
  department_name?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewed_by: string;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  department_id: number | null;
  department_name?: string;
  lead_id: number | null;
  lead_name?: string;
  status: string;
  deadline: string;
  description: string;
  total_tasks: number;
  completed_tasks: number;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface TaskItem {
  id: number;
  project_id: number | null;
  project_name?: string | null;
  title: string;
  description: string;
  assignee_id: number | null;
  assignee_name?: string | null;
  avatar_color?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: TaskStatus;
  due_date: string;
}

export interface MeetingRoom {
  id: number;
  name: string;
  floor: string;
  capacity: number;
  amenities: string;
  status: 'Available' | 'Maintenance';
}

export interface RoomBooking {
  id: number;
  room_id: number;
  room_name: string;
  floor: string;
  capacity: number;
  employee_id: number;
  employee_name: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  attendees: number;
  status: string;
}

export interface Asset {
  id: number;
  asset_tag: string;
  name: string;
  category: string;
  serial_number: string;
  assigned_to: number | null;
  assigned_employee_name?: string | null;
  employee_code?: string | null;
  status: 'Available' | 'Assigned' | 'Maintenance' | 'Retired';
  purchase_date: string;
  value: number;
  notes: string;
}

export interface Expense {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  department_name?: string;
  title: string;
  category: string;
  amount: number;
  expense_date: string;
  status: 'Pending' | 'Approved' | 'Reimbursed' | 'Rejected';
  notes: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  category: string;
  author_id: number | null;
  author_name?: string;
  author_role?: string;
  avatar_color?: string;
  pinned: number;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  actor_id: number | null;
  actor_name: string;
  action_type: string;
  entity_type: string;
  summary: string;
  avatar_color?: string;
  created_at: string;
}

export interface DashboardData {
  today: string;
  kpis: {
    totalEmployees: number;
    activeEmployees: number;
    presentToday: number;
    remoteToday: number;
    pendingLeaves: number;
    openTasks: number;
    urgentTasks: number;
    bookingsToday: number;
    totalAssets: number;
    totalAssetValue: number;
    pendingExpenseCount: number;
    pendingExpenseTotal: number;
  };
  departments: Department[];
  workModeCounts: { mode: string; count: number }[];
  expenseByCategory: { category: string; count: number; total: number }[];
  assetByStatus: { status: string; count: number; total_value: number }[];
  recentActivities: ActivityLog[];
  upcomingBookings: RoomBooking[];
  pendingLeaveList: LeaveRequest[];
  pinnedAnnouncements: Announcement[];
  taskStatusCounts: { status: TaskStatus; count: number }[];
}

export interface SearchResults {
  employees: { id: number; name: string; role: string; email: string; department_name?: string }[];
  tasks: { id: number; title: string; status: string; priority: string; due_date: string }[];
  assets: { id: number; asset_tag: string; name: string; category: string; status: string }[];
  announcements: { id: number; title: string; category: string; created_at: string }[];
}
