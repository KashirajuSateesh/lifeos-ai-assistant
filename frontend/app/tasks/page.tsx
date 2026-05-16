"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import Notice, { NoticeType } from "@/components/ui/Notice";
import {
  deleteTask,
  getTaskReminders,
  getTasks,
  updateTask,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
  TaskItem,
  TaskPriorityFilter,
  TaskRemindersResponse,
  TasksResponse,
} from "@/lib/types";

export default function TasksPage() {
  const router = useRouter();

  const [tasksData, setTasksData] = useState<TasksResponse | null>(null);
  const [remindersData, setRemindersData] =
    useState<TaskRemindersResponse | null>(null);

  const [notice, setNotice] = useState<{
    type: NoticeType;
    message: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [priorityFilter, setPriorityFilter] =
    useState<TaskPriorityFilter>("all");

  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);

  async function fetchTasks(priority: TaskPriorityFilter = priorityFilter) {
    setNotice(null);
    setLoading(true);

    try {
      const data = await getTasks(priority);
      setTasksData(data);
      setPriorityFilter(priority);
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message: "Failed to fetch tasks.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchTaskReminders() {
    setNotice(null);

    try {
      const data = await getTaskReminders();
      setRemindersData(data);
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message: "Failed to fetch task reminders.",
      });
    }
  }

  async function completeTask(taskId: string) {
    setNotice(null);

    try {
      await updateTask(taskId, {
        status: "completed",
      });

      setNotice({
        type: "success",
        message: "Task marked as completed.",
      });

      await fetchTasks(priorityFilter);
      await fetchTaskReminders();
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message: "Failed to complete task. Please try again.",
      });
    }
  }

  function requestDeleteTask(task: TaskItem) {
    setNotice(null);
    setTaskToDelete(task);
  }

  function cancelDeleteTask() {
    if (deletingTask) return;
    setTaskToDelete(null);
  }

  async function confirmDeleteTask() {
    if (!taskToDelete) return;

    setNotice(null);
    setDeletingTask(true);

    try {
      await deleteTask(taskToDelete.id);

      setNotice({
        type: "success",
        message: "Task deleted successfully.",
      });

      setTaskToDelete(null);

      await fetchTasks(priorityFilter);
      await fetchTaskReminders();
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message: "Failed to delete task. Please try again.",
      });
    } finally {
      setDeletingTask(false);
    }
  }

  useEffect(() => {
    async function loadPage() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      await fetchTasks("all");
      await fetchTaskReminders();
    }

    loadPage();
  }, []);

  const tasks = tasksData?.tasks ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Tasks & Reminders</h1>
          <p className="mt-2 text-slate-400">
            Manage todos, due dates, overdue items, and follow-ups.
          </p>
        </div>

        {notice && <Notice type={notice.type} message={notice.message} />}

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <SummaryCard
            title="Pending"
            value={String(tasksData?.pending_count ?? 0)}
            description="Tasks still open"
          />

          <SummaryCard
            title="Completed"
            value={String(tasksData?.completed_count ?? 0)}
            description="Tasks finished"
          />

          <SummaryCard
            title="Due Today"
            value={String(remindersData?.due_today_count ?? 0)}
            description="Needs attention today"
          />

          <SummaryCard
            title="Overdue"
            value={String(remindersData?.overdue_count ?? 0)}
            description="Past due tasks"
          />
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold">Reminders</h2>
              <p className="mt-1 text-sm text-slate-400">
                Quick view of due today, upcoming, overdue, and follow-up tasks.
              </p>
            </div>

            <button
              onClick={fetchTaskReminders}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              Refresh Reminders
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <ReminderColumn
              title="Due Today"
              tasks={remindersData?.due_today ?? []}
              emptyText="No tasks due today."
            />

            <ReminderColumn
              title="Upcoming"
              tasks={remindersData?.upcoming ?? []}
              emptyText="No upcoming tasks."
            />

            <ReminderColumn
              title="Overdue"
              tasks={remindersData?.overdue ?? []}
              emptyText="No overdue tasks."
            />

            <ReminderColumn
              title="Follow-Up"
              tasks={remindersData?.follow_up ?? []}
              emptyText="No follow-up tasks."
            />
          </div>
        </section>

        <section className="flex max-h-[75vh] min-h-[500px] flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold">All Tasks</h2>
              <p className="mt-1 text-sm text-slate-400">
                {tasksData?.count ?? 0} tasks found.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={priorityFilter}
                onChange={(event) =>
                  fetchTasks(event.target.value as TaskPriorityFilter)
                }
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>

              <button
                onClick={() => fetchTasks(priorityFilter)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="lifeos-scrollbar min-h-0 flex-1 overflow-y-auto pr-2">
            {loading ? (
              <p className="text-slate-400">Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <p className="text-slate-400">No tasks found.</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={completeTask}
                    onDelete={requestDeleteTask}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl">
            <p className="text-sm font-medium text-red-300">Delete Task</p>

            <h2 className="mt-2 text-2xl font-bold">Are you sure?</h2>

            <p className="mt-3 text-sm text-slate-400">
              This will permanently delete this task. This action cannot be
              undone.
            </p>

            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800 p-4">
              <p className="font-semibold">{taskToDelete.title}</p>

              {taskToDelete.description && (
                <p className="mt-1 text-sm text-slate-400">
                  {taskToDelete.description}
                </p>
              )}

              <p className="mt-2 text-xs capitalize text-slate-500">
                {taskToDelete.priority} priority · {taskToDelete.status}
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={cancelDeleteTask}
                disabled={deletingTask}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                onClick={confirmDeleteTask}
                disabled={deletingTask}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {deletingTask ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function ReminderColumn({
  title,
  tasks,
  emptyText,
}: {
  title: string;
  tasks: TaskItem[];
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <h3 className="font-semibold">{title}</h3>

      {tasks.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">{emptyText}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {tasks.slice(0, 4).map((task) => (
            <div
              key={task.id}
              className="rounded-lg border border-slate-700 bg-slate-900 p-3"
            >
              <p className="text-sm font-medium">{task.title}</p>

              {task.due_date && (
                <p className="mt-1 text-xs text-slate-400">
                  Due: {new Date(task.due_date).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({
  task,
  onComplete,
  onDelete,
}: {
  task: TaskItem;
  onComplete: (taskId: string) => void;
  onDelete: (task: TaskItem) => void;
}) {
  const isCompleted = task.status === "completed";

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`text-lg font-semibold ${
                isCompleted ? "text-slate-500 line-through" : "text-white"
              }`}
            >
              {task.title}
            </p>

            <span
              className={`rounded-full px-3 py-1 text-xs capitalize ${
                task.priority === "high"
                  ? "bg-red-500/10 text-red-300"
                  : task.priority === "medium"
                  ? "bg-yellow-500/10 text-yellow-300"
                  : "bg-emerald-500/10 text-emerald-300"
              }`}
            >
              {task.priority}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs capitalize ${
                isCompleted
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-blue-500/10 text-blue-300"
              }`}
            >
              {task.status}
            </span>
          </div>

          {task.description && (
            <p className="mt-2 text-sm text-slate-400">{task.description}</p>
          )}

          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
            {task.due_date ? (
              <span>Due: {new Date(task.due_date).toLocaleString()}</span>
            ) : (
              <span>No due date detected</span>
            )}

            {task.reminder_at && (
              <span>
                Reminder: {new Date(task.reminder_at).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isCompleted && (
            <button
              onClick={() => onComplete(task.id)}
              className="rounded-lg border border-emerald-500/40 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/10"
            >
              Complete
            </button>
          )}

          <button
            onClick={() => onDelete(task)}
            className="rounded-lg border border-red-500/40 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}