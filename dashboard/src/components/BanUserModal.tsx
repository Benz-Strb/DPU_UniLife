import { useState } from "react";

const PRESET_DAYS = ["1", "3", "7", "14", "30"];

interface BanTarget {
  id: string;
  name: string;
  username: string;
}

interface BanUserModalProps {
  target: BanTarget | null;
  description?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (days: number) => Promise<void>;
}

export default function BanUserModal({ target, description, loading = false, onClose, onSubmit }: BanUserModalProps) {
  const [banDays, setBanDays] = useState("3");

  if (!target) return null;

  const handleSubmit = async () => {
    const days = parseInt(banDays, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      alert("กรุณาระบุจำนวนวันระหว่าง 1–365");
      return;
    }
    await onSubmit(days);
    setBanDays("3");
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-white font-black text-lg mb-1">แบน User ชั่วคราว</h2>
        <p className="text-slate-400 text-sm mb-5">
          <span className="text-white font-bold">{target.name}</span> (@{target.username})
          {description && <><br />{description}</>}
        </p>

        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
          จำนวนวันที่แบน
        </label>
        <div className="flex gap-2 mb-4">
          {PRESET_DAYS.map(d => (
            <button
              key={d}
              onClick={() => setBanDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                banDays === d ? "bg-orange-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
        <input
          type="number" min="1" max="365" value={banDays}
          onChange={e => setBanDays(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-500 transition mb-5"
          placeholder="หรือระบุเอง..."
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl py-2.5 text-sm transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-black rounded-xl py-2.5 text-sm transition"
          >
            {loading ? "กำลังแบน..." : `แบน ${banDays} วัน`}
          </button>
        </div>
      </div>
    </div>
  );
}
