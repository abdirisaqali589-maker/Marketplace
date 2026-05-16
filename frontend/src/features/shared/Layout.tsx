import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { usePublicConfig } from '../../lib/query-hooks';
import { assetUrl } from '../../lib/assets';
import { resolveTheme } from '../../lib/theme';
import Navbar from './Navbar';
import Footer from './Footer';
import AccessibilityDock from './AccessibilityDock';
import ChatBubble from './ChatBubble';
import { useAuthStore } from '../../lib/auth-store';
import { usePreferenceStore } from '../../lib/preference-store';
import BackToTop from './BackToTop';
import LiveSupport from './LiveSupport';

export default function Layout() {
  const { data: publicConfig } = usePublicConfig();
  const platformAssets = publicConfig?.data?.['platform.assets'] || {};
  const siteIdentity = publicConfig?.data?.['site.identity'] || {};
  const identity = {
    ...siteIdentity,
    logoUrl: siteIdentity.logoUrl || platformAssets.logoUrl,
    faviconUrl: siteIdentity.faviconUrl || platformAssets.faviconUrl,
  };
  const theme = resolveTheme(publicConfig?.data?.['site.theme']);
  const globalColorMode = theme.colorMode as 'light' | 'dark' | 'system' | 'user' | undefined;
  const { isAuthenticated } = useAuthStore();
  const { theme: themeMode, accessibility, highContrast } = usePreferenceStore();

  // Apply SEO meta tags once
  useEffect(() => {
    if (identity.seoTitle || identity.name) document.title = identity.seoTitle || identity.name;
    const description = document.querySelector('meta[name="description"]') || document.createElement('meta');
    description.setAttribute('name', 'description');
    description.setAttribute('content', identity.seoDescription || identity.description || '');
    document.head.appendChild(description);
    if (identity.faviconUrl) {
      let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!icon) {
        icon = document.createElement('link');
        icon.rel = 'icon';
        document.head.appendChild(icon);
      }
      icon.href = assetUrl(identity.faviconUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity.description, identity.faviconUrl, identity.name, identity.seoDescription, identity.seoTitle]);

  // Apply theme palette variables (primary/accent colors)
  useEffect(() => {
    document.documentElement.dataset.theme = theme.id;
    Object.entries(theme.variables || {}).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, String(value));
    });
  }, [theme.id, theme.variables]);

  // Sync preference store state with html element and add transition class
  useEffect(() => {
    const root = document.documentElement;
    const systemPrefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolvedThemeMode =
      globalColorMode === 'light' || globalColorMode === 'dark'
        ? globalColorMode
        : globalColorMode === 'system'
          ? (systemPrefersDark ? 'dark' : 'light')
          : themeMode;
    // Add transition class for smooth theme changes
    root.classList.add('theme-transitioning');
    root.classList.toggle('dark', resolvedThemeMode === 'dark');
    root.classList.toggle('accessibility-on', accessibility);
    root.classList.toggle('high-contrast', highContrast);
    // Remove transition class after animation completes
    const timeout = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 400);
    return () => clearTimeout(timeout);
  }, [themeMode, accessibility, highContrast, globalColorMode]);

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundColor: 'rgb(var(--color-gray-50))',
        color: 'rgb(var(--color-gray-900))',
      }}
      aria-label="Site layout"
    >
      {/* Skip-to-content link for keyboard users */}
      <a href="#main-content" className="skip-to-content" id="skip-link">
        Skip to main content
      </a>
      <Navbar />
      <main
        id="main-content"
        className="flex-1"
        role="main"
        aria-label="Main content"
      >
        <Outlet />
      </main>
      <Footer />
      <AccessibilityDock />
      <ChatBubble />
      <BackToTop />
      <LiveSupport />
    </div>
  );
}
