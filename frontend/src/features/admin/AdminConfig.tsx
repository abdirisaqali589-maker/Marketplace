import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, FileText, Flag, Globe2, Home, Images, KeyRound, Link as LinkIcon, LogIn, Navigation, Package, Palette, Plus, Rocket, Save, Settings, TestTube2, Trash2, Upload, X, ChevronDown } from 'lucide-react';
import { api, get, post, put, del } from '../../lib/api-enhanced';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import LoadingScreen from '../shared/LoadingScreen';
import { themePresets } from '../../lib/theme';
import { assetUrl } from '../../lib/assets';
import toast from 'react-hot-toast';

const paymentTemplates: Record<string, any> = {
  stripe: { id: 'stripe', label: 'Stripe', method: 'CARD', enabled: false, mode: 'test', publishableKey: '', secretKey: '', webhookSecret: '', checkoutUrl: '' },
  paypal: { id: 'paypal', label: 'PayPal', method: 'CARD', enabled: false, mode: 'test', clientId: '', clientSecret: '', webhookSecret: '', checkoutUrl: '' },
  mpesa: { id: 'mpesa', label: 'M-Pesa', method: 'MOBILE_MONEY', enabled: false, mode: 'test', consumerKey: '', consumerSecret: '', passkey: '', shortcode: '', callbackUrl: '' },
  flutterwave: { id: 'flutterwave', label: 'Flutterwave', method: 'CARD', enabled: false, mode: 'test', publicKey: '', secretKey: '', encryptionKey: '', checkoutUrl: '' },
};

const loginTemplates: Record<string, any> = {
  google: { id: 'google', label: 'Google', enabled: false, mode: 'test', clientId: '', clientSecret: '', authUrl: '', brandColor: '#DC4A3F', brandIcon: 'G' },
  facebook: { id: 'facebook', label: 'Facebook', enabled: false, mode: 'test', clientId: '', clientSecret: '', authUrl: '', brandColor: '#1877F2', brandIcon: 'F' },
  apple: { id: 'apple', label: 'Apple', enabled: false, mode: 'test', clientId: '', teamId: '', keyId: '', privateKey: '', authUrl: '', brandColor: '#000000', brandIcon: '🍎' },
  twitter: { id: 'twitter', label: 'X (Twitter)', enabled: false, mode: 'test', clientId: '', clientSecret: '', authUrl: '', brandColor: '#000000', brandIcon: 'X' },
  github: { id: 'github', label: 'GitHub', enabled: false, mode: 'test', clientId: '', clientSecret: '', authUrl: '', brandColor: '#24292F', brandIcon: 'GH' },
  microsoft: { id: 'microsoft', label: 'Microsoft', enabled: false, mode: 'test', clientId: '', clientSecret: '', authUrl: '', brandColor: '#00A4EF', brandIcon: 'MS' },
  linkedin: { id: 'linkedin', label: 'LinkedIn', enabled: false, mode: 'test', clientId: '', clientSecret: '', authUrl: '', brandColor: '#0A66C2', brandIcon: 'in' },
};

const oauthIcons: Record<string, string> = {
  google: 'G',
  facebook: 'F',
  apple: 'A',
  twitter: 'X',
  github: 'GH',
  microsoft: 'MS',
  linkedin: 'in',
};

const secretFields = ['secretKey', 'clientSecret', 'consumerSecret', 'webhookSecret', 'passkey', 'encryptionKey', 'privateKey'];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button type="button" onClick={onChange} className="h-6 w-11 rounded-full p-0.5 transition-colors" style={{ backgroundColor: checked ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-border-strong))' }}>
      <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: any; onChange: (value: any) => void; type?: 'text' | 'number' | 'password' | 'textarea'; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>{label}</span>
      {type === 'textarea' ? (
        <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} className="textarea-field" rows={4} placeholder={placeholder} />
      ) : (
        <input type={type} value={value ?? ''} onChange={(event) => onChange(type === 'number' ? Number(event.target.value) : event.target.value)} className="input-field" placeholder={placeholder} />
      )}
    </label>
  );
}

function MediaField({ label, value, onChange, accept = 'image/*,.svg,.ico', preview = true }: { label: string; value: any; onChange: (value: string) => void; accept?: string; preview?: boolean }) {
  const [uploading, setUploading] = useState(false);
  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const payload = new FormData();
      payload.append('images', file);
      const res = await api.post('/upload/images', payload);
      const uploaded = res.data?.data?.[0];
      if (!uploaded?.path && !uploaded?.url) throw new Error('Upload did not return an asset path');
      onChange(uploaded.path || uploaded.url);
      toast.success('Asset uploaded');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Asset upload failed');
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="space-y-2">
      <Field label={label} value={value} onChange={onChange} placeholder="Upload a file or paste https://... / /uploads/..." />
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed px-3 py-2 text-sm font-medium transition-colors" style={{ borderColor: 'rgb(var(--color-border-strong))', backgroundColor: 'rgb(var(--color-surface-muted))', color: 'rgb(var(--color-text-secondary))' }}>
          {uploading ? 'Uploading...' : 'Choose file'}
          <input type="file" accept={accept} disabled={uploading} onChange={uploadFile} className="hidden" />
        </label>
        {value && <button type="button" onClick={() => onChange('')} className="btn-secondary btn-sm"><X className="h-4 w-4" /> Clear</button>}
      </div>
      {preview && value && (
        <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface-muted))' }}>
          <img src={assetUrl(value)} alt="" className="h-32 w-full object-contain p-2" />
        </div>
      )}
    </div>
  );
}

function SaveBar({ onSave, saving }: { onSave: () => void; saving?: boolean }) {
  return (
    <div className="sticky bottom-4 z-10 flex justify-end">
      <button onClick={onSave} disabled={saving} className="btn-primary shadow-lg">
        <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save changes'}
      </button>
    </div>
  );
}

function ToggleRow({ title, description, checked, onChange }: { title: string; description?: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }}>
      <div>
        <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{title}</p>
        {description && <p className="mt-1 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function PanelHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ backgroundColor: 'rgb(var(--color-primary-50))', color: 'rgb(var(--color-primary-700))' }}>{icon}</div>
      <div>
        <h3 className="text-xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{title}</h3>
        <p className="mt-1 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{description}</p>
      </div>
    </div>
  );
}

function LinksEditor({ links, onChange }: { links: any[]; onChange: (links: any[]) => void }) {
  const update = (index: number, patch: any) => onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  return (
    <div className="space-y-2">
      {links.map((link, index) => (
        <div key={index} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_1.5fr_auto]" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <input value={link.label || ''} onChange={(event) => update(index, { label: event.target.value })} className="input-field py-2" placeholder="Label" />
          <input value={link.href || ''} onChange={(event) => update(index, { href: event.target.value })} className="input-field py-2" placeholder="/pages/example" />
          <button onClick={() => onChange(links.filter((_, i) => i !== index))} className="btn-danger btn-sm"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <button onClick={() => onChange([...links, { label: '', href: '/' }])} className="btn-secondary btn-sm"><Plus className="h-4 w-4" /> Add link</button>
    </div>
  );
}

function SiteIdentity({ config, onSave, saving }: { config: any; onSave: (value: any, description: string) => void; saving?: boolean }) {
  const [draft, setDraft] = useState(() => ({
    name: 'MarketPlace',
    logoUrl: '',
    faviconUrl: '',
    description: '',
    seoTitle: '',
    seoDescription: '',
    supportEmail: '',
    supportPhone: '',
    address: '',
    ...config,
  }));
  const set = (key: string, value: any) => setDraft({ ...draft, [key]: value });
  return (
    <section>
      <PanelHeader icon={<Globe2 className="h-5 w-5" />} title="Site Identity" description="Branding, favicon, SEO text, and contact details used across the public storefront." />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h4 className="mb-4 font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Branding</h4>
          <div className="space-y-4">
            <Field label="Site name" value={draft.name} onChange={(value) => set('name', value)} />
            <MediaField label="Logo image" value={draft.logoUrl} onChange={(value) => set('logoUrl', value)} />
            <MediaField label="Favicon / icon" value={draft.faviconUrl} onChange={(value) => set('faviconUrl', value)} accept="image/*,.svg,.ico" />
            <Field label="Public description" value={draft.description} onChange={(value) => set('description', value)} type="textarea" />
          </div>
        </div>
        <div className="card p-5">
          <h4 className="mb-4 font-semibold" style={{ color: 'rgb(var(--color-text))' }}>SEO & Contact</h4>
          <div className="space-y-4">
            <Field label="SEO title" value={draft.seoTitle} onChange={(value) => set('seoTitle', value)} />
            <Field label="SEO description" value={draft.seoDescription} onChange={(value) => set('seoDescription', value)} type="textarea" />
            <Field label="Support email" value={draft.supportEmail} onChange={(value) => set('supportEmail', value)} />
            <Field label="Support phone" value={draft.supportPhone} onChange={(value) => set('supportPhone', value)} />
            <Field label="Business address" value={draft.address} onChange={(value) => set('address', value)} />
          </div>
        </div>
      </div>
      <SaveBar saving={saving} onSave={() => onSave(draft, 'Branding, favicon, SEO, and contact details')} />
    </section>
  );
}

function ThemeSettings({ config, onSave, saving }: { config: any; onSave: (value: any, description: string) => void; saving?: boolean }) {
  const [draft, setDraft] = useState(() => ({
    presetId: 'marketplace-classic',
    homeTemplate: 'dense-marketplace',
    density: 'dense',
    cornerRadius: 'compact',
    variables: {},
    ...config,
  }));
  const selected = themePresets.find((preset) => preset.id === draft.presetId) || themePresets[0];
  const selectPreset = (presetId: string) => {
    const preset = themePresets.find((item) => item.id === presetId) || themePresets[0];
    setDraft({ ...draft, presetId, homeTemplate: preset.homeTemplate, variables: {} });
  };
  return (
    <section>
      <PanelHeader icon={<Palette className="h-5 w-5" />} title="Themes" description="Central storefront theme, home layout preset, density, and shared design tokens." />
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="grid gap-3 md:grid-cols-2">
          {themePresets.map((preset) => (
            <button key={preset.id} onClick={() => selectPreset(preset.id)} className={`rounded-lg border p-4 text-left transition`} style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: draft.presetId === preset.id ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-border))', boxShadow: draft.presetId === preset.id ? '0 0 0 2px rgb(var(--color-primary-100))' : 'none' }}>
              <div className="mb-3 flex gap-1">
                {['--color-primary-600', '--color-accent-600', '--color-primary-900'].map((key) => (
                  <span key={key} className="h-6 w-6 rounded-full border border-white shadow" style={{ backgroundColor: `rgb(${preset.variables[key]})` }} />
                ))}
              </div>
              <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{preset.label}</p>
              <p className="mt-1 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{preset.description}</p>
              <p className="mt-3 text-xs font-medium uppercase" style={{ color: 'rgb(var(--color-text-disabled))' }}>{preset.homeTemplate.replace(/-/g, ' ')}</p>
            </button>
          ))}
        </div>
        <div className="card h-fit p-5">
          <h4 className="mb-4 font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Active Theme</h4>
          <div className="space-y-4">
            <Field label="Preset" value={selected.label} onChange={() => undefined} />
            <label><span className="mb-1 block text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>Home template</span><select value={draft.homeTemplate} onChange={(event) => setDraft({ ...draft, homeTemplate: event.target.value })} className="select-field"><option value="dense-marketplace">Dense marketplace</option><option value="supplier-desk">Supplier desk</option><option value="retail-grid">Retail grid</option><option value="editorial-grid">Editorial grid</option></select></label>
            <label><span className="mb-1 block text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>Interface density</span><select value={draft.density} onChange={(event) => setDraft({ ...draft, density: event.target.value })} className="select-field"><option value="dense">Dense</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select></label>
            <label><span className="mb-1 block text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>Corner radius</span><select value={draft.cornerRadius} onChange={(event) => setDraft({ ...draft, cornerRadius: event.target.value })} className="select-field"><option value="compact">Compact</option><option value="standard">Standard</option><option value="soft">Soft</option></select></label>
          </div>
        </div>
      </div>
      <SaveBar saving={saving} onSave={() => onSave(draft, 'Central storefront theme preset, layout density, and shared design tokens')} />
    </section>
  );
}

function AssetSettings({ config, onSave, saving }: { config: any; onSave: (value: any, description: string) => void; saving?: boolean }) {
  const [draft, setDraft] = useState(() => ({
    logoUrl: '',
    faviconUrl: '',
    iconSpriteUrl: '',
    navigationIconUrl: '',
    cartIconUrl: '',
    userIconUrl: '',
    adminDashboardImageUrl: '',
    sellerDashboardImageUrl: '',
    dashboardAnimationUrl: '',
    storefrontPreviewImageUrl: '',
    loadingAnimationUrl: '',
    emptyStateImageUrl: '',
    ...config,
  }));
  const set = (key: string, value: any) => setDraft({ ...draft, [key]: value });
  return (
    <section>
      <PanelHeader icon={<Images className="h-5 w-5" />} title="Assets" description="Central platform media library references for branding, favicon, dashboard previews, and animation assets." />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h4 className="mb-4 font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Brand Assets</h4>
          <div className="space-y-4">
            <MediaField label="Platform logo" value={draft.logoUrl} onChange={(value) => set('logoUrl', value)} />
            <MediaField label="Favicon / icon" value={draft.faviconUrl} onChange={(value) => set('faviconUrl', value)} accept="image/*,.svg,.ico" />
            <MediaField label="Icon sprite / icon set" value={draft.iconSpriteUrl} onChange={(value) => set('iconSpriteUrl', value)} accept="image/*,.svg,.ico" />
            <MediaField label="Storefront preview image" value={draft.storefrontPreviewImageUrl} onChange={(value) => set('storefrontPreviewImageUrl', value)} />
          </div>
        </div>
        <div className="card p-5">
          <h4 className="mb-4 font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Interface Icons</h4>
          <div className="space-y-4">
            <MediaField label="Navigation icon" value={draft.navigationIconUrl} onChange={(value) => set('navigationIconUrl', value)} accept="image/*,.svg,.ico" />
            <MediaField label="Cart icon" value={draft.cartIconUrl} onChange={(value) => set('cartIconUrl', value)} accept="image/*,.svg,.ico" />
            <MediaField label="User/account icon" value={draft.userIconUrl} onChange={(value) => set('userIconUrl', value)} accept="image/*,.svg,.ico" />
          </div>
        </div>
        <div className="card p-5 lg:col-span-2">
          <h4 className="mb-4 font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Dashboard & State Media</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <MediaField label="Admin dashboard image" value={draft.adminDashboardImageUrl} onChange={(value) => set('adminDashboardImageUrl', value)} />
            <MediaField label="Seller dashboard image" value={draft.sellerDashboardImageUrl} onChange={(value) => set('sellerDashboardImageUrl', value)} />
            <MediaField label="Dashboard animation" value={draft.dashboardAnimationUrl} onChange={(value) => set('dashboardAnimationUrl', value)} accept="image/*,.svg,.gif,.webp" />
            <MediaField label="Loading animation" value={draft.loadingAnimationUrl} onChange={(value) => set('loadingAnimationUrl', value)} accept="image/*,.svg,.gif,.webp" />
            <MediaField label="Empty state image" value={draft.emptyStateImageUrl} onChange={(value) => set('emptyStateImageUrl', value)} />
          </div>
        </div>
      </div>
      <SaveBar saving={saving} onSave={() => onSave(draft, 'Shared platform assets for branding, admin previews, and dashboard media')} />
    </section>
  );
}

function PromoBannersEditor({ banners, onChange }: { banners: any[]; onChange: (banners: any[]) => void }) {
  const items = Array.isArray(banners) ? banners : [];
  const update = (index: number, patch: any) => onChange(items.map((banner, i) => (i === index ? { ...banner, ...patch } : banner)));
  return (
    <div className="space-y-3">
      {items.map((banner, index) => (
        <div key={index} className="rounded-lg border p-4" style={{ borderColor: 'rgb(var(--color-border))' }}>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>Banner {index + 1}</p>
            <button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))} className="btn-danger btn-sm"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title" value={banner.title || ''} onChange={(value) => update(index, { title: value })} />
            <Field label="Link" value={banner.href || ''} onChange={(value) => update(index, { href: value })} placeholder="/products?search=..." />
            <div className="md:col-span-2"><Field label="Text" value={banner.text || ''} onChange={(value) => update(index, { text: value })} /></div>
            <div className="md:col-span-2"><MediaField label="Banner image" value={banner.imageUrl || ''} onChange={(value) => update(index, { imageUrl: value })} /></div>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { title: 'New banner', text: '', href: '/products', imageUrl: '' }])} className="btn-secondary btn-sm"><Plus className="h-4 w-4" /> Add banner</button>
    </div>
  );
}

function HomeSettings({ config, onSave, saving }: { config: any; onSave: (value: any, description: string) => void; saving?: boolean }) {
  const [draft, setDraft] = useState(() => ({
    heroEnabled: true,
    heroTitle: '',
    heroSubtitle: '',
    heroImageUrl: '',
    heroEyebrow: '',
    heroSearchPlaceholder: '',
    categoryRailEnabled: true,
    trustCardsEnabled: true,
    promoBannersEnabled: true,
    categoryScrollerEnabled: true,
    dealRailEnabled: true,
    sellerStripEnabled: true,
    tabbedShowcaseEnabled: true,
    featuredProductsEnabled: true,
    ctaCardsEnabled: true,
    promoBanners: [],
    ...config,
  }));
  const set = (key: string, value: any) => setDraft({ ...draft, [key]: value });
  return (
    <section>
      <PanelHeader icon={<Home className="h-5 w-5" />} title="Home Page" description="Hero image, copy, search prompt, and homepage section visibility." />
      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div className="card p-5">
          <h4 className="mb-4 font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Hero Content</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Hero eyebrow" value={draft.heroEyebrow} onChange={(value) => set('heroEyebrow', value)} />
            <Field label="Hero title" value={draft.heroTitle} onChange={(value) => set('heroTitle', value)} />
            <MediaField label="Hero image" value={draft.heroImageUrl} onChange={(value) => set('heroImageUrl', value)} />
            <div className="md:col-span-2"><Field label="Hero subtitle" value={draft.heroSubtitle} onChange={(value) => set('heroSubtitle', value)} type="textarea" /></div>
            <Field label="Search placeholder" value={draft.heroSearchPlaceholder} onChange={(value) => set('heroSearchPlaceholder', value)} />
          </div>
        </div>
        <div className="space-y-3">
          {[
            ['heroEnabled', 'Show hero section'],
            ['categoryRailEnabled', 'Show category rail'],
            ['trustCardsEnabled', 'Show trust cards'],
            ['promoBannersEnabled', 'Show promo banners'],
            ['categoryScrollerEnabled', 'Show side-scroll categories'],
            ['dealRailEnabled', 'Show side-scroll deals'],
            ['sellerStripEnabled', 'Show seller strip'],
            ['tabbedShowcaseEnabled', 'Show tabbed product showcase'],
            ['featuredProductsEnabled', 'Show featured products'],
            ['ctaCardsEnabled', 'Show bottom CTA cards'],
          ].map(([key, label]) => (
            <ToggleRow key={key} title={label} checked={!!draft[key]} onChange={() => set(key, !draft[key])} />
          ))}
        </div>
      </div>
      <div className="card mt-4 p-5">
        <h4 className="mb-4 font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Promo Banners</h4>
        <PromoBannersEditor banners={draft.promoBanners || []} onChange={(promoBanners) => set('promoBanners', promoBanners)} />
      </div>
      <SaveBar saving={saving} onSave={() => onSave(draft, 'Homepage hero, images, sections, and merchandising toggles')} />
    </section>
  );
}

function CatalogSettings({ config, onSave, saving }: { config: any; onSave: (value: any, description: string) => void; saving?: boolean }) {
  const [draft, setDraft] = useState(() => ({
    categoriesEnabled: true,
    brandsEnabled: true,
    sellerBrandCreationEnabled: true,
    brandApprovalRequired: false,
    featuredProductsEnabled: true,
    newArrivalsEnabled: true,
    bestSellersEnabled: true,
    ...config,
  }));
  const toggle = (key: string) => setDraft({ ...draft, [key]: !draft[key] });
  return (
    <section>
      <PanelHeader icon={<Package className="h-5 w-5" />} title="Catalog Controls" description="Switch marketplace catalog surfaces on or off without changing code." />
      <div className="grid gap-3 lg:grid-cols-2">
        <ToggleRow title="Categories" description="Show category rails, menus, and category filters." checked={!!draft.categoriesEnabled} onChange={() => toggle('categoriesEnabled')} />
        <ToggleRow title="Brands" description="Show brands in seller product creation and product filters." checked={!!draft.brandsEnabled} onChange={() => toggle('brandsEnabled')} />
        <ToggleRow title="Seller-created brands" description="Allow sellers to add a brand while creating a product." checked={!!draft.sellerBrandCreationEnabled} onChange={() => toggle('sellerBrandCreationEnabled')} />
        <ToggleRow title="Require brand approval" description="New seller brands stay pending until admin review." checked={!!draft.brandApprovalRequired} onChange={() => toggle('brandApprovalRequired')} />
        <ToggleRow title="Featured products" checked={!!draft.featuredProductsEnabled} onChange={() => toggle('featuredProductsEnabled')} />
        <ToggleRow title="New arrivals" checked={!!draft.newArrivalsEnabled} onChange={() => toggle('newArrivalsEnabled')} />
        <ToggleRow title="Best sellers" checked={!!draft.bestSellersEnabled} onChange={() => toggle('bestSellersEnabled')} />
      </div>
      <SaveBar saving={saving} onSave={() => onSave(draft, 'Catalog controls for categories, brands, and product sections')} />
    </section>
  );
}

function PaymentSettings({ config, onSave, saving }: { config: any; onSave: (value: any, description: string) => void; saving?: boolean }) {
  const [draft, setDraft] = useState(() => ({
    enabledMethods: config?.enabledMethods || ['CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CASH_ON_DELIVERY'],
    providers: config?.providers || Object.values(paymentTemplates),
    requireConfiguredProvider: config?.requireConfiguredProvider ?? false,
    localMockEnabled: config?.localMockEnabled ?? true,
  }));
  const [providerToAdd, setProviderToAdd] = useState('stripe');
  const [testingId, setTestingId] = useState<string | null>(null);
  const enabledProviders = draft.providers.filter((provider: any) => provider.enabled);
  const hasUsableProvider = enabledProviders.length > 0 || draft.enabledMethods.includes('CASH_ON_DELIVERY');
  const testProvider = useMutation({
    mutationFn: (providerId: string) => post(`/payments/providers/${providerId}/test`),
    onSuccess: (res: any) => toast.success(res.data?.message || 'Provider test succeeded'),
    onError: (err: any) => toast.error(err.response?.data?.message || 'Provider test failed'),
    onSettled: () => setTestingId(null),
  });

  const updateProvider = (index: number, patch: any) => {
    setDraft({ ...draft, providers: draft.providers.map((item: any, i: number) => (i === index ? { ...item, ...patch } : item)) });
  };
  const providerFields = (provider: any) => Object.keys(provider).filter((key) => !['id', 'label', 'method', 'enabled', 'mode'].includes(key));

  return (
    <section>
      <PanelHeader icon={<CreditCard className="h-5 w-5" />} title="Payment Settings" description="Payment methods, providers, API credentials, live/test mode, and checkout behavior." />
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <div className="card p-4"><p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Enabled providers</p><p className="mt-1 text-3xl font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{enabledProviders.length}</p></div>
        <div className="card p-4"><p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Local test gateway</p><div className="mt-3 flex items-center justify-between"><span style={{ color: 'rgb(var(--color-text))' }}>{draft.localMockEnabled ? 'On' : 'Off'}</span><Toggle checked={draft.localMockEnabled} onChange={() => setDraft({ ...draft, localMockEnabled: !draft.localMockEnabled })} /></div></div>
        <div className={`card p-4`} style={{ borderColor: hasUsableProvider ? 'rgb(var(--color-accent-200))' : 'rgb(var(--color-danger) / 0.3)' }}>
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Readiness</p>
          <div className="mt-2 flex items-center gap-2">
            {hasUsableProvider ? <CheckCircle2 className="h-5 w-5" style={{ color: 'rgb(var(--color-accent-600))' }} /> : <AlertTriangle className="h-5 w-5" style={{ color: 'rgb(var(--color-danger))' }} />}
            <span style={{ color: 'rgb(var(--color-text))' }}>{hasUsableProvider ? 'Checkout has a method' : 'Enable a method'}</span>
          </div>
        </div>
      </div>

      <div className="card mb-5 p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Customer payment methods</h4><p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>These appear at checkout.</p></div>
          <div className="flex items-center gap-2"><span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>Require configured provider</span><Toggle checked={draft.requireConfiguredProvider} onChange={() => setDraft({ ...draft, requireConfiguredProvider: !draft.requireConfiguredProvider })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {['CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CASH_ON_DELIVERY'].map((method) => (
            <button key={method} onClick={() => setDraft({ ...draft, enabledMethods: draft.enabledMethods.includes(method) ? draft.enabledMethods.filter((item: string) => item !== method) : [...draft.enabledMethods, method] })}
              className="rounded-lg border px-3 py-3 text-sm font-medium transition-colors"
              style={{
                borderColor: draft.enabledMethods.includes(method) ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-border))',
                backgroundColor: draft.enabledMethods.includes(method) ? 'rgb(var(--color-primary-50))' : 'rgb(var(--color-surface))',
                color: draft.enabledMethods.includes(method) ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text-secondary))',
              }}
            >
              {method.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div><h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Payment providers</h4><p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Configure Stripe, PayPal, M-Pesa, Flutterwave, or add a duplicate provider.</p></div>
        <div className="flex gap-2">
          <select value={providerToAdd} onChange={(event) => setProviderToAdd(event.target.value)} className="select-field py-2">{Object.keys(paymentTemplates).map((id) => <option key={id} value={id}>{paymentTemplates[id].label}</option>)}</select>
          <button onClick={() => setDraft({ ...draft, providers: [...draft.providers, { ...paymentTemplates[providerToAdd], id: `${providerToAdd}-${Date.now()}` }] })} className="btn-secondary"><Plus className="h-4 w-4" /> Add</button>
        </div>
      </div>

      <div className="space-y-3">
        {draft.providers.map((provider: any, index: number) => (
          <div key={provider.id} className="card p-5">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5" style={{ color: 'rgb(var(--color-primary-600))' }} />
                <input value={provider.label} onChange={(event) => updateProvider(index, { label: event.target.value })} className="border-0 bg-transparent p-0 text-lg font-semibold focus:outline-none" style={{ color: 'rgb(var(--color-text))' }} />
                {provider.enabled ? <span className="badge-success">Enabled</span> : <span className="badge-neutral">Disabled</span>}
              </div>
              <div className="flex items-center gap-2">
                <select value={provider.mode || 'test'} onChange={(event) => updateProvider(index, { mode: event.target.value })} className="select-field py-2"><option value="test">Test</option><option value="live">Live</option></select>
                <Toggle checked={!!provider.enabled} onChange={() => updateProvider(index, { enabled: !provider.enabled })} />
                <button onClick={() => { setTestingId(provider.id); testProvider.mutate(provider.id); }} disabled={testingId === provider.id} className="btn-secondary btn-sm"><TestTube2 className="h-4 w-4" /> Test</button>
                <button onClick={() => setDraft({ ...draft, providers: draft.providers.filter((_: any, i: number) => i !== index) })} className="btn-danger btn-sm"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {providerFields(provider).map((key) => (
                <Field key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())} type={secretFields.includes(key) ? 'password' : 'text'} value={provider[key]} onChange={(value) => updateProvider(index, { [key]: value })} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <SaveBar saving={saving} onSave={() => onSave(draft, 'Payment methods and external checkout providers')} />
    </section>
  );
}

function LoginSettings({ config, onSave, saving }: { config: any; onSave: (value: any, description: string) => void; saving?: boolean }) {
  const [draft, setDraft] = useState(() => ({
    oauthProviders: config?.oauthProviders || Object.values(loginTemplates),
    localMockEnabled: config?.localMockEnabled ?? true,
    showOnLogin: config?.showOnLogin ?? true,
    showOnRegister: config?.showOnRegister ?? true,
    buttonStyle: config?.buttonStyle ?? 'brand',
    dividerLabel: config?.dividerLabel ?? 'or continue with',
    position: config?.position ?? 'above',
  }));
  const [providerToAdd, setProviderToAdd] = useState('google');
  const updateProvider = (index: number, patch: any) => setDraft({ ...draft, oauthProviders: draft.oauthProviders.map((item: any, i: number) => (i === index ? { ...item, ...patch } : item)) });
  const enabledProviders = draft.oauthProviders.filter((p: any) => p.enabled);
  const getIcon = (id: string) => oauthIcons[id] || id[0].toUpperCase();

  return (
    <section>
      <PanelHeader icon={<LogIn className="h-5 w-5" />} title="Login Settings" description="Social login providers, app IDs, secrets, and customer-facing button styles." />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ToggleRow title="Show social login on sign-in" description="Display OAuth buttons on the login page." checked={draft.showOnLogin !== false} onChange={() => setDraft({ ...draft, showOnLogin: !draft.showOnLogin })} />
        <ToggleRow title="Show social login on sign-up" description="Display OAuth buttons on the registration page." checked={draft.showOnRegister !== false} onChange={() => setDraft({ ...draft, showOnRegister: !draft.showOnRegister })} />
        <ToggleRow title="Local OAuth mock" description="Useful in development before real OAuth apps are connected." checked={draft.localMockEnabled} onChange={() => setDraft({ ...draft, localMockEnabled: !draft.localMockEnabled })} />
        <div className="rounded-lg border p-4" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }}>
          <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>Button style</p>
          <div className="mt-2 flex gap-2">
            {['brand', 'outline', 'subtle'].map((style) => (
              <button key={style} onClick={() => setDraft({ ...draft, buttonStyle: style })} className="rounded-lg px-3 py-2 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: draft.buttonStyle === style ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-surface-hover))',
                  color: draft.buttonStyle === style ? 'white' : 'rgb(var(--color-text-muted))',
                }}
              >
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>Divider label</label>
          <input value={draft.dividerLabel} onChange={(e) => setDraft({ ...draft, dividerLabel: e.target.value })} className="input-field" placeholder="or continue with" />
        </div>
        <div className="card p-4">
          <label className="block text-sm font-medium mb-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>Button position</label>
          <select value={draft.position} onChange={(e) => setDraft({ ...draft, position: e.target.value })} className="select-field">
            <option value="above">Above form (top)</option>
            <option value="below">Below form (bottom)</option>
          </select>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>OAuth Providers</h4>
        <div className="flex gap-2">
          <select value={providerToAdd} onChange={(e) => setProviderToAdd(e.target.value)} className="select-field py-2 text-sm">
            {Object.keys(loginTemplates).map((id) => (
              <option key={id} value={id}>{loginTemplates[id].label}</option>
            ))}
          </select>
          <button onClick={() => setDraft({ ...draft, oauthProviders: [...draft.oauthProviders, { ...loginTemplates[providerToAdd], id: `${providerToAdd}-${Date.now()}` }] })} className="btn-secondary btn-sm">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {draft.oauthProviders.map((provider: any, index: number) => {
          const isNew = !Object.keys(loginTemplates).includes(provider.id.replace(/-\d+$/, ''));
          const templateId = provider.id.replace(/-\d+$/, '');
          const icon = getIcon(templateId);
          const color = provider.brandColor || loginTemplates[templateId]?.brandColor || '#666';
          return (
            <div key={provider.id} className="card p-5 overflow-hidden">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm" style={{ backgroundColor: color }}>
                    {icon}
                  </div>
                  <input value={provider.label} onChange={(event) => updateProvider(index, { label: event.target.value })} className="border-0 bg-transparent p-0 text-lg font-semibold focus:outline-none" style={{ color: 'rgb(var(--color-text))' }} />
                </div>
                <div className="flex items-center gap-2">
                  {isNew && <span className="badge-info">Custom</span>}
                  {provider.enabled ? <span className="badge-success">On</span> : <span className="badge-neutral">Off</span>}
                  <select value={provider.mode || 'test'} onChange={(event) => updateProvider(index, { mode: event.target.value })} className="select-field py-2 text-xs">
                    <option value="test">Test</option><option value="live">Live</option>
                  </select>
                  <Toggle checked={!!provider.enabled} onChange={() => updateProvider(index, { enabled: !provider.enabled })} />
                  <button onClick={() => setDraft({ ...draft, oauthProviders: draft.oauthProviders.filter((_: any, i: number) => i !== index) })} className="btn-danger btn-sm"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              {provider.enabled && (
                <div className="mb-4 rounded-lg border p-3" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface-muted))' }}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--color-text-disabled))' }}>Customer preview</p>
                  <button
                    className={`flex w-full items-center justify-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all`}
                    style={{
                      backgroundColor: draft.buttonStyle === 'brand' ? color : 'rgb(var(--color-surface))',
                      color: draft.buttonStyle === 'brand' ? 'white' : color,
                      border: draft.buttonStyle === 'outline' || draft.buttonStyle === 'subtle' ? `2px solid ${color}` : 'none',
                    }}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white" style={{ backgroundColor: color }}>{icon}</span>
                    Continue with {provider.label}
                  </button>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Brand color" type="text" value={provider.brandColor || ''} onChange={(value) => updateProvider(index, { brandColor: value })} placeholder="#DC4A3F" />
                {Object.keys(provider).filter((key) => !['id', 'label', 'enabled', 'mode', 'brandColor', 'brandIcon'].includes(key)).map((key) => (
                  <Field key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())} type={secretFields.includes(key) ? 'password' : 'text'} value={provider[key]} onChange={(value) => updateProvider(index, { [key]: value })} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {draft.oauthProviders.length === 0 && (
        <div className="card p-8 text-center">
          <LogIn className="mx-auto h-8 w-8" style={{ color: 'rgb(var(--color-text-disabled))' }} />
          <p className="mt-3 font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>No OAuth providers configured</p>
          <p className="mt-1 text-sm" style={{ color: 'rgb(var(--color-text-disabled))' }}>Add your first provider above</p>
        </div>
      )}
      <SaveBar saving={saving} onSave={() => onSave(draft, 'OAuth providers, login button styles, and visibility toggles')} />
    </section>
  );
}

function UploadSettings({ config, onSave, saving }: { config: any; onSave: (value: any, description: string) => void; saving?: boolean }) {
  const [draft, setDraft] = useState(() => ({ maxProductImages: 8, maxImageSizeMb: 5, acceptedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'], ...config }));
  return (
    <section>
      <PanelHeader icon={<Upload className="h-5 w-5" />} title="Upload Settings" description="Control media limits and accepted image formats for sellers." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Max product images" type="number" value={draft.maxProductImages} onChange={(value) => setDraft({ ...draft, maxProductImages: value })} />
        <Field label="Max image size MB" type="number" value={draft.maxImageSizeMb} onChange={(value) => setDraft({ ...draft, maxImageSizeMb: value })} />
        <Field label="Accepted image MIME types" value={(draft.acceptedImageTypes || []).join(', ')} onChange={(value) => setDraft({ ...draft, acceptedImageTypes: value.split(',').map((item: string) => item.trim()).filter(Boolean) })} />
      </div>
      <SaveBar saving={saving} onSave={() => onSave(draft, 'Seller product image upload limits and accepted MIME types')} />
    </section>
  );
}

function NavigationSettings({ config, onSave, saving }: { config: any; onSave: (value: any, description: string) => void; saving?: boolean }) {
  const [draft, setDraft] = useState(() => ({ topLinks: [], trustBadges: [], ...config }));
  return (
    <section>
      <PanelHeader icon={<Navigation className="h-5 w-5" />} title="Navigation" description="Top bar links and marketplace trust badges." />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="card p-5"><h4 className="mb-3 font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Top links</h4><LinksEditor links={draft.topLinks || []} onChange={(topLinks) => setDraft({ ...draft, topLinks })} /></div>
        <div className="card p-5">
          <h4 className="mb-3 font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Trust badges</h4>
          <div className="space-y-2">
            {(draft.trustBadges || []).map((badge: string, index: number) => (
              <div key={index} className="grid grid-cols-[1fr_auto] gap-2"><input value={badge} onChange={(event) => setDraft({ ...draft, trustBadges: draft.trustBadges.map((item: string, i: number) => i === index ? event.target.value : item) })} className="input-field py-2" /><button onClick={() => setDraft({ ...draft, trustBadges: draft.trustBadges.filter((_: string, i: number) => i !== index) })} className="btn-danger btn-sm"><Trash2 className="h-4 w-4" /></button></div>
            ))}
            <button onClick={() => setDraft({ ...draft, trustBadges: [...(draft.trustBadges || []), 'New badge'] })} className="btn-secondary btn-sm"><Plus className="h-4 w-4" /> Add badge</button>
          </div>
        </div>
      </div>
      <SaveBar saving={saving} onSave={() => onSave(draft, 'Navbar links and marketplace trust badges')} />
    </section>
  );
}

function FooterSettings({ config, onSave, saving }: { config: any; onSave: (value: any, description: string) => void; saving?: boolean }) {
  const [draft, setDraft] = useState(() => ({ newsletterEnabled: true, groups: [], ...config }));
  const updateGroup = (index: number, patch: any) => setDraft({ ...draft, groups: draft.groups.map((group: any, i: number) => i === index ? { ...group, ...patch } : group) });
  return (
    <section>
      <PanelHeader icon={<Flag className="h-5 w-5" />} title="Footer & Policies" description="Footer columns, links, policy routes, and newsletter visibility." />
      <ToggleRow title="Newsletter signup" checked={draft.newsletterEnabled !== false} onChange={() => setDraft({ ...draft, newsletterEnabled: !draft.newsletterEnabled })} />
      <div className="mt-4 space-y-4">
        {(draft.groups || []).map((group: any, index: number) => (
          <div key={index} className="card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Field label="Group title" value={group.title} onChange={(value) => updateGroup(index, { title: value })} />
              <button onClick={() => setDraft({ ...draft, groups: draft.groups.filter((_: any, i: number) => i !== index) })} className="btn-danger btn-sm"><Trash2 className="h-4 w-4" /></button>
            </div>
            <LinksEditor links={group.links || []} onChange={(links) => updateGroup(index, { links })} />
          </div>
        ))}
        <button onClick={() => setDraft({ ...draft, groups: [...(draft.groups || []), { title: 'New group', links: [] }] })} className="btn-secondary"><Plus className="h-4 w-4" /> Add footer group</button>
      </div>
      <SaveBar saving={saving} onSave={() => onSave(draft, 'Footer groups, policy links, and newsletter controls')} />
    </section>
  );
}

function PagesSettings({ config, onSave, saving }: { config: any[]; onSave: (value: any, description: string) => void; saving?: boolean }) {
  const [pages, setPages] = useState<any[]>(() => Array.isArray(config) ? config : []);
  const update = (index: number, patch: any) => setPages(pages.map((page, i) => i === index ? { ...page, ...patch } : page));
  return (
    <section>
      <PanelHeader icon={<FileText className="h-5 w-5" />} title="Basic Pages" description="Create public pages used by footer links and policies." />
      <div className="space-y-4">
        {pages.map((page, index) => (
          <div key={index} className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><LinkIcon className="h-4 w-4" style={{ color: 'rgb(var(--color-primary-600))' }} /><span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>/pages/{page.slug || 'new-page'}</span></div>
              <div className="flex items-center gap-2"><Toggle checked={page.isPublished !== false} onChange={() => update(index, { isPublished: page.isPublished === false })} /><button onClick={() => setPages(pages.filter((_, i) => i !== index))} className="btn-danger btn-sm"><Trash2 className="h-4 w-4" /></button></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title" value={page.title} onChange={(value) => update(index, { title: value })} />
              <Field label="Slug" value={page.slug} onChange={(value) => update(index, { slug: value })} />
              <div className="md:col-span-2"><Field label="Page body" type="textarea" value={page.body} onChange={(value) => update(index, { body: value })} /></div>
            </div>
          </div>
        ))}
        <button onClick={() => setPages([...pages, { slug: 'new-page', title: 'New Page', body: '', isPublished: true }])} className="btn-secondary"><Plus className="h-4 w-4" /> Add page</button>
      </div>
      <SaveBar saving={saving} onSave={() => onSave(pages, 'Editable public pages used by footer and policy links')} />
    </section>
  );
}

function DeploymentSettings({ config, onSave, saving }: { config: any; onSave: (value: any, description: string) => void; saving?: boolean }) {
  const [draft, setDraft] = useState(() => ({ hosting: [], domainMigration: [], secrets: [], launchChecklist: [], ...config }));
  const listKeys = [
    ['hosting', 'Cloud hosting steps'],
    ['domainMigration', 'Domain migration'],
    ['secrets', 'Secure keys'],
    ['launchChecklist', 'Launch checklist'],
  ];
  const updateList = (key: string, values: string[]) => setDraft({ ...draft, [key]: values });
  return (
    <section>
      <PanelHeader icon={<Rocket className="h-5 w-5" />} title="Deployment Roadmap" description="Cloud hosting, domain migration, secret management, and launch operations." />
      <div className="grid gap-4 xl:grid-cols-2">
        {listKeys.map(([key, title]) => (
          <div key={key} className="card p-5">
            <h4 className="mb-3 font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{title}</h4>
            <div className="space-y-2">
              {(draft[key] || []).map((item: string, index: number) => (
                <div key={index} className="grid grid-cols-[1fr_auto] gap-2"><input value={item} onChange={(event) => updateList(key, draft[key].map((value: string, i: number) => i === index ? event.target.value : value))} className="input-field py-2" /><button onClick={() => updateList(key, draft[key].filter((_: string, i: number) => i !== index))} className="btn-danger btn-sm"><Trash2 className="h-4 w-4" /></button></div>
              ))}
              <button onClick={() => updateList(key, [...(draft[key] || []), 'New step'])} className="btn-secondary btn-sm"><Plus className="h-4 w-4" /> Add step</button>
            </div>
          </div>
        ))}
      </div>
      <SaveBar saving={saving} onSave={() => onSave(draft, 'Cloud hosting, domain migration, and secure key handling roadmap')} />
    </section>
  );
}

function CustomSettings({ configs, onSave, onDelete, saving }: { configs: any[]; onSave: (payload: any) => void; onDelete: (key: string) => void; saving?: boolean }) {
  const [form, setForm] = useState({ key: '', value: '', type: 'string', description: '', isActive: true });
  const customConfigs = configs.filter((cfg) => !['site.identity', 'site.theme', 'platform.assets', 'homepage.content', 'marketplace.catalog', 'marketplace.payments', 'marketplace.auth', 'marketplace.uploads', 'marketplace.navigation', 'footer.content', 'site.pages', 'deployment.roadmap'].includes(cfg.key));
  const save = () => {
    const value = form.type === 'number' ? Number(form.value) : form.type === 'boolean' ? form.value === 'true' : form.value;
    onSave({ key: form.key, value, type: form.type, description: form.description, isActive: form.isActive });
    setForm({ key: '', value: '', type: 'string', description: '', isActive: true });
  };
  return (
    <section>
      <PanelHeader icon={<Settings className="h-5 w-5" />} title="Custom Settings" description="Add simple site flags and values with typed controls. No JSON required." />
      <div className="card mb-5 p-5">
        <h4 className="mb-4 font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Add setting</h4>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Key" value={form.key} onChange={(value) => setForm({ ...form, key: value })} placeholder="feature.example" />
          <label><span className="mb-1 block text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>Type</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="select-field"><option value="string">Text</option><option value="number">Number</option><option value="boolean">Boolean</option></select></label>
          {form.type === 'boolean' ? (
            <label><span className="mb-1 block text-sm font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>Value</span><select value={form.value || 'true'} onChange={(event) => setForm({ ...form, value: event.target.value })} className="select-field"><option value="true">On</option><option value="false">Off</option></select></label>
          ) : <Field label="Value" type={form.type === 'number' ? 'number' : 'text'} value={form.value} onChange={(value) => setForm({ ...form, value: String(value) })} />}
          <Field label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
        </div>
        <div className="mt-4 flex justify-end"><button onClick={save} disabled={saving || !form.key} className="btn-primary"><KeyRound className="h-4 w-4" /> Add setting</button></div>
      </div>
      <div className="grid gap-3">
        {customConfigs.map((cfg) => (
          <div key={cfg.key} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between" style={{ borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }}>
            <div><p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{cfg.key}</p><p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{cfg.description || 'Custom setting'} · {cfg.type}</p></div>
            <div className="flex items-center gap-2"><span className="rounded px-2 py-1 text-sm" style={{ backgroundColor: 'rgb(var(--color-surface-hover))', color: 'rgb(var(--color-text))' }}>{String(cfg.value)}</span><button onClick={() => onDelete(cfg.key)} className="btn-danger btn-sm"><Trash2 className="h-4 w-4" /></button></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AdminConfig() {
  const qc = useQueryClient();
  const [section, setSection] = useState('site');
  const { data, isLoading } = useQuery({ queryKey: ['admin-config'], queryFn: () => get('/config') });
  const configs = data?.data || [];
  const configMap = useMemo(() => configs.reduce((acc: any, cfg: any) => ({ ...acc, [cfg.key]: cfg }), {}), [configs]);

  const saveConfig = useMutation({
    mutationFn: ({ key, value, type, description, isActive = true }: any) => put(`/config/${key}`, { value, type, description, isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-config'] });
      qc.invalidateQueries({ queryKey: ['config', 'public'] });
      toast.success('Settings saved');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to save settings'),
  });

  const createConfig = useMutation({
    mutationFn: (payload: any) => post('/config', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-config'] });
      qc.invalidateQueries({ queryKey: ['config', 'public'] });
      toast.success('Setting added');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add setting'),
  });

  const deleteConfig = useMutation({
    mutationFn: (key: string) => del(`/config/${key}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-config'] });
      qc.invalidateQueries({ queryKey: ['config', 'public'] });
      toast.success('Setting deleted');
    },
  });

  const saveJsonConfig = (key: string, value: any, description: string) => saveConfig.mutate({ key, value, type: 'json', description, isActive: true });
  
  const menu = [
    { group: 'Storefront', items: [
      { id: 'site', label: 'Site Identity', icon: Globe2 },
      { id: 'theme', label: 'Themes', icon: Palette },
      { id: 'assets', label: 'Assets', icon: Images },
      { id: 'home', label: 'Home Page', icon: Home },
      { id: 'navigation', label: 'Navigation', icon: Navigation },
      { id: 'footer', label: 'Footer & Policies', icon: Flag },
      { id: 'pages', label: 'Basic Pages', icon: FileText },
    ] },
    { group: 'Commerce', items: [
      { id: 'catalog', label: 'Catalog', icon: Package },
      { id: 'payments', label: 'Payments', icon: CreditCard },
      { id: 'uploads', label: 'Uploads', icon: Upload },
      { id: 'login', label: 'Login', icon: LogIn },
    ] },
    { group: 'Operations', items: [
      { id: 'deployment', label: 'Deployment', icon: Rocket },
      { id: 'custom', label: 'Custom Settings', icon: Settings },
    ] },
  ];

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="space-y-6">
      {/* Horizontal sticky pill toggle bar */}
      <div className="sticky z-20" style={{ top: '4rem', paddingTop: '0.25rem', marginTop: '-0.25rem' }}>
        <div
          className="flex flex-nowrap gap-1 overflow-x-auto py-2 px-1 scrollbar-thin"
          style={{
            backgroundColor: 'rgb(var(--color-surface))',
            borderBottom: 'none',
          }}
          role="tablist"
          aria-label="Settings sections"
        >
          {menu.map((group) => (
            <React.Fragment key={group.group}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = section === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    role="tab"
                    aria-selected={isActive}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0"
                    style={{
                      backgroundColor: isActive ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-surface-hover))',
                      color: isActive ? 'white' : 'rgb(var(--color-text-muted))',
                      boxShadow: isActive ? '0 1px 3px rgb(0 0 0 / 0.12)' : 'none',
                    }}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden sm:inline">{item.label}</span>
                    {item.id === 'site' && (
                      <span className="inline sm:hidden">Site</span>
                    )}
                    {item.id !== 'site' && (
                      <span className="inline sm:hidden">{item.label === 'Site Identity' ? 'Site' : item.label.split(' ')[0]}</span>
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        <div style={{ height: '1px', backgroundColor: 'rgb(var(--color-divider))' }} />
      </div>

      <main className="min-w-0">
        {section === 'site' && <SiteIdentity config={configMap['site.identity']?.value} saving={saveConfig.isPending} onSave={(value, description) => saveJsonConfig('site.identity', value, description)} />}
        {section === 'theme' && <ThemeSettings config={configMap['site.theme']?.value} saving={saveConfig.isPending} onSave={(value, description) => saveJsonConfig('site.theme', value, description)} />}
        {section === 'assets' && <AssetSettings config={configMap['platform.assets']?.value} saving={saveConfig.isPending} onSave={(value, description) => saveJsonConfig('platform.assets', value, description)} />}
        {section === 'home' && <HomeSettings config={configMap['homepage.content']?.value} saving={saveConfig.isPending} onSave={(value, description) => saveJsonConfig('homepage.content', value, description)} />}
        {section === 'catalog' && <CatalogSettings config={configMap['marketplace.catalog']?.value} saving={saveConfig.isPending} onSave={(value, description) => saveJsonConfig('marketplace.catalog', value, description)} />}
        {section === 'payments' && <PaymentSettings config={configMap['marketplace.payments']?.value} saving={saveConfig.isPending} onSave={(value, description) => saveJsonConfig('marketplace.payments', value, description)} />}
        {section === 'login' && <LoginSettings config={configMap['marketplace.auth']?.value} saving={saveConfig.isPending} onSave={(value, description) => saveJsonConfig('marketplace.auth', value, description)} />}
        {section === 'uploads' && <UploadSettings config={configMap['marketplace.uploads']?.value} saving={saveConfig.isPending} onSave={(value, description) => saveJsonConfig('marketplace.uploads', value, description)} />}
        {section === 'navigation' && <NavigationSettings config={configMap['marketplace.navigation']?.value} saving={saveConfig.isPending} onSave={(value, description) => saveJsonConfig('marketplace.navigation', value, description)} />}
        {section === 'footer' && <FooterSettings config={configMap['footer.content']?.value} saving={saveConfig.isPending} onSave={(value, description) => saveJsonConfig('footer.content', value, description)} />}
        {section === 'pages' && <PagesSettings config={configMap['site.pages']?.value} saving={saveConfig.isPending} onSave={(value, description) => saveJsonConfig('site.pages', value, description)} />}
        {section === 'deployment' && <DeploymentSettings config={configMap['deployment.roadmap']?.value} saving={saveConfig.isPending} onSave={(value, description) => saveJsonConfig('deployment.roadmap', value, description)} />}
        {section === 'custom' && <CustomSettings configs={configs} saving={createConfig.isPending} onSave={(payload) => createConfig.mutate(payload)} onDelete={(key) => deleteConfig.mutate(key)} />}
      </main>
    </div>
  );
}