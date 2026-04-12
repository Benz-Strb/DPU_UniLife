import { useEffect, useState } from "react";
import { Search, Ban, CheckCircle } from "lucide-react";
import { adminService } from "../lib/api";

interface UsersProps {
  currentUser: any;
}

export default function Users({ currentUser }: UsersProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  const limit = 10;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminService.getUsers({ page, limit, search: search || undefined });
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
  }, [page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
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

  const totalPages = Math.ceil(total / limit);

  const roleBadge: Record<string, string> = {
    STUDENT: "bg-slate-700 text-slate-300",
    ADMIN: "bg-violet-600/20 text-violet-400",
    SUPER_ADMIN: "bg-amber-600/20 text-amber-400",
  };

  const statusBadge: Record<string, string> = {
    ACTIVE: "bg-emerald-600/20 text-emerald-400",
    SUSPENDED: "bg-red-600/20 text-red-400",
    DEACTIVATED: "bg-slate-700 text-slate-400",
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Users</h1>
        <p className="text-slate-400 text-sm mt-1">{total} total users</p>
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
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500 text-sm">Loading...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-500 text-sm">No users found</td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition">
                  <td className="px-5 py-3">
                    <p className="text-white text-sm font-bold">{user.fullName}</p>
                    <p className="text-slate-500 text-xs">@{user.username}</p>
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
                  <td className="px-5 py-3 text-right">
                    {user.role !== "SUPER_ADMIN" && user.id !== currentUser.id && (
                      <button
                        onClick={() => handleStatusToggle(user)}
                        className={`p-2 rounded-lg transition ${
                          user.status === "SUSPENDED"
                            ? "text-emerald-400 hover:bg-emerald-600/10"
                            : "text-red-400 hover:bg-red-600/10"
                        }`}
                        title={user.status === "SUSPENDED" ? "Unsuspend" : "Suspend"}
                      >
                        {user.status === "SUSPENDED"
                          ? <CheckCircle size={16} />
                          : <Ban size={16} />
                        }
                      </button>
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
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-slate-700 transition"
            >
              Prev
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-slate-700 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
