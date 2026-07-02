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
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Profile header with accent bar */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div
          className="h-2 w-full"
          style={{ background: 'linear-gradient(90deg, #D31905, #FF6B35, #003082)' }}
        />
        <div className="p-6">
          <ProfileHeader user={profile} isOwnProfile={false} />
        </div>
      </div>

      {/* Stats */}
      <ProfileStats
        postCount={profile?.postCount}
        bookingCount={profile?.bookingCount}
        reviewCount={profile?.reviewCount}
      />

      {/* Reviews section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-warning" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <h2 className="text-base font-semibold text-text">Reviews</h2>
          {reviewsMeta?.total > 0 && (
            <span className="text-xs text-text-muted bg-surface-alt border border-border rounded-full px-2 py-0.5">
              {reviewsMeta.total}
            </span>
          )}
        </div>
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
