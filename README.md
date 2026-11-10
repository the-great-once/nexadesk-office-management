# NexaDesk — Office Management System

Full-stack Office Management System built with React, TypeScript, Tailwind CSS, Express, and Node's built-in SQLite (`node:sqlite`).

## Modules

- **Executive Dashboard**: Real-time headcount, attendance, pending approvals, task summary, department budgets, upcoming room bookings, and pinned notices.
- **Employees & Departments**: Staff directory, search & department filtering, add/edit/remove employees, profile view, and department budget/payroll tracking.
- **Attendance & Leave**: One-click Clock-In / Clock-Out with work-mode tracking (`In-Office`, `Hybrid`, `Remote`), daily attendance log, leave request submission, and manager approval workflow.
- **Tasks & Projects**: Project progress tracking, interactive 4-column Kanban task board (`To Do`, `In Progress`, `In Review`, `Done`), priority tags, and assignments.
- **Meeting Rooms**: Room directory, date-based schedule viewer, and conflict-checked room reservations.
- **Office Assets**: Equipment inventory, value tracking, employee assignment/return, and status management.
- **Expenses**: Claim submission, finance approval/rejection, and reimbursement tracking.
- **Announcements**: Company notice board with category tags and dashboard pinning.

## Running Locally

```bash
cd office-management
npm install
npm run dev
```

- Frontend (Vite): `http://localhost:5173`
- Backend API (Express + SQLite): `http://localhost:4000`

### Production Build & Start

```bash
npm run build
npm start
```
