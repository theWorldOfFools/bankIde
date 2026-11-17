import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

function buildPageItems(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = new Set([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...items]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((left, right) => left - right);

  const result = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) {
      result.push(`ellipsis-${value}`);
    }
    result.push(value);
  });
  return result;
}

export default function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  label = 'data',
  pageSizeOptions = [],
  onPageSizeChange,
}) {
  if (!total) return null;

  const safeTotalPages = Math.max(1, totalPages || 1);
  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);
  const pageItems = buildPageItems(page, safeTotalPages);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
        <span>
          Menampilkan <strong className="font-semibold text-slate-700">{firstItem}</strong>
          {' - '}
          <strong className="font-semibold text-slate-700">{lastItem}</strong>
          {' dari '}
          <strong className="font-semibold text-slate-700">{total}</strong> {label}
        </span>
        {pageSizeOptions.length > 0 && onPageSizeChange && (
          <label className="inline-flex items-center gap-1.5">
            <span className="text-slate-400">Per halaman</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="rounded-lg border border-slate-200 bg-white/80 px-2 py-1 text-xs font-medium text-slate-600 outline-none focus:border-indigo-400"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center justify-between gap-1 sm:justify-end">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200/80 bg-white/80 px-2.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Sebelumnya</span>
        </motion.button>

        <div className="hidden items-center gap-1 sm:flex">
          {pageItems.map((item) => (
            typeof item === 'number' ? (
              <motion.button
                key={item}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => onPageChange(item)}
                aria-current={item === page ? 'page' : undefined}
                className={`grid h-9 min-w-9 place-items-center rounded-xl px-2 text-xs font-semibold transition ${
                  item === page
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                    : 'text-slate-500 hover:bg-white hover:text-indigo-600'
                }`}
              >
                {item}
              </motion.button>
            ) : (
              <span key={item} className="grid h-9 w-6 place-items-center text-xs text-slate-300">
                …
              </span>
            )
          ))}
        </div>

        <span className="text-xs font-medium text-slate-500 sm:hidden">
          Hal {page} / {safeTotalPages}
        </span>

        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= safeTotalPages}
          className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200/80 bg-white/80 px-2.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Halaman berikutnya"
        >
          <span className="hidden sm:inline">Berikutnya</span>
          <ChevronRight className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  );
}
