import { db } from './db.js';

function offsetDate(daysFromToday) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function seedIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM departments').get();
  if (count === 0) {
    seedCoreData();
  }
  seedActivityLogsIfEmpty();
}

function seedActivityLogsIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM activity_logs').get();
  if (count > 0) return;

  const insertLog = db.prepare(`
    INSERT INTO activity_logs (actor_name, action_type, entity_type, summary)
    VALUES (?, ?, ?, ?)
  `);
  [
    ['Aarav Mehta', 'Approved', 'Leave', 'Approved 4-day Annual Leave request for Hannah Brooks'],
    ['Elena Vance', 'Milestone', 'Project', 'Internal Employee Self-Service v2 reached 33% task completion'],
    ['Marcus Sterling', 'Audit', 'Expense', 'Flagged Q3 SaaS subscription reconciliation for Finance review'],
    ['Liam O\'Connor', 'Assigned', 'Asset', 'Provisioned AST-1002 (MacBook Pro 14") to Sofia Alvarez'],
    ['Priya Nair', 'Chatter', 'Room', 'Updated Summit Boardroom Q4 Town Hall AV checklist'],
    ['David Kim', 'Booked', 'Room', 'Reserved Horizon Briefing Room for Acme Corp Executive Onboarding'],
  ].forEach((row) => insertLog.run(...row));
}

function seedCoreData() {

  const today = offsetDate(0);
  const yesterday = offsetDate(-1);

  db.exec('BEGIN');
  try {
    const insertDept = db.prepare(
      'INSERT INTO departments (name, head_name, budget, location) VALUES (?, ?, ?, ?)'
    );
    const deptIds = [
      insertDept.run('Operations & HR', 'Aarav Mehta', 185000, 'HQ - Floor 2').lastInsertRowid,
      insertDept.run('Engineering', 'Elena Vance', 540000, 'HQ - Floor 4').lastInsertRowid,
      insertDept.run('Finance & Legal', 'Marcus Sterling', 240000, 'HQ - Floor 3').lastInsertRowid,
      insertDept.run('Product & Design', 'Priya Nair', 210000, 'HQ - Floor 5').lastInsertRowid,
      insertDept.run('Sales & Client Success', 'David Kim', 275000, 'HQ - Floor 1').lastInsertRowid,
    ];

    const insertEmp = db.prepare(`
      INSERT INTO employees (
        employee_code, name, email, phone, role, department_id,
        employment_type, status, join_date, salary, avatar_color, access_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const employees = [
      ['EMP-101', 'Aarav Mehta', 'aarav.mehta@nexadesk.io', '+1 (415) 555-0142', 'VP of Operations & HR', deptIds[0], 'Full-time', 'Active', '2022-03-14', 135000, 'bg-indigo-600', 'Admin'],
      ['EMP-102', 'Elena Vance', 'elena.vance@nexadesk.io', '+1 (415) 555-0188', 'Director of Engineering', deptIds[1], 'Full-time', 'Active', '2021-08-02', 168000, 'bg-emerald-600', 'Manager'],
      ['EMP-103', 'Marcus Sterling', 'marcus.sterling@nexadesk.io', '+1 (415) 555-0124', 'Head of Finance', deptIds[2], 'Full-time', 'Active', '2022-01-10', 152000, 'bg-slate-700', 'Manager'],
      ['EMP-104', 'Priya Nair', 'priya.nair@nexadesk.io', '+1 (415) 555-0167', 'Lead Product Designer', deptIds[3], 'Full-time', 'Active', '2023-05-19', 124000, 'bg-violet-600', 'Manager'],
      ['EMP-105', 'David Kim', 'david.kim@nexadesk.io', '+1 (415) 555-0191', 'Enterprise Account Director', deptIds[4], 'Full-time', 'Active', '2023-02-06', 118000, 'bg-sky-600', 'Staff'],
      ['EMP-106', 'Sofia Alvarez', 'sofia.alvarez@nexadesk.io', '+1 (415) 555-0133', 'Senior Full-Stack Engineer', deptIds[1], 'Full-time', 'Active', '2023-09-11', 142000, 'bg-amber-600', 'Staff'],
      ['EMP-107', 'Liam O\'Connor', 'liam.oconnor@nexadesk.io', '+1 (415) 555-0174', 'IT & Workplace Specialist', deptIds[0], 'Full-time', 'Active', '2024-01-22', 88000, 'bg-teal-600', 'Staff'],
      ['EMP-108', 'Hannah Brooks', 'hannah.brooks@nexadesk.io', '+1 (415) 555-0155', 'Financial Analyst', deptIds[2], 'Full-time', 'On Leave', '2024-04-08', 94000, 'bg-rose-600', 'Staff'],
      ['EMP-109', 'Rohan Kapoor', 'rohan.kapoor@nexadesk.io', '+1 (415) 555-0119', 'Customer Success Lead', deptIds[4], 'Full-time', 'Active', '2024-06-15', 96000, 'bg-cyan-600', 'Staff'],
      ['EMP-110', 'Maya Lin', 'maya.lin@nexadesk.io', '+1 (415) 555-0199', 'UX Researcher', deptIds[3], 'Contract', 'Active', '2025-02-03', 82000, 'bg-fuchsia-600', 'Staff'],
    ];
    const empIds = employees.map((e) => insertEmp.run(...e).lastInsertRowid);

    const insertAtt = db.prepare(
      'INSERT INTO attendance (employee_id, date, check_in, check_out, status, work_mode, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const todayAttendance = [
      [empIds[0], today, '08:52', null, 'Present', 'In-Office', 'Morning executive standup'],
      [empIds[1], today, '09:04', null, 'Present', 'Hybrid', ''],
      [empIds[2], today, '08:45', null, 'Present', 'In-Office', 'Q4 budget close'],
      [empIds[3], today, '09:18', null, 'Late', 'Remote', 'Design sprint prep'],
      [empIds[4], today, '09:00', null, 'Present', 'In-Office', 'Client onboarding call'],
      [empIds[5], today, '08:57', null, 'Present', 'Remote', ''],
      [empIds[6], today, '08:30', null, 'Present', 'In-Office', 'Hardware provisioning'],
      [empIds[7], today, null, null, 'On Leave', 'Remote', 'Approved annual leave'],
      [empIds[8], today, '09:02', null, 'Present', 'In-Office', ''],
      [empIds[0], yesterday, '08:50', '17:45', 'Present', 'In-Office', ''],
      [empIds[1], yesterday, '09:01', '18:10', 'Present', 'In-Office', ''],
      [empIds[5], yesterday, '09:05', '17:55', 'Present', 'Remote', ''],
    ];
    todayAttendance.forEach((a) => insertAtt.run(...a));

    const insertLeave = db.prepare(`
      INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, days, reason, status, reviewed_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      [empIds[7], 'Annual Leave', offsetDate(-1), offsetDate(2), 4, 'Family trip out of state', 'Approved', 'Aarav Mehta'],
      [empIds[5], 'Personal Leave', offsetDate(4), offsetDate(5), 2, 'Moving to new apartment', 'Pending', ''],
      [empIds[9], 'Sick Leave', offsetDate(1), offsetDate(1), 1, 'Dental procedure and recovery', 'Pending', ''],
      [empIds[4], 'Annual Leave', offsetDate(10), offsetDate(14), 5, 'Thanksgiving travel', 'Pending', ''],
      [empIds[6], 'Training Leave', offsetDate(-8), offsetDate(-7), 2, 'IT Security Certification Workshop', 'Approved', 'Aarav Mehta'],
    ].forEach((l) => insertLeave.run(...l));

    const insertProj = db.prepare(
      'INSERT INTO projects (name, department_id, lead_id, status, deadline, description) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const projId1 = insertProj.run('HQ Floor 4 Workspace Upgrade', deptIds[0], empIds[0], 'Active', offsetDate(20), 'Upgrade ergonomic desks, acoustic booths, and smart badge readers.').lastInsertRowid;
    const projId2 = insertProj.run('Internal Employee Self-Service v2', deptIds[1], empIds[1], 'Active', offsetDate(14), 'Launch single sign-on and automated expense receipts.').lastInsertRowid;
    const projId3 = insertProj.run('FY27 Budget & Procurement Audit', deptIds[2], empIds[2], 'Active', offsetDate(9), 'Consolidate vendor contracts and departmental software licenses.').lastInsertRowid;
    const projId4 = insertProj.run('Brand Guidelines & Office Signage', deptIds[3], empIds[3], 'Completed', offsetDate(-3), 'Unified visual templates for client decks and reception displays.').lastInsertRowid;

    const insertTask = db.prepare(
      'INSERT INTO tasks (project_id, title, description, assignee_id, priority, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    [
      [projId1, 'Finalize acoustic booth vendor quote', 'Compare 3 shortlisted vendors and confirm delivery lead times.', empIds[6], 'High', 'in_progress', offsetDate(3)],
      [projId1, 'Schedule building electrical inspection', 'Coordinate with facilities management for Floor 4 circuit testing.', empIds[0], 'Medium', 'todo', offsetDate(6)],
      [projId1, 'Audit current desk monitor arms', 'Check compatibility with 27-inch USB-C monitors.', empIds[6], 'Low', 'done', offsetDate(-1)],
      [projId2, 'Implement SSO callback endpoint', 'Add SAML validation and audit logging.', empIds[5], 'Urgent', 'in_progress', offsetDate(2)],
      [projId2, 'Design mobile approval cards', 'Streamline leave and expense approvals on narrow viewports.', empIds[3], 'Medium', 'review', offsetDate(4)],
      [projId2, 'Run security penetration checklist', 'Verify rate limiting and session expiry policies.', empIds[1], 'High', 'todo', offsetDate(8)],
      [projId3, 'Reconcile Q3 SaaS subscriptions', 'Flag duplicate licenses across Engineering and Design.', empIds[2], 'High', 'review', offsetDate(1)],
      [projId3, 'Collect department headcount forecasts', 'Need Q1-Q2 hiring projections from all leads.', empIds[7], 'Medium', 'todo', offsetDate(5)],
      [projId3, 'Archive FY26 tax compliance packets', 'Upload signed auditor statements to vault.', empIds[2], 'Low', 'done', offsetDate(-4)],
      [projId4, 'Install lobby welcome display graphics', 'Verify color calibration on 4K reception screen.', empIds[9], 'Medium', 'done', offsetDate(-3)],
      [null, 'Prepare monthly all-hands slide deck', 'Compile department highlights and new hire introductions.', empIds[0], 'Medium', 'todo', offsetDate(2)],
      [null, 'Renew enterprise client SLA templates', 'Update support response tier language for Q4 renewals.', empIds[4], 'High', 'in_progress', offsetDate(3)],
    ].forEach((t) => insertTask.run(...t));

    const insertRoom = db.prepare(
      'INSERT INTO meeting_rooms (name, floor, capacity, amenities, status) VALUES (?, ?, ?, ?, ?)'
    );
    const r1 = insertRoom.run('Summit Boardroom', 'Floor 4', 16, '4K Dual Display, Polycom A/V, Whiteboard, Catering Ready', 'Available').lastInsertRowid;
    const r2 = insertRoom.run('Atlas Studio', 'Floor 5', 8, 'Apple TV, Magnetic Glass Wall, Acoustic Paneling', 'Available').lastInsertRowid;
    const r3 = insertRoom.run('Beacon Huddle A', 'Floor 2', 4, 'Monitor, USB-C Hub, Video Bar', 'Available').lastInsertRowid;
    const r4 = insertRoom.run('Horizon Briefing Room', 'Floor 1', 12, 'Projector, Conferencing Mic Array, Guest Wi-Fi', 'Available').lastInsertRowid;
    const r5 = insertRoom.run('Focus Pod B', 'Floor 3', 2, 'Soundproof Booth, Ring Light, Power Dock', 'Maintenance').lastInsertRowid;

    const insertBooking = db.prepare(`
      INSERT INTO room_bookings (room_id, employee_id, title, date, start_time, end_time, attendees, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      [r1, empIds[0], 'Weekly Operations & Leadership Sync', today, '09:30', '10:30', 8, 'Confirmed'],
      [r1, empIds[2], 'FY27 Budget Review Committee', today, '14:00', '15:30', 6, 'Confirmed'],
      [r2, empIds[3], 'Q4 Design Critique & Prototype Walkthrough', today, '11:00', '12:00', 5, 'Confirmed'],
      [r3, empIds[5], 'API Architecture Pairing Session', today, '15:00', '16:00', 3, 'Confirmed'],
      [r4, empIds[4], 'Acme Corp Executive Onboarding', offsetDate(1), '10:00', '11:30', 7, 'Confirmed'],
    ].forEach((b) => insertBooking.run(...b));

    const insertAsset = db.prepare(`
      INSERT INTO assets (asset_tag, name, category, serial_number, assigned_to, status, purchase_date, value, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['AST-1001', 'MacBook Pro 16" M3 Max', 'Laptop', 'C02YM4K8MD6R', empIds[1], 'Assigned', '2024-02-12', 3499, '36GB RAM / 1TB SSD'],
      ['AST-1002', 'MacBook Pro 14" M3 Pro', 'Laptop', 'C02ZN9P1L9Q2', empIds[5], 'Assigned', '2024-03-04', 2399, '18GB RAM / 512GB SSD'],
      ['AST-1003', 'MacBook Air 15" M3', 'Laptop', 'C02AB3R7W4K1', empIds[0], 'Assigned', '2024-05-18', 1699, 'Operations primary workstation'],
      ['AST-1004', 'Dell UltraSharp 27" 4K USB-C', 'Monitor', 'DL-U2723QE-882', empIds[3], 'Assigned', '2023-11-15', 640, 'Calibrated for design'],
      ['AST-1005', 'Herman Miller Aeron Chair', 'Furniture', 'HM-AER-4410', empIds[2], 'Assigned', '2023-07-09', 1450, 'Size B Graphite'],
      ['AST-1006', 'MacBook Pro 14" M3', 'Laptop', 'C02PQ7V2X8M5', null, 'Available', '2025-01-20', 1999, 'Ready for new hire onboarding'],
      ['AST-1007', 'Logitech Rally Bar Mini', 'AV Equipment', 'LG-RBM-3029', null, 'Assigned', '2024-04-02', 2999, 'Installed in Beacon Huddle A'],
      ['AST-1008', 'iPad Pro 12.9" M2', 'Tablet', 'AP-IPD-9921', empIds[9], 'Assigned', '2024-06-22', 1199, 'Field user testing device'],
      ['AST-1009', 'HP LaserJet Enterprise M507', 'Printer', 'HP-LJ-7741', null, 'Maintenance', '2022-09-14', 920, 'Fuser maintenance scheduled'],
      ['AST-1010', 'Standing Desk Dual-Motor Frame', 'Furniture', 'SD-PRO-1182', null, 'Available', '2025-01-10', 780, 'Stored in Floor 2 supply bay'],
    ].forEach((a) => insertAsset.run(...a));

    const insertExpense = db.prepare(`
      INSERT INTO expenses (employee_id, title, category, amount, expense_date, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    [
      [empIds[4], 'Client Luncheon — Northstar Legal Group', 'Meals & Entertainment', 248.50, offsetDate(-2), 'Pending', 'Quarterly executive check-in (4 attendees)'],
      [empIds[6], 'Cat6A Patch Cables & Rack Organizers', 'Office Supplies', 164.20, offsetDate(-4), 'Approved', 'Server closet cleanup Floor 4'],
      [empIds[1], 'Cloud Infrastructure Summit Travel', 'Travel & Lodging', 892.00, offsetDate(-9), 'Reimbursed', 'Flight + 2 nights hotel'],
      [empIds[3], 'Figma Organization Annual Seat Add-on', 'Software', 540.00, offsetDate(-1), 'Pending', 'Additional seat for UX Researcher'],
      [empIds[8], 'Customer Appreciation Gift Hampers', 'Client Success', 315.00, offsetDate(-5), 'Approved', 'Q4 renewal milestone'],
      [empIds[5], 'Ergonomic Split Keyboard', 'Equipment', 189.99, offsetDate(-3), 'Pending', 'WFH workstation stipend'],
      [empIds[9], 'User Testing Participant Incentives', 'Research', 400.00, offsetDate(-12), 'Reimbursed', '8 x \$50 digital gift cards'],
      [empIds[4], 'Airport Priority Lounge Pass', 'Travel & Lodging', 79.00, offsetDate(-15), 'Rejected', 'Outside travel policy tier'],
    ].forEach((ex) => insertExpense.run(...ex));

    const insertAnn = db.prepare(`
      INSERT INTO announcements (title, content, category, author_id, pinned)
      VALUES (?, ?, ?, ?, ?)
    `);
    [
      [
        'Q4 Company All-Hands & Strategy Town Hall',
        'Join us this Thursday at 3:00 PM in the Summit Boardroom (and via livestream) for our Q4 operational review, product roadmap showcase, and team recognition awards.',
        'Company Event',
        empIds[0],
        1,
      ],
      [
        'Updated Hybrid Work & Desk Booking Guidelines',
        'Effective next Monday, all in-office days are Tuesday through Thursday. Please log your attendance mode in NexaDesk before 9:30 AM and release unused meeting rooms promptly.',
        'HR Policy',
        empIds[0],
        1,
      ],
      [
        'Scheduled Network Maintenance — Floor 4 & 5',
        'IT will upgrade core access switches this Saturday between 6:00 AM and 8:30 AM. VPN and local office Wi-Fi may experience brief 5-minute interruptions.',
        'IT & Facilities',
        empIds[6],
        0,
      ],
      [
        'Year-End Expense Reimbursement Cutoff',
        'Please submit all pending travel, client meal, and equipment receipts by the 20th of the month so Finance can process payouts in the current payroll cycle.',
        'Finance',
        empIds[2],
        0,
      ],
    ].forEach((an) => insertAnn.run(...an));

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
