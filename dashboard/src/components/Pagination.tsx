interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-slate-500 text-xs">Page {page} of {totalPages}</p>
      <div className="flex gap-2">
        <button
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-slate-700 transition"
        >
          Prev
        </button>
        <button
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-slate-700 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
