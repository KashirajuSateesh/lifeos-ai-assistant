"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import Notice, { NoticeType } from "@/components/ui/Notice";
import {
  getExpenses,
  getMyProfile,
  getTaskReminders,
  getTasks,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
  ExpenseItem,
  ExpensesResponse,
  Profile,
  TaskItem,
  TaskRemindersResponse,
  TasksResponse,
} from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();

  const [notice, setNotice] = useState<{
    type: NoticeType;
    message: string;
  } | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");

  const [expensesData, setExpensesData] = useState<ExpensesResponse | null>(
    null
  );
  const [tasksData, setTasksData] = useState<TasksResponse | null>(null);
  const [taskReminders, setTaskReminders] =
    useState<TaskRemindersResponse | null>(null);

  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setNotice(null);
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setEmail(user?.email ?? "");

      const [expenses, tasks, reminders, profileResponse] = await Promise.all([
        getExpenses({
          period: "this_month",
          category: "all",
        }),
        getTasks("all"),
        getTaskReminders(),
        getMyProfile(),
      ]);

      setExpensesData(expenses);
      setTasksData(tasks);
      setTaskReminders(reminders);
      setProfile(profileResponse.profile ?? null);
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message: "Failed to load dashboard data.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const firstName = profile?.first_name ?? "";
  const lastName = profile?.last_name ?? "";
  const fullName = `${firstName} ${lastName}`.trim();

  const initials =
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() ||
    email?.[0]?.toUpperCase() ||
    "U";

  const recentTransactions = expensesData?.expenses?.slice(0, 5) ?? [];
  const dueTodayTasks = taskReminders?.due_today?.slice(0, 3) ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-6 shadow-xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {profile?.profile_photo_url ? (
                <img
                  src={profile.profile_photo_url}
                  alt="Profile"
                  className="h-20 w-20 rounded-full object-cover shadow-lg"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white shadow-lg">
                  {initials}
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-blue-300">LifeOS</p>

                <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                  Welcome back{fullName ? `, ${firstName}` : ""} 👋
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Your personal AI assistant for expenses, tasks, journals,
                  saved places, and daily planning.
                </p>
              </div>
            </div>

            <button
              onClick={loadDashboard}
              disabled={loading}
              className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        {notice && <Notice type={notice.type} message={notice.message} />}

        {loading ? (
          <p className="text-slate-400">Loading dashboard...</p>
        ) : (
          <>
            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <SummaryCard
                title="Money In This Month"
                value={`$${(expensesData?.total_credit ?? 0).toFixed(2)}`}
                description="Income logged this month"
              />

              <SummaryCard
                title="Money Out This Month"
                value={`$${(expensesData?.total_debit ?? 0).toFixed(2)}`}
                description="Spending logged this month"
              />

              <SummaryCard
                title="Net Balance This Month"
                value={`$${(expensesData?.net_balance ?? 0).toFixed(2)}`}
                description="Income minus spending"
              />
            </section>

            <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <SummaryCard
                title="Total Tasks"
                value={String(tasksData?.count ?? 0)}
                description="All tasks"
              />

              <SummaryCard
                title="Pending Tasks"
                value={String(tasksData?.pending_count ?? 0)}
                description="Tasks still open"
              />

              <SummaryCard
                title="Completed Tasks"
                value={String(tasksData?.completed_count ?? 0)}
                description="Tasks finished"
              />

              <SummaryCard
                title="Due Today"
                value={String(taskReminders?.due_today_count ?? 0)}
                description="Needs attention today"
              />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">This Month</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Recent money activity.
                    </p>
                  </div>

                  <Link
                    href="/expenses"
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                  >
                    View Expenses
                  </Link>
                </div>

                {recentTransactions.length === 0 ? (
                  <p className="text-slate-400">
                    No transactions this month yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentTransactions.map((expense: ExpenseItem) => (
                      <div
                        key={expense.id}
                        className="rounded-xl border border-slate-700 bg-slate-800 p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold">
                              {expense.description || "Transaction"}
                            </p>

                            <p className="mt-1 text-sm capitalize text-slate-400">
                              {expense.category} ·{" "}
                              {new Date(expense.created_at).toLocaleDateString()}
                            </p>
                          </div>

                          <p
                            className={`font-bold ${
                              expense.transaction_type === "credit"
                                ? "text-emerald-300"
                                : "text-red-300"
                            }`}
                          >
                            {expense.transaction_type === "credit" ? "+" : "-"}$
                            {Number(expense.amount).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">Task Reminders</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Due today, upcoming, overdue, and follow-up.
                    </p>
                  </div>

                  <Link
                    href="/tasks"
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                  >
                    View Tasks
                  </Link>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <MiniStat
                    label="Upcoming"
                    value={String(taskReminders?.upcoming_count ?? 0)}
                  />

                  <MiniStat
                    label="Overdue"
                    value={String(taskReminders?.overdue_count ?? 0)}
                  />

                  <MiniStat
                    label="Follow-Up"
                    value={String(taskReminders?.follow_up_count ?? 0)}
                  />

                  <MiniStat
                    label="Due Today"
                    value={String(taskReminders?.due_today_count ?? 0)}
                  />
                </div>

                {dueTodayTasks.length > 0 ? (
                  <div className="space-y-3">
                    {dueTodayTasks.map((task: TaskItem) => (
                      <div
                        key={task.id}
                        className="rounded-xl border border-slate-700 bg-slate-800 p-4"
                      >
                        <p className="font-semibold">{task.title}</p>

                        <p className="mt-1 text-sm text-slate-400">
                          {task.due_date
                            ? new Date(task.due_date).toLocaleString()
                            : "No due date detected"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">No tasks due today.</p>
                )}
              </div>
            </section>

          </>
        )}
      </div>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
