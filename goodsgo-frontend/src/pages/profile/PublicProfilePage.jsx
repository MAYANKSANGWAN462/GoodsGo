import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { usePublicProfile } from '../../hooks/useUsers';
import { useUserReviews } from '../../hooks/useReviews';
import useAuth from '../../hooks/useAuth';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileStats from '../../components/profile/ProfileStats';
import ReviewList from '../../components/reviews/ReviewList';
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
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="skeleton h-2 w-full rounded-none" />
          <div className="p-6 flex flex-col sm:flex-row items-start gap-5">
            <div className="skeleton w-20 h-20 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-3 pt-1">
              <div className="skeleton h-6 w-40 rounded-full" />
              <div className="skeleton h-4 w-24 rounded-full" />
              <div className="skeleton h-3 w-32 rounded-full" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-4 text-center">
              <div className="skeleton h-7 w-10 rounded mx-auto mb-2" />
              <div className="skeleton h-3 w-14 rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    if (error?.status === 404) {
      return <Navigate to={ROUTES.NOT_FOUND} replace />;
    }
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 flex flex-col items-center text-center animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-danger-subtle border border-danger/20 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-base font-semibold text-text mb-1">Failed to load profile</p>
        <p className="text-sm text-text-muted">Please try again.</p>
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
