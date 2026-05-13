import Link from "next/link";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Chat", href: "/chat" },
  { label: "Expenses", href: "/expenses" },
  { label: "Tasks", href: "/tasks" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-950 px-3 py-2 text-white lg:hidden">
      <div className="grid grid-cols-4 gap-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl px-2 py-2 text-center text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}