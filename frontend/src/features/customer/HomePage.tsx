import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Sparkles, ArrowRight, ChevronLeft, ChevronRight, ShoppingBag, Truck, Shield, Clock, Star, Package, Percent, TrendingUp, Zap, Globe, Award, BadgeCheck, Store, Gift } from 'lucide-react';
import { useCategoryTree, useFeaturedProducts, useProducts, usePublicConfig } from '../../lib/query-hooks';
import { assetUrl } from '../../lib/assets';
import RecentlyViewed from '../shared/RecentlyViewed';

function CompactProductCard({ product }: { product: any }) {
  const price = product.discountPrice || product.basePrice;
  return (
    <Link
      to={`/products/${product.slug || product.id}`}
      className="group block overflow-hidden rounded-xl transition-all duration-200 hover:shadow-lg"
      style={{
        backgroundColor: 'rgb(var(--color-surface))',
        border: '1px solid',
        borderColor: 'rgb(var(--color-border))',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgb(var(--color-primary-300))'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgb(var(--color-border))'; }}
    >
      <div className="aspect-square overflow-hidden relative" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
        {product.images?.[0]?.url ? (
          <img src={assetUrl(product.images[0].url)} alt={product.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="grid h-full w-full place-items-center" style={{ color: 'rgb(var(--color-text-disabled))' }}>
            <Package className="w-10 h-10" />
          </div>
        )}
        {product.discountPrice && (
          <span className="absolute top-2 left-2 text-white text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-danger))' }}>
            -{Math.round((1 - product.discountPrice / product.basePrice) * 100)}%
          </span>
        )}
        {product.totalSales > 50 && (
          <span className="absolute top-2 right-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgb(var(--color-warning) / 0.9)', color: 'white' }}>
            Hot
          </span>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="line-clamp-2 text-xs font-medium leading-tight min-h-[2.5rem] transition-colors group-hover:text-primary-600" style={{ color: 'rgb(var(--color-text))' }}>
          {product.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-1 flex-wrap">
          <span className="text-xs font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>{price?.toLocaleString()} TZS</span>
          {product.discountPrice && (
            <span className="text-[10px] line-through" style={{ color: 'rgb(var(--color-text-muted))' }}>{product.basePrice?.toLocaleString()}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {product.rating && (
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'rgb(var(--color-warning))' }}>
              <Star className="w-2.5 h-2.5 fill-current" /> {product.rating}
            </span>
          )}
          {product.totalSales > 0 && (
            <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>{product.totalSales} sold</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ScrollRail({ id, children }: { id: string; children: React.ReactNode }) {
  const scroll = (direction: number) => {
    const el = document.getElementById(id);
    if (el) el.scrollBy({ left: direction * 380, behavior: 'smooth' });
  };
  return (
    <div className="relative group">
      <button type="button" onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden group-hover:flex shadow-lg rounded-full p-1.5 -ml-4 border items-center justify-center"
        style={{ backgroundColor: 'rgb(var(--color-surface) / 0.9)', borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text-secondary))' }}
        aria-label="Scroll left">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden group-hover:flex shadow-lg rounded-full p-1.5 -mr-4 border items-center justify-center"
        style={{ backgroundColor: 'rgb(var(--color-surface) / 0.9)', borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text-secondary))' }}
        aria-label="Scroll right">
        <ChevronRight className="h-5 w-5" />
      </button>
      <div id={id} className="flex gap-3 overflow-x-auto scroll-smooth pb-2 -mx-4 px-4">{children}</div>
    </div>
  );
}

const promoDeals = [
  { title: 'Flash Sale', subtitle: 'Up to 70% off', color: 'from-red-500 to-red-600', icon: Zap, link: '/products?sortBy=discountPrice&sortOrder=desc' },
  { title: 'New Season', subtitle: 'Fresh arrivals', color: 'from-blue-500 to-blue-600', icon: Sparkles, link: '/products?sortBy=createdAt&sortOrder=desc' },
  { title: 'Free Shipping', subtitle: 'On all orders', color: 'from-green-500 to-green-600', icon: Truck, link: '/products?shipping=free' },
  { title: 'Best Rated', subtitle: 'Top reviews', color: 'from-purple-500 to-purple-600', icon: Star, link: '/products?sortBy=rating&sortOrder=desc' },
  { title: 'Wholesale', subtitle: 'Bulk discounts', color: 'from-orange-500 to-orange-600', icon: Package, link: '/products' },
  { title: 'Gift Cards', subtitle: 'Perfect gift', color: 'from-pink-500 to-pink-600', icon: Gift, link: '/products' },
];

const brandLogos = [
  { name: 'TechPro', color: 'rgb(var(--color-primary-600))' },
  { name: 'FashionHub', color: 'rgb(var(--color-accent-500))' },
  { name: 'HomeStyle', color: 'rgb(var(--color-warning))' },
  { name: 'SportMax', color: 'rgb(var(--color-danger))' },
  { name: 'BeautyLab', color: 'rgb(var(--color-pink-500))' },
  { name: 'EcoGoods', color: 'rgb(var(--color-green-500))' },
  { name: 'AutoParts', color: 'rgb(var(--color-gray-600))' },
  { name: 'BookWorld', color: 'rgb(var(--color-indigo-500))' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { data: featuredData, isLoading: featuredLoading } = useFeaturedProducts();
  const { data: newestData } = useProducts({ page: 1, limit: 24, sortBy: 'createdAt', sortOrder: 'desc' });
  const { data: bestSellersData } = useProducts({ page: 1, limit: 12, sortBy: 'totalSales', sortOrder: 'desc' });
  const { data: discountedData } = useProducts({ page: 1, limit: 12, sortBy: 'discountPrice', sortOrder: 'desc' });
  const { data: catData } = useCategoryTree();
  const { data: publicConfig } = usePublicConfig();

  const featuredProducts = featuredData?.data || [];
  const newestProducts = newestData?.data || [];
  const bestSellers = bestSellersData?.data || [];
  const discountedProducts = discountedData?.data || [];
  const categories = catData?.data || [];
  const home = publicConfig?.data?.['homepage.content'] || {};

  const quickCats = categories.length ? categories.slice(0, 12) : [
    { id: 'electronics', name: 'Electronics' },
    { id: 'fashion', name: 'Fashion' },
    { id: 'home-living', name: 'Home & Living' },
    { id: 'sports-outdoors', name: 'Sports' },
    { id: 'beauty', name: 'Beauty' },
    { id: 'tools', name: 'Tools' },
    { id: 'automotive', name: 'Automotive' },
    { id: 'books', name: 'Books' },
    { id: 'toys', name: 'Toys & Games' },
    { id: 'health', name: 'Health' },
    { id: 'jewelry', name: 'Jewelry' },
    { id: 'pet-supplies', name: 'Pet Supplies' },
  ];

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get('search') as string;
    if (q?.trim()) navigate(`/products?search=${encodeURIComponent(q.trim())}`);
  };

  const [currentSlide, setCurrentSlide] = useState(0);
  const heroSlides = [
    { title: 'Source smarter, sell faster', subtitle: 'Discover products, chat with AI assistant, and manage your store from one place.', cta: 'Explore Now', link: '/products' },
    { title: 'Become a Seller Today', subtitle: 'Join thousands of sellers and grow your business on our platform.', cta: 'Start Selling', link: '/become-seller' },
    { title: 'AI-Powered Shopping', subtitle: 'Let our AI assistant help you find the perfect products.', cta: 'Try AI Chat', link: '/ai-chat' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen transition-colors" style={{ backgroundColor: 'rgb(var(--color-gray-50))' }}>
      
      {/* Hero Carousel */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-600)), rgb(var(--color-primary-800)))' }}>
        <div className="absolute inset-0 opacity-5" aria-hidden="true">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider mb-3 rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-50) / 0.1)', color: 'rgb(var(--color-primary-50))' }}>
              <Sparkles className="h-3 w-3" /> {home.heroEyebrow || 'Marketplace AI-Powered'}
            </div>
            
            {/* Slide content */}
            <div className="transition-all duration-500">
              <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-3" style={{ color: 'rgb(var(--color-primary-50))' }}>
                {heroSlides[currentSlide].title}
              </h1>
              <p className="text-primary-100 mb-6 text-sm md:text-base" style={{ color: 'rgb(var(--color-primary-50) / 0.9)' }}>
                {heroSlides[currentSlide].subtitle}
              </p>
            </div>

            {/* Slide indicators */}
            <div className="flex justify-center gap-1.5 mb-4">
              {heroSlides.map((_, i) => (
                <button key={i} onClick={() => setCurrentSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8' : 'w-1.5'}`}
                  style={{ backgroundColor: i === currentSlide ? 'white' : 'rgb(var(--color-primary-50) / 0.4)' }}
                  aria-label={`Slide ${i + 1}`} />
              ))}
            </div>

            <div className="flex items-center justify-center gap-3">
              <Link to={heroSlides[currentSlide].link}
                className="px-6 py-2 rounded-full text-sm font-semibold transition-all hover:shadow-lg"
                style={{ backgroundColor: 'white', color: 'rgb(var(--color-primary-700))' }}>
                {heroSlides[currentSlide].cta} <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
              </Link>
            </div>

            <form onSubmit={handleSearch} className="w-full max-w-lg mx-auto mt-6" role="search">
              <div className="relative flex items-center rounded-full" style={{ backgroundColor: 'rgb(var(--color-primary-50) / 0.1)', border: '1px solid', borderColor: 'rgb(var(--color-primary-50) / 0.2)' }}>
                <Search className="absolute left-4 h-4 w-4" style={{ color: 'rgb(var(--color-primary-50))' }} />
                <input name="search" className="w-full bg-transparent pl-12 pr-20 py-2.5 text-sm focus:outline-none" placeholder="Search products, brands, categories..." aria-label="Search products" style={{ color: 'rgb(var(--color-primary-50))' }} />
                <button type="submit" className="absolute right-1.5 px-4 py-1 text-sm font-semibold rounded-full transition-all" style={{ backgroundColor: 'rgb(var(--color-primary-50))', color: 'rgb(var(--color-primary-900))' }}>
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <div className="border-b" style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2.5 overflow-x-auto gap-4">
            {[
              { icon: Shield, label: 'Secure Payments', sub: '100% protected' },
              { icon: Truck, label: 'Free Shipping', sub: 'On all orders' },
              { icon: Clock, label: '24/7 Support', sub: 'AI-powered help' },
              { icon: Award, label: 'Quality Assured', sub: 'Verified sellers' },
              { icon: BadgeCheck, label: 'Trade Assurance', sub: 'Buyer protection' },
              { icon: Globe, label: 'Global Reach', sub: 'Worldwide shipping' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 shrink-0">
                <item.icon className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
                <div className="text-[11px] leading-tight">
                  <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{item.label}</p>
                  <p style={{ color: 'rgb(var(--color-text-muted))' }}>{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">

        {/* Promo Deal Banners */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {promoDeals.map((deal) => (
            <Link key={deal.title} to={deal.link}
              className={`bg-gradient-to-br ${deal.color} rounded-xl p-3 text-white transition-transform hover:scale-105`}>
              <deal.icon className="w-5 h-5 mb-1.5" />
              <p className="text-xs font-bold">{deal.title}</p>
              <p className="text-[10px] opacity-80">{deal.subtitle}</p>
            </Link>
          ))}
        </div>

        {/* Recently Viewed */}
        <RecentlyViewed />

        {/* Quick Categories - Horizontal Scroll */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text))' }}>Shop by Category</h2>
            <Link to="/products" className="text-xs transition-colors flex items-center gap-1" style={{ color: 'rgb(var(--color-primary-600))' }}>
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 smooth-scroll">
            {quickCats.map((cat: any) => (
              <Link key={cat.id} to={`/products?categoryId=${cat.id}`}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all border"
                style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text-secondary))' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgb(var(--color-primary-300))'; e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-50))'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgb(var(--color-border))'; e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface))'; }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgb(var(--color-primary-100))', color: 'rgb(var(--color-primary-600))' }}>
                  {cat.name[0]}
                </div>
                <span className="text-[10px] font-medium text-center leading-tight">{cat.name}</span>
              </Link>
            ))}
          </div>
          {/* Gradient fade hint */}
          <div className="relative h-0 -mt-1 pointer-events-none">
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-50 dark:from-gray-900 to-transparent" />
          </div>
        </section>

        {/* Flash Deals / Discounted Products */}
        {discountedProducts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 rounded text-white text-[10px] font-bold uppercase tracking-wider animate-pulse" style={{ backgroundColor: 'rgb(var(--color-danger))' }}>
                  Flash Deals
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text))' }}>Limited Time Offers</h2>
              </div>
              <Link to="/products?sortBy=discountPrice&sortOrder=desc" className="text-xs transition-colors flex items-center gap-1" style={{ color: 'rgb(var(--color-primary-600))' }}>
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <ScrollRail id="flash-deals">
              {discountedProducts.map((product: any) => (
                <div key={product.id} className="shrink-0 w-[180px]">
                  <CompactProductCard product={product} />
                </div>
              ))}
            </ScrollRail>
          </section>
        )}

        {/* Featured Products */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text))' }}>Featured Products</h2>
            <Link to="/products?sortBy=isFeatured&sortOrder=desc" className="text-xs transition-colors flex items-center gap-1" style={{ color: 'rgb(var(--color-primary-600))' }}>
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {featuredLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="rounded-xl animate-pulse h-40" style={{ backgroundColor: 'rgb(var(--color-surface-active))' }} />
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {featuredProducts.slice(0, 12).map((product: any) => (
                <CompactProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>No featured products yet</div>
          )}
        </section>

        {/* Best Sellers */}
        {bestSellers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
                <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text))' }}>Best Sellers</h2>
              </div>
              <Link to="/products?sortBy=totalSales&sortOrder=desc" className="text-xs transition-colors flex items-center gap-1" style={{ color: 'rgb(var(--color-primary-600))' }}>
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {bestSellers.slice(0, 6).map((product: any, idx: number) => (
                <div key={product.id} className="relative">
                  <span className="absolute -top-1 -left-1 z-10 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: idx < 3 ? 'rgb(var(--color-danger))' : 'rgb(var(--color-text-muted))' }}>
                    {idx + 1}
                  </span>
                  <CompactProductCard product={product} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* New Arrivals */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: 'rgb(var(--color-accent-500))' }} />
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text))' }}>New Arrivals</h2>
            </div>
            <Link to="/products?sortBy=createdAt&sortOrder=desc" className="text-xs transition-colors flex items-center gap-1" style={{ color: 'rgb(var(--color-primary-600))' }}>
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ScrollRail id="new-arrivals">
            {newestProducts.slice(0, 12).map((product: any) => (
              <div key={product.id} className="shrink-0 w-[180px]">
                <CompactProductCard product={product} />
              </div>
            ))}
          </ScrollRail>
        </section>

        {/* Brand / Supplier Showcase - Horizontal Scroll */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text))' }}>Top Brands</h2>
            </div>
            <Link to="/products" className="text-xs transition-colors flex items-center gap-1" style={{ color: 'rgb(var(--color-primary-600))' }}>
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 smooth-scroll">
            {brandLogos.map((brand) => (
              <Link key={brand.name} to="/products"
                className="flex items-center justify-center p-3 rounded-xl border transition-all hover:shadow-md"
                style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
                <span className="text-xs font-bold tracking-tight" style={{ color: brand.color }}>{brand.name}</span>
              </Link>
            ))}
          </div>
          <div className="relative h-0 -mt-1 pointer-events-none">
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-50 dark:from-gray-900 to-transparent" />
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, rgb(var(--color-primary-600)), rgb(var(--color-primary-800)))' }}>
          <div className="absolute inset-0 opacity-10" aria-hidden="true">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle cx="20" cy="30" r="40" className="fill-white/10" />
              <circle cx="80" cy="60" r="50" className="fill-white/5" />
            </svg>
          </div>
          <div className="relative z-10 px-6 py-8 sm:px-10">
            <div className="text-center sm:text-left sm:flex items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Start selling today</h3>
                <p className="text-sm" style={{ color: 'rgb(var(--color-primary-50) / 0.8)' }}>Join thousands of sellers on our platform. No setup fees, no hidden costs.</p>
                <div className="flex flex-wrap gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgb(var(--color-primary-50) / 0.8)' }}>
                    <Shield className="w-3.5 h-3.5" /> Buyer protection included
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgb(var(--color-primary-50) / 0.8)' }}>
                    <Percent className="w-3.5 h-3.5" /> Low commission rates
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgb(var(--color-primary-50) / 0.8)' }}>
                    <Globe className="w-3.5 h-3.5" /> Global customer base
                  </div>
                </div>
              </div>
              <Link to="/become-seller" className="inline-flex items-center gap-2 mt-4 sm:mt-0 shrink-0 bg-white px-6 py-2.5 rounded-full font-semibold text-sm transition-all hover:shadow-lg hover:scale-105" style={{ color: 'rgb(var(--color-primary-700))' }}>
                Open your store <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Footer */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          {[
            { value: '10K+', label: 'Products' },
            { value: '1K+', label: 'Sellers' },
            { value: '50K+', label: 'Happy Customers' },
            { value: '24/7', label: 'AI Support' },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-3 rounded-xl" style={{ backgroundColor: 'rgb(var(--color-surface))' }}>
              <p className="text-lg font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>{stat.value}</p>
              <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{stat.label}</p>
            </div>
          ))}
        </div>

      </div>

      <div className="h-8" />
    </div>
  );
}