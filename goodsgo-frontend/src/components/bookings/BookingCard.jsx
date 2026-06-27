import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import Avatar from '../common/Avatar';
import BookingStatusBadge from './BookingStatusBadge';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { buildRoute, ROUTES } from '../../constants/routes';

/** Summary card for the BookingsPage list. Clicking navigates to the booking detail. */
export default function BookingCard({ booking, currentUserId }) {
  const navigate = useNavigate();

  const counterparty =
    booking.requester?.id === currentUserId ? booking.postOwner : booking.requester;

  const routeLabel =
    [booking.post?.originCity, booking.post?.destinationCity].filter(Boolean).join(' → ') || '—';

  return (
    <Card
      onClick={() => navigate(buildRoute(ROUTES.BOOKING_DETAIL, { id: booking.id }))}
      className="w-full"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: status + route + meta */}
        <div className="flex-1 min-w-0">
          <div className="mb-1.5">
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="font-medium text-text text-sm truncate">{routeLabel}</p>
          {booking.scheduledDate && (
            <p className="text-xs text-text-muted mt-0.5">
              {formatDate(booking.scheduledDate)}
            </p>
          )}
          <p className="text-xs text-text-muted mt-0.5">
            {booking.agreedPrice != null ? formatCurrency(booking.agreedPrice) : 'Price pending'}
          </p>
        </div>

        {/* Right: counterparty avatar + name */}
        {counterparty && (
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
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
