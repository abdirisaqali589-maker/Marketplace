import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from '../shared/EmptyState';
import LoadingScreen from '../shared/LoadingScreen';
import { useAddToCart, useRemoveFromWishlist, useWishlist } from '../../lib/query-hooks';
import { assetUrl } from '../../lib/assets';

export default function WishlistPage() {
  const { data, isLoading } = useWishlist();
  const remove = useRemoveFromWishlist();
  const addToCart = useAddToCart();
  const items = data?.data || [];

  if (isLoading) return <LoadingScreen />;

  if (!items.length) {
    return (
      <div className="page-container">
        <EmptyState
          icon={<Heart className="w-8 h-8 text-red-400" />}
          title="Your wishlist is empty"
          description="Save items you love to your wishlist and shop them later"
          actionLabel="Browse Products"
          actionHref="/products"
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Wishlist</h1>
        <p className="text-sm text-gray-500">{items.length} saved item{items.length === 1 ? '' : 's'}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((item: any) => {
          const product = item.product;
          const price = product.discountPrice || product.basePrice;
          return (
            <div key={item.id} className="card p-4 flex gap-4">
              <Link to={`/products/${product.slug || product.id}`} className="w-28 h-28 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                {product.images?.[0]?.url ? (
                  <img src={assetUrl(product.images[0].url)} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-gray-300"><ShoppingBag className="w-8 h-8" /></div>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/products/${product.slug || product.id}`} className="font-medium text-gray-900 line-clamp-2 hover:text-primary-600">{product.title}</Link>
                <p className="text-sm text-gray-500 mt-1">{product.seller?.storeName}</p>
                <p className="text-lg font-bold text-primary-600 mt-2">{price?.toLocaleString()} TZS</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => addToCart.mutate({ productId: product.id, quantity: 1 })} className="btn-primary btn-sm">Add to cart</button>
                  <button onClick={() => remove.mutate(product.id)} className="btn-secondary btn-sm" aria-label="Remove from wishlist"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
