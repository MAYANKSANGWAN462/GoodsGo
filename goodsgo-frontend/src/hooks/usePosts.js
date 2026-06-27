import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getFeed,
  getPostById,
  toggleSave,
  reportPost,
  getMyPosts,
  getSavedPosts,
  createPost,
  updatePost,
  deletePost,
  updatePostStatus,
} from '../services/posts.service';
import { ROUTES, buildRoute } from '../constants/routes';

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

/**
 * Mutation hook for creating a new post.
 * On success: invalidates ['posts'] + ['my-posts'], redirects to new post detail.
 */
export function useCreatePost() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (formData) => createPost(formData),
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['my-posts'] });
      toast.success('Post created successfully!');
      if (post?.id) {
        navigate(buildRoute(ROUTES.POST_DETAIL, { id: post.id }));
      }
    },
    onError: (err) => toast.error(err.message || 'Failed to create post.'),
  });
}

/**
 * Mutation hook for updating an existing post.
 * On success: invalidates ['post', postId] + ['my-posts'], redirects to post detail.
 * @param {string} postId
 */
export function useUpdatePost(postId) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (formData) => updatePost(postId, formData),
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['my-posts'] });
      toast.success('Post updated successfully!');
      const id = post?.id ?? postId;
      navigate(buildRoute(ROUTES.POST_DETAIL, { id }));
    },
    onError: (err) => toast.error(err.message || 'Failed to update post.'),
  });
}

/**
 * Mutation hook for permanently deleting a post.
 * On success: invalidates ['posts'] + ['my-posts'], redirects to /profile/me.
 */
export function useDeletePost() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (postId) => deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['my-posts'] });
      toast.success('Post deleted.');
      navigate(ROUTES.MY_PROFILE);
    },
    onError: (err) => toast.error(err.message || 'Failed to delete post.'),
  });
}

/**
 * React Query hook for the authenticated user's saved posts.
 * @returns {import('@tanstack/react-query').UseQueryResult<{ data: Array, meta: object }>}
 */
export function useSavedPosts() {
  return useQuery({
    queryKey: ['saved-posts'],
    queryFn: getSavedPosts,
  });
}

/**
 * Mutation hook for toggling a post's active/inactive status.
 * @param {string} postId
 */
export function useUpdatePostStatus(postId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status) => updatePostStatus(postId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['my-posts'] });
      toast.success('Post status updated.');
    },
    onError: (err) => toast.error(err.message || 'Failed to update post status.'),
  });
}
