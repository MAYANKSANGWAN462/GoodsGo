import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { usePublicProfile } from '../../hooks/useUsers';
import { useUserReviews } from '../../hooks/useReviews';
import useAuth from '../../hooks/useAuth';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileStats from '../../components/profile/ProfileStats';
import ReviewList from '../../components/reviews/ReviewList';
import Spinner from '../../components/common/Spinner';
import { ROUTES } from '../../constants/routes';

const REVIEWS_PER_PAGE = 10;

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
        <ReviewList
          reviews={reviews}
          isLoading={reviewsLoading}
          meta={reviewsMeta}
          currentPage={reviewPage}
          onPageChange={(p) => {
            setReviewPage(p);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          emptyTitle="No reviews yet"
          emptyMessage="This user hasn't received any reviews yet."
        />
      </div>
    </div>
  );
}
