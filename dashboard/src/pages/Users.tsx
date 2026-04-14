import { useEffect, useState } from "react";
import { Search, Ban, CheckCircle, ShieldCheck, ShieldOff } from "lucide-react";
import { adminService } from "../lib/api";

interface UsersProps {
  currentUser: any;
}

const ROLE_TABS = [
  { label: "All", value: "" },
  { label: "Students", value: "STUDENT" },
  { label: "Admins", value: "ADMIN" },
];

const roleBadge: Record<string, string> = {
  STUDENT: "bg-slate-700 text-slate-300",
  ADMIN: "bg-violet-600/20 text-violet-400",
  SUPER_ADMIN: "bg-amber-600/20 text-amber-400",
};

const statusBadge: Record<string, string> = {
  ACTIVE: "bg-emerald-600/20 text-emerald-400",
  SUSPENDED: "bg-red-600/20 text-red-400",
  DEACTIVATED: "bg-slate-700 text-slate-400",
  PENDING: "bg-amber-600/20 text-amber-400",
};

export default function Users({ currentUser }: UsersProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Ban modal state
  const [banTarget, setBanTarget] = useState<any>(null);
  const [banDays, setBanDays] = useState("3");
  const [banLoading, setBanLoading] = useState(false);

  const limit = 10;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminService.getUsers({
        page,
        limit,
        q: search || undefined,
        role: roleFilter || undefined,
      });
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleRoleTab = (role: string) => {
    setRoleFilter(role);
    setPage(1);
  };

  const handleStatusToggle = async (user: any) => {
    const newStatus = user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    const action = newStatus === "SUSPENDED" ? "suspend" : "unsuspend";
    if (!confirm(`Are you sure you want to ${action} ${user.fullName}?`)) return;
    try {
      await adminService.updateUserStatus(user.id, newStatus, currentUser.id);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
    } catch {
      alert("Failed to update user status");
    }
  };

  const handleBanSubmit = async () => {
    if (!banTarget) return;
    const days = parseInt(banDays, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      alert("กรุณาระบุจำนวนวันระหว่าง 1–365");
      return;
    }
    setBanLoading(true);
    try {
      const result = await adminService.banUser(banTarget.id, days, currentUser.id);
      setUsers(prev => prev.map(u => u.id === banTarget.id ? { ...u, bannedUntil: result.user.bannedUntil } : u));
      setBanTarget(null);
    } catch {
      alert("Failed to ban user");
    } finally {
      setBanLoading(false);
    }
  };

  const handleUnban = async (user: any) => {
    if (!confirm(`Unban ${user.fullName}?`)) return;
    try {
      await adminService.banUser(user.id, 0, currentUser.id);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, bannedUntil: null } : u));
    } catch {
      alert("Failed to unban user");
    }
  };

  const isBanned = (user: any) => user.bannedUntil && new Date(user.bannedUntil) > new Date();

  const totalPages = Math.ceil(total / limit);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Users</h1>
        <p className="text-slate-400 text-sm mt-1">{total} total users</p>
      </div>

      {/* Role Tabs */}
      <div className="flex gap-2 mb-4">
        {ROLE_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => handleRoleTab(tab.value)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
              roleFilter === tab.value
                ? "bg-violet-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search name, username, student ID..."
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-violet-500 transition"
          />
        </div>
        <button
          type="submit"
          className="bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl px-4 py-2.5 text-sm transition"
        >
          Search
        </button>
      </form>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Name</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Student ID</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Faculty</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Role</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Ban</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500 text-sm">Loading...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500 text-sm">No users found</td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl.startsWith("http") ? user.avatarUrl : `http://localhost:8080${user.avatarUrl}`} className="w-8 h-8 rounded-xl object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-violet-600/20 flex items-center justify-center">
                          <span className="text-violet-400 font-black text-xs">{user.fullName?.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-white text-sm font-bold">{user.fullName}</p>
                        <p className="text-slate-500 text-xs">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-300 text-sm">{user.studentId}</td>
                  <td className="px-5 py-3 text-slate-300 text-sm">{user.faculty || "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${roleBadge[user.role] ?? "bg-slate-700 text-slate-300"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${statusBadge[user.status] ?? "bg-slate-700 text-slate-300"}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {isBanned(user) ? (
                      <div>
                        <span className="text-[10px] font-black text-orange-400 block">ถึง {formatDate(user.bannedUntil)}</span>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {user.role !== "SUPER_ADMIN" && user.id !== currentUser.id && (
                      <div className="flex items-center justify-end gap-1">
                        {isBanned(user) ? (
                          <button
                            onClick={() => handleUnban(user)}
                            className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-600/10 transition"
                            title="Unban"
                          >
                            <ShieldOff size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => { setBanTarget(user); setBanDays("3"); }}
                            className="p-2 rounded-lg text-orange-400 hover:bg-orange-600/10 transition"
                            title="Ban"
                          >
                            <ShieldCheck size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusToggle(user)}
                          className={`p-2 rounded-lg transition ${
                            user.status === "SUSPENDED"
                              ? "text-emerald-400 hover:bg-emerald-600/10"
                              : "text-red-400 hover:bg-red-600/10"
                          }`}
                          title={user.status === "SUSPENDED" ? "Unsuspend" : "Suspend"}
                        >
                          {user.status === "SUSPENDED" ? <CheckCircle size={16} /> : <Ban size={16} />}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-slate-500 text-xs">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-slate-700 transition">Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-slate-700 transition">Next</button>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {banTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-white font-black text-lg mb-1">แบน User ชั่วคราว</h2>
            <p className="text-slate-400 text-sm mb-5">
              <span className="text-white font-bold">{banTarget.fullName}</span> (@{banTarget.username})
              <br />จะโพสต์ไม่ได้และเห็นโพสต์ไม่ได้ในช่วงเวลาที่ถูกแบน
            </p>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">จำนวนวันที่แบน</label>
            <div className="flex gap-2 mb-4">
              {["1", "3", "7", "14", "30"].map(d => (
                <button key={d} onClick={() => setBanDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${banDays === d ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                  {d}d
                </button>
              ))}
            </div>
            <input
              type="number" min="1" max="365" value={banDays}
              onChange={e => setBanDays(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-500 transition mb-5"
              placeholder="หรือระบุเอง..."
            />
            <div className="flex gap-3">
              <button onClick={() => setBanTarget(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl py-2.5 text-sm transition">
                ยกเลิก
              </button>
              <button onClick={handleBanSubmit} disabled={banLoading}
                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-black rounded-xl py-2.5 text-sm transition">
                {banLoading ? "กำลังแบน..." : `แบน ${banDays} วัน`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
