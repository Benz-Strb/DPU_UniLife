import type { ReactNode } from "react";

interface Column {
  label: string;
  /** Override the full th className. Omit to use the standard header style. */
  className?: string;
}

interface DataTableProps<T> {
  columns: Column[];
  data: T[];
  loading: boolean;
  emptyMessage?: string;
  keyExtractor: (item: T, index: number) => string;
  /** Should return <td> elements (or a Fragment of them) */
  renderRow: (item: T, index: number) => ReactNode;
}

const TH_DEFAULT = "text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest";

export default function DataTable<T,>({
  columns,
  data,
  loading,
  emptyMessage = "No data found",
  keyExtractor,
  renderRow,
}: DataTableProps<T>) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800">
            {columns.map((col, i) => (
              <th key={i} className={col.className ?? TH_DEFAULT}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-slate-500 text-sm">
                Loading...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-slate-500 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={keyExtractor(item, index)}
                className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition"
              >
                {renderRow(item, index)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
