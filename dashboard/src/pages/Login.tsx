import { useState } from "react";
import { authService } from "../lib/api";

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authService.login(studentId, password);
      const user = data.user;
      if (user.role !== "SUPER_ADMIN") {
        setError("Access denied: Super Admin only");
        return;
      }
      onLogin(user);
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-center mb-10">
            <h1 className="text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-linear-to-r from-violet-400 via-fuchsia-400 to-violet-400 drop-shadow-[0_2px_10px_rgba(168,85,247,0.5)] mb-2">
              DPU
            </h1>
            <h1 className="text-6xl font-black tracking-tighter bg-clip-text text-transparent bg-linear-to-r from-violet-400 via-fuchsia-400 to-violet-400 drop-shadow-[0_2px_10px_rgba(168,85,247,0.5)] mb-2">
              UniLife
            </h1>
            <p className="text-white/70 text-lg font-medium tracking-wide">
              Admin Dashboard
            </p>
          </div>
      
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                Email Super Admin
              </label>
              <input
                type="text"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                placeholder="Email Super Admin"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition"
                required
              />
            </div>

            {error && <p className="text-red-400 text-xs font-bold">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-black rounded-xl py-3 text-sm uppercase tracking-widest transition"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
      );
}
