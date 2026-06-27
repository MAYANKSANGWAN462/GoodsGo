import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { usePublicProfile } from '../../hooks/useUsers';
import { useUserReviews } from '../../hooks/useReviews';
import useAuth from '../../hooks/useAuth';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileStats from '../../components/profile/ProfileStats';
import StarRating from '../../components/common/StarRating';
import Avatar from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import Pagination from '../../components/common/Pagination';
import { timeAgo } from '../../utils/formatters';
import { ROUTES } from '../../constants/routes';

const REVIEWS_PER_PAGE = 10;

function ReviewCard({ review }) {
  return (
    <div className="flex gap-4 p-4 border-b border-border last:border-0">
      <Avatar
        src={review.reviewer?.profileImageUrl}
        name={review.reviewer?.fullName ?? 'User'}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-medium text-text">{review.reviewer?.fullName ?? 'Anonymous'}</span>
          <span className="text-xs text-text-muted">{timeAgo(review.createdAt)}</span>
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
    createdAt: PropTypes.string,
    reviewer: PropTypes.shape({
      fullName: PropTypes.string,
      profileImageUrl: PropTypes.string,
    }),
  }).isRequired,
};

export default function PublicProfilePage() {
  const { userId } = useParams();
  const { user: me } = useAuth();
  const [reviewPage, setReviewPage] = useState(1);

  const isOwnProfile = Boolean(me && me.id === userId);

  const { data: profile, isLoading, isError, error } = usePublicProfile(userId);
  const { data: reviewsData, isLoading: reviewsLoading } = useUserReviews(userId, {
    page: reviewPage,
    limit: REVIEWS_PER_PAGE,
  });

  // Hooks must all be called before any conditional return
  if (isOwnProfile) {
    return <Navigate to={ROUTES.MY_PROFILE} replace />;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    if (error?.status === 404) {
      return <Navigate to={ROUTES.NOT_FOUND} replace />;
    }
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-text-muted text-sm">Failed to load this profile. Please try again.</p>
      </div>
    );
  }

  const reviews = reviewsData?.data ?? [];
  const reviewsMeta = reviewsData?.meta ?? null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Profile header */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <ProfileHeader user={profile} isOwnProfile={false} />
      </div>

      {/* Stats */}
      <ProfileStats
        postCount={profile?.postCount}
        bookingCount={profile?.bookingCount}
        reviewCount={profile?.reviewCount}
      />

      {/* Reviews section */}
      <div>
        <h2 className="text-base font-semibold text-text mb-3">Reviews</h2>

        {reviewsLoading ? (
          <div className="flex justify-center py-10">
            <Spinner size="md" />
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={<span className="text-4xl">⭐</span>}
            title="No reviews yet"
            message="This user hasn't received any reviews yet."
          />
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}

        {reviewsMeta?.totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={reviewPage}
              totalPages={reviewsMeta.totalPages}
              onPageChange={(p) => {
                setReviewPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
