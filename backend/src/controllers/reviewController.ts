import { Request, Response } from 'express';
import Review from '../models/Review';
import Product from '../models/Product';
import Order from '../models/Order';
import { AuthRequest } from '../middleware/auth';

/**
 * Get reviews for a product
 */
export const getProductReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'newest' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    // Build sort object
    let sortObj: any = { createdAt: -1 }; // Default: newest first
    if (sort === 'oldest') {
      sortObj = { createdAt: 1 };
    } else if (sort === 'highest') {
      sortObj = { rating: -1, createdAt: -1 };
    } else if (sort === 'lowest') {
      sortObj = { rating: 1, createdAt: -1 };
    } else if (sort === 'helpful') {
      sortObj = { helpful: -1, createdAt: -1 };
    }

    // Get reviews with pagination
    const reviews = await Review.find({ product: productId })
      .populate('user', 'name email')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await Review.countDocuments({ product: productId });

    // Calculate average rating
    const mongoose = require('mongoose');
    const ratingStats = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating',
          },
        },
      },
    ]);

    let averageRating = 0;
    let ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (ratingStats.length > 0) {
      averageRating = Math.round((ratingStats[0].averageRating || 0) * 10) / 10;
      const ratings = ratingStats[0].ratingDistribution || [];
      ratings.forEach((rating: number) => {
        if (rating >= 1 && rating <= 5) {
          ratingDistribution[rating as keyof typeof ratingDistribution]++;
        }
      });
    }

    res.json({
      reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      stats: {
        averageRating,
        totalReviews: total,
        ratingDistribution,
      },
    });
  } catch (error: any) {
    console.error('Error fetching product reviews:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch reviews' });
  }
};

/**
 * Create a new review
 */
export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user!._id;

    // Validate required fields
    if (!rating || !comment) {
      res.status(400).json({ message: 'Rating and comment are required' });
      return;
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      res.status(400).json({ message: 'Rating must be between 1 and 5' });
      return;
    }

    // Validate comment length
    if (comment.trim().length < 10) {
      res.status(400).json({ message: 'Comment must be at least 10 characters long' });
      return;
    }

    if (comment.trim().length > 1000) {
      res.status(400).json({ message: 'Comment must not exceed 1000 characters' });
      return;
    }

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ product: productId, user: userId });
    if (existingReview) {
      res.status(400).json({ message: 'You have already reviewed this product' });
      return;
    }

    // Check if user has purchased this product (for verified purchase badge)
    const hasPurchased = await Order.findOne({
      user: userId,
      'items.product': productId,
      status: 'completed',
    });

    // Create review
    const review = new Review({
      product: productId,
      user: userId,
      rating: parseInt(rating, 10),
      comment: comment.trim(),
      verifiedPurchase: !!hasPurchased,
    });

    await review.save();

    // Populate user data for response
    await review.populate('user', 'name email');

    res.status(201).json({
      review,
      message: 'Review submitted successfully',
    });
  } catch (error: any) {
    console.error('Error creating review:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'You have already reviewed this product' });
      return;
    }
    res.status(500).json({ message: error.message || 'Failed to create review' });
  }
};

/**
 * Update a review
 */
export const updateReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user!._id;

    // Find review
    const review = await Review.findById(reviewId);
    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    // Check if user owns the review
    if (review.user.toString() !== userId.toString()) {
      res.status(403).json({ message: 'You can only update your own reviews' });
      return;
    }

    // Update fields if provided
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        res.status(400).json({ message: 'Rating must be between 1 and 5' });
        return;
      }
      review.rating = parseInt(rating, 10);
    }

    if (comment !== undefined) {
      if (comment.trim().length < 10) {
        res.status(400).json({ message: 'Comment must be at least 10 characters long' });
        return;
      }
      if (comment.trim().length > 1000) {
        res.status(400).json({ message: 'Comment must not exceed 1000 characters' });
        return;
      }
      review.comment = comment.trim();
    }

    await review.save();
    await review.populate('user', 'name email');

    res.json({
      review,
      message: 'Review updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: error.message || 'Failed to update review' });
  }
};

/**
 * Delete a review
 */
export const deleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;
    const userId = req.user!._id;

    // Find review
    const review = await Review.findById(reviewId);
    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    // Check if user owns the review or is admin
    const isOwner = review.user.toString() === userId.toString();
    const isAdmin = req.user!.role === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: 'You can only delete your own reviews' });
      return;
    }

    await Review.findByIdAndDelete(reviewId);

    res.json({ message: 'Review deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: error.message || 'Failed to delete review' });
  }
};

/**
 * Mark review as helpful
 */
export const markHelpful = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reviewId } = req.params;
    const userId = req.user!._id;

    const review = await Review.findById(reviewId);
    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    // Increment helpful count
    review.helpful = (review.helpful || 0) + 1;
    await review.save();

    res.json({
      review,
      message: 'Review marked as helpful',
    });
  } catch (error: any) {
    console.error('Error marking review as helpful:', error);
    res.status(500).json({ message: error.message || 'Failed to mark review as helpful' });
  }
};

/**
 * Get user's review for a product (if exists)
 */
export const getUserReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const userId = req.user!._id;

    const review = await Review.findOne({ product: productId, user: userId })
      .populate('user', 'name email');

    // Return null if no review exists (not an error - user just hasn't reviewed yet)
    res.json({ review: review || null });
  } catch (error: any) {
    console.error('Error fetching user review:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch review' });
  }
};
