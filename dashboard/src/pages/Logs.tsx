import { useEffect, useState } from "react";
import { adminService } from "../lib/api";
import { loginStatusBadge } from "../lib/badges";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import UserCell from "../components/UserCell";
import Badge from "../components/Badge";
import Pagination from "../components/Pagination";

const COLUMNS = [
  { label: "User" },
  { label: "Status" },
  { label: "IP" },
  { label: "Time" },
];

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

  useEffect(() => { fetchLogs(); }, [page]);

  const totalPages = Math.ceil(total / limit);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="p-8">
      <PageHeader title="Login Logs" description={`${total} records`} />

      <DataTable
        columns={COLUMNS}
        data={logs}
        loading={loading}
        emptyMessage="No logs found"
        keyExtractor={(_, i) => String(i)}
        renderRow={log => (
          <>
            <td className="px-5 py-3">
              <UserCell
                name={log.user?.fullName ?? "—"}
                username={log.user?.username ?? "unknown"}
              />
            </td>
            <td className="px-5 py-3">
              <Badge label={log.status} className={loginStatusBadge[log.status]} />
            </td>
            <td className="px-5 py-3 text-slate-400 text-sm font-mono">{log.ipAddress ?? "—"}</td>
            <td className="px-5 py-3 text-slate-400 text-sm">{formatDate(log.createdAt)}</td>
          </>
        )}
      />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
