import { useEffect, useState } from "react";
import { Users, FileText, Flag, ShieldAlert } from "lucide-react";
import { adminService } from "../lib/api";
import StatCard from "../components/StatCard";
import BarChart from "../components/BarChart";
import PageHeader from "../components/PageHeader";

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
      <PageHeader title="Dashboard" description="DPU UniLife — Overview" className="mb-8" />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Users"
          value={stats?.users?.total}
          sub={`${stats?.users?.active ?? 0} active · ${stats?.users?.suspended ?? 0} suspended`}
          icon={Users}
          color="bg-violet-600"
        />
        <StatCard label="Posts" value={stats?.posts?.total} icon={FileText} color="bg-blue-600" />
        <StatCard label="Open Reports" value={stats?.reports?.open} icon={Flag} color="bg-red-600" />
        <StatCard
          label="Banned Users"
          value={stats?.users?.banned ?? 0}
          sub="active temp bans"
          icon={ShieldAlert}
          color="bg-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <BarChart title="Posts (7 days)" data={stats?.charts?.postsPerDay ?? {}} max={20} color="violet" />
        <BarChart title="Logins (7 days)" data={stats?.charts?.loginsPerDay ?? {}} max={50} color="emerald" />
      </div>
    </div>
  );
}
