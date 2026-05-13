import BottomNav from "./BottomNav";
import Sidebar from "./Sidebar";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="flex">
        <Sidebar />

        <main className="min-h-screen flex-1 px-4 py-6 pb-24 text-white lg:px-8 lg:pb-8">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}