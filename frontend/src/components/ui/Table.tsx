import React from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

export function Table<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No records found',
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
  className = '',
}: TableProps<T>) {
  const totalPages = Math.ceil(total / pageSize);
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className={`w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="overflow-x-auto relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        )}

        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 select-none">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`px-6 py-3.5 font-semibold ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length > 0 ? (
              data.map((item, idx) => (
                <tr key={item.id ? String(item.id) : idx} className="hover:bg-slate-50/75 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-6 py-4 whitespace-nowrap ${col.className || ''}`}>
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : !isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10">
                  <EmptyState title={emptyMessage} description="Try adjusting your search or filter criteria." />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {total > 0 && onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-700">{startItem}</span> to{' '}
            <span className="font-semibold text-slate-700">{endItem}</span> of{' '}
            <span className="font-semibold text-slate-700">{total}</span> entries
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="px-3 py-1.5 text-slate-700 font-medium">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
