import { useState } from 'react';
import { useAppSelector } from '../store/types';
import { useGetProductReviewsQuery, useMarkHelpfulMutation, Review } from '../store/api/reviewApi';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { H2, Body } from './ui/Typography';
import { Star, ThumbsUp, CheckCircle, Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

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
      await markHelpful(reviewId).unwrap();
    } catch (error) {
      console.error('Failed to mark review as helpful:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="md" className="text-center py-8">
        <Body className="text-red-600">Failed to load reviews. Please try again later.</Body>
      </Card>
    );
  }

  if (!data || data.reviews.length === 0) {
    return (
      <Card variant="md" className="text-center py-12">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <H2 className="text-xl font-semibold text-gray-900 mb-2">No Reviews Yet</H2>
        <Body className="text-gray-600">Be the first to review this product!</Body>
      </Card>
    );
  }

  const { reviews, stats, pagination } = data;

  return (
    <div className="space-y-6">
      {/* Review Stats */}
      {stats && (
        <Card variant="md" className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= Math.round(stats.averageRating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <H2 className="text-2xl font-bold text-gray-900">
                  {stats.averageRating.toFixed(1)}
                </H2>
              </div>
              <Body className="text-gray-600">
                Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
              </Body>
            </div>
            <div className="flex flex-col gap-1">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution];
                const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                return (
                  <div key={rating} className="flex items-center gap-2 min-w-[200px]">
                    <div className="flex items-center gap-1 w-12">
                      <span className="text-sm font-medium text-gray-700">{rating}</span>
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    </div>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Sort Options */}
      <div className="flex items-center gap-2 flex-wrap">
        <Body className="text-sm font-medium text-gray-700">Sort by:</Body>
        {(['newest', 'oldest', 'highest', 'lowest', 'helpful'] as const).map((sort) => (
          <Button
            key={sort}
            variant={sortBy === sort ? 'primary' : 'ghost'}
            size="small"
            onClick={() => {
              setSortBy(sort);
              setPage(1);
            }}
            className="capitalize"
          >
            {sort}
          </Button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard
            key={review._id}
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
          <Button
            variant="secondary"
            size="small"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <Body className="text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </Body>
          <Button
            variant="secondary"
            size="small"
            onClick={() => setPage(page + 1)}
            disabled={page >= pagination.totalPages}
          >
            Next
          </Button>
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
    <Card variant="md" className="hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Body className="font-semibold text-gray-900">{review.user.name}</Body>
            {review.verifiedPurchase && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <CheckCircle className="h-3 w-3" />
                Verified Purchase
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= review.rating
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <Body className="text-sm text-gray-500">
              {format(new Date(review.createdAt), 'MMM dd, yyyy')}
            </Body>
          </div>
        </div>
      </div>
      <Body className="text-gray-700 mb-4 whitespace-pre-wrap">{review.comment}</Body>
      {isAuthenticated && (
        <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
          <Button
            variant="ghost"
            size="small"
            onClick={() => onMarkHelpful(review._id)}
            disabled={isMarkingHelpful}
            className="text-gray-600 hover:text-teal-600"
          >
            <ThumbsUp className="h-4 w-4 mr-1" />
            Helpful ({review.helpful || 0})
          </Button>
        </div>
      )}
    </Card>
  );
};
