import { useContext, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  listNotifications,
  markOneRead,
  markAllRead,
} from '../services/notifications.service';
import NotificationContext from '../context/NotificationContext';

/**
 * React Query hook for the authenticated user's notification list.
 * staleTime is 0 — the socket subscription in NotificationContext drives cache freshness.
 * Syncs unreadCount from response meta after each successful fetch.
 * @param {{ page?: number, limit?: number }} filters
 * @returns {import('@tanstack/react-query').UseQueryResult<{ data: Array, meta: object }>}
 */
export function useNotifications(filters = {}) {
  const { setUnreadCount } = useContext(NotificationContext);

  const result = useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => listNotifications(filters),
    staleTime: 0,
  });

  useEffect(() => {
    if (result.data?.meta?.unreadCount !== undefined) {
      setUnreadCount(result.data.meta.unreadCount);
    }
  }, [result.data, setUnreadCount]);

  return result;
}

/**
 * Mutation hook to mark a single notification as read.
 * Invalidates all ['notifications'] queries on success.
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useMarkOneRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId) => markOneRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      // Silent — failing to mark-read should not surface a toast
    },
  });
}

/**
 * Mutation hook to mark all notifications as read.
 * Optimistically resets unreadCount to 0 immediately.
 * Invalidates all ['notifications'] queries on success.
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const { setUnreadCount } = useContext(NotificationContext);

  return useMutation({
    mutationFn: markAllRead,
    onMutate: () => {
      setUnreadCount(0);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read.');
    },
    onError: () => {
      toast.error('Failed to mark notifications as read.');
    },
  });
}
