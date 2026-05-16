import { prisma } from '../../common/prisma';
import { AppError, NotFoundError } from '../../common/errors';

const defaults = [
  {
    key: 'marketplace.uploads',
    value: {
      maxProductImages: 8,
      maxImageSizeMb: 15,
      acceptedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'],
    },
    type: 'json',
    description: 'Seller product image upload limits and accepted MIME types',
  },
  {
    key: 'marketplace.auth',
    value: {
      oauthProviders: [
        { id: 'google', label: 'Google', enabled: false, mode: 'test', clientId: '', clientSecret: '', authUrl: '' },
        { id: 'facebook', label: 'Facebook', enabled: false, mode: 'test', clientId: '', clientSecret: '', authUrl: '' },
        { id: 'apple', label: 'Apple', enabled: false, mode: 'test', clientId: '', teamId: '', keyId: '', privateKey: '', authUrl: '' },
      ],
      localMockEnabled: true,
    },
    type: 'json',
    description: 'Third-party login providers exposed to customers',
  },
  {
    key: 'marketplace.payments',
    value: {
      enabledMethods: ['CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CASH_ON_DELIVERY'],
      providers: [
        { id: 'stripe', label: 'Stripe', method: 'CARD', enabled: false, mode: 'test', publishableKey: '', secretKey: '', webhookSecret: '', checkoutUrl: '' },
        { id: 'paypal', label: 'PayPal', method: 'CARD', enabled: false, mode: 'test', clientId: '', clientSecret: '', webhookSecret: '', checkoutUrl: '' },
        { id: 'mpesa', label: 'M-Pesa', method: 'MOBILE_MONEY', enabled: false, mode: 'test', consumerKey: '', consumerSecret: '', passkey: '', shortcode: '', callbackUrl: '' },
        { id: 'flutterwave', label: 'Flutterwave', method: 'CARD', enabled: false, mode: 'test', publicKey: '', secretKey: '', encryptionKey: '', checkoutUrl: '' },
      ],
      requireConfiguredProvider: false,
      localMockEnabled: true,
    },
    type: 'json',
    description: 'Payment methods and external checkout providers',
  },
  {
    key: 'marketplace.navigation',
    value: {
      topLinks: [
        { label: 'Supplier Center', href: '/seller' },
        { label: 'Orders', href: '/account/orders' },
      ],
      trustBadges: ['Verified suppliers', 'Ready to ship', 'Trade assurance'],
    },
    type: 'json',
    description: 'Navbar links and marketplace trust badges',
  },
  {
    key: 'site.identity',
    value: {
      name: 'MarketPlace',
      logoUrl: '',
      faviconUrl: '',
      description: 'A multi-vendor marketplace for secure buying, seller operations, order tracking, and configurable platform integrations.',
      seoTitle: 'MarketPlace - Buy and Sell Online',
      seoDescription: 'Shop products from trusted sellers with secure checkout and seller tools.',
      supportEmail: 'support@marketplace.co.tz',
      supportPhone: '+255 123 456 789',
      address: 'Dar es Salaam, Tanzania',
    },
    type: 'json',
    description: 'Branding, favicon, SEO, and contact details',
  },
  {
    key: 'site.theme',
    value: {
      presetId: 'marketplace-classic',
      homeTemplate: 'dense-marketplace',
      density: 'dense',
      cornerRadius: 'compact',
      variables: {},
    },
    type: 'json',
    description: 'Central storefront theme preset, layout density, and shared design tokens',
  },
  {
    key: 'platform.assets',
    value: {
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
    },
    type: 'json',
    description: 'Shared platform assets for branding, admin previews, and dashboard media',
  },
  {
    key: 'homepage.content',
    value: {
      heroEnabled: true,
      heroTitle: 'Source smarter, sell faster',
      heroSubtitle: 'Find ready-to-ship items, compare trusted sellers, and build your cart from one fast storefront.',
      heroImageUrl: '/uploads/products/iphone15pm-1.jpg',
      heroSearchPlaceholder: 'Search phones, shoes, laptops...',
      heroEyebrow: 'Configurable commerce',
      categoryRailEnabled: true,
      trustCardsEnabled: true,
      promoBannersEnabled: true,
      categoryScrollerEnabled: true,
      dealRailEnabled: true,
      sellerStripEnabled: true,
      tabbedShowcaseEnabled: true,
      featuredProductsEnabled: true,
      ctaCardsEnabled: true,
      promoBanners: [
        { title: 'Electronics week', text: 'Phones, laptops, and accessories from verified sellers.', href: '/products?search=electronics', imageUrl: '/uploads/products/iphone15pm-1.jpg' },
        { title: 'Fresh fashion drops', text: 'Shoes and style essentials ready to ship.', href: '/products?search=fashion', imageUrl: '/uploads/products/ultraboost-1.jpg' },
        { title: 'Supplier deals', text: 'Bulk-ready offers for growing stores.', href: '/products?sortBy=totalSales&sortOrder=desc', imageUrl: '/uploads/products/mbp14-1.jpg' },
      ],
    },
    type: 'json',
    description: 'Homepage hero, images, sections, and merchandising toggles',
  },
  {
    key: 'marketplace.catalog',
    value: {
      categoriesEnabled: true,
      brandsEnabled: true,
      sellerBrandCreationEnabled: true,
      brandApprovalRequired: false,
      featuredProductsEnabled: true,
      newArrivalsEnabled: true,
      bestSellersEnabled: true,
    },
    type: 'json',
    description: 'Catalog controls for categories, brands, and product sections',
  },
  {
    key: 'footer.content',
    value: {
      newsletterEnabled: true,
      groups: [
        { title: 'Shop', links: [{ label: 'All Products', href: '/products' }, { label: 'Featured', href: '/products?isFeatured=true' }, { label: 'Best Sellers', href: '/products?sortBy=totalSales&sortOrder=desc' }] },
        { title: 'Sell', links: [{ label: 'Start Selling', href: '/become-seller' }, { label: 'Seller Center', href: '/seller' }, { label: 'Payouts', href: '/seller/payouts' }] },
        { title: 'Policies', links: [{ label: 'Privacy Policy', href: '/pages/privacy-policy' }, { label: 'Terms of Service', href: '/pages/terms-of-service' }, { label: 'Return Policy', href: '/pages/return-policy' }, { label: 'Shipping Policy', href: '/pages/shipping-policy' }] },
        { title: 'Company', links: [{ label: 'Contact Support', href: '/pages/contact-support' }, { label: 'Admin Panel', href: '/admin' }] },
      ],
    },
    type: 'json',
    description: 'Footer groups, policy links, and newsletter controls',
  },
  {
    key: 'site.pages',
    value: [
      { slug: 'privacy-policy', title: 'Privacy Policy', body: 'Explain how customer and seller data is collected, protected, and used.', isPublished: true },
      { slug: 'terms-of-service', title: 'Terms of Service', body: 'Define marketplace account, purchase, seller, and platform rules.', isPublished: true },
      { slug: 'return-policy', title: 'Return Policy', body: 'Describe return windows, conditions, refunds, and seller obligations.', isPublished: true },
      { slug: 'shipping-policy', title: 'Shipping Policy', body: 'Explain shipping methods, labels, timelines, and tracking.', isPublished: true },
      { slug: 'contact-support', title: 'Contact Support', body: 'Use the support channels configured in admin settings for assistance.', isPublished: true },
    ],
    type: 'json',
    description: 'Editable public pages used by footer and policy links',
  },
  {
    key: 'deployment.roadmap',
    value: {
      hosting: ['Build frontend with Vite and serve from CDN/static hosting', 'Run backend API on a managed Node host or container platform', 'Use managed PostgreSQL for production instead of SQLite', 'Store uploads in S3/R2/Cloudinary-compatible object storage'],
      domainMigration: ['Point DNS A/CNAME records to the new hosting provider', 'Set FRONTEND_URL and API URLs for the new domain', 'Enable HTTPS and redirect old domains to the canonical domain', 'Update payment, OAuth, and M-Pesa webhook callback URLs'],
      secrets: ['Keep JWT, database, payment, OAuth, SMTP, SMS, and storage keys in provider secret managers', 'Never expose secret keys in public config responses', 'Rotate keys before launch and after staff changes', 'Use separate test and live provider credentials'],
      launchChecklist: ['Run migrations against production database', 'Seed admin user through a secure one-time process', 'Configure backups, logs, uptime checks, and error monitoring', 'Verify checkout, email/SMS, uploads, and search indexing on the final domain'],
    },
    type: 'json',
    description: 'Cloud hosting, domain migration, and secure key handling roadmap',
  },
{
     key: 'ai.chat',
     value: {
       enabled: true,
       defaultProvider: '',
       defaultModel: 'gpt-3.5-turbo',
       systemPrompt: 'You are a helpful AI assistant for a marketplace platform. Assist users with product inquiries, orders, and general questions. Be concise and friendly.',
       temperature: 0.7,
       maxTokens: 1024,
       maxContextMessages: 50,
       usageLimitDaily: 100,
       usageLimitMonthly: 3000,
       showTypingIndicator: true,
       streamingEnabled: true,
     },
     type: 'json',
     description: 'AI chatbot configuration: provider, model, system prompt, temperature, token limits, and usage quotas',
   },
   {
     key: 'ai.capabilities',
     value: {
       registryEnabled: true,
       autoApproveLowRisk: true,
       maxToolsPerRequest: 10,
       knowledgeBaseEnabled: true,
       promptProfilesEnabled: true,
       auditLogRetentionDays: 90,
     },
     type: 'json',
     description: 'AI capability registry settings: tool registry, auto-approval, knowledge base, prompt profiles, and audit retention',
   },
];

function parseFlagValue(flag: { value: string }) {
  try {
    return JSON.parse(flag.value);
  } catch {
    return flag.value;
  }
}

function scrubProvider(provider: any) {
  const secretFields = ['secretKey', 'clientSecret', 'consumerSecret', 'webhookSecret', 'passkey', 'encryptionKey', 'privateKey'];
  return Object.keys(provider || {}).reduce((acc: any, key) => {
    if (!secretFields.includes(key)) acc[key] = provider[key];
    return acc;
  }, {});
}

function scrubPublicValue(key: string, value: any) {
  if (key === 'marketplace.payments') {
    return {
      ...value,
      providers: Array.isArray(value?.providers) ? value.providers.map(scrubProvider) : [],
    };
  }
  if (key === 'marketplace.auth') {
    return {
      ...value,
      oauthProviders: Array.isArray(value?.oauthProviders) ? value.oauthProviders.map(scrubProvider) : [],
    };
  }
  return value;
}

export class DynamicConfigService {
  async getAll() {
    const flags = await prisma.featureFlag.findMany({ orderBy: { updatedAt: 'desc' } });
    const storedKeys = new Set(flags.map((flag) => flag.key));
    const stored = flags.map(f => ({ ...f, value: parseFlagValue(f) }));
    const missingDefaults = defaults
      .filter((item) => !storedKeys.has(item.key))
      .map((item) => ({
        id: `default:${item.key}`,
        key: item.key,
        value: item.value,
        type: item.type,
        description: item.description,
        isActive: true,
        updatedAt: new Date(0),
        isDefault: true,
      }));
    return [...missingDefaults, ...stored];
  }

  async getByKey(key: string) {
    const flag = await prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) {
      const fallback = defaults.find((item) => item.key === key);
      if (!fallback) throw new NotFoundError('Config not found');
      return { ...fallback, id: `default:${key}`, isActive: true, updatedAt: new Date(0), isDefault: true };
    }
    return { ...flag, value: parseFlagValue(flag) };
  }

  async getValue(key: string, defaultValue?: any): Promise<any> {
    const flag = await prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) {
      const fallback = defaults.find((item) => item.key === key);
      return fallback?.value ?? defaultValue ?? null;
    }
    if (!flag || !flag.isActive) return defaultValue ?? null;
    return parseFlagValue(flag);
  }

  async create(data: { key: string; value: any; type?: string; description?: string }) {
    const existing = await prisma.featureFlag.findUnique({ where: { key: data.key } });
    if (existing) throw new AppError(409, 'Config key already exists');
    return prisma.featureFlag.create({
      data: {
        key: data.key,
        value: JSON.stringify(data.value),
        type: data.type || 'string',
        description: data.description,
      },
    });
  }

  async update(key: string, data: { value?: any; type?: string; description?: string; isActive?: boolean }) {
    const flag = await prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) {
      const fallback = defaults.find((item) => item.key === key);
      if (!fallback) throw new NotFoundError('Config not found');
      return prisma.featureFlag.create({
        data: {
          key,
          value: JSON.stringify(data.value !== undefined ? data.value : fallback.value),
          type: data.type || fallback.type,
          description: data.description !== undefined ? data.description : fallback.description,
          isActive: data.isActive ?? true,
        },
      });
    }
    return prisma.featureFlag.update({
      where: { key },
      data: {
        ...(data.value !== undefined && { value: JSON.stringify(data.value) }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async delete(key: string) {
    const flag = await prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) throw new NotFoundError('Config not found');
    await prisma.featureFlag.delete({ where: { key } });
    return { message: 'Config deleted' };
  }

  async getPublic() {
    const flags = await prisma.featureFlag.findMany({ where: { isActive: true } });
    const acc = defaults.reduce((result: any, item) => {
      result[item.key] = scrubPublicValue(item.key, item.value);
      return result;
    }, {});
    flags.forEach((f) => {
      acc[f.key] = scrubPublicValue(f.key, parseFlagValue(f));
    });
    return acc;
  }
}
