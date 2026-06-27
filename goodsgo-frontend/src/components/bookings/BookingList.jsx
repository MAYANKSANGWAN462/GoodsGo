import PropTypes from 'prop-types';
import BookingCard from './BookingCard';
import Pagination from '../common/Pagination';
import EmptyState from '../common/EmptyState';
import Spinner from '../common/Spinner';

/** Renders an array of BookingCard items with pagination and empty/loading states. */
export default function BookingList({ bookings, meta, isLoading, currentUserId, onPageChange }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <EmptyState
        title="No bookings yet"
        message="Bookings you make or receive as a post owner will appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {bookings.map((booking) => (
        <BookingCard key={booking.id} booking={booking} currentUserId={currentUserId} />
      ))}
      {meta && meta.totalPages > 1 && (
        <Pagination
          currentPage={meta.page}
          totalPages={meta.totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

BookingList.propTypes = {
  bookings: PropTypes.array,
  meta: PropTypes.shape({
    page: PropTypes.number,
    totalPages: PropTypes.number,
  }),
  isLoading: PropTypes.bool,
  currentUserId: PropTypes.string,
  onPageChange: PropTypes.func.isRequired,
};
