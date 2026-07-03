import PropTypes from 'prop-types';
import BookingCard from './BookingCard';
import Pagination from '../common/Pagination';
import EmptyState from '../common/EmptyState';

function SkeletonBookingCard() {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm p-5">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0 flex flex-col gap-2.5">
          <div className="skeleton h-5 w-20 rounded-full" />
          <div className="skeleton h-4 w-1/2 rounded-full" />
          <div className="flex items-center gap-3">
            <div className="skeleton h-3 w-24 rounded-full" />
            <div className="skeleton h-3 w-16 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex flex-col items-center gap-1">
            <div className="skeleton w-8 h-8 rounded-full" />
            <div className="skeleton h-2.5 w-14 rounded-full" />
          </div>
          <div className="skeleton w-4 h-4 rounded" />
        </div>
      </div>
    </div>
  );
}

/** Renders an array of BookingCard items with pagination and empty/loading states. */
export default function BookingList({ bookings, meta, isLoading, currentUserId, onPageChange }) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 animate-fade-in">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBookingCard key={i} />
        ))}
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
