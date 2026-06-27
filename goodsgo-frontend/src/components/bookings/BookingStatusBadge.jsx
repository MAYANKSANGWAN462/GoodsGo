import PropTypes from 'prop-types';
import Badge from '../common/Badge';
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_BADGE_VARIANT } from '../../constants/bookingStatuses';

/** Colour-coded badge for any of the 9 booking statuses. Thin wrapper around Badge. */
export default function BookingStatusBadge({ status, size = 'sm' }) {
  const label = BOOKING_STATUS_LABELS[status] ?? status;
  const variant = BOOKING_STATUS_BADGE_VARIANT[status] ?? 'neutral';
  return <Badge variant={variant} size={size}>{label}</Badge>;
}

BookingStatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['sm', 'md']),
};
