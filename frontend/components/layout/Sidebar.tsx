"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { resetChatSession } from "@/lib/api";

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
    try {
      await resetChatSession();
    } catch (error) {
      console.error("Failed to reset chat session on logout:", error);
    }

    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="hidden min-h-screen w-64 border-r border-slate-800 bg-slate-950 p-5 text-white lg:block">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <img
            src="/lifeos-logo.png"
            alt="LifeOS Logo"
            className="h-40 w-20 rounded-xl object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />

          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">LifeOS</h1>
            <p className="text-xs text-blue-400">Personal AI Assistant</p>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Expenses, tasks, journals, and places.
        </p>

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