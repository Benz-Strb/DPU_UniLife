import { useEffect, useState } from "react";
import { ShieldMinus, ShieldPlus, UserPlus, ChevronDown, ChevronUp } from "lucide-react";
import { adminService, facultyService } from "../lib/api";
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

  // Create Admin dropdown
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName: "", username: "", email: "", password: "", faculty: "", role: "ADMIN" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [faculties, setFaculties] = useState<{ code: string; name: string }[]>([]);

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const [adminData, superAdminData] = await Promise.all([
        adminService.getUsers({ role: "ADMIN", limit: 100 }),
        adminService.getUsers({ role: "SUPER_ADMIN", limit: 100 }),
      ]);
      const combined = [...(superAdminData.users ?? []), ...(adminData.users ?? [])];
      setAdmins(combined);
      setTotalAdmins(combined.length);
    } catch {
      setAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  useEffect(() => {
    facultyService.getAll().then(setFaculties).catch(() => setFaculties([]));
  }, []);

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
      fetchAdmins();
    } catch {
      alert("Failed to remove admin role");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    const { fullName, username, email, password, faculty, role } = createForm;
    if (!fullName || !username || !email || !password) {
      setCreateError("กรุณากรอกข้อมูลที่จำเป็นให้ครบ");
      return;
    }
    setCreateLoading(true);
    try {
      await adminService.createAdminAccount({ actorId: currentUser.id, fullName, username, email, password, faculty: faculty || undefined, role });
      setCreateSuccess(`สร้างบัญชี "${fullName}" สำเร็จ`);
      setCreateForm({ fullName: "", username: "", email: "", password: "", faculty: "", role: "ADMIN" });
      fetchAdmins();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || "เกิดข้อผิดพลาด");
    } finally {
      setCreateLoading(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="p-8">
      <PageHeader title="Admin Management" description="จัดการสิทธิ์ Admin ทั้งหมดในระบบ" className="mb-8" />

      {/* Create Admin — Dropdown */}
      <div className="mb-6 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <button
          onClick={() => { setCreateOpen(o => !o); setCreateError(""); setCreateSuccess(""); }}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-800/50 transition"
        >
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-violet-400" />
            <span className="text-white font-black text-sm uppercase tracking-widest">Create Admin Account</span>
          </div>
          {createOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {createOpen && (
          <form onSubmit={handleCreate} autoComplete="off" className="px-6 pb-6 border-t border-slate-800 pt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <input
                type="text" placeholder="ชื่อ-นามสกุล *" value={createForm.fullName}
                onChange={e => setCreateForm(p => ({ ...p, fullName: e.target.value }))}
                autoComplete="off"
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
              <input
                type="text" placeholder="Username *" value={createForm.username}
                onChange={e => setCreateForm(p => ({ ...p, username: e.target.value }))}
                autoComplete="off"
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
              <input
                type="email" placeholder="Email *" value={createForm.email}
                onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                autoComplete="off"
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
              <input
                type="password" placeholder="Password *" value={createForm.password}
                onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                autoComplete="new-password"
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
              <select
                value={createForm.faculty}
                onChange={e => setCreateForm(p => ({ ...p, faculty: e.target.value }))}
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 text-white"
              >
                <option value="">คณะ / วิทยาลัย (optional)</option>
                {faculties.map(f => (
                  <option key={f.code} value={f.code}>{f.code} — {f.name}</option>
                ))}
              </select>
              <select
                value={createForm.role}
                onChange={e => setCreateForm(p => ({ ...p, role: e.target.value }))}
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 text-white"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              </select>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <button
                type="submit" disabled={createLoading}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition"
              >
                <UserPlus size={15} />
                {createLoading ? "กำลังสร้าง..." : "สร้าง Account"}
              </button>
              {createError && <p className="text-red-400 text-sm">{createError}</p>}
              {createSuccess && <p className="text-green-400 text-sm">{createSuccess}</p>}
            </div>
          </form>
        )}
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
                    <Avatar avatarUrl={admin.avatarUrl} name={admin.fullName} size="md" />
                    <div>
                      <p className="text-white text-sm font-bold">{admin.fullName}</p>
                      <p className="text-slate-500 text-xs">@{admin.username} · {admin.faculty || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge label={admin.role} className={roleBadge[admin.role]} />
                    {admin.role !== "SUPER_ADMIN" && (
                      <IconButton
                        icon={<ShieldMinus size={16} />}
                        onClick={() => handleDemote(admin)}
                        disabled={actionLoading === admin.id}
                        variant="danger"
                        title="Remove Admin"
                      />
                    )}
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
