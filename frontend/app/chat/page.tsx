import AppShell from "@/components/layout/AppShell";

export default function ChatPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-medium text-blue-400">Chat</p>
        <h1 className="text-3xl font-bold">AI Assistant Chat</h1>
        <p className="mt-2 text-slate-400">
          We will move the chat assistant here next.
        </p>
      </div>
    </AppShell>
  );
}