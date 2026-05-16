import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Minus, Plus, MessageSquareReply } from 'lucide-react';
import { useProduct, useAddToCart, useAddToWishlist, useAskProductQuestion, useProductQuestions, useProductReviews, useCreateReview } from '../../lib/query-hooks';
import { assetUrl } from '../../lib/assets';
import LoadingScreen from '../shared/LoadingScreen';
import { useAuthStore } from '../../lib/auth-store';

import { addRecentlyViewed } from '../shared/RecentlyViewed';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useProduct(slug || '');
  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();
  const { isAuthenticated, user } = useAuthStore();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', text: '' });

  const product = data?.data;

  // Track recently viewed
  useEffect(() => {
    if (product) {
      addRecentlyViewed({
        id: product.id,
        title: product.title,
        slug: product.slug || product.id,
        image: product.images?.[0]?.url,
        price: product.discountPrice || product.basePrice,
      });
    }
  }, [product?.id]);
  const questions = useProductQuestions(product?.id);
  const askQuestion = useAskProductQuestion(product?.id || '');
  const reviews = useProductReviews(product?.id, { limit: 20 });
  const createReview = useCreateReview(product?.id || '');
  const images = product?.images || [];
  const variants = product?.variants || [];

  if (isLoading) return <LoadingScreen />;
  if (!product) return (
    <div className="page-container text-center py-16">
      <p style={{ color: 'rgb(var(--color-text-muted))' }}>Product not found</p>
    </div>
  );

  const price = product.discountPrice || product.basePrice;
  const originalPrice = product.discountPrice ? product.basePrice : null;

  const handleAddToCart = () => {
    addToCart.mutate({ productId: product.id, variantId: selectedVariant, quantity });
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.text.trim() && !reviewForm.title.trim()) return;
    createReview.mutate(reviewForm, { onSuccess: () => setReviewForm({ rating: 5, title: '', text: '' }) });
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    askQuestion.mutate(question.trim(), { onSuccess: () => setQuestion('') });
  };

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
        <Link to="/" style={{ color: 'rgb(var(--color-text-muted))' }} className="hover:text-primary-600">Home</Link>
        <span>/</span>
        {product.category && (
          <Link to={`/products?categoryId=${product.category.id}`} className="hover:text-primary-600" style={{ color: 'rgb(var(--color-text-muted))' }}>
            {product.category.name}
          </Link>
        )}
        <span>/</span>
        <span style={{ color: 'rgb(var(--color-text))' }}>{product.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div>
          <div
            className="aspect-square rounded-2xl overflow-hidden mb-4"
            style={{ backgroundColor: 'rgb(var(--color-surface-muted))' }}
          >
            {images[selectedImage]?.url ? (
              <img src={assetUrl(images[selectedImage].url)} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg" style={{ color: 'rgb(var(--color-text-disabled))' }}>
                No Image
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors"
                  style={{
                    borderColor: idx === selectedImage ? 'rgb(var(--color-primary-600))' : 'transparent',
                  }}
                  aria-label={`View image ${idx + 1}`}
                >
                  <img src={assetUrl(img.url)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold mb-3" style={{ color: 'rgb(var(--color-text))' }}>{product.title}</h1>

          {/* Rating */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < Math.round(product.rating || 0) ? 'text-yellow-400 fill-yellow-400' : ''}`}
                  style={{ color: i < Math.round(product.rating || 0) ? undefined : 'rgb(var(--color-text-disabled))' }}
                />
              ))}
            </div>
            <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>({product.reviewCount || 0} reviews)</span>
            {product._count?.wishlistItems > 0 && (
              <span className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>| {product._count.wishlistItems} wishlists</span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-end gap-3 mb-6">
            <span className="text-3xl font-bold" style={{ color: 'rgb(var(--color-primary-600))' }}>{price?.toLocaleString()} TZS</span>
            {originalPrice && (
              <span className="text-lg line-through" style={{ color: 'rgb(var(--color-text-muted))' }}>{originalPrice.toLocaleString()} TZS</span>
            )}
            {originalPrice && <span className="badge-error">-{Math.round((1 - price / originalPrice) * 100)}% OFF</span>}
          </div>

          {/* Variants */}
          {variants.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2" style={{ color: 'rgb(var(--color-text-secondary))' }}>Options</h3>
              <div className="flex flex-wrap gap-2">
                {variants.map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => { setSelectedVariant(v.id); setQuantity(1); }}
                    className="px-4 py-2 rounded-lg border text-sm transition-colors"
                    style={{
                      borderColor: selectedVariant === v.id ? 'rgb(var(--color-primary-600))' : 'rgb(var(--color-border-strong))',
                      backgroundColor: selectedVariant === v.id ? 'rgb(var(--color-primary-50))' : 'transparent',
                      color: selectedVariant === v.id ? 'rgb(var(--color-primary-700))' : 'rgb(var(--color-text-secondary))',
                    }}
                  >
                    {v.sku} - {v.price?.toLocaleString()} TZS
                    {v.stock <= 0 && <span className="text-red-500 ml-1">(Sold Out)</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center rounded-lg" style={{ border: '1px solid', borderColor: 'rgb(var(--color-border-strong))' }}>
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" style={{ color: 'rgb(var(--color-text-secondary))' }} />
              </button>
              <span
                className="px-4 py-2 text-sm font-medium min-w-[40px] text-center"
                style={{ color: 'rgb(var(--color-text))' }}
              >
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" style={{ color: 'rgb(var(--color-text-secondary))' }} />
              </button>
            </div>
            <button onClick={handleAddToCart} disabled={addToCart.isPending} className="btn-primary flex-1 py-3 text-base">
              <ShoppingCart className="w-5 h-5" aria-hidden="true" />
              {addToCart.isPending ? 'Adding...' : 'Add to Cart'}
            </button>
            <button
              onClick={() => addToWishlist.mutate(product.id)}
              className="p-3 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{ border: '1px solid', borderColor: 'rgb(var(--color-border-strong))', color: 'rgb(var(--color-text-muted))' }}
              aria-label="Add to wishlist"
            >
              <Heart className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Description */}
          <div className="pt-6" style={{ borderTop: '1px solid', borderColor: 'rgb(var(--color-divider))' }}>
            <h3 className="font-semibold mb-2" style={{ color: 'rgb(var(--color-text))' }}>Description</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--color-text-secondary))' }}>{product.description}</p>
          </div>

          {/* Seller Info */}
          {product.seller && (
            <div className="pt-6 mt-6" style={{ borderTop: '1px solid', borderColor: 'rgb(var(--color-divider))' }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-semibold"
                  style={{ backgroundColor: 'rgb(var(--color-primary-100))', color: 'rgb(var(--color-primary-700))' }}
                >
                  {product.seller.storeName?.[0] || 'S'}
                </div>
                <div>
                  <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{product.seller.storeName}</p>
                  <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>{product.seller.rating?.toFixed(1)} Rating</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <section className="card p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>Reviews & Seller Replies</h2>
          {isAuthenticated ? (
            <form
              onSubmit={handleReviewSubmit}
              className="mb-6 rounded-lg p-4"
              style={{
                border: '1px solid',
                borderColor: 'rgb(var(--color-border))',
                backgroundColor: 'rgb(var(--color-surface-muted))',
              }}
            >
              <div className="mb-3 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button key={rating} type="button" onClick={() => setReviewForm({ ...reviewForm, rating })} aria-label={`Rate ${rating} stars`}>
                    <Star className={`h-5 w-5 ${rating <= reviewForm.rating ? 'fill-yellow-400 text-yellow-400' : ''}`} style={{ color: rating <= reviewForm.rating ? undefined : 'rgb(var(--color-text-disabled))' }} />
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3">
                <input value={reviewForm.title} onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })} className="input-field" placeholder="Review title" />
                <textarea value={reviewForm.text} onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })} className="textarea-field" rows={3} placeholder="Share your experience with this product" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>Posting as {user?.firstName || 'customer'}</p>
                <button disabled={createReview.isPending} className="btn-primary btn-sm">Post review</button>
              </div>
            </form>
          ) : (
            <div
              className="mb-6 rounded-lg p-4 text-sm"
              style={{
                border: '1px solid',
                borderColor: 'rgb(var(--color-border))',
                backgroundColor: 'rgb(var(--color-surface-muted))',
                color: 'rgb(var(--color-text-secondary))',
              }}
            >
              Sign in to ask questions, review products, and interact with sellers.
            </div>
          )}
          <div className="space-y-4">
            {(reviews.data?.data || []).length === 0 && <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>No reviews yet.</p>}
            {(reviews.data?.data || []).map((review: any) => (
              <div key={review.id} className="pb-4 last:border-0" style={{ borderBottom: '1px solid', borderColor: 'rgb(var(--color-divider))' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium" style={{ color: 'rgb(var(--color-text))' }}>{review.title || 'Customer review'}</p>
                    <p className="text-xs" style={{ color: 'rgb(var(--color-text-muted))' }}>
                      {review.user?.firstName || 'Customer'} · {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : ''}`} style={{ color: i < review.rating ? undefined : 'rgb(var(--color-text-disabled))' }} />
                    ))}
                  </div>
                </div>
                {review.text && <p className="mt-2 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>{review.text}</p>}
                {review.replies?.map((reply: any) => (
                  <div key={reply.id} className="mt-3 rounded-lg p-3 text-sm" style={{ backgroundColor: 'rgb(var(--color-primary-50))' }}>
                    <p className="flex items-center gap-2 font-medium" style={{ color: 'rgb(var(--color-primary-800))' }}>
                      <MessageSquareReply className="h-4 w-4" aria-hidden="true" /> Seller reply
                    </p>
                    <p className="mt-1" style={{ color: 'rgb(var(--color-text-secondary))' }}>{reply.text}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
        <section className="card p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'rgb(var(--color-text))' }}>Product Q&A</h2>
          <form onSubmit={handleAskQuestion} className="flex gap-2 mb-5">
            <input value={question} onChange={(e) => setQuestion(e.target.value)} className="input-field" placeholder="Ask the seller a question" />
            <button disabled={askQuestion.isPending || !product?.id} className="btn-primary shrink-0">Ask</button>
          </form>
          <div className="space-y-4">
            {(questions.data?.data || []).length === 0 && <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>No questions yet.</p>}
            {(questions.data?.data || []).map((item: any) => (
              <div key={item.id} className="pb-4 last:border-0" style={{ borderBottom: '1px solid', borderColor: 'rgb(var(--color-divider))' }}>
                <p className="text-sm font-medium" style={{ color: 'rgb(var(--color-text))' }}>Q: {item.question}</p>
                <p className="mt-2 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>A: {item.answer || 'Waiting for seller response'}</p>
              </div>
            ))}
          </div>
        </section>
        <aside className="card p-6">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'rgb(var(--color-text))' }}>Buyer protection</h2>
          <ul className="space-y-3 text-sm" style={{ color: 'rgb(var(--color-text-secondary))' }}>
            <li>Secure checkout and order tracking</li>
            <li>Seller ratings and verified reviews</li>
            <li>Wishlist and cart saved to your account</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}