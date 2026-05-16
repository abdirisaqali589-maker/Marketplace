import React from 'react';
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import LoadingScreen from './LoadingScreen';
import EmptyState from './EmptyState';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  onPageChange?: (page: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  idKey?: string;
  bulkActions?: React.ReactNode;
}

export default function DataTable<T extends Record<string, any>>({
  columns, data, loading, pagination, onPageChange, sortBy, sortOrder, onSort, search, onSearch,
  searchPlaceholder = 'Search...', emptyTitle = 'No data found', emptyDescription,
  onRowClick, selectedIds = [], onSelectionChange, idKey = 'id', bulkActions,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && data.every(row => selectedIds.includes(row[idKey]));

  const toggleAll = () => {
    if (allSelected) onSelectionChange?.([]);
    else onSelectionChange?.(data.map(row => row[idKey]));
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) onSelectionChange?.(selectedIds.filter(sid => sid !== id));
    else onSelectionChange?.([...selectedIds, id]);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div>
      {(onSearch || bulkActions) && (
        <div className="flex items-center justify-between mb-4 gap-4">
          {onSearch && (
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search || ''} onChange={e => onSearch(e.target.value)} placeholder={searchPlaceholder} className="input-field pl-9 text-sm" />
            </div>
          )}
          {bulkActions && selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{selectedIds.length} selected</span>
              {bulkActions}
            </div>
          )}
        </div>
      )}

      <div
        className="overflow-x-auto rounded-xl border"
        style={{
          borderColor: 'rgb(var(--color-border))',
        }}
      >
        <table className="min-w-full divide-y" style={{ borderColor: 'rgb(var(--color-divider))' }}>
          <thead style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
            <tr>
              {onSelectionChange && (
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                </th>
              )}
              {columns.map((col, ci) => (
                <th
                  key={`h-${ci}`}
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${col.className || ''}`}
                  style={{ color: 'rgb(var(--color-text-muted))' }}
                >
                  {col.sortable ? (
                    <button
                      onClick={() => onSort?.(col.key)}
                      className="flex items-center gap-1 transition-colors"
                      style={{ color: 'rgb(var(--color-text-muted))' }}
                    >
                      {col.label}
                      {sortBy === col.key ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" style={{ color: 'rgb(var(--color-primary-600))' }} /> : <ChevronDown className="w-3 h-3" style={{ color: 'rgb(var(--color-primary-600))' }} />
                      ) : <div className="w-3 h-3" />}
                    </button>
                  ) : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-divider))' }}>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onSelectionChange ? 1 : 0)} className="px-4 py-12">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              data.map((row, ri) => (
                <tr
                  key={row[idKey] || ri}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface-hover))'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {onSelectionChange && (
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.includes(row[idKey])} onChange={() => toggleOne(row[idKey])} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    </td>
                  )}
                  {columns.map((col, ci) => (
                    <td
                      key={`c-${ri}-${ci}`}
                      className={`px-4 py-3 text-sm ${col.className || ''}`}
                      style={{ color: 'rgb(var(--color-text-secondary))' }}
                    >
                      {col.render ? col.render(row[col.key], row, ri) : row[col.key] ?? '-'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Showing {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
              onMouseEnter={(e) => { if (!pagination || pagination.page > 1) e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface-hover))'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
              const start = Math.max(1, pagination.page - 2);
              const pg = start + i;
              if (pg > pagination.totalPages) return null;
              return (
                <button
                  key={pg}
                  onClick={() => onPageChange?.(pg)}
                  className="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: pg === pagination.page ? 'rgb(var(--color-primary-600))' : 'transparent',
                    color: pg === pagination.page ? 'white' : 'rgb(var(--color-text-muted))',
                  }}
                  aria-label={`Page ${pg}`}
                  aria-current={pg === pagination.page ? 'page' : undefined}
                >
                  {pg}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'rgb(var(--color-text-secondary))' }}
              onMouseEnter={(e) => { if (!pagination || pagination.page < pagination.totalPages) e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface-hover))'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}