"use client";

import { useState } from "react";

type ChatResponse = {
  status: string;
  user_id: string;
  message_received: string;
  response: string;
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [assistantResponse, setAssistantResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  async function sendMessage() {
    if (!message.trim()) return;

    setLoading(true);
    setAssistantResponse("");

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
      setAssistantResponse(data.response);
    } catch (error) {
      console.error(error);
      setAssistantResponse("Something went wrong while connecting to the backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-xl border border-slate-800">
        <h1 className="text-2xl font-bold mb-2">LifeOS AI Assistant</h1>
        <p className="text-slate-400 mb-6">
          Your personal AI assistant for expenses, tasks, journal, and places.
        </p>

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

        {assistantResponse && (
          <div className="mt-6 rounded-xl bg-slate-800 border border-slate-700 p-4">
            <p className="text-sm text-slate-400 mb-1">Assistant Response</p>
            <p>{assistantResponse}</p>
          </div>
        )}
      </div>
    </main>
  );
}