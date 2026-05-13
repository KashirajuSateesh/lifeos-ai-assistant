import AppShell from "@/components/layout/AppShell";

export default function ExpensesPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-medium text-blue-400">Expenses</p>
        <h1 className="text-3xl font-bold">Expense Management</h1>
        <p className="mt-2 text-slate-400">
          We will move the expense dashboard here next.
        </p>
      </div>
    </AppShell>
  );
}