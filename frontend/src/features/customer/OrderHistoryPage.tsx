import React from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useOrders, useCancelOrder } from '../../lib/query-hooks';
import { assetUrl } from '../../lib/assets';
import EmptyState from '../shared/EmptyState';
import LoadingScreen from '../shared/LoadingScreen';

const statusStyles: Record<string, string> = {
  PENDING_PAYMENT: 'badge-warning',
  PAYMENT_CONFIRMED: 'badge-info',
  PROCESSING: 'badge-info',
  SHIPPED: 'badge-info',
  DELIVERED: 'badge-success',
  CANCELLED: 'badge-error',
  REFUNDED: 'badge-neutral',
};

export default function OrderHistoryPage() {
  const { data, isLoading } = useOrders();
  const cancelOrder = useCancelOrder();
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const orders = data?.data || [];

  if (isLoading) return <LoadingScreen />;
  if (!orders.length) return <div className="page-container"><EmptyState icon={<Package className="w-8 h-8" />} title="No orders yet" description="Shop now and your orders will appear here" actionLabel="Start Shopping" actionHref="/products" /></div>;

  return (
    <div className="page-container max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>
      <div className="space-y-4">
        {orders.map((order: any) => (
          <div key={order.id} className="card overflow-hidden">
            <button onClick={() => setExpandedId(expandedId === order.id ? null : order.id)} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={statusStyles[order.status] || 'badge-neutral'}>{order.status?.replace(/_/g, ' ')}</span>
                <span className="text-sm font-semibold">{order.totalAmount?.toLocaleString()} TZS</span>
                {expandedId === order.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {expandedId === order.id && (
              <div className="border-t px-4 py-4 space-y-4 animate-fade-in">
                <div className="space-y-2">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden">
                        {item.product?.images?.[0]?.url ? <img src={assetUrl(item.product.images[0].url)} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 m-3 text-gray-300" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.product?.title}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity} x {item.unitPrice?.toLocaleString()} TZS</p>
                      </div>
                      <p className="text-sm font-semibold">{item.totalPrice?.toLocaleString()} TZS</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Seller: {order.seller?.storeName || 'N/A'}</span>
                  <span>Items: {order._count?.items || order.items?.length || 0}</span>
                </div>
                {['PENDING_PAYMENT', 'PAYMENT_CONFIRMED', 'PROCESSING'].includes(order.status) && (
                  <button onClick={() => cancelOrder.mutate(order.id)} className="btn-danger btn-sm">Cancel Order</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
