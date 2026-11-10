import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckSquare, FolderKanban, Kanban, List, Plus, Trash2 } from 'lucide-react';
import type { Department, Employee, Project, TaskItem, TaskStatus } from '../types/oms';
import { api } from '../lib/api';
import { formatDate, todayISO } from '../lib/format';
import { Avatar, Modal, PageHeader, StagePath, StatusBadge } from '../components/UI';

const COLUMNS: { id: TaskStatus; label: string; dot: string }[] = [
  { id: 'todo', label: 'To Do', dot: 'bg-slate-400' },
  { id: 'in_progress', label: 'In Progress', dot: 'bg-[#0176D3]' },
  { id: 'review', label: 'In Review', dot: 'bg-amber-500' },
  { id: 'done', label: 'Done', dot: 'bg-emerald-500' },
];

export function TasksProjects({
  employees,
  departments,
  onNotify,
  onDashboardRefresh,
}: {
  employees: Employee[];
  departments: Department[];
  onNotify: (msg: string, isError?: boolean) => void;
  onDashboardRefresh: () => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projectFilter, setProjectFilter] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    project_id: '',
    assignee_id: '',
    priority: 'Medium' as TaskItem['priority'],
    status: 'todo' as TaskStatus,
    due_date: todayISO(),
  });

  const [projectForm, setProjectForm] = useState({
    name: '',
    department_id: '',
    lead_id: '',
    deadline: todayISO(),
    description: '',
  });

  async function loadAll() {
    try {
      const [pRows, tRows] = await Promise.all([
        api.getProjects(),
        api.getTasks({ project_id: projectFilter }),
      ]);
      setProjects(pRows);
      setTasks(tRows);
      setSelectedTask((prev) => (prev ? tRows.find((t) => t.id === prev.id) ?? null : null));
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  useEffect(() => {
    loadAll();
  }, [projectFilter]);

  async function handleMoveStatus(task: TaskItem, nextStatus: TaskStatus) {
    try {
      await api.updateTask(task.id, { status: nextStatus });
      await loadAll();
      onDashboardRefresh();
      onNotify(`Moved "${task.title}" to ${COLUMNS.find((c) => c.id === nextStatus)?.label}`);
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  async function handleDeleteTask(id: number) {
    try {
      await api.deleteTask(id);
      setSelectedTask(null);
      await loadAll();
      onDashboardRefresh();
      onNotify('Task deleted');
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createTask({
        ...taskForm,
        project_id: taskForm.project_id ? Number(taskForm.project_id) : null,
        assignee_id: taskForm.assignee_id ? Number(taskForm.assignee_id) : null,
      });
      setTaskModalOpen(false);
      setTaskForm({
        title: '',
        description: '',
        project_id: '',
        assignee_id: '',
        priority: 'Medium',
        status: 'todo',
        due_date: todayISO(),
      });
      await loadAll();
      onDashboardRefresh();
      onNotify('Task created');
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.createProject({
        ...projectForm,
        department_id: projectForm.department_id ? Number(projectForm.department_id) : null,
        lead_id: projectForm.lead_id ? Number(projectForm.lead_id) : null,
      });
      setProjectModalOpen(false);
      setProjectForm({ name: '', department_id: '', lead_id: '', deadline: todayISO(), description: '' });
      await loadAll();
      onNotify('Project created');
    } catch (err) {
      onNotify((err as Error).message, true);
    }
  }

  const openCount = tasks.filter((t) => t.status !== 'done').length;
  const reviewCount = tasks.filter((t) => t.status === 'review').length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="space-y-5">
      <PageHeader
        objectLabel="Work Management"
        icon={CheckSquare}
        title="Projects & Task Pipeline"
        subtitle="Track cross-functional initiatives using Salesforce Kanban & List views"
        highlights={[
          { label: 'Active Projects', value: projects.filter((p) => p.status === 'Active').length },
          { label: 'Open Tasks', value: openCount },
          { label: 'In Review', value: reviewCount },
          { label: 'Completed', value: doneCount },
        ]}
        actions={
          <>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  viewMode === 'kanban' ? 'bg-white text-[#0176D3] shadow-2xs' : 'text-slate-600'
                }`}
              >
                <Kanban className="h-3.5 w-3.5" />
                Kanban
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  viewMode === 'list' ? 'bg-white text-[#0176D3] shadow-2xs' : 'text-slate-600'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                List View
              </button>
            </div>
            <button
              type="button"
              onClick={() => setProjectModalOpen(true)}
              className="sf-btn-neutral"
            >
              <FolderKanban className="h-3.5 w-3.5" />
              New Project
            </button>
            <button
              type="button"
              onClick={() => setTaskModalOpen(true)}
              className="sf-btn-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              New Task
            </button>
          </>
        }
      />

      {/* Project Spotlight Strip */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {projects.map((p) => {
          const total = p.total_tasks || 0;
          const done = p.completed_tasks || 0;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const selected = projectFilter === String(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setProjectFilter(selected ? '' : String(p.id))}
              className={`rounded-xl border p-4 text-left transition ${
                selected
                  ? 'border-[#0176D3] bg-sky-50/50 ring-2 ring-[#0176D3]/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-900">{p.name}</h3>
                <StatusBadge status={p.status} />
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                {p.description || p.department_name}
              </p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[11px] text-slate-500">
                  <span>
                    {done}/{total} tasks done
                  </span>
                  <span className="tabular-nums font-bold text-slate-800">{pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#0176D3]" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                <span>Lead: {p.lead_name || 'Unassigned'}</span>
                <span>Due {formatDate(p.deadline)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {projectFilter && (
        <div className="flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-xs text-[#032D60]">
          <span>
            Showing tasks for project:{' '}
            <strong>{projects.find((p) => String(p.id) === projectFilter)?.name}</strong>
          </span>
          <button
            type="button"
            onClick={() => setProjectFilter('')}
            className="font-bold text-[#0176D3] hover:underline"
          >
            Clear Filter
          </button>
        </div>
      )}

      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col, colIndex) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            const nextCol = COLUMNS[colIndex + 1];
            return (
              <div
                key={col.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-slate-100/80 p-3"
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.dot}`} />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {col.label}
                    </h3>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-700 shadow-2xs">
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {colTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:border-[#0176D3]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <StatusBadge status={task.priority} />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(task.id);
                          }}
                          className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                          title="Delete task"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <h4 className="mt-2 text-xs font-bold text-[#0176D3] hover:underline">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                          {task.description}
                        </p>
                      )}
                      {task.project_name && (
                        <div className="mt-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {task.project_name}
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                        <div className="flex items-center gap-1.5">
                          {task.assignee_name ? (
                            <>
                              <Avatar name={task.assignee_name} color={task.avatar_color} size="sm" />
                              <span className="text-[11px] font-medium text-slate-700">
                                {task.assignee_name.split(' ')[0]}
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400">Unassigned</span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">{formatDate(task.due_date)}</span>
                      </div>
                      {nextCol && (
                        <div
                          className="mt-2 flex justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleMoveStatus(task, nextCol.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-[10px] font-bold text-[#0176D3] hover:bg-sky-100"
                          >
                            Move to {nextCol.label}
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400">
                      No tasks in {col.label}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="sf-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className="cursor-pointer hover:bg-sky-50/40"
                  >
                    <td className="px-4 py-3 font-bold text-[#0176D3]">{t.title}</td>
                    <td className="px-4 py-3 text-slate-600">{t.project_name || 'General'}</td>
                    <td className="px-4 py-3 text-slate-700">{t.assignee_name || 'Unassigned'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.priority} />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={t.status}
                        onChange={(e) => handleMoveStatus(t, e.target.value as TaskStatus)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        {COLUMNS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(t.due_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Salesforce-style Task Record Modal with Stage Path */}
      <Modal
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.title || 'Task Record'}
        subtitle={selectedTask?.project_name || 'General Office Task'}
        maxWidth="max-w-2xl"
      >
        {selectedTask && (
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Stage Path (Click a stage to update)
              </div>
              <StagePath
                stages={COLUMNS.map((c) => ({ id: c.id, label: c.label }))}
                currentStage={selectedTask.status}
                onSelectStage={(next) => handleMoveStatus(selectedTask, next as TaskStatus)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs sm:grid-cols-3">
              <div>
                <div className="text-slate-400">Assignee</div>
                <div className="mt-1 font-bold text-slate-900">
                  {selectedTask.assignee_name || 'Unassigned'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Priority</div>
                <div className="mt-1">
                  <StatusBadge status={selectedTask.priority} />
                </div>
              </div>
              <div>
                <div className="text-slate-400">Due Date</div>
                <div className="mt-1 font-bold text-slate-900">{formatDate(selectedTask.due_date)}</div>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-700">Description</div>
              <p className="mt-1 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600">
                {selectedTask.description || 'No description provided.'}
              </p>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => handleDeleteTask(selectedTask.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Task
              </button>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="sf-btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="Create Task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Task Title *</label>
            <input
              required
              value={taskForm.title}
              onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0176D3] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Description</label>
            <textarea
              rows={2}
              value={taskForm.description}
              onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0176D3] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Project</label>
              <select
                value={taskForm.project_id}
                onChange={(e) => setTaskForm({ ...taskForm, project_id: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">General Office Task</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Assignee</label>
              <select
                value={taskForm.assignee_id}
                onChange={(e) => setTaskForm({ ...taskForm, assignee_id: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Priority</label>
              <select
                value={taskForm.priority}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, priority: e.target.value as TaskItem['priority'] })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Urgent</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Due Date</label>
              <input
                type="date"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setTaskModalOpen(false)}
              className="sf-btn-neutral"
            >
              Cancel
            </button>
            <button type="submit" className="sf-btn-primary">
              Create Task
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={projectModalOpen} onClose={() => setProjectModalOpen(false)} title="Create Project">
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Project Name *</label>
            <input
              required
              value={projectForm.name}
              onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Department</label>
              <select
                value={projectForm.department_id}
                onChange={(e) => setProjectForm({ ...projectForm, department_id: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Cross-Functional</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Project Lead</label>
              <select
                value={projectForm.lead_id}
                onChange={(e) => setProjectForm({ ...projectForm, lead_id: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select Lead</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Target Deadline *</label>
            <input
              required
              type="date"
              value={projectForm.deadline}
              onChange={(e) => setProjectForm({ ...projectForm, deadline: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Description</label>
            <textarea
              rows={2}
              value={projectForm.description}
              onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setProjectModalOpen(false)}
              className="sf-btn-neutral"
            >
              Cancel
            </button>
            <button type="submit" className="sf-btn-primary">
              Create Project
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
