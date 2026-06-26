import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  getFeed,
  getPostById,
  toggleSave,
  reportPost,
  getMyPosts,
} from '../services/posts.service';

/**
 * React Query hook for the marketplace feed.
 * @param {object} filters - Full URL param object (type, city, page, etc.)
 * @returns {import('@tanstack/react-query').UseQueryResult<{ data: Array, meta: object }>}
 */
export function useFeed(filters) {
  return useQuery({
    queryKey: ['posts', filters],
    queryFn: () => getFeed(filters),
    staleTime: 60_000,
  });
}

/**
 * React Query hook for a single post.
 * @param {string|undefined} postId
 * @returns {import('@tanstack/react-query').UseQueryResult<object>}
 */
export function usePost(postId) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: () => getPostById(postId),
    enabled: Boolean(postId),
  });
}

/**
 * Mutation hook for toggling the saved state of a post.
 * Performs an optimistic update — reverts on error.
 * @param {string} postId
 */
export function useToggleSave(postId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => toggleSave(postId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['post', postId] });
      const previous = queryClient.getQueryData(['post', postId]);
      if (previous) {
        queryClient.setQueryData(['post', postId], {
          ...previous,
          isSaved: !previous.isSaved,
        });
      }
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['post', postId], ctx.previous);
      }
      toast.error(err.message || 'Failed to update saved post.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['saved-posts'] });
    },
  });
}

/**
 * Mutation hook for reporting a post.
 */
export function useReportPost() {
  return useMutation({
    mutationFn: ({ postId, body }) => reportPost(postId, body),
    onSuccess: () => toast.success('Post reported successfully. Thank you.'),
    onError: (err) => toast.error(err.message || 'Failed to report post.'),
  });
}

/**
 * React Query hook for the authenticated user's own posts.
 * @param {object} filters - Query params: status, page, limit
 */
export function useMyPosts(filters = {}) {
  return useQuery({
    queryKey: ['my-posts', filters],
    queryFn: () => getMyPosts(filters),
    staleTime: 30_000,
  });
}
