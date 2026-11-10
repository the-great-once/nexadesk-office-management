import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { DashboardData, Department, Employee, NavSection } from './types/oms';
import { api } from './lib/api';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { AttendanceLeave } from './pages/AttendanceLeave';
import { TasksProjects } from './pages/TasksProjects';
import { MeetingRooms } from './pages/MeetingRooms';
import { Assets } from './pages/Assets';
import { Expenses } from './pages/Expenses';
import { Announcements } from './pages/Announcements';

interface ToastState {
  message: string;
  isError?: boolean;
}

export function App() {
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [activeUser, setActiveUser] = useState<Employee | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const notify = useCallback((message: string, isError = false) => {
    setToast({ message, isError });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const refreshCoreData = useCallback(async () => {
    try {
      const [empRows, deptRows, dashData] = await Promise.all([
        api.getEmployees(),
        api.getDepartments(),
        api.getDashboard(),
      ]);
      setEmployees(empRows);
      setDepartments(deptRows);
      setDashboard(dashData);
      setActiveUser((prev) => {
        if (prev) {
          return empRows.find((e) => e.id === prev.id) ?? empRows[0] ?? null;
        }
        return empRows[0] ?? null;
      });
    } catch (err) {
      notify((err as Error).message, true);
    }
  }, [notify]);

  const refreshDashboard = useCallback(async () => {
    try {
      const dashData = await api.getDashboard();
      setDashboard(dashData);
    } catch {
      // ignore transient refresh failure
    }
  }, []);

  useEffect(() => {
    refreshCoreData();
  }, [refreshCoreData]);

  async function handleQuickLeaveDecision(id: number, status: 'Approved' | 'Rejected') {
    try {
      await api.updateLeaveStatus(id, status, activeUser?.name || 'Manager');
      await refreshDashboard();
      notify(`Leave request ${status.toLowerCase()}`);
    } catch (err) {
      notify((err as Error).message, true);
    }
  }

  return (
    <Layout
      activeNav={activeNav}
      onNavigate={setActiveNav}
      employees={employees}
      activeUser={activeUser}
      dashboard={dashboard}
      onSelectUser={setActiveUser}
      onRefreshDashboard={refreshDashboard}
      onNotify={notify}
    >
      {activeNav === 'dashboard' && (
        <Dashboard
          data={dashboard}
          activeUser={activeUser}
          onNavigate={setActiveNav}
          onRefresh={refreshCoreData}
          onQuickLeaveDecision={handleQuickLeaveDecision}
          onNotify={notify}
        />
      )}
      {activeNav === 'employees' && (
        <Employees
          employees={employees}
          departments={departments}
          onRefresh={refreshCoreData}
          onNotify={notify}
        />
      )}
      {activeNav === 'attendance' && (
        <AttendanceLeave
          employees={employees}
          activeUser={activeUser}
          onNotify={notify}
          onDashboardRefresh={refreshDashboard}
        />
      )}
      {activeNav === 'tasks' && (
        <TasksProjects
          employees={employees}
          departments={departments}
          onNotify={notify}
          onDashboardRefresh={refreshDashboard}
        />
      )}
      {activeNav === 'rooms' && (
        <MeetingRooms
          employees={employees}
          activeUser={activeUser}
          onNotify={notify}
          onDashboardRefresh={refreshDashboard}
        />
      )}
      {activeNav === 'assets' && (
        <Assets
          employees={employees}
          onNotify={notify}
          onDashboardRefresh={refreshDashboard}
        />
      )}
      {activeNav === 'expenses' && (
        <Expenses
          employees={employees}
          activeUser={activeUser}
          onNotify={notify}
          onDashboardRefresh={refreshDashboard}
        />
      )}
      {activeNav === 'announcements' && (
        <Announcements
          activeUser={activeUser}
          onNotify={notify}
          onDashboardRefresh={refreshDashboard}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
          {toast.isError ? (
            <AlertCircle className="h-4 w-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </Layout>
  );
}

export default App;
