import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ShoppingBag, Zap, TrendingUp, Star, Layers, Sparkles, Clock } from 'lucide-react';

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  children?: CategoryNode[];
}

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLDivElement>;
  categories: CategoryNode[];
}

export default function MegaMenu({ isOpen, onClose, triggerRef, categories }: MegaMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, triggerRef]);

  // Reset active column when menu opens
  useEffect(() => {
    if (isOpen) setActiveColumn(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const topCategories = categories.slice(0, 8);
  const featuredItems = [
    { icon: Star, label: 'Featured Products', desc: 'Handpicked top picks', href: '/products?isFeatured=true', color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { icon: TrendingUp, label: 'Best Sellers', desc: 'Most popular items', href: '/products?sortBy=totalSales&sortOrder=desc', color: 'text-primary-600', bg: 'bg-primary-50' },
    { icon: Clock, label: 'New Arrivals', desc: 'Fresh stock daily', href: '/products?sortBy=createdAt&sortOrder=desc', color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: Sparkles, label: 'Weekly Deals', desc: 'Limited offers', href: '/products?sortBy=discountPrice&sortOrder=desc', color: 'text-green-500', bg: 'bg-green-50' },
  ];

  return (
    <div
      ref={menuRef}
      id="mega-menu"
      className="fixed left-0 right-0 top-[120px] shadow-2xl border-t z-50 rounded-b-2xl overflow-hidden animate-fade-in"
      style={{
        maxHeight: 'calc(100vh - 130px)',
        overflowY: 'auto',
        backgroundColor: 'rgb(var(--color-surface))',
        borderColor: 'rgb(var(--color-border))',
      }}
      role="menu"
      aria-label="Category menu"
    >
      <div className="max-w-7xl mx-auto flex" style={{ borderRight: '1px solid', borderColor: 'rgb(var(--color-divider))' }}>
        {/* Categories List — 2 column grid */}
        <div className="flex-1 p-6">
          <div className="flex items-center gap-2 mb-5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            Browse by Category
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            {topCategories.map((cat) => {
              const hasChildren = cat.children && cat.children.length > 0;
              return (
                <div key={cat.id} className="group relative">
                  <Link
                    to={`/products?categoryId=${cat.id}`}
                    onClick={onClose}
                    onMouseEnter={() => setActiveColumn(activeColumn === cat.id ? null : cat.id)}
                    className="flex items-center justify-between font-semibold transition-colors text-sm py-1.5 border-b border-transparent hover:border-primary-200 group-hover:border-primary-200"
                    style={{ color: 'rgb(var(--color-text))' }}
                    role="menuitem"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-400 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                      {cat.name}
                    </span>
                    {hasChildren && <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${activeColumn === cat.id ? 'rotate-90' : ''}`} style={{ color: 'rgb(var(--color-text-disabled))' }} aria-hidden="true" />}
                  </Link>
                  {hasChildren && activeColumn === cat.id && (
                    <div className="mt-1 ml-3 pl-3 space-y-1 animate-fade-in" style={{ borderLeft: '2px solid', borderColor: 'rgb(var(--color-primary-200))' }}>
                      {cat.children!.slice(0, 6).map((child) => (
                        <Link
                          key={child.id}
                          to={`/products?categoryId=${child.id}`}
                          onClick={onClose}
                          className="block text-sm px-2 py-1 rounded transition-colors"
                          style={{ color: 'rgb(var(--color-text-muted))' }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-50))'; e.currentTarget.style.color = 'rgb(var(--color-primary-600))'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgb(var(--color-text-muted))'; }}
                        >
                          {child.name}
                        </Link>
                      ))}
                      {cat.children!.length > 6 && (
                        <Link
                          to={`/products?categoryId=${cat.id}`}
                          onClick={onClose}
                          className="block text-xs font-medium px-2 py-1"
                          style={{ color: 'rgb(var(--color-primary-600))' }}
                        >
                          View all &rarr;
                        </Link>
                      )}
                    </div>
                  )}
                  {!hasChildren && (
                    <div className="hidden group-hover:block absolute left-0 -bottom-1 w-full h-0.5 bg-primary-500 rounded-full animate-fade-in" aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
          {categories.length > 8 && (
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid', borderColor: 'rgb(var(--color-divider))' }}>
              <Link to="/products" onClick={onClose} className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors" style={{ color: 'rgb(var(--color-primary-600))' }}>
                Browse all categories <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>

        {/* Featured Sidebar */}
        <div
          className="hidden lg:block w-72 p-6"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--color-surface-muted)), rgb(var(--color-surface)), rgb(var(--color-primary-50) / 0.3))',
          }}
        >
          <div className="flex items-center gap-2 mb-5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-muted))' }}>
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            Quick Links
          </div>
          <div className="space-y-3">
            {featuredItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                onClick={onClose}
                className="block rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border border-transparent"
                style={{ backgroundColor: item.bg.split(' ')[1] ? item.bg : 'rgb(var(--color-surface-muted))' }}
              >
                <item.icon className={`w-7 h-7 ${item.color} mb-2`} aria-hidden="true" />
                <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{item.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>{item.desc}</p>
              </Link>
            ))}
          </div>

          {/* View all CTA */}
          <Link
            to="/products"
            onClick={onClose}
            className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl text-white text-sm font-semibold px-4 py-3 transition-colors shadow-sm"
            style={{ backgroundColor: 'rgb(var(--color-primary-600))' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-700))'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-600))'; }}
            aria-label="Shop all products"
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            Shop All Products
          </Link>
        </div>
      </div>
    </div>
  );
}