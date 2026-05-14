"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Chat", href: "/chat" },
  { label: "Expenses", href: "/expenses" },
  { label: "Tasks", href: "/tasks" },
  { label: "Journal", href: "/journal" },
  { label: "Places", href: "/places" },
  { label: "Settings", href: "/settings" },
];

export default function Sidebar() {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }
  return (
    <aside className="hidden min-h-screen w-64 border-r border-slate-800 bg-slate-950 p-5 text-white lg:block">
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-400">LifeOS</p>
        <h1 className="text-xl font-bold">AI Assistant</h1>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <button
        onClick={logout}
        className="mt-8 w-full rounded-xl border border-slate-700 px-4 py-3 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
      >
        Logout
      </button>
    </aside>
  );
}