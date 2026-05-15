"use client";

import BottomNav from "@/components/layout/BottomNav";
import Sidebar from "@/components/layout/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Sidebar />

      <main className="min-h-screen pb-24 md:ml-72 md:pb-0">
        <div className="min-h-screen p-4 md:p-6">{children}</div>
      </main>

      <BottomNav />
    </div>
  );
}