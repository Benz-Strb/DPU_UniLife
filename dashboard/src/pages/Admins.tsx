import { useEffect, useState } from "react";
import { Search, ShieldMinus, ShieldPlus } from "lucide-react";
import { adminService } from "../lib/api";

interface AdminsProps {
  currentUser: any;
}

const roleBadge: Record<string, string> = {
  STUDENT: "bg-slate-700 text-slate-300",
  ADMIN: "bg-violet-600/20 text-violet-400",
  SUPER_ADMIN: "bg-amber-600/20 text-amber-400",
};

export default function Admins({ currentUser }: AdminsProps) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  // Search to promote
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const data = await adminService.getUsers({ role: "ADMIN", limit: 100 });
      setAdmins(data.users ?? []);
      setTotalAdmins(data.total ?? 0);
    } catch {
      setAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setSearching(true);
    try {
      const data = await adminService.getUsers({ q: searchInput.trim(), role: "STUDENT", limit: 10 });
      setSearchResults(data.users ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handlePromote = async (user: any) => {
    if (!confirm(`Promote ${user.fullName} to ADMIN?`)) return;
    setActionLoading(user.id);
    try {
      await adminService.updateUserRole(user.id, "ADMIN", currentUser.id);
      setSearchResults(prev => prev.filter(u => u.id !== user.id));
      fetchAdmins();
    } catch {
      alert("Failed to promote user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDemote = async (user: any) => {
    if (!confirm(`Remove admin role from ${user.fullName}?`)) return;
    setActionLoading(user.id);
    try {
      await adminService.updateUserRole(user.id, "STUDENT", currentUser.id);
      setAdmins(prev => prev.filter(u => u.id !== user.id));
      setTotalAdmins(t => t - 1);
    } catch {
      alert("Failed to remove admin role");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Admin Management</h1>
        <p className="text-slate-400 text-sm mt-1">จัดการสิทธิ์ Admin ทั้งหมดในระบบ</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Current Admins */}
        <div>
          <h2 className="text-white font-black text-sm uppercase tracking-widest mb-3">
            Admins ปัจจุบัน
            <span className="ml-2 text-violet-400 text-xs font-bold normal-case">{totalAdmins} คน</span>
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {loadingAdmins ? (
              <p className="text-center py-10 text-slate-500 text-sm">Loading...</p>
            ) : admins.length === 0 ? (
              <p className="text-center py-10 text-slate-500 text-sm">ยังไม่มี Admin</p>
            ) : (
              admins.map(admin => (
                <div key={admin.id} className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition">
                  <div className="flex items-center gap-3">
                    {admin.avatarUrl ? (
                      <img
                        src={admin.avatarUrl.startsWith("http") ? admin.avatarUrl : `http://localhost:8080${admin.avatarUrl}`}
                        className="w-9 h-9 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center">
                        <span className="text-violet-400 font-black text-sm">{admin.fullName?.charAt(0)}</span>
                      </div>
                    )}
                    <div>
                      <p className="text-white text-sm font-bold">{admin.fullName}</p>
                      <p className="text-slate-500 text-xs">@{admin.username} · {admin.faculty || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${roleBadge[admin.role]}`}>
                      {admin.role}
                    </span>
                    <button
                      onClick={() => handleDemote(admin)}
                      disabled={actionLoading === admin.id}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-600/10 transition disabled:opacity-40"
                      title="Remove Admin"
                    >
                      <ShieldMinus size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Promote User */}
        <div>
          <h2 className="text-white font-black text-sm uppercase tracking-widest mb-3">เพิ่ม Admin ใหม่</h2>
          <p className="text-slate-500 text-xs mb-3">ค้นหา Student แล้ว promote เป็น Admin</p>

          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="ค้นหาชื่อ, username, รหัสนักศึกษา..."
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-violet-500 transition"
              />
            </div>
            <button type="submit" disabled={searching}
              className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-xl px-4 py-2.5 text-sm transition">
              {searching ? "..." : "ค้นหา"}
            </button>
          </form>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {searchResults.length === 0 ? (
              <p className="text-center py-10 text-slate-600 text-sm">ค้นหา Student เพื่อ promote</p>
            ) : (
              searchResults.map(user => (
                <div key={user.id} className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition">
                  <div className="flex items-center gap-3">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl.startsWith("http") ? user.avatarUrl : `http://localhost:8080${user.avatarUrl}`}
                        className="w-9 h-9 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center">
                        <span className="text-slate-400 font-black text-sm">{user.fullName?.charAt(0)}</span>
                      </div>
                    )}
                    <div>
                      <p className="text-white text-sm font-bold">{user.fullName}</p>
                      <p className="text-slate-500 text-xs">@{user.username} · {user.faculty || "—"} · เข้าเมื่อ {formatDate(user.createdAt)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePromote(user)}
                    disabled={actionLoading === user.id}
                    className="p-2 rounded-lg text-violet-400 hover:bg-violet-600/10 transition disabled:opacity-40"
                    title="Promote to Admin"
                  >
                    <ShieldPlus size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
