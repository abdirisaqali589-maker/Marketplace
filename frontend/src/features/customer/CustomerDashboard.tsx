import { Link } from 'react-router-dom';
import { 
  Bell, CreditCard, Heart, Package, TrendingUp, Clock,
  ShoppingBag, Star, Shield, Activity, ChevronRight, User,
  Settings, MapPin, Phone, Mail, Calendar, DollarSign,
  Truck, RefreshCw, MessageSquare, AlertCircle, CheckCircle,
  Box, BarChart3, Download, Search, Eye
} from 'lucide-react';
import { useNotifications, useOrders, useWishlist } from '../../lib/query-hooks';

function StatCard({ label, value, icon, href, color, subtext }: any) {
  return (
    <Link to={href} className="group card p-4 md:p-5 hover:border-primary-200 relative overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>{label}</p>
          <p className="text-xl sm:text-2xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>{value}</p>
          {subtext && <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{subtext}</p>}
        </div>
        <div className={`rounded-xl p-3 ${color} transition-transform group-hover:scale-110 duration-200`}>
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-center text-xs font-medium" style={{ color: 'rgb(var(--color-primary-600))' }}>
        View details <ChevronRight className="h-3 w-3 ml-0.5" />
      </div>
    </Link>
  );
}

function RecentActivity({ items, type }: { items: any[]; type: 'orders' | 'notifications' }) {
  const iconMap = {
    orders: Package,
    notifications: MessageSquare,
  } as const;
  const Icon = iconMap[type];
  const emptyIcons: any = {
    orders: { icon: ShoppingBag, text: 'No orders yet. Start shopping!' },
    notifications: { icon: Bell, text: 'No activity yet.' },
  };
  const empty = emptyIcons[type];

  if (!items.length) {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--color-primary-50))' }}>
          <empty.icon className="h-6 w-6" style={{ color: 'rgb(var(--color-primary-500))' }} />
        </div>
        <p className="mt-3 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{empty.text}</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {items.slice(0, 5).map((item: any, idx: number) => (
        <div
          key={item.id || idx}
          className="flex items-center gap-3 p-3.5 border-b last:border-b-0 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
          style={{ borderColor: 'rgb(var(--color-divider))' }}
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgb(var(--color-primary-50))' }}>
            <Icon className="h-4 w-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
          </div>
          <div className="flex-1 min-w-0">
            {type === 'orders' ? (
              <>
                <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>
                  {item.orderNumber || item.id?.slice(0, 8)}
                </p>
                <div className="flex items-center gap-2 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                    item.status === 'DELIVERED' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    item.status === 'SHIPPED' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    item.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {item.status?.replace(/_/g, ' ')}
                  </span>
                  <span>{item.totalAmount?.toLocaleString() || ''} TZS</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--color-text))' }}>{item.title || item.type}</p>
                <p className="text-xs truncate" style={{ color: 'rgb(var(--color-text-muted))' }}>{item.body || item.message || item.type}</p>
              </>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'rgb(var(--color-text-disabled))' }} />
        </div>
      ))}
    </div>
  );
}

function InsightCard({ icon, title, description, href }: any) {
  return (
    <Link to={href} className="card p-3.5 flex items-start gap-3 hover:border-primary-200 group transition-all">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: 'rgb(var(--color-primary-50))' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{title}</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 mt-1 shrink-0 group-hover:translate-x-0.5 transition-transform" style={{ color: 'rgb(var(--color-text-disabled))' }} />
    </Link>
  );
}

export default function CustomerDashboard() {
  const { data: ordersData } = useOrders({ limit: 5 });
  const { data: notificationsData } = useNotifications({ limit: 5 });
  const { data: wishlistData } = useWishlist();
  const orders = ordersData?.data || [];
  const notifications = notificationsData?.data || [];
  const wishlist = wishlistData?.data || [];
  const unread = notifications.filter((n: any) => !n.isRead).length;
  const totalOrders = ordersData?.pagination?.total || orders.length;
  const deliveredOrders = orders.filter((o: any) => o.status === 'DELIVERED').length;

  const stats = [
    { label: 'Total Orders', value: totalOrders, icon: <Package className="h-5 w-5 text-primary-600" />, href: '/account/orders', color: 'bg-primary-50', subtext: `${deliveredOrders} delivered` },
    { label: 'Unread Alerts', value: unread, icon: <Bell className="h-5 w-5 text-amber-600" />, href: '/account/notifications', color: 'bg-amber-50', subtext: unread === 1 ? '1 new message' : `${unread} new messages` },
    { label: 'Wishlist', value: wishlist.length, icon: <Heart className="h-5 w-5 text-rose-600" />, href: '/wishlist', color: 'bg-rose-50', subtext: 'Saved items' },
    { label: 'Spent This Month', value: '—', icon: <DollarSign className="h-5 w-5 text-green-600" />, href: '/account/orders', color: 'bg-green-50', subtext: 'Track spending' },
  ];

  const insights = [
    { icon: <TrendingUp className="h-5 w-5 text-primary-600" />, title: 'Order Insights', description: 'View your purchase history, trends, and delivery statuses', href: '/account/orders' },
    { icon: <Star className="h-5 w-5 text-yellow-600" />, title: 'Product Reviews', description: 'Review purchased products and help other buyers', href: '/account/orders' },
    { icon: <Shield className="h-5 w-5 text-blue-600" />, title: 'Account Security', description: 'Manage password, 2FA, and connected devices', href: '/account/settings' },
    { icon: <MapPin className="h-5 w-5 text-violet-600" />, title: 'Saved Addresses', description: 'Manage your shipping and billing addresses', href: '/account/settings' },
    { icon: <CreditCard className="h-5 w-5 text-emerald-600" />, title: 'Payment Methods', description: 'Add, remove, or update your payment options', href: '/account/payments' },
    { icon: <Truck className="h-5 w-5 text-orange-600" />, title: 'Track Shipments', description: 'Real-time tracking for all your active orders', href: '/account/orders' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'rgb(var(--color-text))' }}>Welcome back! 👋</h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Here's what's happening with your account today.
          </p>
        </div>
        <Link to="/account/settings" className="btn-secondary btn-sm">
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>Recent Orders</h3>
            <Link to="/account/orders" className="text-xs font-medium flex items-center gap-1" style={{ color: 'rgb(var(--color-primary-600))' }}>
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <RecentActivity items={orders} type="orders" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm" style={{ color: 'rgb(var(--color-text))' }}>Recent Activity</h3>
            <Link to="/account/notifications" className="text-xs font-medium flex items-center gap-1" style={{ color: 'rgb(var(--color-primary-600))' }}>
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <RecentActivity items={notifications} type="notifications" />
        </div>
      </div>

      {/* Quick Insights */}
      <div>
        <h3 className="font-semibold text-sm mb-3" style={{ color: 'rgb(var(--color-text))' }}>Quick Access</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {insights.map((insight) => (
            <InsightCard key={insight.title} {...insight} />
          ))}
        </div>
      </div>

      {/* AI Assistant Prompt */}
      <div className="card p-5 bg-gradient-to-r from-primary-600 to-primary-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg">Need help? Ask our AI Assistant</h3>
            <p className="text-white/80 text-sm mt-1">Get instant answers about orders, returns, product questions and more.</p>
          </div>
          <Link to="/account/ai" className="shrink-0 btn bg-white text-primary-700 hover:bg-primary-50 font-semibold shadow-lg">
            Chat Now
          </Link>
        </div>
      </div>
    </div>
  );
}