import React, { useState } from 'react';
import { ClipboardList, Check, X, Eye } from 'lucide-react';
import { useProducts } from '../../lib/query-hooks';
import { patch } from '../../lib/api-enhanced';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DataTable from '../shared/DataTable';
import toast from 'react-hot-toast';

export default function AdminProducts() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const qc = useQueryClient();

  const params: any = { page, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' };
  if (statusFilter) params.status = statusFilter;
  if (search) params.search = search;

  const { data, isLoading } = useProducts(params);
  const products = data?.data || [];
  const pagination = data?.pagination;

  const toggleFeatured = useMutation({
    mutationFn: (id: string) => patch(`/products/${id}/featured`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Toggled featured'); },
  });

  const toggleActive = useMutation({
    mutationFn: (id: string) => patch(`/products/${id}/active`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Toggled active status'); },
  });

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['', 'DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-1.5 text-xs font-medium rounded-full ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <DataTable
        columns={[
          { key: 'title', label: 'Title', sortable: true },
          { key: 'seller', label: 'Seller', render: (val: any) => val?.storeName || '-' },
          { key: 'basePrice', label: 'Price', sortable: true, render: (val: number) => `${val?.toLocaleString()} TZS` },
          { key: 'status', label: 'Status', render: (val: string) => {
            const styles: Record<string, string> = { DRAFT: 'badge-neutral', ACTIVE: 'badge-success', INACTIVE: 'badge-warning', ARCHIVED: 'badge-error' };
            return <span className={styles[val] || 'badge-neutral'}>{val}</span>;
          }},
          { key: 'isFeatured', label: 'Featured', render: (val: boolean) => val ? <span className="badge-info">Yes</span> : '-' },
          { key: 'isActive', label: 'Active', render: (val: boolean) => <span className={val ? 'badge-success' : 'badge-error'}>{val ? 'Yes' : 'No'}</span> },
          { key: 'id', label: 'Actions', render: (_: any, row: any) => (
            <div className="flex gap-1">
              <button onClick={() => toggleFeatured.mutate(row.id)} className={`p-1.5 rounded ${row.isFeatured ? 'bg-yellow-100 text-yellow-700' : 'hover:bg-gray-100 text-gray-500'}`}>
                <Eye className="w-4 h-4" />
              </button>
              <button onClick={() => toggleActive.mutate(row.id)} className={`p-1.5 rounded ${row.isActive ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-500'}`}>
                {row.isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              </button>
            </div>
          )},
        ]}
        data={products}
        loading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        search={search}
        onSearch={setSearch}
        emptyTitle="No products found"
      />
    </div>
  );
}