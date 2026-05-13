"use client";

import { useEffect, useState } from "react";

type ExtractedData = {
  id?: string;
  user_id?: string;
  amount?: number | null;
  category?: string;
  description?: string;
  transaction_type?: string;
  created_at?: string;
};

type ChatResponse = {
  status: string;
  user_id: string;
  message_received: string;
  intent?: string | null;
  selected_agent?: string | null;
  extracted_data?: ExtractedData | null;
  response: string;
};

type ExpenseItem = {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  description?: string | null;
  transaction_type: string;
  created_at: string;
};

type ExpensesResponse = {
  status: string;
  user_id: string;
  count: number;
  total_debit: number;
  total_credit: number;
  net_balance: number;
  period?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  expenses: ExpenseItem[];
};

type PeriodFilter = "all" | "today" | "this_week" | "this_month" | "this_year";

const DEMO_USER_ID = "demo-user";

const periodOptions: { label: string; value: PeriodFilter }[] = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
  { label: "This Year", value: "this_year" },
];

export default function Home() {
  const [message, setMessage] = useState("");
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  const [expensesData, setExpensesData] = useState<ExpensesResponse | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("all");
  const [loading, setLoading] = useState(false);
  const [expensesLoading, setExpensesLoading] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  async function fetchExpenses(period: PeriodFilter = selectedPeriod) {
    setExpensesLoading(true);

    try {
      const periodQuery = period === "all" ? "" : `?period=${period}`;

      const response = await fetch(
        `${backendUrl}/api/expenses/${DEMO_USER_ID}${periodQuery}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch expenses");
      }

      const data: ExpensesResponse = await response.json();
      setExpensesData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setExpensesLoading(false);
    }
  }

  async function handlePeriodChange(period: PeriodFilter) {
    setSelectedPeriod(period);
    await fetchExpenses(period);
  }

  async function sendMessage() {
    if (!message.trim()) return;

    setLoading(true);
    setChatResponse(null);

    try {
      const response = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: DEMO_USER_ID,
          message: message,
        }),
      });

      if (!response.ok) {
        throw new Error("Backend request failed");
      }

      const data: ChatResponse = await response.json();
      setChatResponse(data);
      setMessage("");

      if (data.selected_agent === "expense_agent") {
        await fetchExpenses(selectedPeriod);
      }
    } catch (error) {
      console.error(error);
      setChatResponse({
        status: "error",
        user_id: DEMO_USER_ID,
        message_received: message,
        response: "Something went wrong while connecting to the backend.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchExpenses("all");
  }, []);

  const isExpenseAgent = chatResponse?.selected_agent === "expense_agent";
  const expenseData = chatResponse?.extracted_data;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-6">
            <p className="text-sm font-medium text-blue-400">LifeOS</p>
            <h1 className="text-2xl font-bold">AI Assistant</h1>
            <p className="mt-2 text-slate-400">
              Track expenses, tasks, journal entries, and places using natural language.
            </p>
          </div>

          <div className="space-y-3">
            <textarea
              className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
              placeholder="Try: I spent $25 on lunch or I got paid $1500 today"
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
                <p className="mb-1 text-sm text-slate-400">Assistant Response</p>
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
                      <span className="capitalize">{expenseData.category ?? "N/A"}</span>
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
                Track money in, money out, and net balance by time period.
              </p>
            </div>

            <button
              onClick={() => fetchExpenses(selectedPeriod)}
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
              <span className="capitalize">{selectedPeriod.replace("_", " ")}</span>
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
              {expensesData.expenses.slice(0, 10).map((expense) => (
                <div
                  key={expense.id}
                  className="rounded-xl border border-slate-700 bg-slate-800 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold capitalize">{expense.category}</p>
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">
              No transactions for this period. Try: I spent $25 on lunch.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}