import { LayoutDashboard, Users, FileText, Flag, ScrollText, Settings2, ShieldCheck } from "lucide-react";

const navItems = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "users", icon: Users, label: "Users" },
  { id: "admins", icon: ShieldCheck, label: "Admin Management" },
  { id: "posts", icon: FileText, label: "Posts" },
  { id: "reports", icon: Flag, label: "Reports" },
  { id: "logs", icon: ScrollText, label: "Logs" },
  { id: "settings", icon: Settings2, label: "Settings" },
];

interface SidebarProps {
  page: string;
  onNavigate: (page: string) => void;
  user: any;
}

export default function Sidebar({ page, onNavigate }: SidebarProps) {

  return (
    <aside className="w-16 h-full bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 gap-1">
      {navItems
        .map(({ id, icon: Icon, label }) => {
          const isActive = page === id;
          return (
            <div key={id} className="relative group w-full flex justify-center">
              <button
                onClick={() => onNavigate(id)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150 ${
                  isActive
                    ? "bg-violet-600 text-white"
                    : "text-slate-500 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
              </button>
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-400 rounded-r-full" />
              )}
              {/* Tooltip */}
              <div className="absolute left-14 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-800 border border-slate-700 text-white text-[11px] font-bold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                {label}
              </div>
            </div>
          );
        })}
    </aside>
  );
}
