import { useState, useEffect } from 'react';
import { useAppSelector } from '../store/types';
import { useCreateReviewMutation, useUpdateReviewMutation, useDeleteReviewMutation, useGetUserReviewQuery } from '../store/api/reviewApi';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { useAppDispatch } from '../store/types';
import { JournalCard, JournalButton, CardHeading, JournalBody } from './journal';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { Star, Loader2, Edit2, X, Trash2 } from 'lucide-react';
import { cn } from '../utils/cn';

interface ReviewFormProps {
  productId: string;
  onSuccess?: () => void;
}

export const ReviewForm = ({ productId, onSuccess }: ReviewFormProps) => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Check if user has already reviewed
  const { data: existingReview, isLoading: isLoadingReview } = useGetUserReviewQuery(productId, {
    skip: !isAuthenticated,
  });

  const [createReview, { isLoading: isCreating }] = useCreateReviewMutation();
  const [updateReview, { isLoading: isUpdating }] = useUpdateReviewMutation();
  const [deleteReview, { isLoading: isDeleting }] = useDeleteReviewMutation();

  // Reset form when user changes
  useEffect(() => {
    setRating(0);
    setComment('');
    setIsEditing(false);
  }, [user?._id]);

  // Update form when existingReview data changes
  useEffect(() => {
    // Only set editing mode if review exists and is not null
    if (existingReview?.review && existingReview.review !== null) {
      setRating(existingReview.review.rating);
      setComment(existingReview.review.comment);
      setIsEditing(true);
    } else {
      // Reset form if no review exists
      setRating(0);
      setComment('');
      setIsEditing(false);
    }
  }, [existingReview?.review?.rating, existingReview?.review?.comment, existingReview?.review?._id]);

  if (!isAuthenticated) {
    return (
      <JournalCard className="text-center py-8">
        <JournalBody className="!text-journal-muted">Please log in to write a review.</JournalBody>
      </JournalCard>
    );
  }

  if (isLoadingReview) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-journal-teal" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      dispatch(showNotification({ message: 'Please select a rating', type: 'error' }));
      return;
    }

    if (comment.trim().length < 10) {
      dispatch(showNotification({ message: 'Comment must be at least 10 characters long', type: 'error' }));
      return;
    }

    if (comment.trim().length > 1000) {
      dispatch(showNotification({ message: 'Comment must not exceed 1000 characters', type: 'error' }));
      return;
    }

    try {
      // Check if updating existing review (review exists and is not null)
      if (isEditing && existingReview?.review && existingReview.review !== null) {
        await updateReview({
          reviewId: existingReview.review._id,
          productId, // Pass productId for cache invalidation
          data: { rating, comment: comment.trim() },
        }).unwrap();
        dispatch(showNotification({ message: 'Review updated successfully!', type: 'success' }));
        // Cache invalidation will trigger refetch of user review and product reviews
      } else {
        // Create new review
        await createReview({
          productId,
          data: { rating, comment: comment.trim() },
        }).unwrap();
        dispatch(showNotification({ message: 'Review submitted successfully!', type: 'success' }));
        // Cache invalidation will trigger refetch and update the form to edit mode
      }
      if (onSuccess) onSuccess();
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to submit review');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
    }
  };

  const handleCancel = () => {
    if (existingReview?.review && existingReview.review !== null) {
      setRating(existingReview.review.rating);
      setComment(existingReview.review.comment);
    } else {
      setRating(0);
      setComment('');
    }
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!existingReview?.review) return;

    try {
      await deleteReview({
        reviewId: existingReview.review._id,
        productId,
      }).unwrap();

      dispatch(showNotification({
        message: 'Review deleted successfully!',
        type: 'success',
      }));

      setShowDeleteModal(false);

      // Reset form to create mode
      setRating(0);
      setComment('');
      setIsEditing(false);

      if (onSuccess) onSuccess();
    } catch (error: any) {
      const errorInfo = getErrorInfo(error, 'Failed to delete review');
      dispatch(showNotification({
        message: errorInfo.message,
        type: 'error',
      }));
      setShowDeleteModal(false);
    }
  };

  const isLoading = isCreating || isUpdating || isDeleting;
  const characterCount = comment.length;
  const maxCharacters = 1000;

  return (
    <JournalCard>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <CardHeading>
          {isEditing ? 'Edit your review' : 'Write a review'}
        </CardHeading>
        {isEditing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDeleteClick}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-[12px] font-sans font-medium text-journal-danger-text hover:underline disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 text-[12px] font-sans font-medium text-journal-muted hover:underline disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Selection */}
        <div>
          <p className="text-[11px] font-sans font-semibold uppercase tracking-[0.08em] text-journal-muted mb-3">Your rating *</p>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none transition-transform hover:scale-110"
                disabled={isLoading}
              >
                <Star
                  className={cn(
                    'h-7 w-7 transition-colors',
                    star <= (hoveredRating || rating)
                      ? 'text-journal-teal fill-journal-teal'
                      : 'text-journal-star-empty fill-journal-star-empty'
                  )}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="text-[13px] font-sans text-journal-muted ml-2">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </span>
            )}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label htmlFor="comment" className="block text-[11px] font-sans font-semibold uppercase tracking-[0.08em] text-journal-muted mb-1.5">
            Your review *
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this product..."
            rows={6}
            className="w-full px-3.5 py-3 border border-journal-input-border rounded-journal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-journal-teal transition-colors resize-none text-[14px] font-sans"
            disabled={isLoading}
            maxLength={maxCharacters}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] font-sans text-journal-faint">
              Minimum 10 characters required
            </span>
            <span
              className={cn(
                'text-[11px] font-sans',
                characterCount > maxCharacters - 50
                  ? 'text-journal-warn-text'
                  : characterCount > maxCharacters
                  ? 'text-journal-danger-text'
                  : 'text-journal-faint'
              )}
            >
              {characterCount} / {maxCharacters} characters
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <JournalButton
          type="submit"
          variant="primary"
          className="w-full"
          disabled={isLoading || rating === 0 || comment.trim().length < 10}
        >
          {isCreating || isUpdating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {isEditing ? 'Updating...' : 'Submitting...'}
            </>
          ) : (
            <>
              {isEditing ? (
                <>
                  <Edit2 className="h-3.5 w-3.5" />
                  Update review
                </>
              ) : (
                'Submit review'
              )}
            </>
          )}
        </JournalButton>
      </form>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Review"
        message="Are you sure you want to delete your review? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </JournalCard>
  );
};
