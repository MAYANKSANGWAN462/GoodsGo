import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useNotifications, useMarkOneRead, useMarkAllRead } from '../../hooks/useNotifications';
import NotificationItem from './NotificationItem';
import Spinner from '../common/Spinner';
import Button from '../common/Button';
import { ROUTES } from '../../constants/routes';

const DROPDOWN_LIMIT = 10;

/**
 * Popover notification list displayed below the NotificationBell.
 * Rendered only when the bell is open; close is managed by the parent.
 */
export default function NotificationDropdown({ onClose }) {
  const { data, isLoading } = useNotifications({ limit: DROPDOWN_LIMIT });
  const markOneMutation = useMarkOneRead();
  const markAllMutation = useMarkAllRead();

  const notifications = data?.data ?? [];
  const hasUnread = notifications.some((n) => !n.isRead);

  function handleMarkAll() {
    markAllMutation.mutate();
  }

  function handleMarkOne(id) {
    markOneMutation.mutate(id);
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Notifications"
      className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-text">Notifications</h2>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAll}
            isLoading={markAllMutation.isPending}
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification list */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-2xl mb-2">🔔</p>
            <p className="text-sm font-medium text-text">You're all caught up</p>
            <p className="text-xs text-text-muted mt-1">No notifications yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={(id) => {
                  handleMarkOne(id);
                  onClose();
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-2.5">
        <Link
          to={ROUTES.NOTIFICATIONS}
          onClick={onClose}
          className="block text-center text-xs text-primary font-medium hover:underline"
        >
          See all notifications
        </Link>
      </div>
    </div>
  );
}

NotificationDropdown.propTypes = {
  onClose: PropTypes.func.isRequired,
};
