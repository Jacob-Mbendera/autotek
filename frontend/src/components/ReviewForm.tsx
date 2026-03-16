import { useState, useEffect } from 'react';
import { useAppSelector } from '../store/types';
import { useCreateReviewMutation, useUpdateReviewMutation, useDeleteReviewMutation, useGetUserReviewQuery } from '../store/api/reviewApi';
import { showNotification } from '../store/slices/uiSlice';
import { getErrorInfo } from '../utils/errorHandler';
import { useAppDispatch } from '../store/types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { H2, Body } from './ui/Typography';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { Star, Loader2, Edit2, X, Trash2 } from 'lucide-react';

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
      <Card variant="md" className="text-center py-8">
        <Body className="text-gray-600">Please log in to write a review.</Body>
      </Card>
    );
  }

  if (isLoadingReview) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
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
    <Card variant="md">
      <div className="flex items-center justify-between mb-6">
        <H2 className="text-xl font-semibold text-gray-900">
          {isEditing ? 'Edit Your Review' : 'Write a Review'}
        </H2>
        {isEditing && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="small" onClick={handleDeleteClick} disabled={isLoading} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <Button variant="ghost" size="small" onClick={handleCancel} disabled={isLoading}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Selection */}
        <div>
          <Body className="text-sm font-medium text-gray-700 mb-3">Your Rating *</Body>
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
                  className={`h-8 w-8 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <Body className="text-sm text-gray-600 ml-2">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </Body>
            )}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
            Your Review *
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this product..."
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all resize-none"
            disabled={isLoading}
            maxLength={maxCharacters}
          />
          <div className="flex items-center justify-between mt-2">
            <Body className="text-xs text-gray-500">
              Minimum 10 characters required
            </Body>
            <Body className={`text-xs ${
              characterCount > maxCharacters - 50
                ? 'text-amber-600'
                : characterCount > maxCharacters
                ? 'text-red-600'
                : 'text-gray-500'
            }`}>
              {characterCount} / {maxCharacters} characters
            </Body>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="default"
          className="w-full"
          disabled={isLoading || rating === 0 || comment.trim().length < 10}
        >
          {isCreating || isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isEditing ? 'Updating...' : 'Submitting...'}
            </>
          ) : (
            <>
              {isEditing ? (
                <>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Update Review
                </>
              ) : (
                'Submit Review'
              )}
            </>
          )}
        </Button>
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
    </Card>
  );
};
