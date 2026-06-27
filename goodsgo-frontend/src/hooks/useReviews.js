import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getUserReviews, getMyReviews, deleteReview } from '../services/reviews.service';

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
