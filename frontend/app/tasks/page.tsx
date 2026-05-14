"use client";

import { useEffect, useState } from "react";

import AppShell from "@/components/layout/AppShell";
import {
  deleteTask as deleteTaskApi,
  getTaskReminders,
  getTasks,
  updateTask,
} from "@/lib/api";
import {
  TaskItem,
  TaskPriorityFilter,
  TaskRemindersResponse,
  TasksResponse,
} from "@/lib/types";

const taskPriorityOptions: { label: string; value: TaskPriorityFilter }[] = [
  { label: "All Priorities", value: "all" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

export default function TasksPage() {
  const [tasksData, setTasksData] = useState<TasksResponse | null>(null);
  const [taskReminders, setTaskReminders] =
    useState<TaskRemindersResponse | null>(null);

  const [selectedTaskPriority, setSelectedTaskPriority] =
    useState<TaskPriorityFilter>("all");

  const [tasksLoading, setTasksLoading] = useState(false);
  const [remindersLoading, setRemindersLoading] = useState(false);

  async function fetchTasks(priority: TaskPriorityFilter = selectedTaskPriority) {
    setTasksLoading(true);

    try {
      const data = await getTasks(priority);
      setTasksData(data);
    } catch (error) {
      console.error(error);
      alert("Failed to fetch tasks.");
    } finally {
      setTasksLoading(false);
    }
  }

  async function fetchTaskReminders() {
    setRemindersLoading(true);

    try {
      const data = await getTaskReminders();
      setTaskReminders(data);
    } catch (error) {
      console.error(error);
      alert("Failed to fetch task reminders.");
    } finally {
      setRemindersLoading(false);
    }
  }

  async function handleTaskPriorityChange(priority: TaskPriorityFilter) {
    setSelectedTaskPriority(priority);
    await fetchTasks(priority);
  }

  async function markTaskCompleted(taskId: string) {
    try {
      await updateTask(taskId, {
        status: "completed",
      });

      await fetchTasks(selectedTaskPriority);
      await fetchTaskReminders();
    } catch (error) {
      console.error(error);
      alert("Failed to complete task. Please try again.");
    }
  }

  async function deleteTask(taskId: string) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmDelete) return;

    try {
      await deleteTaskApi(taskId);
      await fetchTasks(selectedTaskPriority);
      await fetchTaskReminders();
    } catch (error) {
      console.error(error);
      alert("Failed to delete task. Please try again.");
    }
  }

  useEffect(() => {
    fetchTasks("all");
    fetchTaskReminders();
  }, []);

  const overdueFollowUpTasks = taskReminders
    ? Array.from(
        new Map(
          [...taskReminders.overdue, ...taskReminders.follow_up].map((task) => [
            task.id,
            task,
          ])
        ).values()
      )
    : [];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-blue-400">Tasks</p>
          <h1 className="text-3xl font-bold">Tasks & Reminders</h1>
          <p className="mt-2 text-slate-400">
            Track todos, reminders, due dates, overdue tasks, and follow-ups.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Reminder Center</h2>
              <p className="mt-2 text-slate-400">
                Tasks that are due today, upcoming, overdue, or need follow-up.
              </p>
            </div>

            <button
              onClick={() => {
                fetchTasks(selectedTaskPriority);
                fetchTaskReminders();
              }}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>

          <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-800 p-4">
            {remindersLoading ? (
              <p className="text-sm text-slate-400">Loading reminders...</p>
            ) : taskReminders ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-blue-500/30 bg-slate-900 p-4">
                  <p className="text-sm text-slate-400">Due Today</p>
                  <p className="mt-1 text-2xl font-bold">
                    {taskReminders.due_today_count}
                  </p>
                </div>

                <div className="rounded-xl border border-purple-500/30 bg-slate-900 p-4">
                  <p className="text-sm text-slate-400">Upcoming</p>
                  <p className="mt-1 text-2xl font-bold">
                    {taskReminders.upcoming_count}
                  </p>
                </div>

                <div className="rounded-xl border border-red-500/30 bg-slate-900 p-4">
                  <p className="text-sm text-slate-400">Overdue</p>
                  <p className="mt-1 text-2xl font-bold">
                    {taskReminders.overdue_count}
                  </p>
                </div>

                <div className="rounded-xl border border-yellow-500/30 bg-slate-900 p-4">
                  <p className="text-sm text-slate-400">Follow-up</p>
                  <p className="mt-1 text-2xl font-bold">
                    {taskReminders.follow_up_count}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                No reminder data available yet.
              </p>
            )}
          </div>

          {taskReminders && (
            <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <h4 className="mb-3 font-semibold">Due Today</h4>

                {taskReminders.due_today.length > 0 ? (
                  <div className="space-y-2">
                    {taskReminders.due_today.slice(0, 5).map((task) => (
                      <div key={task.id} className="rounded-lg bg-slate-900 p-3">
                        <p className="font-medium">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Due:{" "}
                          {task.due_date
                            ? new Date(task.due_date).toLocaleString()
                            : "N/A"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No tasks due today.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <h4 className="mb-3 font-semibold">Overdue / Follow-up</h4>

                {overdueFollowUpTasks.length > 0 ? (
                  <div className="space-y-2">
                    {overdueFollowUpTasks.slice(0, 5).map((task) => (
                      <div
                        key={`overdue-followup-${task.id}`}
                        className="rounded-lg bg-slate-900 p-3"
                      >
                        <p className="font-medium">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Due:{" "}
                          {task.due_date
                            ? new Date(task.due_date).toLocaleString()
                            : "N/A"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    No overdue follow-ups.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="mb-2 block text-sm text-slate-400">
              Filter by Priority
            </label>

            <select
              value={selectedTaskPriority}
              onChange={(event) =>
                handleTaskPriorityChange(
                  event.target.value as TaskPriorityFilter
                )
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            >
              {taskPriorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Total Tasks</p>
              <p className="mt-1 text-xl font-bold">{tasksData?.count ?? 0}</p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Pending</p>
              <p className="mt-1 text-xl font-bold">
                {tasksData?.pending_count ?? 0}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Completed</p>
              <p className="mt-1 text-xl font-bold">
                {tasksData?.completed_count ?? 0}
              </p>
            </div>
          </div>

          {tasksLoading ? (
            <p className="text-slate-400">Loading tasks...</p>
          ) : tasksData && tasksData.tasks.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {tasksData.tasks.slice(0, 20).map((task: TaskItem) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{task.title}</p>

                        <span className="rounded-full border border-slate-600 px-2 py-1 text-xs capitalize text-slate-300">
                          {task.priority}
                        </span>

                        <span
                          className={`rounded-full px-2 py-1 text-xs capitalize ${
                            task.status === "completed"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-yellow-500/20 text-yellow-300"
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-400">
                        {task.description}
                      </p>

                      {task.due_date && (
                        <p className="mt-2 text-xs text-slate-500">
                          Due: {new Date(task.due_date).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {task.status !== "completed" && (
                        <button
                          onClick={() => markTaskCompleted(task.id)}
                          className="rounded-lg border border-emerald-500/40 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10"
                        >
                          Complete
                        </button>
                      )}

                      <button
                        onClick={() => deleteTask(task.id)}
                        className="rounded-lg border border-red-500/40 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">
              No tasks for this filter. Use the Chat page to create a reminder.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}