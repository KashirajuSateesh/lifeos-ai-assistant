"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";

import {
  deleteExpense as deleteExpenseApi,
  deleteTask as deleteTaskApi,
  getExpenses,
  getTaskReminders,
  getTasks,
  sendChatMessage,
  updateExpense as updateExpenseApi,
  updateTask,
} from "@/lib/api";

import {
  ChatResponse,
  ExpenseCategoryFilter,
  ExpenseItem,
  ExpensesResponse,
  PeriodFilter,
  TaskItem,
  TaskPriorityFilter,
  TaskRemindersResponse,
  TasksResponse,
} from "@/lib/types";

const periodOptions: { label: string; value: PeriodFilter }[] = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
  { label: "This Year", value: "this_year" },
];

const expenseCategoryOptions: {
  label: string;
  value: ExpenseCategoryFilter;
}[] = [
  { label: "All Categories", value: "all" },
  { label: "Food", value: "food" },
  { label: "Groceries", value: "groceries" },
  { label: "Transport", value: "transport" },
  { label: "Shopping", value: "shopping" },
  { label: "Rent", value: "rent" },
  { label: "Utilities", value: "utilities" },
  { label: "Health", value: "health" },
  { label: "Entertainment", value: "entertainment" },
  { label: "Income", value: "income" },
  { label: "Other", value: "other" },
];

const taskPriorityOptions: { label: string; value: TaskPriorityFilter }[] = [
  { label: "All Priorities", value: "all" },
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

export default function Home() {
  const [message, setMessage] = useState("");
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);

  const [expensesData, setExpensesData] = useState<ExpensesResponse | null>(
    null
  );
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("all");
  const [selectedExpenseCategory, setSelectedExpenseCategory] =
    useState<ExpenseCategoryFilter>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [tasksData, setTasksData] = useState<TasksResponse | null>(null);
  const [taskReminders, setTaskReminders] =
    useState<TaskRemindersResponse | null>(null);
  const [selectedTaskPriority, setSelectedTaskPriority] =
    useState<TaskPriorityFilter>("all");

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTransactionType, setEditTransactionType] = useState<
    "debit" | "credit"
  >("debit");

  const [loading, setLoading] = useState(false);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [remindersLoading, setRemindersLoading] = useState(false);

  async function fetchExpenses(
    period: PeriodFilter = selectedPeriod,
    category: ExpenseCategoryFilter = selectedExpenseCategory
  ) {
    setExpensesLoading(true);

    try {
      const data = await getExpenses({
        period,
        category,
      });

      setExpensesData(data);
    } catch (error) {
      console.error(error);
      alert("Failed to fetch expenses.");
    } finally {
      setExpensesLoading(false);
    }
  }

  async function handlePeriodChange(period: PeriodFilter) {
    setSelectedPeriod(period);
    await fetchExpenses(period, selectedExpenseCategory);
  }

  async function handleExpenseCategoryChange(
    category: ExpenseCategoryFilter
  ) {
    setSelectedExpenseCategory(category);
    await fetchExpenses(selectedPeriod, category);
  }

  async function handleCustomDateSearch() {
    if (!customStartDate || !customEndDate) {
      alert("Please select both start date and end date.");
      return;
    }

    setExpensesLoading(true);

    try {
      const startDateTime = `${customStartDate}T00:00:00.000Z`;
      const endDateTime = `${customEndDate}T23:59:59.999Z`;

      const data = await getExpenses({
        startDate: startDateTime,
        endDate: endDateTime,
        category: selectedExpenseCategory,
      });

      setSelectedPeriod("all");
      setExpensesData(data);
    } catch (error) {
      console.error(error);
      alert("Failed to fetch custom date expenses.");
    } finally {
      setExpensesLoading(false);
    }
  }

  function startEditingExpense(expense: ExpenseItem) {
    setEditingExpenseId(expense.id);
    setEditAmount(String(expense.amount));
    setEditCategory(expense.category);
    setEditDescription(expense.description ?? "");
    setEditTransactionType(expense.transaction_type as "debit" | "credit");
  }

  function cancelEditingExpense() {
    setEditingExpenseId(null);
    setEditAmount("");
    setEditCategory("");
    setEditDescription("");
    setEditTransactionType("debit");
  }

  async function updateExpense(expenseId: string) {
    if (!editAmount || Number(editAmount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (!editCategory.trim()) {
      alert("Please enter a category.");
      return;
    }

    try {
      await updateExpenseApi(expenseId, {
        amount: Number(editAmount),
        category: editCategory,
        description: editDescription,
        transaction_type: editTransactionType,
      });

      cancelEditingExpense();
      await fetchExpenses(selectedPeriod, selectedExpenseCategory);
    } catch (error) {
      console.error(error);
      alert("Failed to update transaction. Please try again.");
    }
  }

  async function deleteExpense(expenseId: string) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this transaction?"
    );

    if (!confirmDelete) return;

    try {
      await deleteExpenseApi(expenseId);
      await fetchExpenses(selectedPeriod, selectedExpenseCategory);
    } catch (error) {
      console.error(error);
      alert("Failed to delete transaction. Please try again.");
    }
  }

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

  async function sendMessage() {
    if (!message.trim()) return;

    setLoading(true);
    setChatResponse(null);

    try {
      const data = await sendChatMessage(message);

      setChatResponse(data);
      setMessage("");

      if (data.selected_agent === "expense_agent") {
        await fetchExpenses(selectedPeriod, selectedExpenseCategory);
      }

      if (data.selected_agent === "task_agent") {
        await fetchTasks(selectedTaskPriority);
        await fetchTaskReminders();
      }
    } catch (error) {
      console.error(error);

      setChatResponse({
        status: "error",
        user_id: "demo-user",
        message_received: message,
        response: "Something went wrong while connecting to the backend.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchExpenses("all", "all");
      fetchTasks("all");
      fetchTaskReminders();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // The first load should run once on mount with the default filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isExpenseAgent = chatResponse?.selected_agent === "expense_agent";
  const expenseData = chatResponse?.extracted_data;

  return (
    <AppShell>
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-6">
            <p className="text-sm font-medium text-blue-400">LifeOS</p>
            <h1 className="text-2xl font-bold">AI Assistant</h1>
            <p className="mt-2 text-slate-400">
              Track expenses, tasks, journal entries, and places using natural
              language.
            </p>
          </div>

          <div className="space-y-3">
            <textarea
              className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
              placeholder="Try: I spent $25 on lunch or remind me to pay rent tomorrow"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />

            <button
              onClick={sendMessage}
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send Message"}
            </button>
          </div>

          {chatResponse && (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <p className="mb-1 text-sm text-slate-400">
                  Assistant Response
                </p>
                <p>{chatResponse.response}</p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <p className="mb-3 text-sm text-slate-400">Routing Details</p>

                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Intent</span>
                    <span>{chatResponse.intent ?? "N/A"}</span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-400">Selected Agent</span>
                    <span>{chatResponse.selected_agent ?? "N/A"}</span>
                  </div>
                </div>
              </div>

              {isExpenseAgent && expenseData && (
                <div className="rounded-xl border border-blue-500/40 bg-slate-800 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-semibold">Transaction Saved</p>
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-xs capitalize">
                      {expenseData.transaction_type ?? "unknown"}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Amount</span>
                      <span>
                        {expenseData.amount != null
                          ? `$${Number(expenseData.amount).toFixed(2)}`
                          : "Missing"}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Category</span>
                      <span className="capitalize">
                        {expenseData.category ?? "N/A"}
                      </span>
                    </div>

                    <div className="border-t border-slate-700 pt-2">
                      <p className="mb-1 text-slate-400">Description</p>
                      <p>{expenseData.description ?? "N/A"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-400">Expenses</p>
              <h2 className="text-2xl font-bold">Money Overview</h2>
              <p className="mt-2 text-slate-400">
                Track money in, money out, and net balance by time period and
                category.
              </p>
            </div>

            <button
              onClick={() =>
                fetchExpenses(selectedPeriod, selectedExpenseCategory)
              }
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handlePeriodChange(option.value)}
                className={`rounded-full px-3 py-2 text-sm transition ${
                  selectedPeriod === option.value
                    ? "bg-blue-600 text-white"
                    : "border border-slate-700 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-sm text-slate-400">
              Filter by Category
            </label>

            <select
              value={selectedExpenseCategory}
              onChange={(event) =>
                handleExpenseCategoryChange(
                  event.target.value as ExpenseCategoryFilter
                )
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            >
              {expenseCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800 p-4">
            <p className="mb-3 text-sm font-medium text-slate-300">
              Custom Date Range
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(event) => setCustomStartDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  End Date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(event) => setCustomEndDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleCustomDateSearch}
              className="mt-3 w-full rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-600"
            >
              Apply Custom Range
            </button>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Money In</p>
              <p className="mt-1 text-xl font-bold">
                ${expensesData?.total_credit?.toFixed(2) ?? "0.00"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Money Out</p>
              <p className="mt-1 text-xl font-bold">
                ${expensesData?.total_debit?.toFixed(2) ?? "0.00"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <p className="text-sm text-slate-400">Net Balance</p>
              <p className="mt-1 text-xl font-bold">
                ${expensesData?.net_balance?.toFixed(2) ?? "0.00"}
              </p>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Selected Period</span>
              <span className="capitalize">
                {selectedPeriod.replace("_", " ")}
              </span>
            </div>

            <div className="mt-2 flex justify-between gap-4">
              <span className="text-slate-400">Selected Category</span>
              <span className="capitalize">
                {selectedExpenseCategory.replace("_", " ")}
              </span>
            </div>

            <div className="mt-2 flex justify-between gap-4">
              <span className="text-slate-400">Records</span>
              <span>{expensesData?.count ?? 0}</span>
            </div>
          </div>

          {expensesLoading ? (
            <p className="text-slate-400">Loading expenses...</p>
          ) : expensesData && expensesData.expenses.length > 0 ? (
            <div className="space-y-3">
              {expensesData.expenses.slice(0, 10).map((expense) => {
                const isEditing = editingExpenseId === expense.id;

                return (
                  <div
                    key={expense.id}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs text-slate-400">
                              Amount
                            </label>
                            <input
                              type="number"
                              value={editAmount}
                              onChange={(event) =>
                                setEditAmount(event.target.value)
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs text-slate-400">
                              Category
                            </label>
                            <input
                              type="text"
                              value={editCategory}
                              onChange={(event) =>
                                setEditCategory(event.target.value)
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-slate-400">
                            Description
                          </label>
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(event) =>
                              setEditDescription(event.target.value)
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-slate-400">
                            Transaction Type
                          </label>
                          <select
                            value={editTransactionType}
                            onChange={(event) =>
                              setEditTransactionType(
                                event.target.value as "debit" | "credit"
                              )
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                          >
                            <option value="debit">Debit</option>
                            <option value="credit">Credit</option>
                          </select>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => updateExpense(expense.id)}
                            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-700"
                          >
                            Save
                          </button>

                          <button
                            onClick={cancelEditingExpense}
                            className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold capitalize">
                            {expense.category}
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            {expense.description}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            {new Date(expense.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div className="text-right">
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

                          <p className="mt-1 text-xs capitalize text-slate-400">
                            {expense.transaction_type}
                          </p>

                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              onClick={() => startEditingExpense(expense)}
                              className="rounded-lg border border-blue-500/40 px-3 py-1 text-xs text-blue-300 hover:bg-blue-500/10"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteExpense(expense.id)}
                              className="rounded-lg border border-red-500/40 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400">
              No transactions for this filter. Try: I spent $25 on lunch.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl lg:col-span-2">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-400">Tasks</p>
              <h2 className="text-2xl font-bold">Todo & Reminders</h2>
              <p className="mt-2 text-slate-400">
                Saved tasks are created by the Task Agent and loaded from
                Supabase.
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
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-blue-400">
                  Reminder Center
                </p>
                <h3 className="text-xl font-bold">Today&apos;s Attention</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Tasks that are due, upcoming, overdue, or need follow-up.
                </p>
              </div>

              <button
                onClick={fetchTaskReminders}
                className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-700"
              >
                Refresh
              </button>
            </div>

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
                    {taskReminders.due_today.slice(0, 3).map((task) => (
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

                {taskReminders.overdue.length > 0 ||
                taskReminders.follow_up.length > 0 ? (
                  <div className="space-y-2">
                    {[...taskReminders.overdue, ...taskReminders.follow_up]
                      .slice(0, 3)
                      .map((task) => (
                        <div
                          key={task.id}
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
              {tasksData.tasks.slice(0, 10).map((task: TaskItem) => (
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
              No tasks for this filter. Try: Remind me to pay rent tomorrow.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
