import PropTypes from 'prop-types';
import Avatar from '../common/Avatar';
import StarRating from '../common/StarRating';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { timeAgo } from '../../utils/formatters';

const ROLE_LABELS = {
  as_customer: 'As Customer',
  as_transporter: 'As Transporter',
};

const ROLE_VARIANTS = {
  as_customer: 'info',
  as_transporter: 'success',
};

/**
 * Displays a single review: reviewer avatar, name, star rating, comment, date.
 * Optionally shows a role badge and a delete button for editable own reviews.
 */
export default function ReviewCard({ review, showRoleBadge = false, onDelete, isDeleting = false }) {
  const canDelete = Boolean(onDelete) && Boolean(review.isEditable);

  return (
    <div className="flex gap-3 p-4 border-b border-border last:border-0">
      <Avatar
        src={review.reviewer?.profileImageUrl}
        name={review.reviewer?.fullName ?? 'User'}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-text">
              {review.reviewer?.fullName ?? 'Anonymous'}
            </span>
            {showRoleBadge && review.reviewRole && (
              <Badge
                variant={ROLE_VARIANTS[review.reviewRole] ?? 'neutral'}
                size="sm"
              >
                {ROLE_LABELS[review.reviewRole] ?? review.reviewRole}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-text-muted">{timeAgo(review.createdAt)}</span>
            {canDelete && (
              <Button
                variant="danger"
                size="sm"
                isLoading={isDeleting}
                onClick={() => onDelete(review.id)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>

        <div className="mt-1">
          <StarRating value={Number(review.rating)} readOnly size="sm" />
        </div>

        {review.comment && (
          <p className="mt-1.5 text-sm text-text leading-relaxed">{review.comment}</p>
        )}
      </div>
    </div>
  );
}

ReviewCard.propTypes = {
  review: PropTypes.shape({
    id: PropTypes.string.isRequired,
    rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    comment: PropTypes.string,
    reviewRole: PropTypes.oneOf(['as_customer', 'as_transporter']),
    createdAt: PropTypes.string,
    isEditable: PropTypes.bool,
    reviewer: PropTypes.shape({
      id: PropTypes.string,
      fullName: PropTypes.string,
      profileImageUrl: PropTypes.string,
    }),
  }).isRequired,
  showRoleBadge: PropTypes.bool,
  onDelete: PropTypes.func,
  isDeleting: PropTypes.bool,
};
