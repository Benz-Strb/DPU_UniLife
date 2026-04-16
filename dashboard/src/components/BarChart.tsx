import { TrendingUp } from "lucide-react";

type BarColor = "violet" | "emerald" | "blue";

const barColorClass: Record<BarColor, string> = {
  violet:  "bg-violet-500",
  emerald: "bg-emerald-500",
  blue:    "bg-blue-500",
};

const iconColorClass: Record<BarColor, string> = {
  violet:  "text-violet-400",
  emerald: "text-emerald-400",
  blue:    "text-blue-400",
};

interface BarChartProps {
  title: string;
  data: Record<string, number>;
  max: number;
  color?: BarColor;
}

export default function BarChart({ title, data, max, color = "violet" }: BarChartProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className={iconColorClass[color]} />
        <span className="text-white font-black text-sm">{title}</span>
      </div>
      <div className="space-y-2">
        {Object.entries(data).map(([label, count]) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-slate-500 text-xs w-24">{label}</span>
            <div className="flex-1 bg-slate-800 rounded-full h-2">
              <div
                className={`${barColorClass[color]} h-2 rounded-full`}
                style={{ width: `${Math.min((count / max) * 100, 100)}%` }}
              />
            </div>
            <span className="text-slate-400 text-xs w-6 text-right">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
