import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { reportService, adminService } from "../lib/api";

interface ReportsProps {
  currentUser: any;
}

const STATUS_LIST = ["ALL", "OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"];

const statusBadge: Record<string, string> = {
  OPEN: "bg-red-600/20 text-red-400",
  IN_REVIEW: "bg-amber-600/20 text-amber-400",
  RESOLVED: "bg-emerald-600/20 text-emerald-400",
  DISMISSED: "bg-slate-700 text-slate-400",
};

export default function Reports({ currentUser }: ReportsProps) {
  const [reports, setReports] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // Ban modal
  const [banTarget, setBanTarget] = useState<any>(null); // { userId, name, username }
  const [banDays, setBanDays] = useState("3");
  const [banLoading, setBanLoading] = useState(false);

  const limit = 15;

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await reportService.getReports({
        page,
        limit,
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

  const getTargetUser = (report: any) => {
    if (report.targetUser) return report.targetUser;
    if (report.targetPost?.authorId) return { id: report.targetPost.authorId, fullName: report.targetPost.authorId, username: "—" };
    return null;
  };

  const handleBanSubmit = async () => {
    if (!banTarget) return;
    const days = parseInt(banDays, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      alert("กรุณาระบุจำนวนวัน 1–365");
      return;
    }
    setBanLoading(true);
    try {
      await adminService.banUser(banTarget.userId, days, currentUser.id);
      setBanTarget(null);
      alert(`แบน ${banTarget.name} เป็นเวลา ${days} วันแล้ว`);
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
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Reports</h1>
        <p className="text-slate-400 text-sm mt-1">{total} reports</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_LIST.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
              statusFilter === s ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Reporter</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Target</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Reason</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Date</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-500 text-sm">Loading...</td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-500 text-sm">No reports found</td></tr>
            ) : (
              reports.map(report => {
                const targetUser = report.targetUser;
                return (
                  <tr key={report.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition">
                    <td className="px-5 py-3">
                      <p className="text-white text-sm font-bold">{report.reporter?.fullName ?? "—"}</p>
                      <p className="text-slate-500 text-xs">@{report.reporter?.username ?? "unknown"}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase px-2 py-1 rounded-md bg-slate-700 text-slate-300">
                          {report.targetType}
                        </span>
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
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${statusBadge[report.status] ?? "bg-slate-700 text-slate-300"}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-sm">{formatDate(report.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {targetUser && targetUser.role !== "SUPER_ADMIN" && (
                          <button
                            onClick={() => { setBanTarget({ userId: targetUser.id, name: targetUser.fullName, username: targetUser.username }); setBanDays("3"); }}
                            className="p-2 rounded-lg text-orange-400 hover:bg-orange-600/10 transition"
                            title="Ban user"
                          >
                            <ShieldCheck size={16} />
                          </button>
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
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
              <span className="text-white font-bold">{banTarget.name}</span> (@{banTarget.username})
              <br />จะโพสต์ไม่ได้และล็อกอินเข้าแอปไม่ได้ในช่วงเวลาที่ถูกแบน
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
            <input type="number" min="1" max="365" value={banDays}
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
