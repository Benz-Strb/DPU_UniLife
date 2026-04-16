import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value?: number | string | null;
  sub?: string;
  icon: LucideIcon;
  color: string;
}

export default function StatCard({ label, value, sub, icon: Icon, color }: StatCardProps) {
  const display = value != null
    ? typeof value === "number" ? value.toLocaleString() : value
    : "—";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className="text-3xl font-black text-white">{display}</p>
      {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}
