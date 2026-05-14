"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import AppShell from "@/components/layout/AppShell";
import { getExpenses, getMyProfile, getTaskReminders, getTasks } from "@/lib/api";
import {
  ExpensesResponse,
  Profile,
  TaskRemindersResponse,
  TasksResponse,
} from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [expensesData, setExpensesData] = useState<ExpensesResponse | null>(
    null
  );
  const [tasksData, setTasksData] = useState<TasksResponse | null>(null);
  const [taskReminders, setTaskReminders] =
    useState<TaskRemindersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  async function loadDashboardData() {
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const [expenses, tasks, reminders, profileResponse] = await Promise.all([
        getExpenses({ period: "this_month", category: "all" }),
        getTasks("all"),
        getTaskReminders(),
        getMyProfile(),
      ]);

      setExpensesData(expenses);
      setTasksData(tasks);
      setTaskReminders(reminders);
      setProfile(profileResponse.profile);
    } catch (error) {
      console.error(error);
      alert("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="flex items-center gap-4">
            {profile?.profile_photo_url ? (
              <img
                src={profile.profile_photo_url}
                alt="Profile"
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-xl font-bold">
                {`${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}`.toUpperCase() ||
                  "U"}
              </div>
            )}

            <div>
              <h1 className="text-3xl font-bold">
                Welcome back, {profile?.first_name || "there"} 👋
              </h1>
              <p className="mt-2 text-slate-400">
                Your personal overview for money, reminders, journals, and saved places.
              </p>
            </div>
          </div>

          <button
            onClick={loadDashboardData}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-slate-400">Loading dashboard...</p>
        ) : (
          <div className="space-y-6">
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
                <p className="text-sm text-slate-400">Money In This Month</p>
                <p className="mt-2 text-2xl font-bold">
                  ${expensesData?.total_credit?.toFixed(2) ?? "0.00"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
                <p className="text-sm text-slate-400">Money Out This Month</p>
                <p className="mt-2 text-2xl font-bold">
                  ${expensesData?.total_debit?.toFixed(2) ?? "0.00"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
                <p className="text-sm text-slate-400">Net Balance This Month</p>
                <p className="mt-2 text-2xl font-bold">
                  ${expensesData?.net_balance?.toFixed(2) ?? "0.00"}
                </p>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
                <p className="text-sm text-slate-400">Total Tasks</p>
                <p className="mt-2 text-2xl font-bold">
                  {tasksData?.count ?? 0}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
                <p className="text-sm text-slate-400">Pending</p>
                <p className="mt-2 text-2xl font-bold">
                  {tasksData?.pending_count ?? 0}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
                <p className="text-sm text-slate-400">Completed</p>
                <p className="mt-2 text-2xl font-bold">
                  {tasksData?.completed_count ?? 0}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
                <p className="text-sm text-slate-400">Due Today</p>
                <p className="mt-2 text-2xl font-bold">
                  {taskReminders?.due_today_count ?? 0}
                </p>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
                <div className="mb-4">
                  <p className="text-sm font-medium text-blue-400">
                    Recent Transactions
                  </p>
                  <h2 className="text-xl font-bold">This Month</h2>
                </div>

                {expensesData && expensesData.expenses.length > 0 ? (
                  <div className="space-y-3">
                    {expensesData.expenses.slice(0, 5).map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-start justify-between rounded-xl border border-slate-700 bg-slate-800 p-4"
                      >
                        <div>
                          <p className="font-semibold capitalize">
                            {expense.category}
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            {expense.description}
                          </p>
                        </div>

                        <p
                          className={`font-bold ${
                            expense.transaction_type === "credit"
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {expense.transaction_type === "credit" ? "+" : "-"}$
                          {Number(expense.amount).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">
                    No transactions this month yet.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
                <div className="mb-4">
                  <p className="text-sm font-medium text-blue-400">
                    Reminder Center
                  </p>
                  <h2 className="text-xl font-bold">Needs Attention</h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <p className="text-sm text-slate-400">Upcoming</p>
                    <p className="mt-1 text-xl font-bold">
                      {taskReminders?.upcoming_count ?? 0}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <p className="text-sm text-slate-400">Overdue</p>
                    <p className="mt-1 text-xl font-bold">
                      {taskReminders?.overdue_count ?? 0}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <p className="text-sm text-slate-400">Follow-up</p>
                    <p className="mt-1 text-xl font-bold">
                      {taskReminders?.follow_up_count ?? 0}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <p className="text-sm text-slate-400">Due Today</p>
                    <p className="mt-1 text-xl font-bold">
                      {taskReminders?.due_today_count ?? 0}
                    </p>
                  </div>
                </div>

                {taskReminders && taskReminders.due_today.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-slate-300">
                      Due today
                    </p>

                    {taskReminders.due_today.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="rounded-xl border border-slate-700 bg-slate-800 p-4"
                      >
                        <p className="font-semibold">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {task.due_date
                            ? new Date(task.due_date).toLocaleString()
                            : "No due date"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="mb-4">
                <p className="text-sm font-medium text-blue-400">
                  Quick Actions
                </p>
                <h2 className="text-xl font-bold">What would you like to do?</h2>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <a
                  href="/chat"
                  className="rounded-xl border border-slate-700 bg-slate-800 p-4 hover:bg-slate-700"
                >
                  <p className="font-semibold">Open AI Chat</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Log expenses, create tasks, journal, or save places.
                  </p>
                </a>

                <a
                  href="/expenses"
                  className="rounded-xl border border-slate-700 bg-slate-800 p-4 hover:bg-slate-700"
                >
                  <p className="font-semibold">View Expenses</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Review money in, money out, and category filters.
                  </p>
                </a>

                <a
                  href="/tasks"
                  className="rounded-xl border border-slate-700 bg-slate-800 p-4 hover:bg-slate-700"
                >
                  <p className="font-semibold">View Tasks</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Manage reminders, due dates, and follow-ups.
                  </p>
                </a>
              </div>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}