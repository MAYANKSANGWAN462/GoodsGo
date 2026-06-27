import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { ROUTES, buildRoute } from '../../constants/routes';
import { timeAgo } from '../../utils/formatters';

/** Maps backend notification type values to an emoji icon. */
const NOTIFICATION_ICONS = {
  booking_request_received: '📋',
  booking_accepted: '✅',
  booking_rejected: '❌',
  booking_withdrawn: '↩️',
  booking_cancelled: '🚫',
  booking_completed: '🏁',
  booking_auto_rejected: '⏱️',
  new_message: '💬',
  review_received: '⭐',
  payment_received: '💰',
  payment_released: '💸',
  post_expired: '⏰',
  post_expiry_warning: '⚠️',
  dispute_raised: '🚨',
  dispute_resolved: '🛡️',
  account_verified: '✔️',
  system: '🔔',
};

/**
 * Resolves the destination path from the notification's linked resource data.
 * @param {object} notification
 * @returns {string} Route path
 */
function getNotificationLink(notification) {
  const data = notification.data || {};
  if (data.bookingId) return buildRoute(ROUTES.BOOKING_DETAIL, { id: data.bookingId });
  if (data.conversationId) return `${ROUTES.CHAT}?conversation=${data.conversationId}`;
  if (data.postId) return buildRoute(ROUTES.POST_DETAIL, { id: data.postId });
  return ROUTES.NOTIFICATIONS;
}

/**
 * Single notification row component.
 * Calls onRead before navigating so the server state updates immediately.
 */
export default function NotificationItem({ notification, onRead }) {
  const navigate = useNavigate();
  const icon = NOTIFICATION_ICONS[notification.type] ?? '🔔';
  const link = getNotificationLink(notification);

  function handleClick() {
    if (!notification.isRead) {
      onRead(notification.id);
    }
    navigate(link);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={[
        'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
        notification.isRead
          ? 'hover:bg-gray-50'
          : 'bg-orange-50 hover:bg-orange-100',
      ].join(' ')}
      aria-label={notification.title}
    >
      {/* Type icon */}
      <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">
        {icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={[
            'text-sm leading-snug truncate',
            notification.isRead ? 'text-text font-normal' : 'text-text font-semibold',
          ].join(' ')}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-text-muted mt-1">
          {timeAgo(notification.createdAt)}
        </p>
      </div>

      {/* Unread dot */}
      {!notification.isRead && (
        <span
          className="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full bg-primary"
          aria-label="Unread"
        />
      )}
    </div>
  );
}

NotificationItem.propTypes = {
  notification: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    body: PropTypes.string,
    isRead: PropTypes.bool.isRequired,
    createdAt: PropTypes.string.isRequired,
    data: PropTypes.shape({
      bookingId: PropTypes.string,
      postId: PropTypes.string,
      conversationId: PropTypes.string,
    }),
  }).isRequired,
  onRead: PropTypes.func.isRequired,
};
