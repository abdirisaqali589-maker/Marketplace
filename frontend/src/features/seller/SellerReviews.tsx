import React, { useState } from 'react';
import { MessageSquareReply, Star } from 'lucide-react';
import { useReplyToReview, useSellerReviews } from '../../lib/query-hooks';
import { assetUrl } from '../../lib/assets';
import LoadingScreen from '../shared/LoadingScreen';
import EmptyState from '../shared/EmptyState';

export default function SellerReviews() {
  const [page, setPage] = useState(1);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const { data, isLoading } = useSellerReviews({ page, limit: 10 });
  const replyToReview = useReplyToReview();
  const reviews = data?.data || [];
  const pagination = data?.pagination;

  if (isLoading) return <LoadingScreen />;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Reviews ({pagination?.total || 0})</h2>
          <p className="text-sm text-gray-500">Reply to customer feedback on your products.</p>
        </div>
      </div>

      {!reviews.length ? (
        <EmptyState icon={<MessageSquareReply className="h-8 w-8" />} title="No reviews yet" description="Customer reviews will appear here when buyers rate your products." />
      ) : (
        <div className="space-y-4">
          {reviews.map((review: any) => (
            <div key={review.id} className="card p-4">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {review.product?.images?.[0]?.url ? (
                    <img src={assetUrl(review.product.images[0].url)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <MessageSquareReply className="m-5 h-6 w-6 text-gray-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900">{review.product?.title}</p>
                      <p className="text-sm text-gray-500">
                        {review.user?.firstName || 'Customer'} {review.user?.lastName || ''} · {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} className={`h-4 w-4 ${index < review.rating ? 'fill-current' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                  {review.title && <p className="mt-3 font-medium text-gray-900">{review.title}</p>}
                  {review.text && <p className="mt-1 text-sm text-gray-600">{review.text}</p>}

                  {review.replies?.length > 0 && (
                    <div className="mt-4 space-y-2 border-l-2 border-primary-100 pl-3">
                      {review.replies.map((reply: any) => (
                        <div key={reply.id} className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs font-medium text-gray-500">{reply.user?.firstName || 'Seller'} replied</p>
                          <p className="mt-1 text-sm text-gray-700">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={replyText[review.id] || ''}
                      onChange={(event) => setReplyText({ ...replyText, [review.id]: event.target.value })}
                      placeholder="Write a helpful public reply"
                      className="input-field"
                    />
                    <button
                      onClick={() => {
                        replyToReview.mutate({ reviewId: review.id, text: replyText[review.id] || '' });
                        setReplyText({ ...replyText, [review.id]: '' });
                      }}
                      disabled={replyToReview.isPending || !replyText[review.id]?.trim()}
                      className="btn-primary shrink-0"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {pagination?.totalPages > 1 && (
            <div className="flex justify-end gap-2">
              <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="btn-secondary btn-sm">Previous</button>
              <button onClick={() => setPage(page + 1)} disabled={page >= pagination.totalPages} className="btn-secondary btn-sm">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
