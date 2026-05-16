import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { usePublicConfig } from './lib/query-hooks';
import './index.css';

// Layouts
import Layout from './features/shared/Layout';
import LoadingScreen from './features/shared/LoadingScreen';

// Auth pages
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';

// Customer pages
import HomePage from './features/customer/HomePage';
import ProductListPage from './features/customer/ProductListPage';
import ProductDetailPage from './features/customer/ProductDetailPage';
import CartPage from './features/customer/CartPage';
import CheckoutPage from './features/customer/CheckoutPage';
import OrderHistoryPage from './features/customer/OrderHistoryPage';
import CustomerDashboard from './features/customer/CustomerDashboard';
import CustomerLayout from './features/customer/CustomerLayout';
import CustomerSettings from './features/customer/CustomerSettings';
import CustomerNotifications from './features/customer/CustomerNotifications';
import CustomerPayments from './features/customer/CustomerPayments';
import SellerStorePage from './features/customer/SellerStorePage';
import ProfilePage from './features/customer/ProfilePage';
import WishlistPage from './features/customer/WishlistPage';
import BecomeSellerPage from './features/customer/BecomeSellerPage';
import AIChatPage from './features/customer/AIChatPage';
import PublicPage from './features/customer/PublicPage';

// Seller pages
import SellerDashboard from './features/seller/SellerDashboard';
import SellerLayout from './features/seller/SellerLayout';
import SellerProducts from './features/seller/SellerProducts';
import SellerOrders from './features/seller/SellerOrders';
import SellerPayouts from './features/seller/SellerPayouts';
import SellerAnalytics from './features/seller/SellerAnalytics';
import SellerReviews from './features/seller/SellerReviews';

// Admin pages
import AdminLayout from './features/admin/AdminLayout';
import AdminDashboard from './features/admin/AdminDashboard';
import AdminUsers from './features/admin/AdminUsers';
import AdminProducts from './features/admin/AdminProducts';
import AdminCategories from './features/admin/AdminCategories';
import AdminConfig from './features/admin/AdminConfig';
import AdminBlog from './features/admin/AdminBlog';
import AdminRoles from './features/admin/AdminRoles';
import AdminTickets from './features/admin/AdminTickets';
import AdminAnnouncements from './features/admin/AdminAnnouncements';
import AdminApiKeys from './features/admin/AdminApiKeys';
import AdminPlugins from './features/admin/AdminPlugins';
import AdminGiftCards from './features/admin/AdminGiftCards';
import AdminChatbot from './features/admin/AdminChatbot';
import AdminVoiceConfig from './features/admin/AdminVoiceConfig';
import AdminWorkflows from './features/admin/AdminWorkflows';
import AdminAiConfig from './features/admin/AdminAiConfig';
import AdminAiProviders from './features/admin/AdminAiProviders';
import AdminAiToolRegistry from './features/admin/AdminAiToolRegistry';
import AdminAuditLogs from './features/admin/AdminAuditLogs';
import AIContentEditor from './features/admin/AIContentEditor';

function App() {
  const { data: publicConfig, isLoading } = usePublicConfig();
  const theme = publicConfig?.data?.theme || {};
  const fontFamily = theme.fontFamily || "'Inter', system-ui, -apple-system, sans-serif";
  const cornerRadius = theme.cornerRadius || 'compact';
  const radiusMap: Record<string, string> = {
    compact: '0.25rem',
    standard: '0.375rem',
    soft: '0.5rem'
  };
  const radiusValue = radiusMap[cornerRadius] || '0.25rem';

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{
        fontFamily: fontFamily,
        ...({ '--radius': radiusValue } as React.CSSProperties),
      }}>
        <LoadingScreen />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ 
      fontFamily: fontFamily,
      ...({ '--radius': radiusValue } as React.CSSProperties),
    }}>
      <Routes>
        {/* Public routes (no sidebar, full page) */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/sellers/:sellerId" element={<SellerStorePage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/page/:slug" element={<PublicPage />} />
          <Route path="/become-seller" element={<BecomeSellerPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/ai-chat" element={<AIChatPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />

          {/* Customer Center (sidebar via CustomerLayout) */}
          <Route path="/account" element={<CustomerLayout />}>
            <Route index element={<CustomerDashboard />} />
            <Route path="orders" element={<OrderHistoryPage />} />
            <Route path="notifications" element={<CustomerNotifications />} />
            <Route path="payments" element={<CustomerPayments />} />
            <Route path="settings" element={<CustomerSettings />} />
            <Route path="ai" element={<AIChatPage />} />
          </Route>

          {/* Seller Center (sidebar via SellerLayout) */}
          <Route path="/seller" element={<SellerLayout />}>
            <Route index element={<SellerDashboard />} />
            <Route path="products" element={<SellerProducts />} />
            <Route path="orders" element={<SellerOrders />} />
            <Route path="payouts" element={<SellerPayouts />} />
            <Route path="analytics" element={<SellerAnalytics />} />
            <Route path="reviews" element={<SellerReviews />} />
            <Route path="settings" element={<CustomerSettings />} />
          </Route>

          {/* Admin Panel (sidebar via AdminLayout) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="config" element={<AdminConfig />} />
            <Route path="blog" element={<AdminBlog />} />
            <Route path="roles" element={<AdminRoles />} />
            <Route path="tickets" element={<AdminTickets />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="api-keys" element={<AdminApiKeys />} />
            <Route path="plugins" element={<AdminPlugins />} />
            <Route path="giftcards" element={<AdminGiftCards />} />
            <Route path="chatbot" element={<AdminChatbot />} />
            <Route path="voice" element={<AdminVoiceConfig />} />
            <Route path="workflows" element={<AdminWorkflows />} />
            <Route path="ai-config" element={<AdminAiConfig />} />
            <Route path="ai-providers" element={<AdminAiProviders />} />
            <Route path="ai-tools" element={<AdminAiToolRegistry />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="ai-content-editor" element={<AIContentEditor />} />
          </Route>
        </Route>

        {/* Old flat routes — redirect to new structure */}
        <Route path="/orders" element={<Navigate to="/account/orders" replace />} />
        <Route path="/notifications" element={<Navigate to="/account/notifications" replace />} />
        <Route path="/payments" element={<Navigate to="/account/payments" replace />} />
        <Route path="/dashboard" element={<Navigate to="/account" replace />} />
        <Route path="/settings" element={<Navigate to="/account/settings" replace />} />
        <Route path="/profile" element={<Navigate to="/account/settings" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
