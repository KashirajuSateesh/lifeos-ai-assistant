"use client";

import { useState } from "react";

type ExtractedData = {
  amount?: number | null;
  category?: string;
  description?: string;
  transaction_type?: string;
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

export default function Home() {
  const [message, setMessage] = useState("");
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

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
          user_id: "demo-user",
          message: message,
        }),
      });

      if (!response.ok) {
        throw new Error("Backend request failed");
      }

      const data: ChatResponse = await response.json();
      setChatResponse(data);
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

  const isExpenseAgent = chatResponse?.selected_agent === "expense_agent";
  const expenseData = chatResponse?.extracted_data;

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-xl border border-slate-800">
        <div className="mb-6">
          <p className="text-sm text-blue-400 font-medium">LifeOS</p>
          <h1 className="text-2xl font-bold">AI Assistant</h1>
          <p className="text-slate-400 mt-2">
            Track expenses, tasks, journal entries, and places using natural language.
          </p>
        </div>

        <div className="space-y-3">
          <textarea
            className="w-full min-h-28 rounded-xl bg-slate-800 border border-slate-700 p-3 text-white outline-none focus:border-blue-500"
            placeholder="Try: I spent $25 on lunch"
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
            <div className="rounded-xl bg-slate-800 border border-slate-700 p-4">
              <p className="text-sm text-slate-400 mb-1">Assistant Response</p>
              <p>{chatResponse.response}</p>
            </div>

            <div className="rounded-xl bg-slate-800 border border-slate-700 p-4">
              <p className="text-sm text-slate-400 mb-3">Routing Details</p>

              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Intent</span>
                  <span>{chatResponse.intent ?? "N/A"}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Selected Agent</span>
                  <span>{chatResponse.selected_agent ?? "N/A"}</span>
                </div>
              </div>
            </div>

            {isExpenseAgent && expenseData && (
              <div className="rounded-xl bg-slate-800 border border-blue-500/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold">Expense Detected</p>
                  <span className="text-xs rounded-full bg-blue-600 px-3 py-1">
                    {expenseData.transaction_type ?? "unknown"}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount</span>
                    <span>
                      {expenseData.amount != null
                        ? `$${expenseData.amount.toFixed(2)}`
                        : "Missing"}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">Category</span>
                    <span>{expenseData.category ?? "N/A"}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-700">
                    <p className="text-slate-400 mb-1">Description</p>
                    <p>{expenseData.description ?? "N/A"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}