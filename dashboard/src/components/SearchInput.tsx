import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder?: string;
  submitLabel?: string;
  loading?: boolean;
  fullWidth?: boolean;
}

export default function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Search...",
  submitLabel = "Search",
  loading = false,
  fullWidth = false,
}: SearchInputProps) {
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <div className={`relative ${fullWidth ? "flex-1" : "flex-1 max-w-sm"}`}>
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-violet-500 transition"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-xl px-4 py-2.5 text-sm transition"
      >
        {loading ? "..." : submitLabel}
      </button>
    </form>
  );
}
