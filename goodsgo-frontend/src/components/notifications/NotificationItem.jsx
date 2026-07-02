import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { ROUTES, buildRoute } from '../../constants/routes';
import { timeAgo } from '../../utils/formatters';

/* ── SVG Icon components ─────────────────────────────────────────────────── */

function BookingIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function BellCheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0 text-text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

/* ── Icon + colour config ────────────────────────────────────────────────── */

const TYPE_CONFIG = {
  booking_request_received:  { Icon: BookingIcon,   bg: 'bg-info-subtle',    text: 'text-info' },
  booking_accepted:          { Icon: BookingIcon,   bg: 'bg-info-subtle',    text: 'text-info' },
  booking_rejected:          { Icon: BookingIcon,   bg: 'bg-info-subtle',    text: 'text-info' },
  booking_withdrawn:         { Icon: BookingIcon,   bg: 'bg-info-subtle',    text: 'text-info' },
  booking_cancelled:         { Icon: BookingIcon,   bg: 'bg-info-subtle',    text: 'text-info' },
  booking_completed:         { Icon: BookingIcon,   bg: 'bg-info-subtle',    text: 'text-info' },
  booking_auto_rejected:     { Icon: BookingIcon,   bg: 'bg-info-subtle',    text: 'text-info' },
  payment_received:          { Icon: PaymentIcon,  bg: 'bg-success-subtle', text: 'text-success' },
  payment_released:          { Icon: PaymentIcon,  bg: 'bg-success-subtle', text: 'text-success' },
  new_message:               { Icon: MessageIcon,  bg: 'bg-primary/10',     text: 'text-primary' },
  review_received:           { Icon: StarIcon,     bg: 'bg-warning-subtle', text: 'text-warning' },
  post_expired:              { Icon: ClockIcon,    bg: 'bg-warning-subtle', text: 'text-warning' },
  post_expiry_warning:       { Icon: ClockIcon,    bg: 'bg-warning-subtle', text: 'text-warning' },
  dispute_raised:            { Icon: AlertIcon,    bg: 'bg-danger-subtle',  text: 'text-danger' },
  dispute_resolved:          { Icon: AlertIcon,    bg: 'bg-danger-subtle',  text: 'text-danger' },
  account_verified:          { Icon: BellCheckIcon, bg: 'bg-surface-alt',   text: 'text-text-muted' },
  system:                    { Icon: BellCheckIcon, bg: 'bg-surface-alt',   text: 'text-text-muted' },
};

const DEFAULT_CONFIG = { Icon: BellCheckIcon, bg: 'bg-surface-alt', text: 'text-text-muted' };

/* ── Link resolver ───────────────────────────────────────────────────────── */

function getNotificationLink(notification) {
  const data = notification.data || {};
  if (data.bookingId) return buildRoute(ROUTES.BOOKING_DETAIL, { id: data.bookingId });
  if (data.conversationId) return `${ROUTES.CHAT}?conversation=${data.conversationId}`;
  if (data.postId) return buildRoute(ROUTES.POST_DETAIL, { id: data.postId });
  return ROUTES.NOTIFICATIONS;
}

/* ── Component ───────────────────────────────────────────────────────────── */

export default function NotificationItem({ notification, onRead }) {
  const navigate = useNavigate();
  const { Icon, bg, text } = TYPE_CONFIG[notification.type] ?? DEFAULT_CONFIG;
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
        'flex items-start gap-3.5 px-4 py-3.5 cursor-pointer transition-colors duration-150 animate-fade-in',
        notification.isRead
          ? 'hover:bg-surface-alt'
          : 'bg-primary/5 hover:bg-primary/10',
      ].join(' ')}
      aria-label={notification.title}
    >
      {/* Icon in coloured circle */}
      <div
        className={[
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-0.5',
          bg,
          text,
        ].join(' ')}
        aria-hidden="true"
      >
        <Icon />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={[
            'text-sm leading-snug',
            notification.isRead ? 'text-text font-normal' : 'text-text font-semibold',
          ].join(' ')}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-text-muted mt-1 line-clamp-2 leading-relaxed">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-text-subtle mt-1.5">{timeAgo(notification.createdAt)}</p>
      </div>

      {/* Right side: unread dot + chevron */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0 self-center">
        {!notification.isRead && (
          <span
            className="w-2 h-2 rounded-full bg-primary animate-pulse"
            aria-label="Unread"
          />
        )}
        <ChevronRightIcon />
      </div>
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
