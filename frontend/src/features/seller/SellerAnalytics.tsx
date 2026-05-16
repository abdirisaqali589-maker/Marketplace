import React, { useState } from 'react';
import { DollarSign, ShoppingCart, TrendingUp, BarChart3 } from 'lucide-react';
import { useSellerAnalytics } from '../../lib/query-hooks';
import LoadingScreen from '../shared/LoadingScreen';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function SellerAnalytics() {
  const [period, setPeriod] = useState('30d');
  const { data, isLoading } = useSellerAnalytics(period);
  const analytics = data?.data;

  if (isLoading) return <LoadingScreen />;

  const chartData = analytics?.salesByDate || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <div className="flex gap-1">
          {['7d', '30d', '90d', '1y'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 text-xs rounded-full ${period === p ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{p}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Revenue', value: `${(analytics?.totalRevenue || 0).toLocaleString()} TZS`, icon: <DollarSign className="w-5 h-5" />, color: 'bg-green-500' },
          { label: 'Total Orders', value: analytics?.totalOrders || 0, icon: <ShoppingCart className="w-5 h-5" />, color: 'bg-blue-500' },
          { label: 'Avg Order Value', value: `${(analytics?.avgOrderValue || 0).toLocaleString()} TZS`, icon: <TrendingUp className="w-5 h-5" />, color: 'bg-purple-500' },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Revenue</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs><linearGradient id="revColor" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revColor)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-[300px] flex items-center justify-center text-gray-400">No data for this period</div>}
        </div>
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Orders</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-[300px] flex items-center justify-center text-gray-400">No data for this period</div>}
        </div>
      </div>
    </div>
  );
}