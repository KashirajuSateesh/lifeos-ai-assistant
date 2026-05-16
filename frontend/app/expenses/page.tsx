"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import Notice, { NoticeType } from "@/components/ui/Notice";
import { deleteExpense, getExpenses, updateExpense } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
  ExpenseCategoryFilter,
  ExpenseItem,
  ExpensesResponse,
  PeriodFilter,
} from "@/lib/types";

export default function ExpensesPage() {
  const router = useRouter();

  const [expensesData, setExpensesData] = useState<ExpensesResponse | null>(
    null
  );

  const [notice, setNotice] = useState<{
    type: NoticeType;
    message: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [categoryFilter, setCategoryFilter] =
    useState<ExpenseCategoryFilter>("all");

  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(
    null
  );
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTransactionType, setEditTransactionType] = useState<
    "debit" | "credit"
  >("debit");

  const [expenseToDelete, setExpenseToDelete] =
    useState<ExpenseItem | null>(null);
  const [deletingExpense, setDeletingExpense] = useState(false);

  async function fetchExpenses(
    period: PeriodFilter = periodFilter,
    category: ExpenseCategoryFilter = categoryFilter
  ) {
    setNotice(null);
    setLoading(true);

    try {
      const data = await getExpenses({
        period,
        category,
      });

      setExpensesData(data);
      setPeriodFilter(period);
      setCategoryFilter(category);
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message: "Failed to fetch expenses.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomDateExpenses() {
    setNotice(null);

    if (!customStartDate || !customEndDate) {
      setNotice({
        type: "error",
        message: "Please select both start date and end date.",
      });
      return;
    }

    setLoading(true);

    try {
      const data = await getExpenses({
        period: "all",
        category: categoryFilter,
        startDate: customStartDate,
        endDate: customEndDate,
      });

      setExpensesData(data);
      setPeriodFilter("all");
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message: "Failed to fetch custom date expenses.",
      });
    } finally {
      setLoading(false);
    }
  }

  function startEdit(expense: ExpenseItem) {
    setNotice(null);
    setEditingExpense(expense);
    setEditAmount(String(expense.amount));
    setEditCategory(expense.category ?? "");
    setEditDescription(expense.description ?? "");
    setEditTransactionType(
      expense.transaction_type === "credit" ? "credit" : "debit"
    );
  }

  function cancelEdit() {
    setEditingExpense(null);
    setEditAmount("");
    setEditCategory("");
    setEditDescription("");
    setEditTransactionType("debit");
  }

  async function saveEdit() {
    setNotice(null);

    if (!editingExpense) return;

    const numericAmount = Number(editAmount);

    if (!numericAmount || numericAmount <= 0) {
      setNotice({
        type: "error",
        message: "Please enter a valid amount.",
      });
      return;
    }

    if (!editCategory.trim()) {
      setNotice({
        type: "error",
        message: "Please enter a category.",
      });
      return;
    }

    try {
      await updateExpense(editingExpense.id, {
        amount: numericAmount,
        category: editCategory,
        description: editDescription,
        transaction_type: editTransactionType,
      });

      cancelEdit();

      setNotice({
        type: "success",
        message: "Transaction updated successfully.",
      });

      await fetchExpenses(periodFilter, categoryFilter);
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message: "Failed to update transaction. Please try again.",
      });
    }
  }

  function requestDeleteExpense(expense: ExpenseItem) {
    setNotice(null);
    setExpenseToDelete(expense);
  }

  async function confirmDeleteExpense() {
    if (!expenseToDelete) return;

    setNotice(null);
    setDeletingExpense(true);

    try {
      await deleteExpense(expenseToDelete.id);

      setNotice({
        type: "success",
        message: "Transaction deleted successfully.",
      });

      setExpenseToDelete(null);
      await fetchExpenses(periodFilter, categoryFilter);
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message: "Failed to delete transaction. Please try again.",
      });
    } finally {
      setDeletingExpense(false);
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

      await fetchExpenses("all", "all");
    }

    loadPage();
  }, []);

  const expenses = expensesData?.expenses ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Money Overview</h1>
          <p className="mt-2 text-slate-400">
            Track income, spending, category filters, and custom date ranges.
          </p>
        </div>

        {notice && <Notice type={notice.type} message={notice.message} />}

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard
            title="Money In"
            value={`$${(expensesData?.total_credit ?? 0).toFixed(2)}`}
            description="Total income"
          />

          <SummaryCard
            title="Money Out"
            value={`$${(expensesData?.total_debit ?? 0).toFixed(2)}`}
            description="Total spending"
          />

          <SummaryCard
            title="Net Balance"
            value={`$${(expensesData?.net_balance ?? 0).toFixed(2)}`}
            description="Income minus spending"
          />
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Filters</h2>
            <p className="mt-1 text-sm text-slate-400">
              Filter your transactions by period, category, or custom date.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm text-slate-400">
                Period
              </label>
              <select
                value={periodFilter}
                onChange={(event) =>
                  fetchExpenses(
                    event.target.value as PeriodFilter,
                    categoryFilter
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="this_year">This Year</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-400">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(event) =>
                  fetchExpenses(
                    periodFilter,
                    event.target.value as ExpenseCategoryFilter
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="food">Food</option>
                <option value="groceries">Groceries</option>
                <option value="transport">Transport</option>
                <option value="rent">Rent</option>
                <option value="utilities">Utilities</option>
                <option value="health">Health</option>
                <option value="entertainment">Entertainment</option>
                <option value="shopping">Shopping</option>
                <option value="income">Income</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-400">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(event) => setCustomStartDate(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-400">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(event) => setCustomEndDate(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={fetchCustomDateExpenses}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-700"
            >
              Apply Custom Date
            </button>

            <button
              onClick={() => {
                setCustomStartDate("");
                setCustomEndDate("");
                fetchExpenses("all", "all");
              }}
              className="rounded-xl border border-slate-700 px-5 py-3 text-sm hover:bg-slate-800"
            >
              Reset Filters
            </button>
          </div>
        </section>

        <section className="flex max-h-[75vh] min-h-[500px] flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold">Transactions</h2>
              <p className="mt-1 text-sm text-slate-400">
                {expensesData?.count ?? 0} transactions found.
              </p>
            </div>

            <button
              onClick={() => fetchExpenses(periodFilter, categoryFilter)}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>

          <div className="lifeos-scrollbar min-h-0 flex-1 overflow-y-auto pr-2">
            {loading ? (
              <p className="text-slate-400">Loading expenses...</p>
            ) : expenses.length === 0 ? (
              <p className="text-slate-400">No transactions found.</p>
            ) : (
              <div className="lifeos-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-2">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="rounded-xl border border-slate-700 bg-slate-800 p-4"
                  >
                    {editingExpense?.id === expense.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(event) => setEditAmount(event.target.value)}
                            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-white outline-none focus:border-blue-500"
                            placeholder="Amount"
                          />

                          <input
                            type="text"
                            value={editCategory}
                            onChange={(event) =>
                              setEditCategory(event.target.value)
                            }
                            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-white outline-none focus:border-blue-500"
                            placeholder="Category"
                          />

                          <select
                            value={editTransactionType}
                            onChange={(event) =>
                              setEditTransactionType(
                                event.target.value as "debit" | "credit"
                              )
                            }
                            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-white outline-none focus:border-blue-500"
                          >
                            <option value="debit">Debit</option>
                            <option value="credit">Credit</option>
                          </select>

                          <input
                            type="text"
                            value={editDescription}
                            onChange={(event) =>
                              setEditDescription(event.target.value)
                            }
                            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-white outline-none focus:border-blue-500"
                            placeholder="Description"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={saveEdit}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                          >
                            Save
                          </button>

                          <button
                            onClick={cancelEdit}
                            className="rounded-lg border border-slate-600 px-4 py-2 text-sm hover:bg-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-semibold">
                              {expense.description || "Transaction"}
                            </p>

                            <span
                              className={`rounded-full px-3 py-1 text-xs ${
                                expense.transaction_type === "credit"
                                  ? "bg-emerald-500/10 text-emerald-300"
                                  : "bg-red-500/10 text-red-300"
                              }`}
                            >
                              {expense.transaction_type}
                            </span>
                          </div>

                          <p className="mt-1 text-sm capitalize text-slate-400">
                            {expense.category} ·{" "}
                            {new Date(expense.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <p
                            className={`text-xl font-bold ${
                              expense.transaction_type === "credit"
                                ? "text-emerald-300"
                                : "text-red-300"
                            }`}
                          >
                            {expense.transaction_type === "credit" ? "+" : "-"}$
                            {Number(expense.amount).toFixed(2)}
                          </p>

                          <button
                            onClick={() => startEdit(expense)}
                            className="rounded-lg border border-slate-600 px-3 py-2 text-xs hover:bg-slate-700"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => requestDeleteExpense(expense)}
                            className="rounded-lg border border-red-500/40 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl">
            <p className="text-sm font-medium text-red-300">
              Delete Transaction
            </p>

            <h2 className="mt-2 text-2xl font-bold">Are you sure?</h2>

            <p className="mt-3 text-sm text-slate-400">
              This will permanently delete this transaction:
            </p>

            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800 p-4">
              <p className="font-semibold">
                {expenseToDelete.description || "Transaction"}
              </p>

              <p className="mt-1 text-sm capitalize text-slate-400">
                {expenseToDelete.category} · $
                {Number(expenseToDelete.amount).toFixed(2)}
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setExpenseToDelete(null)}
                disabled={deletingExpense}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                onClick={confirmDeleteExpense}
                disabled={deletingExpense}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {deletingExpense ? "Deleting..." : "Delete"}
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