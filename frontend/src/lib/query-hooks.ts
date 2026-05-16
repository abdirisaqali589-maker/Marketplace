import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, patch, del } from './api-enhanced';
import toast from 'react-hot-toast';
import { useAuthStore } from './auth-store';

// Query key factory
export const queryKeys = {
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (params: any) => [...queryKeys.products.lists(), params] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
    featured: () => [...queryKeys.products.all, 'featured'] as const,
    search: (q: string) => [...queryKeys.products.all, 'search', q] as const,
  },
  categories: {
    all: ['categories'] as const,
    tree: () => [...queryKeys.categories.all, 'tree'] as const,
    detail: (id: string) => [...queryKeys.categories.all, id] as const,
  },
  cart: {
    all: ['cart'] as const,
  },
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (params: any) => [...queryKeys.orders.lists(), params] as const,
    detail: (id: string) => [...queryKeys.orders.all, id] as const,
    my: () => [...queryKeys.orders.all, 'my'] as const,
  },
  seller: {
    dashboard: () => ['seller', 'dashboard'] as const,
    products: (params: any) => ['seller', 'products', params] as const,
    orders: (params: any) => ['seller', 'orders', params] as const,
    analytics: (period: string) => ['seller', 'analytics', period] as const,
    payouts: () => ['seller', 'payouts'] as const,
  },
  admin: {
    dashboard: () => ['admin', 'dashboard'] as const,
    users: (params: any) => ['admin', 'users', params] as const,
    roles: () => ['admin', 'roles'] as const,
    auditLogs: (params: any) => ['admin', 'audit-logs', params] as const,
    config: () => ['admin', 'config'] as const,
  },
  notifications: {
    all: (params: any) => ['notifications', params] as const,
  },
  brands: {
    all: () => ['brands'] as const,
  },
  sellers: {
    all: ['sellers'] as const,
    list: (params?: any) => ['sellers', params] as const,
    store: (slug: string) => ['sellers', 'store', slug] as const,
  },
  wishlist: {
    all: () => ['wishlist'] as const,
  },
  productQuestions: {
    all: (productId: string) => ['products', productId, 'questions'] as const,
  },
  reviews: {
    product: (productId: string, params?: any) => ['reviews', 'product', productId, params] as const,
  },
  config: {
    all: () => ['config'] as const,
    public: () => ['config', 'public'] as const,
  },
};

// ── Products ──
export function useProducts(params?: any) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => get('/products', params),
    staleTime: 30000,
  });
}

export function useProduct(idOrSlug: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug);
  return useQuery({
    queryKey: queryKeys.products.detail(idOrSlug),
    queryFn: () => get(isUuid ? `/products/${idOrSlug}` : `/products/slug/${idOrSlug}`),
    enabled: !!idOrSlug,
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: queryKeys.products.featured(),
    queryFn: () => get('/products/featured'),
    staleTime: 60000,
  });
}

export function useSearchProducts(q: string, params?: any) {
  return useQuery({
    queryKey: queryKeys.products.search(q),
    queryFn: () => get('/products/search', { q, ...params }),
    enabled: q.length > 0,
  });
}

// ── Categories ──
export function useCategories(params?: any) {
  return useQuery({
    queryKey: [...queryKeys.categories.all, params],
    queryFn: () => get('/categories', params),
    staleTime: 120000,
  });
}

export function useCategoryTree() {
  return useQuery({
    queryKey: queryKeys.categories.tree(),
    queryFn: () => get('/categories/tree'),
    staleTime: 120000,
  });
}

// ── Brands ──
export function useBrands(params?: any) {
  return useQuery({
    queryKey: [...queryKeys.brands.all(), params],
    queryFn: () => get('/brands', params),
    staleTime: 120000,
  });
}

export function useSellers(params?: any) {
  return useQuery({
    queryKey: queryKeys.sellers.list(params),
    queryFn: () => get('/sellers', params),
    staleTime: 60000,
  });
}

export function useSellerStore(slug?: string) {
  return useQuery({
    queryKey: queryKeys.sellers.store(slug || ''),
    queryFn: () => get(`/sellers/store/${slug}`),
    enabled: !!slug,
  });
}

// ── Cart (only fetches if authenticated) ──
export function useCart() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.cart.all,
    queryFn: () => get('/cart'),
    enabled: isAuthenticated,
    staleTime: 5000,
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post('/cart/items', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.cart.all }); toast.success('Added to cart'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add to cart'),
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: any }) => put(`/cart/items/${itemId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cart.all }),
  });
}

export function useRemoveFromCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => del(`/cart/items/${itemId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.cart.all }); toast.success('Removed from cart'); },
  });
}

// ── Wishlist ──
export function useWishlist() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: queryKeys.wishlist.all(),
    queryFn: () => get('/wishlist'),
    enabled: isAuthenticated,
  });
}

export function useAddToWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => post('/wishlist', { productId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wishlist.all() });
      toast.success('Saved to wishlist');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to save item'),
  });
}

export function useRemoveFromWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => del(`/wishlist/${productId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wishlist.all() });
      toast.success('Removed from wishlist');
    },
  });
}

// ── Orders ──
export function useOrders(params?: any) {
  return useQuery({ queryKey: queryKeys.orders.list(params), queryFn: () => get('/orders/my-orders', params) });
}

export function useAdminOrders(params?: any) {
  return useQuery({ queryKey: queryKeys.orders.list({ ...params, admin: true }), queryFn: () => get('/orders/admin/all', params) });
}

export function useOrder(id: string) {
  return useQuery({ queryKey: queryKeys.orders.detail(id), queryFn: () => get(`/orders/${id}`), enabled: !!id });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post('/orders', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.cart.all }); qc.invalidateQueries({ queryKey: queryKeys.orders.all }); toast.success('Order placed!'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to place order'),
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post(`/orders/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.orders.all }); toast.success('Order cancelled'); },
  });
}

// ── Seller ──
export function useSellerDashboard() {
  return useQuery({ queryKey: queryKeys.seller.dashboard(), queryFn: () => get('/sellers/dashboard') });
}

export function useSellerProducts(params?: any) {
  return useQuery({ queryKey: queryKeys.seller.products(params), queryFn: () => get('/products/seller/mine', params) });
}

export function useSellerOrders(params?: any) {
  return useQuery({ queryKey: queryKeys.seller.orders(params), queryFn: () => get('/orders/seller/orders', params) });
}

export function useSellerAnalytics(period: string = '30d') {
  return useQuery({ queryKey: queryKeys.seller.analytics(period), queryFn: () => get('/sellers/analytics', { period }) });
}

export function useSellerReviews(params?: any) {
  return useQuery({ queryKey: ['seller', 'reviews', params], queryFn: () => get('/reviews/seller/mine', params) });
}

export function useReplyToReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, text }: { reviewId: string; text: string }) => post(`/reviews/${reviewId}/reply`, { text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seller', 'reviews'] });
      toast.success('Reply posted');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to reply'),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post('/products', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product created'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create product'),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => put(`/products/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product updated'); },
  });
}

export function useProductQuestions(productId?: string) {
  return useQuery({
    queryKey: queryKeys.productQuestions.all(productId || ''),
    queryFn: () => get(`/products/${productId}/questions`),
    enabled: !!productId,
  });
}

export function useAskProductQuestion(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (question: string) => post(`/products/${productId}/questions`, { question }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.productQuestions.all(productId) });
      toast.success('Question posted');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to post question'),
  });
}

export function useProductReviews(productId?: string, params?: any) {
  return useQuery({
    queryKey: queryKeys.reviews.product(productId || '', params),
    queryFn: () => get(`/reviews/product/${productId}`, params),
    enabled: !!productId,
  });
}

export function useCreateReview(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => post('/reviews', { ...data, productId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', 'product', productId] });
      qc.invalidateQueries({ queryKey: queryKeys.products.detail(productId) });
      toast.success('Review posted');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to post review'),
  });
}

// ── Admin ──
export function useAdminDashboard() {
  return useQuery({ queryKey: queryKeys.admin.dashboard(), queryFn: () => get('/admin/dashboard') });
}

export function useAdminUsers(params?: any) {
  return useQuery({ queryKey: queryKeys.admin.users(params), queryFn: () => get('/admin/users', params) });
}

export function useAdminRoles() {
  return useQuery({ queryKey: queryKeys.admin.roles(), queryFn: () => get('/admin/roles') });
}

// ── Notifications ──
export function useNotifications(params?: any) {
  return useQuery({ queryKey: queryKeys.notifications.all(params), queryFn: () => get('/notifications', params), refetchInterval: 30000 });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// ── Config ──
export function usePublicConfig() {
  return useQuery({ queryKey: queryKeys.config.public(), queryFn: () => get('/config/public'), staleTime: 300000 });
}
