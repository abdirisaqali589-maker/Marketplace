import React from 'react';
import { Users, Store, ShoppingCart, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAdminDashboard } from '../../lib/query-hooks';
import LoadingScreen from '../shared/LoadingScreen';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdminDashboard() {
  const { data, isLoading } = useAdminDashboard();
  if (isLoading) return <LoadingScreen />;
  const dash = data?.data;
  const stats = dash?.stats || {};
  const ordersByStatus = dash?.ordersByStatus || {};
  const statusData = Object.entries(ordersByStatus).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Platform Overview</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: <Users className="w-5 h-5" />, color: 'bg-blue-500' },
          { label: 'Sellers', value: stats.totalSellers, icon: <Store className="w-5 h-5" />, color: 'bg-green-500' },
          { label: 'Orders', value: stats.totalOrders, icon: <ShoppingCart className="w-5 h-5" />, color: 'bg-purple-500' },
          { label: 'Products', value: stats.totalProducts, icon: <DollarSign className="w-5 h-5" />, color: 'bg-yellow-500' },
          { label: 'Total Revenue', value: `${(stats.totalRevenue || 0).toLocaleString()} TZS`, icon: <TrendingUp className="w-5 h-5" />, color: 'bg-green-600' },
          { label: 'Monthly Rev.', value: `${(stats.monthlyRevenue || 0).toLocaleString()} TZS`, icon: <TrendingUp className="w-5 h-5" />, color: 'bg-blue-600' },
          { label: 'Pending Sellers', value: stats.pendingSellers, icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-orange-500' },
          { label: 'Pending Returns', value: stats.pendingReturns, icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-red-500' },
        ].map((stat, i) => (
          <div key={i} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center text-white`}>{stat.icon}</div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{stat.label}</p>
              <p className="text-lg font-bold text-gray-900">{stat.value ?? '-'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Orders by Status</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[250px] flex items-center justify-center text-gray-400">No orders yet</div>}
        </div>
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Recent Orders</h3>
          {dash?.recentOrders?.length > 0 ? (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {dash.recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">{order.user?.firstName} {order.user?.lastName} • {order.seller?.storeName}</p>
                  </div>
                  <span className="font-semibold">{order.totalAmount?.toLocaleString()} TZS</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-sm">No orders yet</p>}
        </div>
      </div>
    </div>
  );
}