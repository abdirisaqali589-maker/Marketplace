import { Outlet } from 'react-router-dom';
import ProtectedLayout from '../shared/ProtectedLayout';
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Wallet, MessageSquareReply } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/seller', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Products', href: '/seller/products', icon: <Package className="w-5 h-5" /> },
  { label: 'Orders', href: '/seller/orders', icon: <ShoppingCart className="w-5 h-5" /> },
  { label: 'Reviews', href: '/seller/reviews', icon: <MessageSquareReply className="w-5 h-5" /> },
  { label: 'Analytics', href: '/seller/analytics', icon: <BarChart3 className="w-5 h-5" /> },
  { label: 'Payouts', href: '/seller/payouts', icon: <Wallet className="w-5 h-5" /> },
];

export default function SellerLayout() {
  return (
    <ProtectedLayout items={navItems} title="Seller Center" subtitle="Manage your store">
      <Outlet />
    </ProtectedLayout>
  );
}
