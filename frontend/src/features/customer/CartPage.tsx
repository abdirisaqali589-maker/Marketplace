import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, Trash2, ArrowRight, Tag } from 'lucide-react';
import { useCart, useUpdateCartItem, useRemoveFromCart } from '../../lib/query-hooks';
import { assetUrl } from '../../lib/assets';
import EmptyState from '../shared/EmptyState';
import LoadingScreen from '../shared/LoadingScreen';

export default function CartPage() {
  const { data, isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveFromCart();
  const [couponCode, setCouponCode] = React.useState('');

  const cart = data?.data;
  const items = cart?.items || [];

  if (isLoading) return <LoadingScreen />;

  if (!items.length) {
    return (
      <div className="page-container">
        <EmptyState icon={<ShoppingCart className="w-8 h-8" />} title="Your cart is empty" description="Looks like you haven't added any items yet" actionLabel="Start Shopping" actionHref="/products" />
      </div>
    );
  }

  const subtotal = items.reduce((sum: number, item: any) => sum + (item.unitPrice || 0) * item.quantity, 0);

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'rgb(var(--color-text))' }}>
        Shopping Cart ({cart?.itemCount || 0} items)
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item: any) => (
            <div key={item.id} className="card p-4 flex gap-4">
              <Link to={`/products/${item.product?.slug || item.productId}`} className="w-20 h-20 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}>
                {item.product?.images?.[0]?.url ? (
                  <img src={assetUrl(item.product.images[0].url)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ color: 'rgb(var(--color-text-disabled))' }}>
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                )}
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/products/${item.product?.slug || item.productId}`}
                  className="text-sm font-medium line-clamp-1 transition-colors"
                  style={{ color: 'rgb(var(--color-text))' }}
                >
                  {item.product?.title}
                </Link>
                {item.variant && <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--color-text-muted))' }}>SKU: {item.variant.sku}</p>}
                <p className="text-sm font-semibold mt-1" style={{ color: 'rgb(var(--color-primary-600))' }}>{item.unitPrice?.toLocaleString()} TZS</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center rounded" style={{ border: '1px solid', borderColor: 'rgb(var(--color-border-strong))' }}>
                    <button
                      onClick={() => updateItem.mutate({ itemId: item.id, data: { quantity: Math.max(1, item.quantity - 1) } })}
                      className="p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" style={{ color: 'rgb(var(--color-text-secondary))' }} />
                    </button>
                    <span className="px-3 text-sm" style={{ color: 'rgb(var(--color-text))' }}>{item.quantity}</span>
                    <button
                      onClick={() => updateItem.mutate({ itemId: item.id, data: { quantity: item.quantity + 1 } })}
                      className="p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" style={{ color: 'rgb(var(--color-text-secondary))' }} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem.mutate(item.id)}
                    className="p-1 transition-colors"
                    style={{ color: 'rgb(var(--color-danger))' }}
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold" style={{ color: 'rgb(var(--color-text))' }}>
                  {(item.unitPrice * item.quantity)?.toLocaleString()} TZS
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="card p-6 h-fit sticky top-24">
          <h3 className="font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>Order Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'rgb(var(--color-text-muted))' }}>Subtotal</span>
              <span className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{subtotal.toLocaleString()} TZS</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'rgb(var(--color-text-muted))' }}>Shipping</span>
              <span className="font-medium" style={{ color: 'rgb(var(--color-accent-600))' }}>Free</span>
            </div>
            <div className="pt-3 flex justify-between" style={{ borderTop: '1px solid', borderColor: 'rgb(var(--color-divider))' }}>
              <span className="font-semibold" style={{ color: 'rgb(var(--color-text))' }}>Total</span>
              <span className="font-bold text-lg" style={{ color: 'rgb(var(--color-primary-600))' }}>{subtotal.toLocaleString()} TZS</span>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <input
              type="text"
              placeholder="Coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="input-field text-sm flex-1"
            />
            <button className="btn-secondary btn-sm"><Tag className="w-4 h-4" aria-hidden="true" />Apply</button>
          </div>
          <Link to="/checkout" className="btn-primary w-full mt-4 justify-center">
            <ArrowRight className="w-4 h-4" aria-hidden="true" /> Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}