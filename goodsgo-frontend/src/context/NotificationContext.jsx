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
  'booking_completed',
  'dispute_raised',
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
      // Prepend new notification to all cached notification queries (prefix match).
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old) => {
        if (!old) return { data: [{ ...notification, isRead: false }], meta: { unreadCount: 1 } };
        return {
          ...old,
          data: [{ ...notification, isRead: false }, ...(old.data ?? [])],
        };
      });

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
