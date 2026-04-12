import { useEffect, useState } from "react";
import { adminService } from "../lib/api";

export default function Logs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const limit = 15;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await adminService.getLoginLogs({ page, limit });
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  const statusBadge: Record<string, string> = {
    SUCCESS: "bg-emerald-600/20 text-emerald-400",
    FAILED: "bg-red-600/20 text-red-400",
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Login Logs</h1>
        <p className="text-slate-400 text-sm mt-1">{total} records</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">User</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">IP</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-500 text-sm">Loading...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-500 text-sm">No logs found</td>
              </tr>
            ) : (
              logs.map((log, i) => (
                <tr key={i} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition">
                  <td className="px-5 py-3">
                    <p className="text-white text-sm font-bold">{log.user?.fullName ?? "—"}</p>
                    <p className="text-slate-500 text-xs">@{log.user?.username ?? "unknown"}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${statusBadge[log.status] ?? "bg-slate-700 text-slate-300"}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-sm font-mono">{log.ipAddress ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-400 text-sm">{formatDate(log.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
