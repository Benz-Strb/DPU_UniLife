import { useEffect, useState } from "react";
import { Ban, CheckCircle, ShieldCheck, ShieldOff } from "lucide-react";
import { adminService } from "../lib/api";
import { roleBadge, userStatusBadge } from "../lib/badges";
import PageHeader from "../components/PageHeader";
import FilterTabs from "../components/FilterTabs";
import SearchInput from "../components/SearchInput";
import DataTable from "../components/DataTable";
import UserCell from "../components/UserCell";
import Badge from "../components/Badge";
import IconButton from "../components/IconButton";
import Pagination from "../components/Pagination";
import BanUserModal from "../components/BanUserModal";

interface UsersProps {
  currentUser: any;
}

const ROLE_TABS = [
  { label: "All", value: "" },
  { label: "Students", value: "STUDENT" },
  { label: "Admins", value: "ADMIN" },
];

const COLUMNS = [
  { label: "Name" },
  { label: "Student ID" },
  { label: "Faculty" },
  { label: "Role" },
  { label: "Status" },
  { label: "Ban" },
  { label: "", className: "px-5 py-3" },
];

export default function Users({ currentUser }: UsersProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const [banTarget, setBanTarget] = useState<{ id: string; name: string; username: string } | null>(null);
  const [banLoading, setBanLoading] = useState(false);

  const limit = 10;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminService.getUsers({
        page, limit,
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

  useEffect(() => { fetchUsers(); }, [page, search, roleFilter]);

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

  const handleBanSubmit = async (days: number) => {
    if (!banTarget) return;
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
      <PageHeader title="Users" description={`${total} total users`} />

      <FilterTabs items={ROLE_TABS} active={roleFilter} onChange={handleRoleTab} />

      <div className="mt-4 mb-6">
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={handleSearch}
          placeholder="Search name, username, student ID..."
        />
      </div>

      <DataTable
        columns={COLUMNS}
        data={users}
        loading={loading}
        emptyMessage="No users found"
        keyExtractor={u => u.id}
        renderRow={user => (
          <>
            <td className="px-5 py-3">
              <UserCell
                avatarUrl={user.avatarUrl}
                name={user.fullName}
                username={user.username}
              />
            </td>
            <td className="px-5 py-3 text-slate-300 text-sm">{user.studentId}</td>
            <td className="px-5 py-3 text-slate-300 text-sm">{user.faculty || "—"}</td>
            <td className="px-5 py-3">
              <Badge label={user.role} className={roleBadge[user.role]} />
            </td>
            <td className="px-5 py-3">
              <Badge label={user.status} className={userStatusBadge[user.status]} />
            </td>
            <td className="px-5 py-3">
              {isBanned(user) ? (
                <span className="text-[10px] font-black text-orange-400">ถึง {formatDate(user.bannedUntil)}</span>
              ) : (
                <span className="text-slate-600 text-xs">—</span>
              )}
            </td>
            <td className="px-5 py-3 text-right">
              {user.role !== "SUPER_ADMIN" && user.id !== currentUser.id && (
                <div className="flex items-center justify-end gap-1">
                  {isBanned(user) ? (
                    <IconButton
                      icon={<ShieldOff size={16} />}
                      onClick={() => handleUnban(user)}
                      variant="success"
                      title="Unban"
                    />
                  ) : (
                    <IconButton
                      icon={<ShieldCheck size={16} />}
                      onClick={() => setBanTarget({ id: user.id, name: user.fullName, username: user.username })}
                      variant="warning"
                      title="Ban"
                    />
                  )}
                  <IconButton
                    icon={user.status === "SUSPENDED" ? <CheckCircle size={16} /> : <Ban size={16} />}
                    onClick={() => handleStatusToggle(user)}
                    variant={user.status === "SUSPENDED" ? "success" : "danger"}
                    title={user.status === "SUSPENDED" ? "Unsuspend" : "Suspend"}
                  />
                </div>
              )}
            </td>
          </>
        )}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <BanUserModal
        target={banTarget}
        description="จะโพสต์ไม่ได้และเห็นโพสต์ไม่ได้ในช่วงเวลาที่ถูกแบน"
        loading={banLoading}
        onClose={() => setBanTarget(null)}
        onSubmit={handleBanSubmit}
      />
    </div>
  );
}
