import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Package, ShieldCheck, Star, Store, ShoppingBag, Grid3X3, List, ChevronRight, Phone, Mail, Clock, Award, TrendingUp, Tag, Heart } from 'lucide-react';
import { useProducts, useSellerStore, useWishlist } from '../../lib/query-hooks';
import { assetUrl } from '../../lib/assets';
import LoadingScreen from '../shared/LoadingScreen';
import EmptyState from '../shared/EmptyState';

function ScrollToggle({ id, children }: { id: string; children: React.ReactNode }) {
  const [viewMode, setViewMode] = useState<'grid' | 'scroll'>('scroll');
  
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('scroll')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'scroll' ? 'text-white' : ''}`}
            style={{
              backgroundColor: viewMode === 'scroll' ? 'rgb(var(--color-primary-600))' : 'transparent',
              color: viewMode === 'scroll' ? 'white' : 'rgb(var(--color-text-muted))',
            }}
            aria-label="Horizontal scroll view"
            title="Horizontal scroll"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'text-white' : ''}`}
            style={{
              backgroundColor: viewMode === 'grid' ? 'rgb(var(--color-primary-600))' : 'transparent',
              color: viewMode === 'grid' ? 'white' : 'rgb(var(--color-text-muted))',
            }}
            aria-label="Grid view"
            title="Grid"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {viewMode === 'scroll' ? (
        <div className="flex gap-3 overflow-x-auto scroll-smooth pb-2" id={id}>
          {children}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {children}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, rank }: { product: any; rank?: number }) {
  const price = product.discountPrice || product.basePrice;
  return (
    <Link to={`/products/${product.slug || product.id}`}
      className="group block shrink-0 w-[180px] sm:w-auto overflow-hidden rounded-xl transition-all duration-200 hover:shadow-lg"
      style={{ backgroundColor: 'rgb(var(--color-surface))', border: '1px solid', borderColor: 'rgb(var(--color-border))' }}>
      <div className="aspect-square overflow-hidden relative" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
        {product.images?.[0]?.url ? (
          <img src={assetUrl(product.images[0].url)} alt={product.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="grid h-full w-full place-items-center" style={{ color: 'rgb(var(--color-text-disabled))' }}><Package className="w-10 h-10" /></div>
        )}
        {product.discountPrice && (
          <span className="absolute top-2 left-2 text-white text-xs font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgb(var(--color-danger))' }}>
            -{Math.round((1 - product.discountPrice / product.basePrice) * 100)}%
          </span>
        )}
        {rank && rank <= 3 && (
          <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: 'rgb(var(--color-danger))' }}>
            {rank}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="line-clamp-2 text-xs font-medium leading-tight min-h-[2.5rem] group-hover:text-primary-600" style={{ color: 'rgb(var(--color-text))' }}>{product.title}</h3>
        <div className="mt-1.5 flex items-center gap-1 flex-wrap">
          <span className="text-xs font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>{price?.toLocaleString()} TZS</span>
          {product.discountPrice && <span className="text-[10px] line-through" style={{ color: 'rgb(var(--color-text-muted))' }}>{product.basePrice?.toLocaleString()}</span>}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {product.rating && <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'rgb(var(--color-warning))' }}><Star className="w-2.5 h-2.5 fill-current" /> {product.rating}</span>}
          {product.totalSales > 0 && <span className="text-[10px]" style={{ color: 'rgb(var(--color-text-muted))' }}>{product.totalSales} sold</span>}
        </div>
      </div>
    </Link>
  );
}

export default function SellerStorePage() {
  const { sellerId } = useParams<{ sellerId: string }>();
  const { data, isLoading } = useSellerStore(sellerId);
  const seller = data?.data;
  const { data: productsData, isLoading: productsLoading } = useProducts({ sellerId: seller?.id, limit: 24, sortBy: 'createdAt', sortOrder: 'desc' });
  const { data: bestSellersData } = useProducts({ sellerId: seller?.id, limit: 8, sortBy: 'totalSales', sortOrder: 'desc' });
  const { data: discountedData } = useProducts({ sellerId: seller?.id, limit: 8, sortBy: 'discountPrice', sortOrder: 'desc' });
  
  const products = productsData?.data || seller?.products || [];
  const bestSellers = bestSellersData?.data || [];
  const discountedItems = discountedData?.data || [];
  const categories = products.reduce((acc: any[], p: any) => {
    if (p.category && !acc.find(c => c.id === p.category.id)) acc.push(p.category);
    return acc;
  }, []);

  if (isLoading) return <LoadingScreen />;
  if (!seller) return <div className="page-container"><EmptyState icon={<Store className="h-8 w-8" />} title="Store not found" description="This vendor store is unavailable." actionLabel="Browse Products" actionHref="/products" /></div>;

  return (
    <div className="min-h-screen transition-colors" style={{ backgroundColor: 'rgb(var(--color-gray-50))' }}>
      {/* Store Hero - Mega Banner */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, rgb(var(--color-primary-700)), rgb(var(--color-primary-900)))` }}>
        {seller.storeBanner && (
          <img src={assetUrl(seller.storeBanner)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
        )}
        <div className="absolute inset-0 opacity-5" aria-hidden="true">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="s-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#s-grid)" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
            {/* Store Logo & Info */}
            <div className="flex items-center gap-5">
              <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-xl border-4 border-white/20 flex items-center justify-center text-3xl font-bold" style={{ backgroundColor: 'rgb(var(--color-surface))', color: 'rgb(var(--color-primary-600))' }}>
                {seller.storeLogo ? <img src={assetUrl(seller.storeLogo)} alt={seller.storeName} className="h-full w-full object-cover" /> : seller.storeName?.[0]}
              </div>
              <div className="text-white">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold">{seller.storeName}</h1>
                  {seller.isVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgb(var(--color-success) / 0.2)', color: 'rgb(var(--color-success))' }}>
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm max-w-xl" style={{ color: 'rgb(var(--color-primary-50) / 0.8)' }}>{seller.storeDescription || 'Vendor marketplace store'}</p>
                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                  <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {seller.rating?.toFixed?.(1) || 'New'}</span>
                  <span className="flex items-center gap-1"><Package className="w-4 h-4" /> {products.length} products</span>
                  {seller.storeLocation && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {seller.storeLocation}</span>}
                  {seller.storePhone && <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {seller.storePhone}</span>}
                </div>
              </div>
            </div>
            <Link to={`/products?sellerId=${seller.id}`} className="md:ml-auto px-5 py-2 rounded-full font-semibold text-sm transition-all hover:scale-105"
              style={{ backgroundColor: 'white', color: 'rgb(var(--color-primary-700))' }}>
              View All Catalog <ChevronRight className="w-3.5 h-3.5 inline" />
            </Link>
          </div>
        </div>
      </section>

      {/* Store Stats Bar */}
      <div className="border-b" style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 overflow-x-auto gap-6 text-xs">
            {[
              { icon: Award, label: 'Member since', value: seller.createdAt ? new Date(seller.createdAt).toLocaleDateString() : 'N/A' },
              { icon: Star, label: 'Rating', value: seller.rating?.toFixed?.(1) || 'New' },
              { icon: Package, label: 'Products', value: String(products.length) },
              { icon: TrendingUp, label: 'Total Sales', value: (seller as any).totalSales ? `${(seller as any).totalSales}` : '0' },
              { icon: Clock, label: 'Response Time', value: 'Within 1 hour' },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 shrink-0">
                <stat.icon className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
                <div className="leading-tight">
                  <p className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>{stat.value}</p>
                  <p style={{ color: 'rgb(var(--color-text-muted))' }}>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">

        {/* Categories */}
        {categories.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text))' }}>Categories</h2>
            </div>
            <ScrollToggle id="store-cats">
              {categories.map((cat: any) => (
                <Link key={cat.id} to={`/products?categoryId=${cat.id}&sellerId=${seller.id}`}
                  className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors border text-xs"
                  style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text-secondary))' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgb(var(--color-primary-300))'; e.currentTarget.style.backgroundColor = 'rgb(var(--color-primary-50))'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgb(var(--color-border))'; e.currentTarget.style.backgroundColor = 'rgb(var(--color-surface))'; }}>
                  <Tag className="w-3 h-3" style={{ color: 'rgb(var(--color-primary-500))' }} />
                  {cat.name}
                </Link>
              ))}
            </ScrollToggle>
          </section>
        )}

        {/* Flash Deals */}
        {discountedItems.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 rounded text-white text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: 'rgb(var(--color-danger))' }}>
                  Deals
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text))' }}>Special Offers</h2>
              </div>
            </div>
            <ScrollToggle id="store-deals">
              {discountedItems.map((product: any, idx: number) => (
                <ProductCard key={product.id} product={product} rank={idx + 1} />
              ))}
            </ScrollToggle>
          </section>
        )}

        {/* Best Sellers */}
        {bestSellers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: 'rgb(var(--color-primary-600))' }} />
                <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text))' }}>Best Sellers</h2>
              </div>
            </div>
            <ScrollToggle id="store-bestsellers">
              {bestSellers.map((product: any, idx: number) => (
                <ProductCard key={product.id} product={product} rank={idx + 1} />
              ))}
            </ScrollToggle>
          </section>
        )}

        {/* Store Featured Products */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--color-text))' }}>All Products</h2>
            <Link to={`/products?sellerId=${seller.id}`} className="text-xs transition-colors flex items-center gap-1" style={{ color: 'rgb(var(--color-primary-600))' }}>
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {productsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[...Array(10)].map((_, i) => <div key={i} className="rounded-xl animate-pulse h-40" style={{ backgroundColor: 'rgb(var(--color-surface-active))' }} />)}
            </div>
          ) : products.length === 0 ? (
            <EmptyState icon={<Package className="h-8 w-8" />} title="No products yet" description="This seller has not published active products." />
          ) : (
            <ScrollToggle id="store-all">
              {products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ScrollToggle>
          )}
        </section>

        {/* Store Info Card */}
        <section className="rounded-2xl overflow-hidden border" style={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))' }}>
          <div className="p-6">
            <h3 className="text-sm font-bold mb-3" style={{ color: 'rgb(var(--color-text))' }}>About {seller.storeName}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              {[
                { label: 'Store Name', value: seller.storeName },
                { label: 'Location', value: seller.storeLocation || 'Tanzania' },
                { label: 'Email', value: seller.storeEmail || 'N/A' },
                { label: 'Phone', value: seller.storePhone || 'N/A' },
                { label: 'Joined', value: seller.createdAt ? new Date(seller.createdAt).toLocaleDateString() : 'N/A' },
                { label: 'Verified', value: seller.isVerified ? 'Yes' : 'Pending' },
              ].map((info) => (
                <div key={info.label} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 font-medium" style={{ color: 'rgb(var(--color-text-muted))' }}>{info.label}</span>
                  <span style={{ color: 'rgb(var(--color-text))' }}>{info.value}</span>
                </div>
              ))}
            </div>
            {seller.storeDescription && (
              <p className="mt-4 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{seller.storeDescription}</p>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}