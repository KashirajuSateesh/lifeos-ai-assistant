import AppShell from "@/components/layout/AppShell";

export default function TasksPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-medium text-blue-400">Tasks</p>
        <h1 className="text-3xl font-bold">Tasks & Reminders</h1>
        <p className="mt-2 text-slate-400">
          Setting code.
        </p>
      </div>
    </AppShell>
  );
}