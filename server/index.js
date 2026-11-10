import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { seedIfEmpty } from './seed.js';

seedIfEmpty();

const app = express();
const PORT = Number(process.env.PORT || 4000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());

function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nowTimeHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function calcDaysInclusive(start, end) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Number.isFinite(diff) && diff > 0 ? diff : 1;
}

const AVATAR_COLORS = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-violet-600',
  'bg-sky-600',
  'bg-amber-600',
  'bg-teal-600',
  'bg-rose-600',
  'bg-cyan-600',
];

function logActivity(actorName, actionType, entityType, summary, actorId = null) {
  try {
    db.prepare(
      'INSERT INTO activity_logs (actor_id, actor_name, action_type, entity_type, summary) VALUES (?, ?, ?, ?, ?)'
    ).run(actorId, actorName || 'System', actionType, entityType, summary);
  } catch {
    // non-fatal
  }
}

// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'nexadesk-oms', timestamp: new Date().toISOString() });
});

// Dashboard Summary
app.get('/api/dashboard', (_req, res) => {
  const today = todayISO();

  const totalEmployees = db.prepare('SELECT COUNT(*) AS count FROM employees').get().count;
  const activeEmployees = db.prepare("SELECT COUNT(*) AS count FROM employees WHERE status = 'Active'").get().count;
  const presentToday = db.prepare(
    "SELECT COUNT(*) AS count FROM attendance WHERE date = ? AND status IN ('Present', 'Late')"
  ).get(today).count;
  const remoteToday = db.prepare(
    "SELECT COUNT(*) AS count FROM attendance WHERE date = ? AND work_mode IN ('Remote', 'Hybrid') AND status IN ('Present', 'Late')"
  ).get(today).count;

  const pendingLeaves = db.prepare("SELECT COUNT(*) AS count FROM leave_requests WHERE status = 'Pending'").get().count;
  const openTasks = db.prepare("SELECT COUNT(*) AS count FROM tasks WHERE status != 'done'").get().count;
  const urgentTasks = db.prepare("SELECT COUNT(*) AS count FROM tasks WHERE status != 'done' AND priority = 'Urgent'").get().count;
  const bookingsToday = db.prepare(
    "SELECT COUNT(*) AS count FROM room_bookings WHERE date = ? AND status = 'Confirmed'"
  ).get(today).count;

  const assetStats = db.prepare(
    'SELECT COUNT(*) AS total, COALESCE(SUM(value), 0) AS totalValue FROM assets'
  ).get();
  const pendingExpenses = db.prepare(
    "SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total FROM expenses WHERE status = 'Pending'"
  ).get();

  const departments = db.prepare(`
    SELECT d.id, d.name, d.head_name, d.budget, d.location,
           COUNT(e.id) AS headcount,
           COALESCE(SUM(e.salary), 0) AS payroll_total
    FROM departments d
    LEFT JOIN employees e ON e.department_id = d.id
    GROUP BY d.id
    ORDER BY headcount DESC, d.name ASC
  `).all();

  const workModeCounts = db.prepare(`
    SELECT
      CASE WHEN status = 'On Leave' THEN 'On Leave' ELSE work_mode END AS mode,
      COUNT(*) AS count
    FROM attendance
    WHERE date = ?
    GROUP BY mode
  `).all(today);

  const expenseByCategory = db.prepare(`
    SELECT category, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE status != 'Rejected'
    GROUP BY category
    ORDER BY total DESC
  `).all();

  const assetByStatus = db.prepare(`
    SELECT status, COUNT(*) AS count, COALESCE(SUM(value), 0) AS total_value
    FROM assets
    GROUP BY status
  `).all();

  const recentActivities = db.prepare(`
    SELECT a.*, e.avatar_color
    FROM activity_logs a
    LEFT JOIN employees e ON e.id = a.actor_id OR e.name = a.actor_name
    ORDER BY a.id DESC
    LIMIT 10
  `).all();

  const upcomingBookings = db.prepare(`
    SELECT rb.*, mr.name AS room_name, mr.floor, e.name AS employee_name
    FROM room_bookings rb
    JOIN meeting_rooms mr ON mr.id = rb.room_id
    JOIN employees e ON e.id = rb.employee_id
    WHERE rb.date >= ? AND rb.status = 'Confirmed'
    ORDER BY rb.date ASC, rb.start_time ASC
    LIMIT 5
  `).all(today);

  const pendingLeaveList = db.prepare(`
    SELECT lr.*, e.name AS employee_name, e.role AS employee_role, e.avatar_color
    FROM leave_requests lr
    JOIN employees e ON e.id = lr.employee_id
    WHERE lr.status = 'Pending'
    ORDER BY lr.created_at DESC
    LIMIT 5
  `).all();

  const pinnedAnnouncements = db.prepare(`
    SELECT a.*, e.name AS author_name
    FROM announcements a
    LEFT JOIN employees e ON e.id = a.author_id
    ORDER BY a.pinned DESC, a.created_at DESC
    LIMIT 4
  `).all();

  const taskStatusCounts = db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM tasks
    GROUP BY status
  `).all();

  res.json({
    today,
    kpis: {
      totalEmployees,
      activeEmployees,
      presentToday,
      remoteToday,
      pendingLeaves,
      openTasks,
      urgentTasks,
      bookingsToday,
      totalAssets: assetStats.total,
      totalAssetValue: assetStats.totalValue,
      pendingExpenseCount: pendingExpenses.count,
      pendingExpenseTotal: pendingExpenses.total,
    },
    departments,
    workModeCounts,
    expenseByCategory,
    assetByStatus,
    recentActivities,
    upcomingBookings,
    pendingLeaveList,
    pinnedAnnouncements,
    taskStatusCounts,
  });
});

// Chatter / Activity Feed
app.get('/api/activities', (_req, res) => {
  const rows = db.prepare(`
    SELECT a.*, e.avatar_color
    FROM activity_logs a
    LEFT JOIN employees e ON e.id = a.actor_id OR e.name = a.actor_name
    ORDER BY a.id DESC
    LIMIT 25
  `).all();
  res.json(rows);
});

app.post('/api/activities', (req, res) => {
  const { actor_id = null, actor_name = 'Team Member', action_type = 'Chatter', entity_type = 'Office', summary } = req.body;
  if (!summary?.trim()) return res.status(400).json({ error: 'Post message is required.' });
  const info = db.prepare(
    'INSERT INTO activity_logs (actor_id, actor_name, action_type, entity_type, summary) VALUES (?, ?, ?, ?, ?)'
  ).run(actor_id ? Number(actor_id) : null, actor_name, action_type, entity_type, summary.trim());
  const created = db.prepare(`
    SELECT a.*, e.avatar_color
    FROM activity_logs a
    LEFT JOIN employees e ON e.id = a.actor_id OR e.name = a.actor_name
    WHERE a.id = ?
  `).get(Number(info.lastInsertRowid));
  res.status(201).json(created);
});

// Global Search
app.get('/api/search', (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ employees: [], tasks: [], assets: [], announcements: [] });
  const pattern = `%${q}%`;

  const employees = db.prepare(`
    SELECT e.id, e.name, e.role, e.email, d.name AS department_name
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE e.name LIKE ? OR e.role LIKE ? OR e.email LIKE ? OR e.employee_code LIKE ?
    LIMIT 5
  `).all(pattern, pattern, pattern, pattern);

  const tasks = db.prepare(`
    SELECT id, title, status, priority, due_date
    FROM tasks
    WHERE title LIKE ? OR description LIKE ?
    LIMIT 5
  `).all(pattern, pattern);

  const assets = db.prepare(`
    SELECT id, asset_tag, name, category, status
    FROM assets
    WHERE name LIKE ? OR asset_tag LIKE ? OR serial_number LIKE ?
    LIMIT 5
  `).all(pattern, pattern, pattern);

  const announcements = db.prepare(`
    SELECT id, title, category, created_at
    FROM announcements
    WHERE title LIKE ? OR content LIKE ?
    LIMIT 5
  `).all(pattern, pattern);

  res.json({ employees, tasks, assets, announcements });
});

// Departments
app.get('/api/departments', (_req, res) => {
  const rows = db.prepare(`
    SELECT d.*, COUNT(e.id) AS headcount, COALESCE(SUM(e.salary), 0) AS payroll_total
    FROM departments d
    LEFT JOIN employees e ON e.department_id = d.id
    GROUP BY d.id
    ORDER BY d.name ASC
  `).all();
  res.json(rows);
});

app.post('/api/departments', (req, res) => {
  const { name, head_name, budget = 0, location = 'HQ - Floor 1' } = req.body;
  if (!name?.trim() || !head_name?.trim()) {
    return res.status(400).json({ error: 'Department name and head name are required.' });
  }
  try {
    const info = db.prepare(
      'INSERT INTO departments (name, head_name, budget, location) VALUES (?, ?, ?, ?)'
    ).run(name.trim(), head_name.trim(), Number(budget) || 0, location.trim());
    const created = db.prepare('SELECT * FROM departments WHERE id = ?').get(Number(info.lastInsertRowid));
    res.status(201).json(created);
  } catch (err) {
    res.status(409).json({ error: 'Department with this name already exists.' });
  }
});

// Employees
app.get('/api/employees', (req, res) => {
  const { search = '', department_id = '', status = '' } = req.query;
  let query = `
    SELECT e.*, d.name AS department_name
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE 1=1
  `;
  const params = [];
  if (String(search).trim()) {
    const p = `%${String(search).trim()}%`;
    query += ' AND (e.name LIKE ? OR e.email LIKE ? OR e.role LIKE ? OR e.employee_code LIKE ?)';
    params.push(p, p, p, p);
  }
  if (String(department_id).trim()) {
    query += ' AND e.department_id = ?';
    params.push(Number(department_id));
  }
  if (String(status).trim()) {
    query += ' AND e.status = ?';
    params.push(String(status));
  }
  query += ' ORDER BY e.employee_code ASC';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/employees', (req, res) => {
  const {
    name,
    email,
    phone = '',
    role,
    department_id = null,
    employment_type = 'Full-time',
    status = 'Active',
    join_date = todayISO(),
    salary = 0,
    access_level = 'Staff',
  } = req.body;

  if (!name?.trim() || !email?.trim() || !role?.trim()) {
    return res.status(400).json({ error: 'Name, email, and role are required.' });
  }

  const maxRow = db.prepare('SELECT COUNT(*) AS count FROM employees').get();
  const employee_code = req.body.employee_code?.trim() || `EMP-${101 + Number(maxRow.count) + Math.floor(Math.random() * 50)}`;
  const avatar_color = AVATAR_COLORS[Number(maxRow.count) % AVATAR_COLORS.length];

  try {
    const info = db.prepare(`
      INSERT INTO employees (
        employee_code, name, email, phone, role, department_id,
        employment_type, status, join_date, salary, avatar_color, access_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      employee_code,
      name.trim(),
      email.trim().toLowerCase(),
      phone.trim(),
      role.trim(),
      department_id ? Number(department_id) : null,
      employment_type,
      status,
      join_date,
      Number(salary) || 0,
      avatar_color,
      access_level
    );

    const created = db.prepare(`
      SELECT e.*, d.name AS department_name
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.id = ?
    `).get(Number(info.lastInsertRowid));
    res.status(201).json(created);
  } catch (err) {
    res.status(409).json({ error: 'An employee with this email or employee code already exists.' });
  }
});

app.put('/api/employees/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Employee not found.' });

  const {
    name = existing.name,
    email = existing.email,
    phone = existing.phone,
    role = existing.role,
    department_id = existing.department_id,
    employment_type = existing.employment_type,
    status = existing.status,
    join_date = existing.join_date,
    salary = existing.salary,
    access_level = existing.access_level,
  } = req.body;

  try {
    db.prepare(`
      UPDATE employees
      SET name = ?, email = ?, phone = ?, role = ?, department_id = ?,
          employment_type = ?, status = ?, join_date = ?, salary = ?, access_level = ?
      WHERE id = ?
    `).run(
      String(name).trim(),
      String(email).trim().toLowerCase(),
      String(phone).trim(),
      String(role).trim(),
      department_id ? Number(department_id) : null,
      employment_type,
      status,
      join_date,
      Number(salary) || 0,
      access_level,
      id
    );

    const updated = db.prepare(`
      SELECT e.*, d.name AS department_name
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.id = ?
    `).get(id);
    res.json(updated);
  } catch (err) {
    res.status(409).json({ error: 'Could not update employee (email may conflict).' });
  }
});

app.delete('/api/employees/:id', (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM employees WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Employee not found.' });
  res.json({ deleted: true, id });
});

// Attendance
app.get('/api/attendance', (req, res) => {
  const date = String(req.query.date || todayISO());
  const rows = db.prepare(`
    SELECT a.*, e.name AS employee_name, e.employee_code, e.role, e.avatar_color, d.name AS department_name
    FROM attendance a
    JOIN employees e ON e.id = a.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE a.date = ?
    ORDER BY a.check_in ASC, e.name ASC
  `).all(date);
  res.json(rows);
});

app.post('/api/attendance/clock', (req, res) => {
  const { employee_id, action, work_mode = 'In-Office', notes = '' } = req.body;
  const empId = Number(employee_id);
  if (!empId) return res.status(400).json({ error: 'employee_id is required.' });

  const today = todayISO();
  const time = nowTimeHHMM();
  const existing = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(empId, today);

  if (action === 'check_in') {
    const status = time > '09:15' ? 'Late' : 'Present';
    if (existing) {
      db.prepare(`
        UPDATE attendance
        SET check_in = COALESCE(check_in, ?), status = ?, work_mode = ?, notes = ?
        WHERE id = ?
      `).run(time, status, work_mode, notes, existing.id);
    } else {
      db.prepare(`
        INSERT INTO attendance (employee_id, date, check_in, status, work_mode, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(empId, today, time, status, work_mode, notes);
    }
  } else if (action === 'check_out') {
    if (!existing) {
      return res.status(400).json({ error: 'No check-in record found for today.' });
    }
    db.prepare('UPDATE attendance SET check_out = ?, notes = COALESCE(NULLIF(?, \'\'), notes) WHERE id = ?').run(
      time,
      notes,
      existing.id
    );
  } else {
    return res.status(400).json({ error: 'Invalid clock action. Use check_in or check_out.' });
  }

  const record = db.prepare(`
    SELECT a.*, e.name AS employee_name, e.employee_code, e.role, e.avatar_color, d.name AS department_name
    FROM attendance a
    JOIN employees e ON e.id = a.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE a.employee_id = ? AND a.date = ?
  `).get(empId, today);
  res.json(record);
});

// Leave Requests
app.get('/api/leaves', (req, res) => {
  const { status = '' } = req.query;
  let query = `
    SELECT lr.*, e.name AS employee_name, e.employee_code, e.role, e.avatar_color, d.name AS department_name
    FROM leave_requests lr
    JOIN employees e ON e.id = lr.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE 1=1
  `;
  const params = [];
  if (String(status).trim()) {
    query += ' AND lr.status = ?';
    params.push(String(status));
  }
  query += ' ORDER BY CASE lr.status WHEN \'Pending\' THEN 0 ELSE 1 END, lr.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/leaves', (req, res) => {
  const { employee_id, leave_type, start_date, end_date, reason } = req.body;
  if (!employee_id || !leave_type || !start_date || !end_date || !reason?.trim()) {
    return res.status(400).json({ error: 'All leave fields are required.' });
  }
  if (end_date < start_date) {
    return res.status(400).json({ error: 'End date cannot be earlier than start date.' });
  }

  const days = calcDaysInclusive(start_date, end_date);
  const info = db.prepare(`
    INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, days, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, 'Pending')
  `).run(Number(employee_id), leave_type, start_date, end_date, days, reason.trim());

  const created = db.prepare(`
    SELECT lr.*, e.name AS employee_name, e.employee_code, e.role, e.avatar_color, d.name AS department_name
    FROM leave_requests lr
    JOIN employees e ON e.id = lr.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE lr.id = ?
  `).get(Number(info.lastInsertRowid));
  res.status(201).json(created);
});

app.patch('/api/leaves/:id', (req, res) => {
  const id = Number(req.params.id);
  const { status, reviewed_by = 'Aarav Mehta' } = req.body;
  if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid leave status.' });
  }
  const existing = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Leave request not found.' });

  db.prepare('UPDATE leave_requests SET status = ?, reviewed_by = ? WHERE id = ?').run(status, reviewed_by, id);

  const updated = db.prepare(`
    SELECT lr.*, e.name AS employee_name, e.employee_code, e.role, e.avatar_color, d.name AS department_name
    FROM leave_requests lr
    JOIN employees e ON e.id = lr.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE lr.id = ?
  `).get(id);
  logActivity(reviewed_by, status, 'Leave', `${status} ${updated.days}-day ${updated.leave_type} for ${updated.employee_name}`);
  res.json(updated);
});

// Projects & Tasks
app.get('/api/projects', (_req, res) => {
  const rows = db.prepare(`
    SELECT p.*,
           d.name AS department_name,
           e.name AS lead_name,
           COUNT(t.id) AS total_tasks,
           SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS completed_tasks
    FROM projects p
    LEFT JOIN departments d ON d.id = p.department_id
    LEFT JOIN employees e ON e.id = p.lead_id
    LEFT JOIN tasks t ON t.project_id = p.id
    GROUP BY p.id
    ORDER BY p.deadline ASC
  `).all();
  res.json(rows);
});

app.post('/api/projects', (req, res) => {
  const { name, department_id = null, lead_id = null, deadline, description = '' } = req.body;
  if (!name?.trim() || !deadline) {
    return res.status(400).json({ error: 'Project name and deadline are required.' });
  }
  const info = db.prepare(`
    INSERT INTO projects (name, department_id, lead_id, status, deadline, description)
    VALUES (?, ?, ?, 'Active', ?, ?)
  `).run(
    name.trim(),
    department_id ? Number(department_id) : null,
    lead_id ? Number(lead_id) : null,
    deadline,
    description.trim()
  );
  const created = db.prepare(`
    SELECT p.*, d.name AS department_name, e.name AS lead_name,
           0 AS total_tasks, 0 AS completed_tasks
    FROM projects p
    LEFT JOIN departments d ON d.id = p.department_id
    LEFT JOIN employees e ON e.id = p.lead_id
    WHERE p.id = ?
  `).get(Number(info.lastInsertRowid));
  res.status(201).json(created);
});

app.get('/api/tasks', (req, res) => {
  const { project_id = '', status = '' } = req.query;
  let query = `
    SELECT t.*, p.name AS project_name, e.name AS assignee_name, e.avatar_color
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN employees e ON e.id = t.assignee_id
    WHERE 1=1
  `;
  const params = [];
  if (String(project_id).trim()) {
    query += ' AND t.project_id = ?';
    params.push(Number(project_id));
  }
  if (String(status).trim()) {
    query += ' AND t.status = ?';
    params.push(String(status));
  }
  query += ' ORDER BY CASE t.priority WHEN \'Urgent\' THEN 0 WHEN \'High\' THEN 1 WHEN \'Medium\' THEN 2 ELSE 3 END, t.due_date ASC';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/tasks', (req, res) => {
  const {
    project_id = null,
    title,
    description = '',
    assignee_id = null,
    priority = 'Medium',
    status = 'todo',
    due_date = todayISO(),
  } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Task title is required.' });

  const info = db.prepare(`
    INSERT INTO tasks (project_id, title, description, assignee_id, priority, status, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    project_id ? Number(project_id) : null,
    title.trim(),
    description.trim(),
    assignee_id ? Number(assignee_id) : null,
    priority,
    status,
    due_date
  );
  const created = db.prepare(`
    SELECT t.*, p.name AS project_name, e.name AS assignee_name, e.avatar_color
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN employees e ON e.id = t.assignee_id
    WHERE t.id = ?
  `).get(Number(info.lastInsertRowid));
  res.status(201).json(created);
});

app.patch('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Task not found.' });

  const {
    title = existing.title,
    description = existing.description,
    status = existing.status,
    priority = existing.priority,
    assignee_id = existing.assignee_id,
    due_date = existing.due_date,
    project_id = existing.project_id,
  } = req.body;

  db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, status = ?, priority = ?, assignee_id = ?, due_date = ?, project_id = ?
    WHERE id = ?
  `).run(
    String(title).trim(),
    String(description).trim(),
    status,
    priority,
    assignee_id ? Number(assignee_id) : null,
    due_date,
    project_id ? Number(project_id) : null,
    id
  );

  const updated = db.prepare(`
    SELECT t.*, p.name AS project_name, e.name AS assignee_name, e.avatar_color
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN employees e ON e.id = t.assignee_id
    WHERE t.id = ?
  `).get(id);
  if (existing.status !== status) {
    logActivity(updated.assignee_name || 'Team', 'Updated', 'Task', `Moved "${updated.title}" to ${status.replace('_', ' ')}`);
  }
  res.json(updated);
});

app.delete('/api/tasks/:id', (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Task not found.' });
  res.json({ deleted: true, id });
});

// Meeting Rooms & Bookings
app.get('/api/rooms', (_req, res) => {
  res.json(db.prepare('SELECT * FROM meeting_rooms ORDER BY floor ASC, name ASC').all());
});

app.get('/api/bookings', (req, res) => {
  const date = String(req.query.date || '');
  let query = `
    SELECT rb.*, mr.name AS room_name, mr.floor, mr.capacity, e.name AS employee_name
    FROM room_bookings rb
    JOIN meeting_rooms mr ON mr.id = rb.room_id
    JOIN employees e ON e.id = rb.employee_id
    WHERE rb.status = 'Confirmed'
  `;
  const params = [];
  if (date) {
    query += ' AND rb.date = ?';
    params.push(date);
  }
  query += ' ORDER BY rb.date ASC, rb.start_time ASC';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/bookings', (req, res) => {
  const { room_id, employee_id, title, date, start_time, end_time, attendees = 2 } = req.body;
  if (!room_id || !employee_id || !title?.trim() || !date || !start_time || !end_time) {
    return res.status(400).json({ error: 'All booking fields are required.' });
  }
  if (end_time <= start_time) {
    return res.status(400).json({ error: 'End time must be after start time.' });
  }

  const room = db.prepare('SELECT * FROM meeting_rooms WHERE id = ?').get(Number(room_id));
  if (!room) return res.status(404).json({ error: 'Meeting room not found.' });
  if (room.status === 'Maintenance') {
    return res.status(409).json({ error: `${room.name} is currently under maintenance.` });
  }

  const conflict = db.prepare(`
    SELECT id, title, start_time, end_time
    FROM room_bookings
    WHERE room_id = ? AND date = ? AND status = 'Confirmed'
      AND NOT (end_time <= ? OR start_time >= ?)
    LIMIT 1
  `).get(Number(room_id), date, start_time, end_time);

  if (conflict) {
    return res.status(409).json({
      error: `Time conflict with "${conflict.title}" (${conflict.start_time}–${conflict.end_time}).`,
    });
  }

  const info = db.prepare(`
    INSERT INTO room_bookings (room_id, employee_id, title, date, start_time, end_time, attendees, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Confirmed')
  `).run(Number(room_id), Number(employee_id), title.trim(), date, start_time, end_time, Number(attendees) || 2);

  const created = db.prepare(`
    SELECT rb.*, mr.name AS room_name, mr.floor, mr.capacity, e.name AS employee_name
    FROM room_bookings rb
    JOIN meeting_rooms mr ON mr.id = rb.room_id
    JOIN employees e ON e.id = rb.employee_id
    WHERE rb.id = ?
  `).get(Number(info.lastInsertRowid));
  logActivity(created.employee_name, 'Booked', 'Room', `Reserved ${created.room_name} for "${created.title}" (${created.start_time}–${created.end_time})`, created.employee_id);
  res.status(201).json(created);
});

app.delete('/api/bookings/:id', (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM room_bookings WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Booking not found.' });
  res.json({ deleted: true, id });
});

// Assets
app.get('/api/assets', (req, res) => {
  const { category = '', status = '', search = '' } = req.query;
  let query = `
    SELECT a.*, e.name AS assigned_employee_name, e.employee_code
    FROM assets a
    LEFT JOIN employees e ON e.id = a.assigned_to
    WHERE 1=1
  `;
  const params = [];
  if (String(category).trim()) {
    query += ' AND a.category = ?';
    params.push(String(category));
  }
  if (String(status).trim()) {
    query += ' AND a.status = ?';
    params.push(String(status));
  }
  if (String(search).trim()) {
    const p = `%${String(search).trim()}%`;
    query += ' AND (a.name LIKE ? OR a.asset_tag LIKE ? OR a.serial_number LIKE ?)';
    params.push(p, p, p);
  }
  query += ' ORDER BY a.asset_tag ASC';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/assets', (req, res) => {
  const {
    asset_tag,
    name,
    category,
    serial_number = '',
    assigned_to = null,
    status = assigned_to ? 'Assigned' : 'Available',
    purchase_date = todayISO(),
    value = 0,
    notes = '',
  } = req.body;

  if (!name?.trim() || !category?.trim()) {
    return res.status(400).json({ error: 'Asset name and category are required.' });
  }
  const countRow = db.prepare('SELECT COUNT(*) AS count FROM assets').get();
  const tag = asset_tag?.trim() || `AST-${1001 + Number(countRow.count) + Math.floor(Math.random() * 50)}`;

  try {
    const info = db.prepare(`
      INSERT INTO assets (asset_tag, name, category, serial_number, assigned_to, status, purchase_date, value, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tag,
      name.trim(),
      category.trim(),
      serial_number.trim(),
      assigned_to ? Number(assigned_to) : null,
      status,
      purchase_date,
      Number(value) || 0,
      notes.trim()
    );
    const created = db.prepare(`
      SELECT a.*, e.name AS assigned_employee_name, e.employee_code
      FROM assets a
      LEFT JOIN employees e ON e.id = a.assigned_to
      WHERE a.id = ?
    `).get(Number(info.lastInsertRowid));
    res.status(201).json(created);
  } catch (err) {
    res.status(409).json({ error: 'Asset tag already exists.' });
  }
});

app.patch('/api/assets/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Asset not found.' });

  const assigned_to = req.body.assigned_to !== undefined
    ? (req.body.assigned_to ? Number(req.body.assigned_to) : null)
    : existing.assigned_to;

  let status = req.body.status ?? existing.status;
  if (req.body.assigned_to !== undefined && req.body.status === undefined) {
    status = assigned_to ? 'Assigned' : 'Available';
  }

  db.prepare(`
    UPDATE assets
    SET name = ?, category = ?, serial_number = ?, assigned_to = ?, status = ?, value = ?, notes = ?
    WHERE id = ?
  `).run(
    req.body.name ?? existing.name,
    req.body.category ?? existing.category,
    req.body.serial_number ?? existing.serial_number,
    assigned_to,
    status,
    req.body.value !== undefined ? Number(req.body.value) : existing.value,
    req.body.notes ?? existing.notes,
    id
  );

  const updated = db.prepare(`
    SELECT a.*, e.name AS assigned_employee_name, e.employee_code
    FROM assets a
    LEFT JOIN employees e ON e.id = a.assigned_to
    WHERE a.id = ?
  `).get(id);
  res.json(updated);
});

app.delete('/api/assets/:id', (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM assets WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Asset not found.' });
  res.json({ deleted: true, id });
});

// Expenses
app.get('/api/expenses', (req, res) => {
  const { status = '' } = req.query;
  let query = `
    SELECT ex.*, e.name AS employee_name, e.employee_code, d.name AS department_name
    FROM expenses ex
    JOIN employees e ON e.id = ex.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE 1=1
  `;
  const params = [];
  if (String(status).trim()) {
    query += ' AND ex.status = ?';
    params.push(String(status));
  }
  query += ' ORDER BY ex.expense_date DESC, ex.id DESC';
  res.json(db.prepare(query).all(...params));
});

app.post('/api/expenses', (req, res) => {
  const { employee_id, title, category, amount, expense_date = todayISO(), notes = '' } = req.body;
  if (!employee_id || !title?.trim() || !category?.trim() || !(Number(amount) > 0)) {
    return res.status(400).json({ error: 'Employee, title, category, and positive amount are required.' });
  }
  const info = db.prepare(`
    INSERT INTO expenses (employee_id, title, category, amount, expense_date, status, notes)
    VALUES (?, ?, ?, ?, ?, 'Pending', ?)
  `).run(Number(employee_id), title.trim(), category.trim(), Number(amount), expense_date, notes.trim());

  const created = db.prepare(`
    SELECT ex.*, e.name AS employee_name, e.employee_code, d.name AS department_name
    FROM expenses ex
    JOIN employees e ON e.id = ex.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE ex.id = ?
  `).get(Number(info.lastInsertRowid));
  res.status(201).json(created);
});

app.patch('/api/expenses/:id', (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!['Pending', 'Approved', 'Reimbursed', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid expense status.' });
  }
  const result = db.prepare('UPDATE expenses SET status = ? WHERE id = ?').run(status, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Expense claim not found.' });

  const updated = db.prepare(`
    SELECT ex.*, e.name AS employee_name, e.employee_code, d.name AS department_name
    FROM expenses ex
    JOIN employees e ON e.id = ex.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE ex.id = ?
  `).get(id);
  res.json(updated);
});

// Announcements
app.get('/api/announcements', (_req, res) => {
  const rows = db.prepare(`
    SELECT a.*, e.name AS author_name, e.role AS author_role, e.avatar_color
    FROM announcements a
    LEFT JOIN employees e ON e.id = a.author_id
    ORDER BY a.pinned DESC, a.created_at DESC
  `).all();
  res.json(rows);
});

app.post('/api/announcements', (req, res) => {
  const { title, content, category = 'General', author_id = null, pinned = false } = req.body;
  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({ error: 'Announcement title and content are required.' });
  }
  const info = db.prepare(`
    INSERT INTO announcements (title, content, category, author_id, pinned)
    VALUES (?, ?, ?, ?, ?)
  `).run(title.trim(), content.trim(), category, author_id ? Number(author_id) : null, pinned ? 1 : 0);

  const created = db.prepare(`
    SELECT a.*, e.name AS author_name, e.role AS author_role, e.avatar_color
    FROM announcements a
    LEFT JOIN employees e ON e.id = a.author_id
    WHERE a.id = ?
  `).get(Number(info.lastInsertRowid));
  res.status(201).json(created);
});

app.patch('/api/announcements/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Announcement not found.' });

  const pinned = req.body.pinned !== undefined ? (req.body.pinned ? 1 : 0) : existing.pinned;
  db.prepare('UPDATE announcements SET pinned = ? WHERE id = ?').run(pinned, id);

  const updated = db.prepare(`
    SELECT a.*, e.name AS author_name, e.role AS author_role, e.avatar_color
    FROM announcements a
    LEFT JOIN employees e ON e.id = a.author_id
    WHERE a.id = ?
  `).get(id);
  res.json(updated);
});

app.delete('/api/announcements/:id', (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Announcement not found.' });
  res.json({ deleted: true, id });
});

// Serve production build if present
const distDir = path.resolve(__dirname, '../dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`NexaDesk API listening on http://localhost:${PORT}`);
});
