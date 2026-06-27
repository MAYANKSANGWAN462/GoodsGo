import { useState } from 'react';
import PropTypes from 'prop-types';
import ReviewCard from './ReviewCard';
import Pagination from '../common/Pagination';
import EmptyState from '../common/EmptyState';
import Spinner from '../common/Spinner';
import { useDeleteReview } from '../../hooks/useReviews';

/**
 * Renders a paginated list of ReviewCard components.
 * Manages delete state internally when allowDelete is true.
 */
export default function ReviewList({
  reviews,
  isLoading,
  meta,
  currentPage,
  onPageChange,
  showRoleBadge = false,
  allowDelete = false,
  emptyTitle = 'No reviews yet',
  emptyMessage = 'Reviews from completed bookings will appear here.',
}) {
  const [deletingId, setDeletingId] = useState(null);
  const { mutate: deleteReview } = useDeleteReview();

  function handleDelete(reviewId) {
    setDeletingId(reviewId);
    deleteReview(reviewId, {
      onSettled: () => setDeletingId(null),
    });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="md" />
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <EmptyState
        icon={<span className="text-4xl">⭐</span>}
        title={emptyTitle}
        message={emptyMessage}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            showRoleBadge={showRoleBadge}
            onDelete={allowDelete ? handleDelete : undefined}
            isDeleting={deletingId === review.id}
          />
        ))}
      </div>

      {meta?.totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={meta.totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

ReviewList.propTypes = {
  reviews: PropTypes.array,
  isLoading: PropTypes.bool,
  meta: PropTypes.shape({
    totalPages: PropTypes.number,
    total: PropTypes.number,
  }),
  currentPage: PropTypes.number,
  onPageChange: PropTypes.func,
  showRoleBadge: PropTypes.bool,
  allowDelete: PropTypes.bool,
  emptyTitle: PropTypes.string,
  emptyMessage: PropTypes.string,
};
