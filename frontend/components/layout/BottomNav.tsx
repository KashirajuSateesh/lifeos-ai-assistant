"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const mainNavItems = [
  { label: "Home", href: "/" },
  { label: "Chat", href: "/chat" },
  { label: "Money", href: "/expenses" },
  { label: "Tasks", href: "/tasks" },
];

const moreNavItems = [
  { label: "Journal", href: "/journal" },
  { label: "Places", href: "/places" },
  { label: "Settings", href: "/settings" },
];

export default function BottomNav() {
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {showMore && (
        <div className="fixed bottom-20 left-4 right-4 z-40 rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl lg:hidden">
          <p className="mb-3 text-sm font-semibold text-slate-300">More</p>

          <div className="grid grid-cols-1 gap-2">
            {moreNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMore(false)}
                className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800"
              >
                {item.label}
              </Link>
            ))}

            <button
              onClick={logout}
              className="rounded-xl border border-red-500/40 px-4 py-3 text-left text-sm text-red-300 hover:bg-red-500/10"
            >
              Logout
            </button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-950 px-2 py-2 text-white lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mainNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-2 py-2 text-center text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}

          <button
            onClick={() => setShowMore((previous) => !previous)}
            className="rounded-xl px-2 py-2 text-center text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            More
          </button>
        </div>
      </nav>
    </>
  );
}