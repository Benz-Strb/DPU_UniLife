import { Sun, Moon, LogOut, ChevronLeft } from "lucide-react";
import Avatar from "./Avatar";

const pageLabels: Record<string, string> = {
  dashboard: "Dashboard",
  users: "User Management",
  admins: "Admin Management",
  posts: "Posts",
  reports: "Report Center",
  logs: "Activity Logs",
  settings: "System Settings",
};

interface TopNavProps {
  page: string;
  user: any;
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  onHome: () => void;
}

export default function TopNav({ page, user, isDark, onToggleTheme, onLogout, onHome }: TopNavProps) {
  const isHome = page === "home";

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-5 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={onHome}>
          <div className="w-7 h-7 rounded-xl bg-violet-600 flex items-center justify-center shadow shadow-violet-600/30">
            <span className="text-white font-black text-[11px]">D</span>
          </div>
          <span className="text-white font-black text-sm">DPU UniLife</span>
        </div>

        {!isHome && (
          <>
            <div className="w-px h-4 bg-slate-700" />
            <button
              onClick={onHome}
              className="flex items-center gap-1 text-slate-400 hover:text-white transition text-sm font-bold"
            >
              <ChevronLeft size={16} />
              <span>{pageLabels[page] ?? page}</span>
            </button>
          </>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition"
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        <div className="flex items-center gap-2">
          <Avatar
            avatarUrl={user?.avatarUrl}
            name={user?.fullName ?? "A"}
            size="xs"
            className="border border-violet-600/30"
          />
          <div className="hidden sm:block">
            <p className="text-white text-[11px] font-black leading-tight">{user?.fullName}</p>
            <p className="text-slate-500 text-[9px] uppercase tracking-wider">{user?.role?.replace("_", " ")}</p>
          </div>
        </div>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        <button
          onClick={onLogout}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-red-600/10 hover:text-red-400 transition"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
