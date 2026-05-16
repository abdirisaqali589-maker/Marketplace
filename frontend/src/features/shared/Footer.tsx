import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { usePublicConfig } from '../../lib/query-hooks';
import { assetUrl } from '../../lib/assets';

const footerGroups = [
  {
    title: 'Shop',
    links: [
      { label: 'All Products', href: '/products' },
      { label: 'Featured', href: '/products?isFeatured=true' },
      { label: 'Best Sellers', href: '/products?sortBy=totalSales&sortOrder=desc' },
      { label: 'New Arrivals', href: '/products?sortBy=createdAt&sortOrder=desc' },
    ],
  },
  {
    title: 'Sell',
    links: [
      { label: 'Start Selling', href: '/become-seller' },
      { label: 'Seller Center', href: '/seller' },
      { label: 'Seller Products', href: '/seller/products' },
      { label: 'Payouts', href: '/seller/payouts' },
    ],
  },
  {
    title: 'Customer',
    links: [
      { label: 'Customer Center', href: '/account' },
      { label: 'Orders', href: '/account/orders' },
      { label: 'Wishlist', href: '/wishlist' },
      { label: 'Payment Settings', href: '/account/payments' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'Account Settings', href: '/account/settings' },
      { label: 'Notifications', href: '/account/notifications' },
      { label: 'Admin Panel', href: '/admin' },
      { label: 'Contact Support', href: '/ai-chat' },
    ],
  },
];

function FooterGroup({ group, open, onToggle }: { group: typeof footerGroups[number]; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-gray-800 py-2 sm:border-0 sm:py-0">
      <button onClick={onToggle} className="flex w-full items-center justify-between py-3 text-left sm:pointer-events-none sm:py-0">
        <h4 className="font-semibold text-white">{group.title}</h4>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform sm:hidden ${open ? 'rotate-180' : ''}`} />
      </button>
      <ul className={`${open ? 'block' : 'hidden'} space-y-2.5 pb-4 text-sm sm:block sm:pb-0`}>
        {group.links.map((link) => (
          <li key={`${group.title}-${link.href}-${link.label}`}>
            <Link to={link.href} className="text-gray-400 transition hover:text-white">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ Shop: true });
  const { data: publicConfig } = usePublicConfig();
  const platformAssets = publicConfig?.data?.['platform.assets'] || {};
  const siteIdentity = publicConfig?.data?.['site.identity'] || {};
  const identity = {
    ...siteIdentity,
    logoUrl: siteIdentity.logoUrl || platformAssets.logoUrl,
    faviconUrl: siteIdentity.faviconUrl || platformAssets.faviconUrl,
  };
  const footer = publicConfig?.data?.['footer.content'] || {};
  const groups = Array.isArray(footer.groups) && footer.groups.length ? footer.groups : footerGroups;

  const toggleGroup = (title: string) => {
    setOpenGroups((current) => ({ ...current, [title]: !current[title] }));
  };

  return (
    <footer
      className="border-t"
      style={{
        backgroundColor: 'rgb(3 7 18)',
        color: 'rgb(156 163 175)',
        borderColor: 'rgb(31 41 55)',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1.85fr)]">
          <div>
            <Link to="/" className="mb-4 flex items-center gap-2">
              {identity.logoUrl ? <img src={assetUrl(identity.logoUrl)} alt={identity.name || 'Marketplace'} className="h-9 w-9 rounded-lg object-cover" /> : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
                  <span className="text-sm font-bold text-white">{(identity.name || 'MarketPlace')[0]}</span>
                </div>
              )}
              <span className="text-xl font-bold text-white">{identity.name || 'MarketPlace'}</span>
            </Link>
            <p className="max-w-md text-sm leading-6">
              {identity.description || 'A multi-vendor marketplace for secure buying, seller operations, order tracking, and configurable platform integrations.'}
            </p>
            <div className="mt-5 grid gap-2 text-sm">
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary-400" /> {identity.address || 'Dar es Salaam, Tanzania'}</div>
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary-400" /> {identity.supportEmail || 'support@marketplace.co.tz'}</div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary-400" /> {identity.supportPhone || '+255 123 456 789'}</div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-800 px-3 py-1"><ShieldCheck className="h-3.5 w-3.5 text-green-400" /> Buyer protection</span>
              <span className="rounded-full border border-gray-800 px-3 py-1">Seller tools</span>
              <span className="rounded-full border border-gray-800 px-3 py-1">Secure checkout</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {groups.map((group: any) => (
              <FooterGroup
                key={group.title}
                group={group}
                open={!!openGroups[group.title]}
                onToggle={() => toggleGroup(group.title)}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-8">
          {footer.newsletterEnabled !== false && <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h4 className="font-semibold text-white">Marketplace updates</h4>
              <p className="mt-1 text-sm">Product launches, seller tools, and account notices in one digest.</p>
            </div>
            <form onSubmit={(e) => e.preventDefault()} className="grid gap-2 sm:grid-cols-[minmax(0,280px)_auto]">
              <input type="email" placeholder="Email address" className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none" />
              <button type="submit" className="btn-primary btn-sm">Subscribe</button>
            </form>
          </div>}
        </div>

        <div className="mt-8 border-t border-gray-800 pt-6 text-center text-sm">
          &copy; {new Date().getFullYear()} {identity.name || 'MarketPlace'}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
