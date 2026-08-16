import { useState } from 'react';
import { useAppSelector } from '../store/types';
import { useGetProductReviewsQuery, useMarkHelpfulMutation } from '../store/api/reviewApi';
import type { Review } from '../store/api/reviewApi';
import { JournalCard, CardHeading, JournalBody } from './journal';
import { Star, ThumbsUp, CheckCircle, Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../utils/cn';

interface ReviewListProps {
  productId: string;
}

export const ReviewList = ({ productId }: ReviewListProps) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful'>('newest');
  const [page, setPage] = useState(1);
  const limit = 5;

  const { data, isLoading, error } = useGetProductReviewsQuery({
    productId,
    params: { page, limit, sort: sortBy },
  });

  const [markHelpful, { isLoading: isMarkingHelpful }] = useMarkHelpfulMutation();

  const handleMarkHelpful = async (reviewId: string) => {
    if (!isAuthenticated) return;
    try {
      await markHelpful({ reviewId, productId }).unwrap();
    } catch (error) {
      console.error('Failed to mark review as helpful:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-7 w-7 animate-spin text-journal-teal" />
      </div>
    );
  }

  if (error) {
    return (
      <JournalCard className="text-center py-8">
        <JournalBody className="!text-journal-danger-text">Failed to load reviews. Please try again later.</JournalBody>
      </JournalCard>
    );
  }

  if (!data || data.reviews.length === 0) {
    return (
      <JournalCard className="text-center py-12">
        <MessageSquare className="h-10 w-10 text-journal-faint mx-auto mb-4" />
        <CardHeading className="!text-[19px] mb-2">No reviews yet</CardHeading>
        <JournalBody className="!text-journal-muted">Be the first to review this product!</JournalBody>
      </JournalCard>
    );
  }

  const { reviews, stats, pagination } = data;

  return (
    <div className="space-y-6">
      {/* Review Stats */}
      {stats && (
        <JournalCard className="bg-journal-teal-tint border-journal-teal-tint-border">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'h-4 w-4',
                        star <= Math.round(stats.averageRating)
                          ? 'text-journal-teal fill-journal-teal'
                          : 'text-journal-star-empty fill-journal-star-empty'
                      )}
                    />
                  ))}
                </div>
                <span className="font-journal text-[24px] text-journal-ink">
                  {stats.averageRating.toFixed(1)}
                </span>
              </div>
              <JournalBody className="!text-journal-muted">
                Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
              </JournalBody>
            </div>
            <div className="flex flex-col gap-1">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution];
                const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                return (
                  <div key={rating} className="flex items-center gap-2 min-w-[200px]">
                    <div className="flex items-center gap-1 w-12">
                      <span className="text-[13px] font-sans font-medium text-journal-body">{rating}</span>
                      <Star className="h-3.5 w-3.5 text-journal-teal fill-journal-teal" />
                    </div>
                    <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
                      <div
                        className="h-full bg-journal-teal rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-[12px] font-sans text-journal-muted w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </JournalCard>
      )}

      {/* Sort Options */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12px] font-sans font-medium text-journal-body">Sort by:</span>
        {(['newest', 'oldest', 'highest', 'lowest', 'helpful'] as const).map((sort) => (
          <button
            key={sort}
            onClick={() => {
              setSortBy(sort);
              setPage(1);
            }}
            className={cn(
              'capitalize px-3 py-1.5 rounded-full text-[12px] font-sans font-medium transition-colors border',
              sortBy === sort
                ? 'bg-journal-ink text-journal-bone border-journal-ink'
                : 'text-journal-body border-journal-hairline hover:border-journal-ink'
            )}
          >
            {sort}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard
            key={`${review._id}-${review.rating}-${review.updatedAt}`}
            review={review}
            onMarkHelpful={handleMarkHelpful}
            isMarkingHelpful={isMarkingHelpful}
            isAuthenticated={isAuthenticated}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 border border-journal-ink text-journal-ink font-sans font-medium text-[11px] tracking-[0.1em] uppercase hover:bg-journal-ink hover:text-journal-bone transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-journal-ink"
          >
            Previous
          </button>
          <span className="text-[13px] font-sans text-journal-muted">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= pagination.totalPages}
            className="px-4 py-2 border border-journal-ink text-journal-ink font-sans font-medium text-[11px] tracking-[0.1em] uppercase hover:bg-journal-ink hover:text-journal-bone transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-journal-ink"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

interface ReviewCardProps {
  review: Review;
  onMarkHelpful: (reviewId: string) => void;
  isMarkingHelpful: boolean;
  isAuthenticated: boolean;
}

const ReviewCard = ({ review, onMarkHelpful, isMarkingHelpful, isAuthenticated }: ReviewCardProps) => {
  return (
    <JournalCard>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-sans font-semibold text-[14px] text-journal-ink">{review.user.name}</span>
            {review.verifiedPurchase && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-journal-teal-tint text-journal-teal rounded-full text-[11px] font-sans font-medium">
                <CheckCircle className="h-3 w-3" />
                Verified purchase
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'h-3.5 w-3.5',
                    star <= review.rating
                      ? 'text-journal-teal fill-journal-teal'
                      : 'text-journal-star-empty fill-journal-star-empty'
                  )}
                />
              ))}
            </div>
            <span className="text-[12px] font-sans text-journal-faint">
              {format(new Date(review.createdAt), 'MMM dd, yyyy')}
            </span>
          </div>
        </div>
      </div>
      <JournalBody className="mb-4 whitespace-pre-wrap">{review.comment}</JournalBody>
      {isAuthenticated && (
        <div className="flex items-center gap-2 pt-3 border-t border-journal-hairline">
          <button
            onClick={() => onMarkHelpful(review._id)}
            disabled={isMarkingHelpful}
            className="inline-flex items-center gap-1.5 text-[12px] font-sans font-medium text-journal-muted hover:text-journal-teal transition-colors disabled:opacity-50"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            Helpful ({review.helpful || 0})
          </button>
        </div>
      )}
    </JournalCard>
  );
};
