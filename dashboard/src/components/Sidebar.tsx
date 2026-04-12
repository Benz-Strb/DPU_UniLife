import { LayoutDashboard, Users, FileText, Flag, ScrollText, LogOut } from "lucide-react";

const navItems = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "users", icon: Users, label: "Users" },
  { id: "posts", icon: FileText, label: "Posts" },
  { id: "reports", icon: Flag, label: "Reports" },
  { id: "logs", icon: ScrollText, label: "Logs" },
];

interface SidebarProps {
  page: string;
  onNavigate: (page: string) => void;
  user: any;
  onLogout: () => void;
}

export default function Sidebar({ page, onNavigate, user, onLogout }: SidebarProps) {
  return (
    <aside className="w-60 h-screen bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
            <span className="text-white font-black text-sm">D</span>
          </div>
          <div>
            <p className="text-white font-black text-sm">DPU UniLife</p>
            <p className="text-slate-500 text-[10px] uppercase tracking-widest">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition text-left ${
              page === id
                ? "bg-violet-600/20 text-violet-400"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-xs font-bold truncate max-w-[130px]">{user?.fullName}</p>
            <p className="text-slate-500 text-[10px] uppercase">{user?.role}</p>
          </div>
          <button
            onClick={onLogout}
            className="text-slate-500 hover:text-red-400 transition"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
