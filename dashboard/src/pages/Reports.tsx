import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { reportService, adminService } from "../lib/api";
import { reportStatusBadge } from "../lib/badges";
import PageHeader from "../components/PageHeader";
import FilterTabs from "../components/FilterTabs";
import DataTable from "../components/DataTable";
import Badge from "../components/Badge";
import IconButton from "../components/IconButton";
import Pagination from "../components/Pagination";
import BanUserModal from "../components/BanUserModal";

interface ReportsProps {
  currentUser: any;
}

const STATUS_TABS = ["ALL", "OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"].map(s => ({ label: s, value: s }));

const COLUMNS = [
  { label: "Reporter" },
  { label: "Target" },
  { label: "Reason" },
  { label: "Status" },
  { label: "Date" },
  { label: "", className: "px-5 py-3" },
];

export default function Reports({ currentUser }: ReportsProps) {
  const [reports, setReports] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const [banTarget, setBanTarget] = useState<{ id: string; name: string; username: string } | null>(null);
  const [banLoading, setBanLoading] = useState(false);

  const limit = 15;

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await reportService.getReports({
        page, limit,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      setReports(data.data ?? []);
      setTotal(data.pagination?.total ?? 0);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); }, [statusFilter]);
  useEffect(() => { fetchReports(); }, [page, statusFilter]);

  const handleStatusChange = async (report: any, newStatus: string) => {
    try {
      await reportService.updateStatus(report.id, newStatus, currentUser.id);
      setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: newStatus } : r));
    } catch {
      alert("Failed to update report status");
    }
  };

  const handleBanSubmit = async (days: number) => {
    if (!banTarget) return;
    setBanLoading(true);
    try {
      await adminService.banUser(banTarget.id, days, currentUser.id);
      alert(`แบน ${banTarget.name} เป็นเวลา ${days} วันแล้ว`);
      setBanTarget(null);
    } catch {
      alert("Failed to ban user");
    } finally {
      setBanLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="p-8">
      <PageHeader title="Reports" description={`${total} reports`} />

      <div className="mb-6">
        <FilterTabs items={STATUS_TABS} active={statusFilter} onChange={setStatusFilter} />
      </div>

      <DataTable
        columns={COLUMNS}
        data={reports}
        loading={loading}
        emptyMessage="No reports found"
        keyExtractor={r => r.id}
        renderRow={report => {
          const targetUser = report.targetUser;
          return (
            <>
              <td className="px-5 py-3">
                <p className="text-white text-sm font-bold">{report.reporter?.fullName ?? "—"}</p>
                <p className="text-slate-500 text-xs">@{report.reporter?.username ?? "unknown"}</p>
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-1.5">
                  <Badge label={report.targetType} />
                  {targetUser && (
                    <p className="text-slate-300 text-xs">{targetUser.fullName ?? "—"}</p>
                  )}
                </div>
                {report.targetPost?.content && (
                  <p className="text-slate-500 text-xs truncate max-w-[160px] mt-0.5">{report.targetPost.content}</p>
                )}
              </td>
              <td className="px-5 py-3 text-slate-300 text-sm max-w-xs">
                <p className="truncate">{report.reason}</p>
                {report.detail && <p className="text-slate-500 text-xs truncate">{report.detail}</p>}
              </td>
              <td className="px-5 py-3">
                <Badge label={report.status} className={reportStatusBadge[report.status]} />
              </td>
              <td className="px-5 py-3 text-slate-400 text-sm">{formatDate(report.createdAt)}</td>
              <td className="px-5 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {targetUser && targetUser.role !== "SUPER_ADMIN" && (
                    <IconButton
                      icon={<ShieldCheck size={16} />}
                      onClick={() => setBanTarget({ id: targetUser.id, name: targetUser.fullName, username: targetUser.username })}
                      variant="warning"
                      title="Ban user"
                    />
                  )}
                  <select
                    value={report.status}
                    onChange={e => handleStatusChange(report, e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 outline-none"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="DISMISSED">Dismissed</option>
                  </select>
                </div>
              </td>
            </>
          );
        }}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <BanUserModal
        target={banTarget}
        description="จะโพสต์ไม่ได้และล็อกอินเข้าแอปไม่ได้ในช่วงเวลาที่ถูกแบน"
        loading={banLoading}
        onClose={() => setBanTarget(null)}
        onSubmit={handleBanSubmit}
      />
    </div>
  );
}
