import { useEffect, useState } from "react";
import { ShieldMinus, ShieldPlus } from "lucide-react";
import { adminService } from "../lib/api";
import { roleBadge } from "../lib/badges";
import PageHeader from "../components/PageHeader";
import SearchInput from "../components/SearchInput";
import Avatar from "../components/Avatar";
import Badge from "../components/Badge";
import IconButton from "../components/IconButton";

interface AdminsProps {
  currentUser: any;
}

export default function Admins({ currentUser }: AdminsProps) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

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
      <PageHeader title="Admin Management" description="จัดการสิทธิ์ Admin ทั้งหมดในระบบ" className="mb-8" />

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
                    <Avatar avatarUrl={admin.avatarUrl} name={admin.fullName} size="md" />
                    <div>
                      <p className="text-white text-sm font-bold">{admin.fullName}</p>
                      <p className="text-slate-500 text-xs">@{admin.username} · {admin.faculty || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge label={admin.role} className={roleBadge[admin.role]} />
                    <IconButton
                      icon={<ShieldMinus size={16} />}
                      onClick={() => handleDemote(admin)}
                      disabled={actionLoading === admin.id}
                      variant="danger"
                      title="Remove Admin"
                    />
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

          <div className="mb-4">
            <SearchInput
              value={searchInput}
              onChange={setSearchInput}
              onSubmit={handleSearch}
              placeholder="ค้นหาชื่อ, username, รหัสนักศึกษา..."
              submitLabel="ค้นหา"
              loading={searching}
              fullWidth
            />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {searchResults.length === 0 ? (
              <p className="text-center py-10 text-slate-600 text-sm">ค้นหา Student เพื่อ promote</p>
            ) : (
              searchResults.map(user => (
                <div key={user.id} className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition">
                  <div className="flex items-center gap-3">
                    <Avatar avatarUrl={user.avatarUrl} name={user.fullName} size="md" variant="slate" />
                    <div>
                      <p className="text-white text-sm font-bold">{user.fullName}</p>
                      <p className="text-slate-500 text-xs">@{user.username} · {user.faculty || "—"} · เข้าเมื่อ {formatDate(user.createdAt)}</p>
                    </div>
                  </div>
                  <IconButton
                    icon={<ShieldPlus size={16} />}
                    onClick={() => handlePromote(user)}
                    disabled={actionLoading === user.id}
                    variant="info"
                    title="Promote to Admin"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
