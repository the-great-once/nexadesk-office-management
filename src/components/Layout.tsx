import React, { useEffect, useState } from 'react';
import {
  Bell,
  Building2,
  CalendarClock,
  CheckSquare,
  ChevronDown,
  Clock,
  Cloud,
  DoorOpen,
  Laptop,
  LayoutDashboard,
  LayoutGrid,
  LogIn,
  LogOut,
  Megaphone,
  Menu,
  MessageSquarePlus,
  Plus,
  Receipt,
  Search,
  Send,
  Users,
  X,
} from 'lucide-react';
import type { DashboardData, Employee, NavSection, SearchResults } from '../types/oms';
import { api } from '../lib/api';
import { Avatar } from './UI';

type AppSuiteId = 'console' | 'people' | 'operations';

const APP_SUITES: {
  id: AppSuiteId;
  name: string;
  description: string;
  color: string;
  tabs: NavSection[];
}[] = [
  {
    id: 'console',
    name: 'Office Console',
    description: 'Complete enterprise workspace across all objects & analytics',
    color: 'bg-[#0176D3]',
    tabs: ['dashboard', 'employees', 'attendance', 'tasks', 'rooms', 'assets', 'expenses', 'announcements'],
  },
  {
    id: 'people',
    name: 'People & HR Cloud',
    description: 'Employee directory, attendance tracking, leave & notices',
    color: 'bg-emerald-600',
    tabs: ['dashboard', 'employees', 'attendance', 'announcements'],
  },
  {
    id: 'operations',
    name: 'Operations & Finance',
    description: 'Projects, tasks, room bookings, assets & expense claims',
    color: 'bg-violet-600',
    tabs: ['dashboard', 'tasks', 'rooms', 'assets', 'expenses'],
  },
];

const NAV_ITEMS: {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Analytics Home', icon: LayoutDashboard },
  { id: 'employees', label: 'People & Depts', icon: Users },
  { id: 'attendance', label: 'Time & Leave', icon: CalendarClock },
  { id: 'tasks', label: 'Projects & Tasks', icon: CheckSquare },
  { id: 'rooms', label: 'Rooms', icon: DoorOpen },
  { id: 'assets', label: 'Assets', icon: Laptop },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'announcements', label: 'Chatter & Notices', icon: Megaphone },
];

export function Layout({
  activeNav,
  onNavigate,
  employees,
  activeUser,
  dashboard,
  onSelectUser,
  onRefreshDashboard,
  onNotify,
  children,
}: {
  activeNav: NavSection;
  onNavigate: (section: NavSection) => void;
  employees: Employee[];
  activeUser: Employee | null;
  dashboard: DashboardData | null;
  onSelectUser: (emp: Employee) => void;
  onRefreshDashboard: () => void;
  onNotify: (msg: string, isError?: boolean) => void;
  children: React.ReactNode;
}) {
  const [appSuite, setAppSuite] = useState<AppSuiteId>('console');
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [utilityPanel, setUtilityPanel] = useState<'clock' | 'chatter' | null>(null);
  const [chatterText, setChatterText] = useState('');
  const [workMode, setWorkMode] = useState('In-Office');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);

  const currentSuite = APP_SUITES.find((s) => s.id === appSuite) ?? APP_SUITES[0];
  const visibleTabs = NAV_ITEMS.filter((item) => currentSuite.tabs.includes(item.id));

  const pendingAlertsCount =
    (dashboard?.kpis.pendingLeaves ?? 0) + (dashboard?.kpis.pendingExpenseCount ?? 0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => {
      api.search(trimmed).then(setResults).catch(() => setResults(null));
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const hasResults =
    results &&
    (results.employees.length > 0 ||
      results.tasks.length > 0 ||
      results.assets.length > 0 ||
      results.announcements.length > 0);

  async function handleQuickClock(action: 'check_in' | 'check_out') {
    if (!activeUser) return;
    try {
      await api.clockAttendance({ employee_id: activeUser.id, action, work_mode: workMode });
      onRefreshDashboard();
      onNotify(action === 'check_in' ? `Clocked in (${workMode})` : 'Clocked out for today');
      setUtilityPanel(null);
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  async function handleQuickChatter(e: React.FormEvent) {
    e.preventDefault();
    if (!chatterText.trim()) return;
    try {
      await api.postActivity({
        actor_id: activeUser?.id ?? null,
        actor_name: activeUser?.name ?? 'Team Member',
        action_type: 'Chatter',
        entity_type: 'Office',
        summary: chatterText.trim(),
      });
      setChatterText('');
      setUtilityPanel(null);
      onRefreshDashboard();
      onNotify('Posted update to Office Chatter feed');
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f5f8] pb-12">
      {/* Salesforce Global Utility Header */}
      <header className="sticky top-0 z-30 bg-white">
        <div className="flex h-14 items-center justify-between gap-3 border-b border-slate-200 px-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2 text-left"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0176D3] to-[#032D60] text-white shadow-sm">
                <Cloud className="h-4 w-4" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-extrabold tracking-tight text-[#032D60]">
                  NEXADESK <span className="font-semibold text-[#0176D3]">CLOUD</span>
                </div>
              </div>
            </button>
          </div>

          {/* Global Salesforce Search */}
          <div className="relative flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search NexaDesk records, people, tasks, assets..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50/70 py-1.5 pl-9 pr-8 text-xs text-slate-900 placeholder-slate-400 transition focus:border-[#0176D3] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0176D3]/20"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults(null);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {results && (
              <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
                {!hasResults ? (
                  <div className="py-5 text-center text-xs text-slate-500">
                    No records matched "{query}"
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    {results.employees.length > 0 && (
                      <div>
                        <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          People
                        </div>
                        {results.employees.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => {
                              onNavigate('employees');
                              setQuery('');
                              setResults(null);
                            }}
                            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-sky-50"
                          >
                            <span className="font-semibold text-[#0176D3]">{e.name}</span>
                            <span className="text-slate-500">{e.role}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {results.tasks.length > 0 && (
                      <div>
                        <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Tasks
                        </div>
                        {results.tasks.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              onNavigate('tasks');
                              setQuery('');
                              setResults(null);
                            }}
                            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-sky-50"
                          >
                            <span className="font-semibold text-[#0176D3]">{t.title}</span>
                            <span className="text-slate-500">{t.priority}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {results.assets.length > 0 && (
                      <div>
                        <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Assets
                        </div>
                        {results.assets.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => {
                              onNavigate('assets');
                              setQuery('');
                              setResults(null);
                            }}
                            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-sky-50"
                          >
                            <span className="font-semibold text-[#0176D3]">{a.name}</span>
                            <span className="text-slate-500">{a.asset_tag}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {results.announcements.length > 0 && (
                      <div>
                        <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Announcements
                        </div>
                        {results.announcements.map((an) => (
                          <button
                            key={an.id}
                            type="button"
                            onClick={() => {
                              onNavigate('announcements');
                              setQuery('');
                              setResults(null);
                            }}
                            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-sky-50"
                          >
                            <span className="font-semibold text-[#0176D3]">{an.title}</span>
                            <span className="text-slate-500">{an.category}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Global Utility Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setQuickAddOpen((v) => !v);
                  setNotifOpen(false);
                  setUserMenuOpen(false);
                }}
                title="Global Actions"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-[#0176D3]"
              >
                <Plus className="h-4 w-4" />
              </button>
              {quickAddOpen && (
                <div className="absolute right-0 top-full z-40 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Quick Navigate
                  </div>
                  {[
                    { label: 'New Task / Project', nav: 'tasks' as NavSection },
                    { label: 'Add Employee', nav: 'employees' as NavSection },
                    { label: 'Book Meeting Room', nav: 'rooms' as NavSection },
                    { label: 'Submit Expense', nav: 'expenses' as NavSection },
                    { label: 'Request Time Off', nav: 'attendance' as NavSection },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        onNavigate(item.nav);
                        setQuickAddOpen(false);
                      }}
                      className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-sky-50 hover:text-[#0176D3]"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setQuickAddOpen(false);
                  setUserMenuOpen(false);
                }}
                title="Notifications"
                className="relative flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-[#0176D3]"
              >
                <Bell className="h-4 w-4" />
                {pendingAlertsCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                    {pendingAlertsCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="mb-2 text-xs font-bold text-slate-900">Action Required</div>
                  <div className="space-y-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('attendance');
                        setNotifOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-left text-amber-900 hover:bg-amber-100"
                    >
                      <span>Pending Leave Requests</span>
                      <span className="font-bold">{dashboard?.kpis.pendingLeaves ?? 0}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('expenses');
                        setNotifOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg bg-sky-50 px-3 py-2 text-left text-sky-900 hover:bg-sky-100"
                    >
                      <span>Pending Expense Claims</span>
                      <span className="font-bold">{dashboard?.kpis.pendingExpenseCount ?? 0}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate('tasks');
                        setNotifOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg bg-rose-50 px-3 py-2 text-left text-rose-900 hover:bg-rose-100"
                    >
                      <span>Urgent Open Tasks</span>
                      <span className="font-bold">{dashboard?.kpis.urgentTasks ?? 0}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {activeUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen((v) => !v);
                    setNotifOpen(false);
                    setQuickAddOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1 text-left transition hover:bg-slate-100"
                >
                  <Avatar name={activeUser.name} color={activeUser.avatar_color} size="sm" />
                  <div className="hidden md:block">
                    <div className="text-[11px] font-bold leading-tight text-slate-900">
                      {activeUser.name}
                    </div>
                    <div className="text-[10px] leading-tight text-slate-500">
                      {activeUser.access_level}
                    </div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Switch Active User Context
                    </div>
                    <div className="max-h-64 space-y-1 overflow-y-auto">
                      {employees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            onSelectUser(emp);
                            setUserMenuOpen(false);
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                            emp.id === activeUser.id
                              ? 'bg-sky-50 text-[#0176D3]'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Avatar name={emp.name} color={emp.avatar_color} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold">{emp.name}</div>
                            <div className="truncate text-[10px] text-slate-500">
                              {emp.access_level} · {emp.role}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Salesforce Lightning Navigation Bar (9-dot App Launcher + Horizontal Object Tabs) */}
        <div className="hidden border-b-2 border-[#0176D3] bg-white px-4 lg:flex lg:items-center lg:gap-4">
          <div className="relative flex items-center gap-3 py-2 pr-3">
            <button
              type="button"
              onClick={() => setLauncherOpen((v) => !v)}
              title="App Launcher"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-sky-50 hover:text-[#0176D3]"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <span className="text-sm font-bold tracking-tight text-slate-900">{currentSuite.name}</span>

            {launcherOpen && (
              <div className="absolute left-0 top-full z-40 mt-1 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    App Launcher
                  </span>
                  <button
                    type="button"
                    onClick={() => setLauncherOpen(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {APP_SUITES.map((suite) => (
                    <button
                      key={suite.id}
                      type="button"
                      onClick={() => {
                        setAppSuite(suite.id);
                        if (!suite.tabs.includes(activeNav)) {
                          onNavigate(suite.tabs[0]);
                        }
                        setLauncherOpen(false);
                      }}
                      className={`flex w-full items-start gap-3 rounded-xl border p-2.5 text-left transition ${
                        appSuite === suite.id
                          ? 'border-[#0176D3] bg-sky-50/70'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${suite.color} text-white`}
                      >
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{suite.name}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">{suite.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {visibleTabs.map((item) => {
              const Icon = item.icon;
              const active = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-sky-50/80 text-[#0176D3]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                  {active && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#0176D3]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
              <span>{currentSuite.name}</span>
              <button
                type="button"
                onClick={() =>
                  setAppSuite((prev) =>
                    prev === 'console' ? 'people' : prev === 'people' ? 'operations' : 'console'
                  )
                }
                className="text-[#0176D3]"
              >
                Switch App
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {visibleTabs.map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
                      active ? 'bg-[#0176D3] text-white' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6">{children}</main>

      {/* Salesforce Lightning Bottom Utility Bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 backdrop-blur">
        <div className="mx-auto flex h-10 max-w-[1440px] items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setUtilityPanel((p) => (p === 'clock' ? null : 'clock'))}
              className={`inline-flex items-center gap-1.5 rounded-t-md px-3 py-1.5 font-semibold transition ${
                utilityPanel === 'clock'
                  ? 'bg-[#0176D3] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Time Clock
            </button>
            <button
              type="button"
              onClick={() => setUtilityPanel((p) => (p === 'chatter' ? null : 'chatter'))}
              className={`inline-flex items-center gap-1.5 rounded-t-md px-3 py-1.5 font-semibold transition ${
                utilityPanel === 'chatter'
                  ? 'bg-[#0176D3] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Quick Chatter
            </button>
            <button
              type="button"
              onClick={() => onNavigate('rooms')}
              className="hidden items-center gap-1.5 rounded-t-md px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 sm:inline-flex"
            >
              <DoorOpen className="h-3.5 w-3.5 text-[#0176D3]" />
              {dashboard?.kpis.bookingsToday ?? 0} Meetings Today
            </button>
          </div>
          <div className="hidden items-center gap-2 text-[11px] text-slate-500 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            NexaDesk Lightning · SQLite Synced
          </div>
        </div>

        {utilityPanel === 'clock' && activeUser && (
          <div className="absolute bottom-11 left-4 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Quick Time Clock · {activeUser.name}</span>
              <button
                type="button"
                onClick={() => setUtilityPanel(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <select
              value={workMode}
              onChange={(e) => setWorkMode(e.target.value)}
              className="mb-3 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
            >
              <option>In-Office</option>
              <option>Hybrid</option>
              <option>Remote</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickClock('check_in')}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <LogIn className="h-3.5 w-3.5" />
                Clock In
              </button>
              <button
                type="button"
                onClick={() => handleQuickClock('check_out')}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                Clock Out
              </button>
            </div>
          </div>
        )}

        {utilityPanel === 'chatter' && (
          <div className="absolute bottom-11 left-28 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Post to Office Chatter</span>
              <button
                type="button"
                onClick={() => setUtilityPanel(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleQuickChatter} className="space-y-2">
              <textarea
                rows={3}
                value={chatterText}
                onChange={(e) => setChatterText(e.target.value)}
                placeholder="Share a quick status update or team note..."
                className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:border-[#0176D3] focus:outline-none"
              />
              <button
                type="submit"
                className="sf-btn-primary w-full justify-center"
              >
                <Send className="h-3.5 w-3.5" />
                Share Update
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
