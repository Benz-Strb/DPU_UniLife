import { useEffect, useState } from "react";
import { Users, FileText, Flag, MessageSquare, TrendingUp } from "lucide-react";
import { adminService } from "../lib/api";

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className="text-3xl font-black text-white">{value?.toLocaleString() ?? "—"}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboard()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">DPU UniLife — Overview</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Users"
          value={stats?.users?.total}
          sub={`${stats?.users?.active ?? 0} active · ${stats?.users?.suspended ?? 0} suspended`}
          icon={Users}
          color="bg-violet-600"
        />
        <StatCard
          label="Posts"
          value={stats?.posts?.total}
          icon={FileText}
          color="bg-blue-600"
        />
        <StatCard
          label="Open Reports"
          value={stats?.reports?.open}
          icon={Flag}
          color="bg-red-600"
        />
        <StatCard
          label="Messages"
          value={stats?.messages?.total}
          icon={MessageSquare}
          color="bg-emerald-600"
        />
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-violet-400" />
            <span className="text-white font-black text-sm">Posts (7 days)</span>
          </div>
          <div className="space-y-2">
            {stats?.charts?.postsPerDay && Object.entries(stats.charts.postsPerDay).map(([day, count]: any) => (
              <div key={day} className="flex items-center gap-3">
                <span className="text-slate-500 text-xs w-24">{day}</span>
                <div className="flex-1 bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-violet-500 h-2 rounded-full"
                    style={{ width: `${Math.min((count / 20) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-slate-400 text-xs w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-emerald-400" />
            <span className="text-white font-black text-sm">Logins (7 days)</span>
          </div>
          <div className="space-y-2">
            {stats?.charts?.loginsPerDay && Object.entries(stats.charts.loginsPerDay).map(([day, count]: any) => (
              <div key={day} className="flex items-center gap-3">
                <span className="text-slate-500 text-xs w-24">{day}</span>
                <div className="flex-1 bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${Math.min((count / 50) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-slate-400 text-xs w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
