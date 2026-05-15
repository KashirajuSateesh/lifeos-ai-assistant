"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import Notice, { NoticeType } from "@/components/ui/Notice";
import { resetChatSession, sendChatMessage } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type ConfirmationCard = {
  title: string;
  fields: {
    label: string;
    value: string;
  }[];
};

type ChatApiResponse = {
  status?: string;
  message_received?: string;
  response?: string;

  assistant_message?: string;
  conversation_status?:
    | "general_response"
    | "needs_more_info"
    | "awaiting_confirmation"
    | "saved"
    | "cancelled";
  selected_agent?: string;
  intent?: string;
  collected_data?: Record<string, unknown>;
  missing_fields?: string[];
  pending_action?: Record<string, unknown> | null;
  confirmation_card?: ConfirmationCard | null;
  routing_source?: string | null;
  routing_reason?: string | null;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  conversationStatus?: string;
  selectedAgent?: string;
  intent?: string;
  confirmationCard?: ConfirmationCard | null;
};

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatAgentName(agent?: string) {
  if (!agent) return "LifeOS";
  return agent.replace("_agent", "").replace("_", " ");
}

export default function ChatPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createMessageId(),
      role: "assistant",
      content:
        "Hi! I’m LifeOS. Tell me anything naturally — expenses, tasks, journals, or places — and I’ll help organize it.",
      timestamp: new Date().toISOString(),
      conversationStatus: "general_response",
      selectedAgent: "orchestrator",
      intent: "general_chat",
    },
  ]);

  const [input, setInput] = useState("");
  const [notice, setNotice] = useState<{
    type: NoticeType;
    message: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setMessages([]);
        setInput("");
        setNotice(null);
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  async function sendMessage(customMessage?: string) {
    const messageToSend = (customMessage ?? input).trim();

    if (!messageToSend || loading) return;

    setNotice(null);

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: messageToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);

    if (!customMessage) {
      setInput("");
    }

    setLoading(true);

    try {
      const response = (await sendChatMessage(messageToSend)) as ChatApiResponse;

      const assistantText =
        response.assistant_message ||
        response.response ||
        "I processed your message.";

      const assistantMessage: ChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: assistantText,
        timestamp: new Date().toISOString(),
        conversationStatus: response.conversation_status,
        selectedAgent: response.selected_agent,
        intent: response.intent,
        confirmationCard: response.confirmation_card ?? null,
      };

      setMessages((currentMessages) => [
        ...currentMessages,
        assistantMessage,
      ]);
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message:
          "Chat request failed. Please make sure backend is running and try again.",
      });

      const errorMessage: ChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content:
          "Sorry, I could not process that right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
        conversationStatus: "general_response",
        selectedAgent: "orchestrator",
        intent: "general_chat",
      };

      setMessages((currentMessages) => [...currentMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage();
  }

  async function sendQuickReply(reply: "yes" | "no") {
    await sendMessage(reply);
  }

  async function clearFrontendChat() {
    setNotice(null);

    try {
      await resetChatSession();
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message: "Frontend chat cleared, but backend session reset failed.",
      });
    }

    setMessages([
      {
        id: createMessageId(),
        role: "assistant",
        content: "Chat cleared. Tell me what you want to organize next.",
        timestamp: new Date().toISOString(),
        conversationStatus: "general_response",
        selectedAgent: "orchestrator",
        intent: "general_chat",
      },
    ]);

    setInput("");
  }

  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

  const isAwaitingConfirmation =
    lastAssistantMessage?.conversationStatus === "awaiting_confirmation";

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-3rem)] overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
          <header className="border-b border-slate-800 bg-slate-900 px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold">LifeOS Chat</h1>
                <p className="mt-1 text-sm text-slate-400">
                  Chat naturally. I’ll ask follow-up questions and confirm before saving.
                </p>
              </div>

              <button
                onClick={clearFrontendChat}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Clear Chat
              </button>
            </div>
          </header>

          {notice && (
            <div className="px-5 pt-4">
              <Notice type={notice.type} message={notice.message} />
            </div>
          )}

          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-md md:max-w-[70%] ${
                      message.role === "user"
                        ? "rounded-br-sm bg-blue-600 text-white"
                        : "rounded-bl-sm border border-slate-700 bg-slate-900 text-slate-100"
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          message.role === "user"
                            ? "text-blue-100"
                            : "text-blue-300"
                        }`}
                      >
                        {message.role === "user"
                          ? "You"
                          : formatAgentName(message.selectedAgent)}
                      </span>

                      {message.role === "assistant" && message.intent && (
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] capitalize text-slate-400">
                          {message.intent.replace("_", " ")}
                        </span>
                      )}
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {message.content}
                    </p>

                    {message.confirmationCard && (
                      <ConfirmationCardView
                        card={message.confirmationCard}
                        showActions={
                          message.conversationStatus === "awaiting_confirmation"
                        }
                        onYes={() => sendQuickReply("yes")}
                        onNo={() => sendQuickReply("no")}
                        disabled={loading}
                      />
                    )}

                    <p
                      className={`mt-2 text-[10px] ${
                        message.role === "user"
                          ? "text-blue-100/70"
                          : "text-slate-500"
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300">
                    LifeOS is typing...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </main>

          <footer className="shrink-0 border-t border-slate-800 bg-slate-900 px-4 py-4">
            {isAwaitingConfirmation && (
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  onClick={() => sendQuickReply("yes")}
                  disabled={loading}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Yes, save it
                </button>

                <button
                  onClick={() => sendQuickReply("no")}
                  disabled={loading}
                  className="rounded-xl border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-60"
                >
                  No, cancel
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={
                  isAwaitingConfirmation
                    ? "Reply yes or no..."
                    : "Type a message like: I went for lunch today"
                }
                disabled={loading}
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500 disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </footer>
        </div>
      </div>
    </AppShell>
  );
}

function ConfirmationCardView({
  card,
  showActions,
  onYes,
  onNo,
  disabled,
}: {
  card: ConfirmationCard;
  showActions: boolean;
  onYes: () => void;
  onNo: () => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-4 rounded-xl border border-blue-500/30 bg-slate-950 p-4">
      <p className="text-sm font-semibold text-blue-300">{card.title}</p>

      <div className="mt-3 space-y-2">
        {card.fields.map((field) => (
          <div
            key={`${field.label}-${field.value}`}
            className="flex justify-between gap-4 rounded-lg bg-slate-900 px-3 py-2 text-sm"
          >
            <span className="text-slate-400">{field.label}</span>
            <span className="text-right font-medium text-slate-100">
              {field.value}
            </span>
          </div>
        ))}
      </div>

      {showActions && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={onYes}
            disabled={disabled}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Yes, save
          </button>

          <button
            onClick={onNo}
            disabled={disabled}
            className="rounded-lg border border-red-500/40 px-4 py-2 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-60"
          >
            No, cancel
          </button>
        </div>
      )}
    </div>
  );
}