import React, { useState } from 'react';
import { ShoppingCart, Search, ChevronDown, ChevronUp, Package, Truck } from 'lucide-react';
import { useSellerOrders } from '../../lib/query-hooks';
import { patch } from '../../lib/api-enhanced';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DataTable from '../shared/DataTable';
import toast from 'react-hot-toast';

const statusTabs = ['ALL', 'PENDING_PAYMENT', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const statusStyles: Record<string, string> = {
  PENDING_PAYMENT: 'badge-warning', PROCESSING: 'badge-info', SHIPPED: 'badge-info',
  DELIVERED: 'badge-success', CANCELLED: 'badge-error', REFUNDED: 'badge-neutral',
};

export default function SellerOrders() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const qc = useQueryClient();

  const params: any = { page, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' };
  if (statusFilter !== 'ALL') params.status = statusFilter;
  if (search) params.search = search;

  const { data, isLoading } = useSellerOrders(params);
  const orders = data?.data || [];
  const pagination = data?.pagination;

  const updateStatus = useMutation({
    mutationFn: ({ id, status, tracking }: any) => patch(`/orders/${id}/status`, { status, ...(tracking ? { notes: `Tracking: ${tracking}` } : {}) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seller', 'orders'] }); toast.success('Order updated'); },
    onError: (err: any) => toast.error(err.response?.data?.message),
  });

  return (
    <div>
      {/* Status Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {statusTabs.map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <DataTable
        columns={[
          { key: 'orderNumber', label: 'Order #', sortable: true },
          { key: 'user', label: 'Customer', render: (val: any) => val ? `${val.firstName || ''} ${val.lastName || ''}`.trim() || '-' : '-' },
          { key: 'createdAt', label: 'Date', render: (val: string) => new Date(val).toLocaleDateString() },
          { key: '_count', label: 'Items', render: (val: any, row: any) => row.items?.length || val?.items || 0 },
          { key: 'totalAmount', label: 'Total', sortable: true, render: (val: number) => `${val?.toLocaleString()} TZS` },
          { key: 'status', label: 'Status', render: (val: string) => <span className={statusStyles[val] || 'badge-neutral'}>{val?.replace(/_/g, ' ')}</span> },
          { key: 'id', label: 'Actions', render: (_: any, row: any) => (
            <div className="flex gap-1">
              {row.status === 'PENDING_PAYMENT' && <button onClick={() => updateStatus.mutate({ id: row.id, status: 'PROCESSING' })} className="btn-primary btn-sm text-xs">Process</button>}
              {row.status === 'PROCESSING' && (
                <div className="flex gap-1 items-center">
                  <input type="text" placeholder="Tracking #" className="input-field text-xs w-24" onChange={e => setTrackingInput(e.target.value)} />
                  <button onClick={() => updateStatus.mutate({ id: row.id, status: 'SHIPPED', tracking: trackingInput })} className="btn-primary btn-sm text-xs"><Truck className="w-3 h-3" />Ship</button>
                </div>
              )}
              {row.status === 'SHIPPED' && <button onClick={() => updateStatus.mutate({ id: row.id, status: 'DELIVERED' })} className="btn-primary btn-sm text-xs">Deliver</button>}
              <button onClick={() => setExpandedId(expandedId === row.id ? null : row.id)} className="p-1.5 hover:bg-gray-100 rounded">{expandedId === row.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
            </div>
          )},
        ]}
        data={orders}
        loading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        search={search}
        onSearch={setSearch}
        emptyTitle="No orders found"
      />

      {/* Expanded Detail */}
      {expandedId && (
        <div className="card p-4 mt-4">
          {orders.filter((o: any) => o.id === expandedId).map((order: any) => (
            <div key={order.id} className="space-y-3">
              <h4 className="font-medium">Order {order.orderNumber}</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Shipping Address</p>
                  {order.shippingAddress ? <p className="text-gray-900">{JSON.parse(order.shippingAddress).street}, {JSON.parse(order.shippingAddress).city}</p> : <p className="text-gray-400">N/A</p>}
                </div>
                <div>
                  <p className="text-gray-500">Payment</p>
                  <p className="text-gray-900">{order.paymentMethod || 'N/A'} - {order.paymentStatus}</p>
                </div>
              </div>
              <div className="space-y-2">
                {order.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center"><Package className="w-5 h-5 text-gray-300" /></div>
                    <div className="flex-1"><p className="text-sm font-medium">{item.product?.title || 'Product'}</p><p className="text-xs text-gray-500">Qty: {item.quantity} x {item.unitPrice?.toLocaleString()} TZS</p></div>
                    <p className="text-sm font-semibold">{item.totalPrice?.toLocaleString()} TZS</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}