import React, { useState } from 'react';
import { Package, ShoppingCart, DollarSign, Star, AlertTriangle, Plus, TrendingUp } from 'lucide-react';
import { useSellerDashboard, useSellerAnalytics } from '../../lib/query-hooks';
import LoadingScreen from '../shared/LoadingScreen';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function SellerDashboard() {
  const { data: dashData, isLoading } = useSellerDashboard();
  const [period, setPeriod] = useState('30d');
  const { data: analyticsData } = useSellerAnalytics(period);

  if (isLoading) return <LoadingScreen />;
  const dash = dashData?.data;
  const stats = dash?.stats;
  const analytics = analyticsData?.data;
  const chartData = analytics?.salesByDate || [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: stats?.totalProducts || 0, icon: <Package className="w-5 h-5" />, color: 'bg-blue-500' },
          { label: 'Total Orders', value: stats?.totalOrders || 0, icon: <ShoppingCart className="w-5 h-5" />, color: 'bg-green-500' },
          { label: 'Revenue', value: `${(stats?.totalRevenue || 0).toLocaleString()} TZS`, icon: <DollarSign className="w-5 h-5" />, color: 'bg-purple-500' },
          { label: 'Rating', value: `${stats?.rating || 0}/5`, icon: <Star className="w-5 h-5" />, color: 'bg-yellow-500' },
        ].map((stat, i) => (
          <div key={i} className="card p-4 flex items-center gap-4">
            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white`}>{stat.icon}</div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Revenue Overview</h3>
          <div className="flex gap-1">
            {['7d', '30d', '90d', '1y'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 text-xs rounded-full ${period === p ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{p}</button>
            ))}
          </div>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <defs><linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#colorRev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-gray-400">No revenue data yet</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Orders</h3>
            <Link to="/seller/orders" className="text-sm text-primary-600 hover:underline">View All</Link>
          </div>
          {dash?.recentOrders?.length > 0 ? (
            <div className="space-y-3">
              {dash.recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">{order.user?.firstName} {order.user?.lastName}</p>
                  </div>
                  <span className="text-sm font-semibold">{order.totalAmount?.toLocaleString()} TZS</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No orders yet</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/seller/products" className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
              <Package className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Add Product</span>
            </Link>
            <Link to="/seller/orders" className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
              <ShoppingCart className="w-6 h-6 text-green-600" />
              <span className="text-sm font-medium text-green-700">View Orders</span>
            </Link>
            <Link to="/seller/analytics" className="flex flex-col items-center gap-2 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors">
              <TrendingUp className="w-6 h-6 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Analytics</span>
            </Link>
            <Link to="/seller/payouts" className="flex flex-col items-center gap-2 p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors">
              <DollarSign className="w-6 h-6 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">Payouts</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}