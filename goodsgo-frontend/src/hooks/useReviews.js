import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  createReview,
  getBookingReviews,
  getUserReviews,
  getMyReviews,
  deleteReview,
} from '../services/reviews.service';

/**
 * React Query hook for reviews of a specific booking.
 * @param {string} bookingId
 * @returns {import('@tanstack/react-query').UseQueryResult<{ data: Array, meta: object }>}
 */
export function useBookingReviews(bookingId) {
  return useQuery({
    queryKey: ['booking-reviews', bookingId],
    queryFn: () => getBookingReviews(bookingId),
    enabled: Boolean(bookingId),
  });
}

/**
 * Mutation hook to create a review for a completed booking.
 * On success: invalidates ['booking-reviews', bookingId], ['public-profile', revieweeId],
 * and ['user-reviews', revieweeId].
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    // revieweeId is included in variables for cache invalidation but NOT sent to the API.
    mutationFn: ({ bookingId, rating, comment, reviewRole }) =>
      createReview({ bookingId, rating, comment, reviewRole }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['booking-reviews', variables.bookingId] });
      if (variables.revieweeId) {
        queryClient.invalidateQueries({ queryKey: ['public-profile', variables.revieweeId] });
        queryClient.invalidateQueries({ queryKey: ['user-reviews', variables.revieweeId] });
      }
      toast.success('Review submitted!');
    },
    onError: (err) => toast.error(err.message || 'Failed to submit review.'),
  });
}

/**
 * React Query hook for reviews of a specific user (as reviewee).
 * @param {string} userId
 * @param {{ page?: number, limit?: number }} [filters]
 * @returns {import('@tanstack/react-query').UseQueryResult<{ data: Array, meta: object }>}
 */
export function useUserReviews(userId, filters = {}) {
  return useQuery({
    queryKey: ['user-reviews', userId, filters],
    queryFn: () => getUserReviews(userId, filters),
    enabled: Boolean(userId),
  });
}

/**
 * React Query hook for the authenticated user's own written reviews.
 * @returns {import('@tanstack/react-query').UseQueryResult<{ data: Array, meta: object }>}
 */
export function useMyReviews() {
  return useQuery({
    queryKey: ['my-reviews'],
    queryFn: getMyReviews,
  });
}

/**
 * Mutation hook to delete a review within the backend's edit window.
 * On success: invalidates ['my-reviews'] and ['booking-reviews'].
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId) => deleteReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['booking-reviews'] });
      toast.success('Review deleted.');
    },
    onError: (err) => toast.error(err.message || 'Failed to delete review.'),
  });
}
