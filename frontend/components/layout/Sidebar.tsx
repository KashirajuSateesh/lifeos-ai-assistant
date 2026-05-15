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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    try {
      if (session?.access_token) {
        await resetChatSession(session.access_token);
      }
    } catch (error) {
      console.error("Failed to reset chat session on logout:", error);
    }

    window.sessionStorage.removeItem("lifeos_chat_messages");

    await supabase.auth.signOut();
    router.replace("/login");
  router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-slate-800/70 bg-slate-950/95 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl md:flex md:flex-col">
      <div className="mb-4">
        <div className="flex items-center gap-5">
          <img
            src="/lifeos-logo.png"
            alt="LifeOS Logo"
            className="h-40 w-20 rounded-xl object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />

          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight">LifeOS</h1>
            <p className="text-sm text-blue-400">Personal AI Assistant</p>
          </div>
        </div>

      </div>

      <nav className="lifeos-scrollbar mt-6 flex-1 space-y-2 overflow-y-auto pr-1">
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