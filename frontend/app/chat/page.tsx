"use client";

import { useState } from "react";

import AppShell from "@/components/layout/AppShell";
import { sendChatMessage } from "@/lib/api";
import { ChatResponse } from "@/lib/types";

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [chatResponse, setChatResponse] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    if (!message.trim()) return;

    setLoading(true);
    setChatResponse(null);

    try {
      const data = await sendChatMessage(message);
      setChatResponse(data);
      setMessage("");
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

  const expenseData = chatResponse?.extracted_data;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">AI Assistant Chat</h1>
          <p className="mt-2 text-slate-400">
            Type naturally to log expenses, create reminders, write journals, or save places.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="space-y-3">
            <textarea
              className="min-h-32 w-full rounded-xl border border-slate-700 bg-slate-800 p-3 text-white outline-none focus:border-blue-500"
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

              {expenseData && chatResponse.selected_agent === "expense_agent" && (
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

               {/* Task Agent saved card*/}
              {chatResponse.selected_agent === "task_agent" && chatResponse.extracted_data && (
                <div className="rounded-xl border border-purple-500/40 bg-slate-800 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-semibold">Task Saved</p>
                    <span className="rounded-full bg-purple-600 px-3 py-1 text-xs capitalize">
                      {String(chatResponse.extracted_data.priority ?? "medium")}
                    </span>
                  </div>



                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="mb-1 text-slate-400">Title</p>
                      <p>{String(chatResponse.extracted_data.title ?? "N/A")}</p>
                    </div>

                    <div className="border-t border-slate-700 pt-2">
                      <p className="mb-1 text-slate-400">Due Date</p>
                      <p>
                        {chatResponse.extracted_data.due_date
                          ? new Date(
                              String(chatResponse.extracted_data.due_date)
                            ).toLocaleString()
                          : "No due date detected"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Journal Saved card */}
              {chatResponse.selected_agent === "journal_agent" &&
              chatResponse.extracted_data && (
                <div className="rounded-xl border border-emerald-500/40 bg-slate-800 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-semibold">Journal Saved</p>
                    <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs capitalize">
                      {String(chatResponse.extracted_data.mood ?? "neutral")}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="mb-1 text-slate-400">Summary</p>
                      <p>{String(chatResponse.extracted_data.summary ?? "N/A")}</p>
                    </div>

                    <div className="border-t border-slate-700 pt-2">
                      <p className="mb-1 text-slate-400">Entry Date</p>
                      <p>{String(chatResponse.extracted_data.entry_date ?? "N/A")}</p>
                    </div>

                    {chatResponse.extracted_data.tags && (
                      <div className="border-t border-slate-700 pt-2">
                        <p className="mb-2 text-slate-400">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {chatResponse.extracted_data.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-slate-600 px-2 py-1 text-xs text-slate-300"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

                {/* Place Agent saved card*/}
              
              {chatResponse.selected_agent === "places_agent" &&
              chatResponse.extracted_data && (
                <div className="rounded-xl border border-orange-500/40 bg-slate-800 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-semibold">Place Saved</p>
                    <span className="rounded-full bg-orange-600 px-3 py-1 text-xs capitalize">
                      {String(chatResponse.extracted_data.status ?? "want_to_visit").replace(
                        "_",
                        " "
                      )}
                    </span>
                  </div>

                  {chatResponse.extracted_data.image_url && (
                    <img
                      src={String(chatResponse.extracted_data.image_url)}
                      alt={String(chatResponse.extracted_data.place_name ?? "Saved place")}
                      className="mb-4 h-40 w-full rounded-xl object-cover"
                    />
                  )}

                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="mb-1 text-slate-400">Place Name</p>
                      <p>{String(chatResponse.extracted_data.place_name ?? "N/A")}</p>
                    </div>

                    <div className="flex justify-between gap-4 border-t border-slate-700 pt-2">
                      <span className="text-slate-400">Category</span>
                      <span className="capitalize">
                        {String(chatResponse.extracted_data.category ?? "general")}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Location</span>
                      <span>
                        {chatResponse.extracted_data.location_known ? "Known" : "Unknown"}
                      </span>
                    </div>

                    {chatResponse.extracted_data.city && (
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">City</span>
                        <span>{String(chatResponse.extracted_data.city)}</span>
                      </div>
                    )}

                    {chatResponse.extracted_data.environment_tags && (
                      <div className="border-t border-slate-700 pt-2">
                        <p className="mb-2 text-slate-400">Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {chatResponse.extracted_data.environment_tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-slate-600 px-2 py-1 text-xs text-slate-300"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {chatResponse.extracted_data.source_url && (
                      <a
                        href={String(chatResponse.extracted_data.source_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
                      >
                        Open Source Link
                      </a>
                    )}
                  </div>
                </div>
              )}




            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}