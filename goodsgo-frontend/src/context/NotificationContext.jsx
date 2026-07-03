import { createContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import useSocketStore from '../stores/useSocketStore';
import useAuthStore from '../stores/useAuthStore';

const NotificationContext = createContext(null);

/** Notification types that warrant a toast when received in real-time. */
const HIGH_PRIORITY_TYPES = [
  'booking_accepted',
  'booking_rejected',
  'booking_cancelled',
  'booking_completed',
  'dispute_raised',
  'payment_received',
  'payment_released',
];

/**
 * NotificationProvider manages the unread notification count and the real-time
 * socket subscription for the 'notification' event.
 *
 * The socket subscription lives here (not in useNotifications) to guarantee
 * a single listener regardless of how many components call useNotifications.
 */
export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const socket = useSocketStore((s) => s.socket);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();

  // Reset count when the user logs out.
  useEffect(() => {
    if (!isAuthenticated) setUnreadCount(0);
  }, [isAuthenticated]);

  const handleNotification = useCallback(
    (notification) => {
      // Invalidate all paginated notification caches so every page re-fetches
      // from the server. Using setQueriesData would inject the item into every
      // page slice (including page 2, 3…) and would hard-code an inaccurate
      // unreadCount in the meta. invalidateQueries is consistent with
      // useMarkOneRead and useMarkAllRead which use the same approach.
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Optimistic badge increment — corrected by the next successful fetch
      // via useNotifications' useEffect that reads meta.unreadCount.
      setUnreadCount((prev) => prev + 1);

      if (HIGH_PRIORITY_TYPES.includes(notification.type)) {
        toast.success(notification.title, { icon: '🔔' });
      }
    },
    [queryClient]
  );

  useEffect(() => {
    if (!socket) return;
    socket.on('notification', handleNotification);
    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket, handleNotification]);

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default NotificationContext;
