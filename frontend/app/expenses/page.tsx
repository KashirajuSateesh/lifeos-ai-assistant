"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import AppShell from "@/components/layout/AppShell";
import {
  deleteExpense as deleteExpenseApi,
  getExpenses,
  updateExpense as updateExpenseApi,
} from "@/lib/api";
import {
  ExpenseCategoryFilter,
  ExpenseItem,
  ExpensesResponse,
  PeriodFilter,
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

export default function ExpensesPage() {
  const router = useRouter();
  const [expensesData, setExpensesData] = useState<ExpensesResponse | null>(
    null
  );
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("all");
  const [selectedExpenseCategory, setSelectedExpenseCategory] =
    useState<ExpenseCategoryFilter>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTransactionType, setEditTransactionType] = useState<
    "debit" | "credit"
  >("debit");

  const [expensesLoading, setExpensesLoading] = useState(false);

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

  async function handleExpenseCategoryChange(category: ExpenseCategoryFilter) {
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

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Money Overview</h1>
          <p className="mt-2 text-slate-400">
            Track income, spending, category filters, and custom date ranges.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Transactions</h2>
              <p className="mt-2 text-slate-400">
                Filter transactions by time period and category.
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
              {expensesData.expenses.slice(0, 20).map((expense) => {
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
              No transactions for this filter. Try using the Chat page to log an
              expense.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}