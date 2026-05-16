import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/auth-store';
import { usePreferenceStore } from '../../lib/preference-store';
import { Menu, X, LogOut, Moon, Sun, ChevronLeft, PanelRightClose, PanelRightOpen } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

interface ProtectedLayoutProps {
  items: NavItem[] | NavGroup[];
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerChildren?: React.ReactNode;
  allowedRoles?: string[];
  /** If true, items are rendered as groups (AdminConfig style) */
  grouped?: boolean;
}

export default function ProtectedLayout({ items, title, subtitle, children, headerChildren, allowedRoles, grouped = false }: ProtectedLayoutProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = usePreferenceStore();
  const darkMode = theme === 'dark';

  const handleLogout = () => { logout(); navigate('/login'); };

  // If user doesn't have proper role, redirect
  const needsRole = allowedRoles || (title.includes('Admin') ? ['ADMIN', 'SUPER_ADMIN'] : title.includes('Seller') ? ['SELLER', 'ADMIN', 'SUPER_ADMIN'] : ['CUSTOMER', 'SELLER', 'ADMIN', 'SUPER_ADMIN']);
  if (user && !needsRole.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  const isActive = (href: string) => {
    const parts = href.split('/').filter(Boolean);
    if (parts.length <= 1) return location.pathname === href;
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const sidebarWidth = collapsed ? 'w-16' : 'w-64';

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={() => setMobileMenuOpen(false)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
        style={{
          backgroundColor: active ? 'rgb(var(--color-primary-50))' : 'transparent',
          color: active ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text-muted))',
        }}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? item.label : undefined}
      >
        <span className="shrink-0" style={{ color: active ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-disabled))' }}>
          {item.icon}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge !== undefined && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                style={{
                  backgroundColor: active ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-surface-active))',
                  color: active ? 'white' : 'rgb(var(--color-text-muted))',
                }}
              >
                {item.badge}
              </span>
            )}
          </>
        )}
        {collapsed && item.badge !== undefined && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{
              backgroundColor: 'rgb(var(--color-primary-600))',
              color: 'white',
            }}
          >
            {item.badge > 9 ? '9+' : item.badge}
          </span>
        )}
      </Link>
    );
  };

  const renderGroupedNav = () => {
    const groups = items as NavGroup[];
    return groups.map((group) => (
      <div key={group.group}>
        {!collapsed && (
          <p className="px-3 text-xs font-semibold uppercase pt-3 pb-1" style={{ color: 'rgb(var(--color-text-disabled))' }}>
            {group.group}
          </p>
        )}
        <div className="space-y-0.5">
          {group.items.map(renderNavItem)}
        </div>
      </div>
    ));
  };

  const renderFlatNav = () => {
    const navItems = items as NavItem[];
    return <div className="space-y-0.5">{navItems.map(renderNavItem)}</div>;
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'rgb(var(--color-gray-50))' }}>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside
        className={`${sidebarWidth} fixed lg:sticky top-0 left-0 z-50 h-screen transform transition-all duration-300 ease-in-out flex flex-col ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{
          backgroundColor: 'rgb(var(--color-surface))',
          borderRight: '1px solid',
          borderColor: 'rgb(var(--color-border))',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
          {!collapsed ? (
            <Link to="/" className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="font-bold truncate" style={{ color: 'rgb(var(--color-text))' }}>{title}</span>
            </Link>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
            </div>
          )}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded shrink-0"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" style={{ color: 'rgb(var(--color-text-secondary))' }} />
          </button>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin"
          aria-label={`${title} navigation`}
        >
          {grouped ? renderGroupedNav() : renderFlatNav()}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:block border-t shrink-0" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            style={{ color: 'rgb(var(--color-text-muted))' }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelRightOpen className="w-4 h-4" aria-hidden="true" />
            ) : (
              <>
                <PanelRightClose className="w-4 h-4" aria-hidden="true" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 min-w-0">
        <header
          className="sticky top-0 z-30 border-b"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            borderColor: 'rgb(var(--color-border))',
          }}
        >
          <div className="flex items-center justify-between px-4 lg:px-6 h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" style={{ color: 'rgb(var(--color-text-secondary))' }} />
              </button>
              <div>
                <h1 className="text-lg font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{title}</h1>
                {subtitle && <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                title={darkMode ? 'Light mode' : 'Dark mode'}
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" style={{ color: 'rgb(var(--color-text-muted))' }} />}
              </button>
              {headerChildren}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 rounded-full flex items-center justify-center text-sm font-semibold">
                  {user?.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium hidden sm:block" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                  {user?.firstName}
                </span>
              </div>
              <button onClick={handleLogout} className="btn-secondary btn-sm">
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}