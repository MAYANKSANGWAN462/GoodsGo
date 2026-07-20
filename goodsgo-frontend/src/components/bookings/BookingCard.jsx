import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import Avatar from '../common/Avatar';
import BookingStatusBadge from './BookingStatusBadge';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { buildRoute, ROUTES } from '../../constants/routes';

function ArrowRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

/** Summary card for the BookingsPage list. Clicking navigates to the booking detail. */
export default function BookingCard({ booking, currentUserId }) {
  const navigate = useNavigate();

  const counterparty =
    booking.requester?.id === currentUserId ? booking.postOwner : booking.requester;

  const originCity = booking.post?.originCity;
  const destinationCity = booking.post?.destinationCity;
  return (
    <Card
      onClick={() => navigate(buildRoute(ROUTES.BOOKING_DETAIL, { id: booking.id }))}
      elevation="sm"
      hoverable
      className="w-full animate-fade-in"
    >
      <div className="flex items-center gap-4">
        {/* Left: main info */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Status badge */}
          <BookingStatusBadge status={booking.status} />

          {/* Route */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {originCity && (
              <span className="text-sm font-semibold text-text">{originCity}</span>
            )}
            {originCity && destinationCity && (
              <span className="text-text-muted flex-shrink-0"><ArrowRightIcon /></span>
            )}
            {destinationCity && (
              <span className="text-sm font-semibold text-text">{destinationCity}</span>
            )}
            {!originCity && !destinationCity && (
              <span className="text-sm text-text-muted">—</span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap">
            {booking.scheduledDate && (
              <span className="flex items-center gap-1 text-xs text-text-muted">
                <CalendarIcon />
                {formatDate(booking.scheduledDate)}
              </span>
            )}
            <span className={`text-xs font-semibold ${booking.agreedPrice != null ? 'text-primary' : 'text-text-muted'}`}>
              {booking.agreedPrice != null ? formatCurrency(booking.agreedPrice) : 'Price pending'}
            </span>
          </div>
        </div>

        {/* Right: counterparty + chevron */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {counterparty && (
            <div className="flex flex-col items-center gap-1">
              <Avatar
                src={counterparty.profileImageUrl}
                name={counterparty.fullName}
                size="sm"
              />
              <p className="text-xs text-text-muted text-center max-w-[72px] truncate">
                {counterparty.fullName}
              </p>
            </div>
          )}
          <span className="text-text-subtle"><ChevronRightIcon /></span>
        </div>
      </div>
    </Card>
  );
}

BookingCard.propTypes = {
  booking: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    agreedPrice: PropTypes.number,
    scheduledDate: PropTypes.string,
    post: PropTypes.shape({
      originCity: PropTypes.string,
      destinationCity: PropTypes.string,
    }),
    requester: PropTypes.shape({
      id: PropTypes.string,
      fullName: PropTypes.string,
      profileImageUrl: PropTypes.string,
    }),
    postOwner: PropTypes.shape({
      id: PropTypes.string,
      fullName: PropTypes.string,
      profileImageUrl: PropTypes.string,
    }),
  }).isRequired,
  currentUserId: PropTypes.string,
};
