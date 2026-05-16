import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Grid3X3, List, Star, ShoppingBag, Store } from 'lucide-react';
import { useProducts, useCategoryTree, usePublicConfig, useSellers } from '../../lib/query-hooks';
import { assetUrl } from '../../lib/assets';
import EmptyState from '../shared/EmptyState';
import LoadingScreen from '../shared/LoadingScreen';

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  
  const params = {
    page: searchParams.get('page') || '1',
    limit: '20',
    search: searchParams.get('search') || undefined,
    categoryId: searchParams.get('categoryId') || undefined,
    sellerId: searchParams.get('sellerId') || undefined,
    minPrice: searchParams.get('minPrice') || undefined,
    maxPrice: searchParams.get('maxPrice') || undefined,
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: searchParams.get('sortOrder') || 'desc',
  };

  const { data, isLoading } = useProducts(params);
  const { data: catData } = useCategoryTree();
  const { data: sellersData } = useSellers({ search: searchParams.get('search') || undefined, limit: 8 });
  const { data: publicConfig } = usePublicConfig();
  
  const products = data?.data || [];
  const pagination = data?.pagination;
  const categories = catData?.data || [];
  const sellers = sellersData?.data || [];
  const catalog = publicConfig?.data?.['marketplace.catalog'] || {};

  const updateParam = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const clearFilters = () => setSearchParams({});

  const hasFilters = searchParams.get('categoryId') || searchParams.get('sellerId') || searchParams.get('minPrice') || searchParams.get('maxPrice') || searchParams.get('search');

  return (
    <div className="page-container">
      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Filters</h3>
            {hasFilters && <button onClick={clearFilters} className="text-xs transition-colors" style={{ color: 'rgb(var(--color-primary-600))' }}>Clear all</button>}
          </div>

          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search..."
              defaultValue={searchParams.get('search') || ''}
              onChange={(e) => updateParam('search', e.target.value || null)}
              className="input-field"
            />
          </div>

          {/* Categories */}
          {catalog.categoriesEnabled !== false && <div>
            <h4 className="text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>Categories</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {categories.map((cat: any) => (
                <label key={cat.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchParams.get('categoryId') === cat.id}
                    onChange={() => updateParam('categoryId', searchParams.get('categoryId') === cat.id ? null : cat.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{cat.name}</span>
                  <span className="text-xs ml-auto" style={{ color: 'rgb(var(--color-text-disabled))' }}>({cat._count?.products || 0})</span>
                </label>
              ))}
            </div>
          </div>}

          {/* Price Range */}
          <div>
            <h4 className="text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>Price Range</h4>
            <div className="flex gap-2 items-center">
              <input type="number" placeholder="Min" defaultValue={searchParams.get('minPrice') || ''} onChange={(e) => updateParam('minPrice', e.target.value || null)} className="input-field text-sm w-full" />
              <span style={{ color: 'rgb(var(--color-text-disabled))' }}>-</span>
              <input type="number" placeholder="Max" defaultValue={searchParams.get('maxPrice') || ''} onChange={(e) => updateParam('maxPrice', e.target.value || null)} className="input-field text-sm w-full" />
            </div>
          </div>

          {catalog.sellersEnabled !== false && <div>
            <h4 className="text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>Vendors</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {sellers.map((seller: any) => (
                <label key={seller.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchParams.get('sellerId') === seller.id}
                    onChange={() => updateParam('sellerId', searchParams.get('sellerId') === seller.id ? null : seller.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{seller.storeName}</span>
                  <Link to={`/stores/${seller.storeSlug}`} className="text-xs transition-colors" style={{ color: 'rgb(var(--color-primary-600))' }}>Store</Link>
                </label>
              ))}
              {!sellers.length && <p className="text-xs" style={{ color: 'rgb(var(--color-text-disabled))' }}>No vendor matches yet.</p>}
            </div>
          </div>}
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-2">
              <select value={`${params.sortBy}:${params.sortOrder}`} onChange={(e) => { const [s, o] = e.target.value.split(':'); updateParam('sortBy', s); updateParam('sortOrder', o); }} className="select-field text-sm">
                <option value="createdAt:desc">Newest</option>
                <option value="basePrice:asc">Price: Low to High</option>
                <option value="basePrice:desc">Price: High to Low</option>
                <option value="rating:desc">Best Rating</option>
                <option value="totalSales:desc">Most Sold</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{pagination?.total || 0} products</span>
              <button
                onClick={() => setViewMode('grid')}
                className="p-1.5 rounded transition-colors"
                style={{
                  backgroundColor: viewMode === 'grid' ? 'rgb(var(--color-primary-100))' : 'transparent',
                  color: viewMode === 'grid' ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-disabled))',
                }}
                aria-label="Grid view"
              >
                <Grid3X3 className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="p-1.5 rounded transition-colors"
                style={{
                  backgroundColor: viewMode === 'list' ? 'rgb(var(--color-primary-100))' : 'transparent',
                  color: viewMode === 'list' ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-text-disabled))',
                }}
                aria-label="List view"
              >
                <List className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {sellers.length > 0 && searchParams.get('search') && (
            <div className="mb-6 rounded-lg p-4" style={{ border: '1px solid', borderColor: 'rgb(var(--color-border))', backgroundColor: 'rgb(var(--color-surface))' }}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  <Store className="h-4 w-4" style={{ color: 'rgb(var(--color-primary-600))' }} aria-hidden="true" /> Matching Vendors
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {sellers.slice(0, 4).map((seller: any) => (
                  <Link
                    key={seller.id}
                    to={`/stores/${seller.storeSlug}`}
                    className="rounded-lg p-3 transition-colors"
                    style={{ border: '1px solid', borderColor: 'rgb(var(--color-border))' }}
                  >
                    <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{seller.storeName}</p>
                    <p className="mt-1 line-clamp-1 text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>{seller.storeDescription || seller.storeLocation || 'Vendor store'}</p>
                    <p className="mt-2 text-xs" style={{ color: 'rgb(var(--color-primary-600))' }}>{seller._count?.products || 0} products</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <LoadingScreen />
          ) : products.length === 0 ? (
            <EmptyState icon={<ShoppingBag className="w-8 h-8" />} title="No products found" description="Try adjusting your filters or search terms" actionLabel="Clear Filters" onAction={clearFilters} />
          ) : (
            <>
              <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
                {products.map((product: any) => (
                  <Link key={product.id} to={`/products/${product.slug || product.id}`} className="card-hover group">
                    <div className="aspect-square rounded-t-xl overflow-hidden" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
                      {product.images?.[0]?.url ? (
                        <img src={assetUrl(product.images[0].url)} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ color: 'rgb(var(--color-text-disabled))' }}>
                          <ShoppingBag className="w-10 h-10" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium line-clamp-2 transition-colors" style={{ color: 'rgb(var(--color-text))' }}>
                        {product.title}
                      </h3>
                      {product.seller && <p className="mt-1 truncate text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>by {product.seller.storeName}</p>}
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < Math.round(product.rating || 0) ? 'text-yellow-400 fill-yellow-400' : ''}`}
                            style={{ color: i < Math.round(product.rating || 0) ? undefined : 'rgb(var(--color-text-disabled))' }}
                          />
                        ))}
                      </div>
                      <p className="text-sm font-bold mt-1" style={{ color: 'rgb(var(--color-primary-600))' }}>{product.basePrice?.toLocaleString()} TZS</p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => updateParam('page', String(page))}
                      className="w-10 h-10 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: page === (Number(params.page) || 1) ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-surface))',
                        color: page === (Number(params.page) || 1) ? 'white' : 'rgb(var(--color-text-secondary))',
                        border: page === (Number(params.page) || 1) ? 'none' : '1px solid',
                        borderColor: 'rgb(var(--color-border))',
                      }}
                      aria-label={`Page ${page}`}
                      aria-current={page === (Number(params.page) || 1) ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}