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
    </aside>
  );
}